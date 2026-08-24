import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay'
import { writtenBar } from '../src/core/bars.ts'
import { TICKS_PER_QUARTER } from '../src/index.ts'
import type { PipelineResult, PracticeUnit } from '../src/index.ts'
import { el, svgEl } from './dom.ts'

/**
 * The solo on the page: OSMD renders it, phrase and idea ticks are drawn
 * into the same SVG, and the unit in hand is painted with a highlighter.
 * Everything is keyed by printed bar (`core/bars.ts`); a second pass
 * through a repeat lands on measures already drawn.
 */
export interface ScoreView {
  highlight(unit: PracticeUnit | null): void
  goTo(printedBar: number): void
}

/** `bar:beat` for a note, the key both the engine and OSMD can produce. */
const noteKey = (bar: number, beat: number): string => `${bar}:${beat.toFixed(3)}`

interface StaffSpan {
  top: number
  bottom: number
}

interface SoloMap {
  notes: Map<string, SVGGElement[]>
  rests: Map<string, SVGGElement>
  /** Staff line extent per printed bar, so markers span the staff, not the note. */
  staves: Map<number, StaffSpan>
  /** One element per printed bar, to scroll to. */
  anchors: Map<number, SVGGElement>
}

/** A small exercise, rendered once its container is in the document. */
export async function renderNotation(container: HTMLElement, xml: string): Promise<void> {
  try {
    const osmd = new OpenSheetMusicDisplay(container, { autoResize: false, drawTitle: false, drawPartNames: false })
    await osmd.load(xml)
    osmd.render()
  } catch (error) {
    container.appendChild(el('p', 'empty', `Could not render this exercise: ${(error as Error).message}`))
  }
}

/**
 * OSMD's MeasureNumber is the MusicXML `number` attribute, the same thing
 * the engine stores as `Note.bar` before repeats are unrolled; its
 * in-measure timestamp is in whole notes, where the engine's beat is in quarters.
 */
async function renderSolo(container: HTMLElement, xml: string): Promise<SoloMap> {
  const osmd = new OpenSheetMusicDisplay(container, { autoResize: true, drawTitle: false, drawPartNames: false })
  await osmd.load(xml)
  osmd.render()

  const map: SoloMap = { notes: new Map(), rests: new Map(), staves: new Map(), anchors: new Map() }
  for (const row of osmd.GraphicSheet.MeasureList) {
    for (const measure of row) {
      if (!measure) continue
      const stave = (measure as unknown as { getVFStave(): { getYForLine(line: number): number } }).getVFStave()
      map.staves.set(measure.MeasureNumber, { top: stave.getYForLine(0), bottom: stave.getYForLine(4) })
      for (const entry of measure.staffEntries) {
        const beat = entry.relInMeasureTimestamp.RealValue * 4
        for (const voiceEntry of entry.graphicalVoiceEntries) {
          for (const note of voiceEntry.notes) {
            const svg = (note as unknown as { getSVGGElement(): SVGGElement }).getSVGGElement()
            if (!svg) continue
            if (!map.anchors.has(measure.MeasureNumber)) map.anchors.set(measure.MeasureNumber, svg)
            const key = noteKey(measure.MeasureNumber, beat)
            if (note.sourceNote.isRest()) map.rests.set(key, svg)
            else map.notes.set(key, [...(map.notes.get(key) ?? []), svg])
          }
        }
      }
    }
  }
  return map
}

/** A vertical marker before a note, spanning the staff, labelled beneath it. */
function tick(anchor: SVGGElement, staff: StaffSpan, className: string, label: string): void {
  const svg = anchor.ownerSVGElement
  if (!svg) return
  const x = anchor.getBBox().x - 10
  const phrase = className.startsWith('phrase')
  const pad = phrase ? 14 : 8
  const g = svgEl('g')
  g.setAttribute('class', className)
  const line = svgEl('rect')
  line.setAttribute('x', String(x))
  line.setAttribute('y', String(staff.top - pad))
  line.setAttribute('width', phrase ? '3.5' : '2.5')
  line.setAttribute('height', String(staff.bottom - staff.top + pad * 2))
  line.setAttribute('rx', '1')
  const text = svgEl('text')
  // Below the staff: above it the label fights chord symbols and bar numbers.
  text.setAttribute('x', String(x))
  text.setAttribute('y', String(staff.bottom + pad + 13))
  text.textContent = label
  g.append(line, text)
  svg.appendChild(g)
}

/** Phrases numbered in amber; ideas within a phrase (2.2, 2.3 …) in blue. */
function markPhrases(result: PipelineResult, map: SoloMap): void {
  const score = result.score
  const printed = (bar: number): number | null => {
    const w = writtenBar(score, bar)
    return w.pass === 2 ? null : w.bar
  }
  result.analysis.phrases.forEach((phrase, i) => {
    const first = phrase.notes[0]
    const firstBar = printed(first.bar)
    if (firstBar === null) return
    // A phrase that begins on a rest inside a tuplet is marked at the rest.
    let anchor: SVGGElement | undefined
    if (phrase.onset !== first.onset) {
      const beat = (phrase.onset - (first.onset - first.beat * TICKS_PER_QUARTER)) / TICKS_PER_QUARTER
      anchor = map.rests.get(noteKey(firstBar, beat))
    }
    anchor ??= map.notes.get(noteKey(firstBar, first.beat))?.[0]
    const staff = map.staves.get(firstBar)
    if (!anchor || !staff) return
    tick(anchor, staff, `phrase-tick${phrase.confidence < 0.6 ? ' weak' : ''}`, String(i + 1))

    phrase.ideas.forEach((idea, j) => {
      if (j === 0) return
      const note = idea.notes[0]
      const noteBar = printed(note.bar)
      if (noteBar === null) return
      const target = map.notes.get(noteKey(noteBar, note.beat))?.[0]
      const ideaStaff = map.staves.get(noteBar)
      if (target && ideaStaff) tick(target, ideaStaff, 'idea-tick', `${i + 1}.${j + 1}`)
    })
  })
}

export async function renderScore(container: HTMLElement, result: PipelineResult, xml: string): Promise<ScoreView> {
  let map: SoloMap | null = null
  try {
    map = await renderSolo(container, xml)
    markPhrases(result, map)
  } catch (error) {
    container.appendChild(el('p', 'empty', `Could not render the solo: ${(error as Error).message}`))
  }

  let hits: SVGGElement[] = []
  let rects: SVGRectElement[] = []

  const highlight = (unit: PracticeUnit | null): void => {
    for (const node of hits) node.classList.remove('hit')
    for (const rect of rects) rect.remove()
    hits = []
    rects = []
    if (!unit || !map) return

    // Noteheads by printed bar, so one highlighter stroke per bar.
    const byBar = new Map<number, SVGGElement[]>()
    for (let i = unit.startIndex; i <= unit.endIndex; i++) {
      const note = result.analysis.contexts[i]?.note
      if (!note) continue
      const bar = writtenBar(result.score, note.bar).bar
      const nodes = map.notes.get(noteKey(bar, note.beat)) ?? []
      byBar.set(bar, [...(byBar.get(bar) ?? []), ...nodes])
      hits.push(...nodes)
    }
    for (const node of hits) node.classList.add('hit')

    for (const [bar, nodes] of byBar) {
      const staff = map.staves.get(bar)
      const svg = nodes[0]?.ownerSVGElement
      if (!staff || !svg || nodes.length === 0) continue
      const boxes = nodes.map((n) => n.getBBox())
      const x0 = Math.min(...boxes.map((b) => b.x)) - 6
      const x1 = Math.max(...boxes.map((b) => b.x + b.width)) + 6
      const rect = svgEl('rect')
      rect.setAttribute('class', 'hl-bar')
      rect.setAttribute('x', String(x0))
      rect.setAttribute('y', String(staff.top - 14))
      rect.setAttribute('width', String(x1 - x0))
      rect.setAttribute('height', String(staff.bottom - staff.top + 28))
      rect.setAttribute('rx', '3')
      // First child: behind the notes, in the same SVG so it scrolls with them.
      svg.insertBefore(rect, svg.firstChild)
      rects.push(rect)
    }
    // After this task: the desk under the score is still being laid out.
    // A timeout, not requestAnimationFrame (which a background tab never
    // fires); instant, because Chrome ignores smooth scrolling to an SVG group.
    const first = hits[0]
    if (first) setTimeout(() => first.scrollIntoView({ block: 'center' }), 0)
  }

  const goTo = (printedBar: number): void => {
    map?.anchors.get(printedBar)?.scrollIntoView({ block: 'center' })
  }

  return { highlight, goTo }
}
