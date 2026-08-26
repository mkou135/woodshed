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
  showScales(mode: ScaleMode): void
  /** Agent look-fors as markers with tooltips, anchored at each unit's first notehead. */
  showLookFors(lookFors: { unitId: string; text: string }[], units: PracticeUnit[]): void
}

/**
 * How much of the scale band to draw. Three of the four sources surveyed say
 * in print that marking every bar is the failure mode (docs/research/
 * scale-analysis.md §5), so 'declared' — the handful the chart itself asked
 * for — is the default and 'all' is opt-in.
 */
export type ScaleMode = 'declared' | 'all' | 'off'

/** `bar:beat` for a note, the key both the engine and OSMD can produce. */
export const noteKey = (bar: number, beat: number): string => `${bar}:${beat.toFixed(3)}`

export interface StaffSpan {
  top: number
  bottom: number
}

export interface SoloMap {
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
export async function mountScore(container: HTMLElement, xml: string): Promise<SoloMap> {
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

/**
 * The scale band: one span per chord, above the staff.
 *
 * The convention is Coker's and Owens's rather than Levine's (docs/research/
 * scale-analysis.md §5) — a solid line with short ticks pointing *down* at the
 * staff, aligned to the first and last notehead rather than the barline, and a
 * terse label at the left edge. Dashed is reserved for inferred, which nothing
 * here is: every span is either what the chart declared or what the chord's
 * function says.
 *
 * A span that crosses a system break is drawn once per system, and Coker's
 * rule is followed at the join: no terminal tick at the right margin, no
 * opening tick where it resumes, and the label is hyphenated.
 */
const BAND_TICK = 5
/** Clearance between the band and the chord symbols it sits above. */
const BAND_CLEAR = 7
/** How far above a staff to look for the things already drawn there. */
const BAND_SEARCH = 130

/**
 * The y for the band above one system. A fixed offset does not work: chord
 * symbols and rehearsal letters already occupy the space above the staff and
 * their height varies, which is why the phrase ticks put their labels below
 * (see `tick`). So find whatever OSMD drew in the gap above this staff and go
 * above the highest of it.
 */
function bandY(svg: SVGSVGElement, top: number, cache: Map<number, number>): number {
  const hit = cache.get(top)
  if (hit !== undefined) return hit
  let highest = top - BAND_CLEAR
  for (const node of svg.querySelectorAll('text')) {
    if (node.closest('g.scale-band')) continue
    const box = (node as SVGGraphicsElement).getBBox()
    if (box.y + box.height > top || box.y < top - BAND_SEARCH) continue
    highest = Math.min(highest, box.y - BAND_CLEAR)
  }
  cache.set(top, highest)
  return highest
}

function scaleBand(result: PipelineResult, map: SoloMap, mode: ScaleMode): void {
  const svg = map.anchors.values().next().value?.ownerSVGElement
  if (!svg) return
  for (const old of svg.querySelectorAll('g.scale-band')) old.remove()
  if (mode === 'off') return
  const tops = new Map<number, number>()

  const spans = mode === 'declared'
    ? result.analysis.scaleSpans.filter((s) => s.declared)
    : result.analysis.scaleSpans

  for (const span of spans) {
    // The notes this chord actually carries, by onset rather than identity,
    // grouped by system. Which system a notehead is on comes from its own
    // measure, never from its y — a high note with ledger lines reaches into
    // the staff above, and guessing from geometry drew bands across the staff.
    const bySystem = new Map<number, SVGGElement[]>()
    for (const ctx of result.analysis.contexts) {
      if (ctx.chord?.onset !== span.chord.onset) continue
      const w = writtenBar(result.score, ctx.note.bar)
      if (w.pass === 2) continue
      const staff = map.staves.get(w.bar)
      if (!staff) continue
      const found = map.notes.get(noteKey(w.bar, ctx.note.beat)) ?? []
      if (found.length === 0) continue
      bySystem.set(staff.top, [...(bySystem.get(staff.top) ?? []), ...found])
    }
    if (bySystem.size === 0) continue

    const runs = [...bySystem.entries()].sort((a, b) => a[0] - b[0])
    runs.forEach(([top, run], i) => {
      const boxes = run.map((n) => n.getBBox())
      const x0 = Math.min(...boxes.map((b) => b.x)) - 3
      const x1 = Math.max(...boxes.map((b) => b.x + b.width)) + 3
      const y = bandY(svg, top, tops)
      const g = svgEl('g')
      g.setAttribute('class', `scale-band${span.declared ? ' declared' : ''}`)

      const path = svgEl('path')
      const opens = i === 0
      const closes = i === runs.length - 1
      path.setAttribute('d', [
        opens ? `M ${x0} ${y + BAND_TICK} L ${x0} ${y}` : `M ${x0} ${y}`,
        `L ${x1} ${y}`,
        closes ? `L ${x1} ${y + BAND_TICK}` : '',
      ].join(' '))
      g.appendChild(path)

      const text = svgEl('text')
      text.setAttribute('x', String(x0 + 2))
      text.setAttribute('y', String(y - 4))
      // Hyphenated across a break, the way Coker carries a label over a system.
      text.textContent = opens ? (closes ? span.name : `${span.name} —`) : `— ${span.name}`
      g.appendChild(text)

      svg.appendChild(g)
    })
  }
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
    map = await mountScore(container, xml)
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
    // No scrolling: the player asked for the page to stay put on Next.
  }

  const goTo = (printedBar: number): void => {
    map?.anchors.get(printedBar)?.scrollIntoView({ block: 'center' })
  }

  const showScales = (mode: ScaleMode): void => {
    if (map) scaleBand(result, map, mode)
  }

  // One tooltip for all markers; fixed-positioned, closed by leave, outside
  // click or Escape. The text is model-written, so the marker and tip carry
  // agent-sourced for the amber treatment.
  let tip: HTMLDivElement | null = null
  let markers: SVGGElement[] = []
  const hideTip = (): void => { if (tip) tip.hidden = true }
  const ensureTip = (): HTMLDivElement => {
    if (tip) return tip
    tip = document.createElement('div')
    tip.className = 'agent-tip agent-sourced'
    tip.hidden = true
    document.body.appendChild(tip)
    document.addEventListener('click', (e) => {
      if (!(e.target instanceof Element) || !e.target.closest('.agent-marker')) hideTip()
    })
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideTip() })
    return tip
  }

  const showLookFors = (lookFors: { unitId: string; text: string }[], units: PracticeUnit[]): void => {
    for (const m of markers) m.remove()
    markers = []
    hideTip()
    if (!map) return
    for (const lookFor of lookFors) {
      const unit = units.find((u) => u.id === lookFor.unitId)
      const note = unit ? result.analysis.contexts[unit.startIndex]?.note : undefined
      if (!unit || !note) continue
      const bar = writtenBar(result.score, note.bar).bar
      const anchor = (map.notes.get(noteKey(bar, note.beat)) ?? [])[0]
      const staff = map.staves.get(bar)
      const svg = anchor?.ownerSVGElement
      if (!anchor || !staff || !svg) continue
      const box = anchor.getBBox()
      const g = svgEl('g')
      g.setAttribute('class', 'agent-marker agent-sourced')
      const dot = svgEl('circle')
      dot.setAttribute('cx', String(box.x + box.width / 2))
      dot.setAttribute('cy', String(Math.min(box.y, staff.top) - 9))
      dot.setAttribute('r', '5')
      g.appendChild(dot)
      const open = (): void => {
        const t = ensureTip()
        t.textContent = lookFor.text
        t.hidden = false
        const rect = g.getBoundingClientRect()
        t.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 340))}px`
        t.style.top = `${rect.bottom + 8}px`
      }
      g.addEventListener('click', (e) => { e.stopPropagation(); open() })
      g.addEventListener('mouseenter', open)
      g.addEventListener('mouseleave', hideTip)
      svg.appendChild(g)
      markers.push(g)
    }
  }

  return { highlight, goTo, showScales, showLookFors }
}
