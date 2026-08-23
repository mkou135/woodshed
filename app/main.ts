import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay'
import {
  run, readScoreXml, exerciseToMusicXml, UnsupportedScoreError, TICKS_PER_QUARTER,
} from '../src/index.ts'
import type {
  Adjustment, Exercise, Finding, FindingView, Instrument, PipelineResult,
} from '../src/index.ts'

const dropZone = document.getElementById('drop') as HTMLDivElement
const fileInput = document.getElementById('file') as HTMLInputElement
const statusLine = document.getElementById('status') as HTMLParagraphElement
const errorBox = document.getElementById('error') as HTMLDivElement
const resultBox = document.getElementById('result') as HTMLDivElement

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function setStatus(text: string | null): void {
  statusLine.textContent = text ?? ''
  statusLine.hidden = text === null
}

function showError(title: string, detail: string): void {
  errorBox.replaceChildren(el('strong', undefined, title), el('span', undefined, detail))
  errorBox.hidden = false
}

/** An Adjustment targets either a single bar or an inclusive range. */
function whereOf(adjustment: Adjustment): string {
  const target = adjustment.target
  if ('bar' in target) return `bar ${target.bar}`
  return `bars ${target.range[0]}–${target.range[1]}`
}

function download(name: string, xml: string): void {
  const url = URL.createObjectURL(new Blob([xml], { type: 'application/vnd.recordare.musicxml+xml' }))
  const link = el('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoking in the same tick can cancel the download before it starts.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function fileNameOf(exercise: Exercise): string {
  const slug = exercise.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  // Several findings can share a name, so the id keeps the files distinct.
  return `${exercise.id}-${slug || exercise.id}.musicxml`
}

function summarySection(result: PipelineResult): HTMLElement {
  const { score, report } = result
  const section = el('section', 'summary')
  const list = el('dl')

  const row = (label: string, value: string): void => {
    list.append(el('dt', undefined, label), el('dd', undefined, value))
  }

  row('Instrument', score.instrument.name)
  row('Length', `${score.barCount} bars, ${score.notes.length} notes`)
  row(
    'Form',
    report.form
      ? `${report.form.periodBars}-bar chorus, ${report.form.chorusStarts.length} choruses ` +
        `(${report.form.method} match, ${Math.round(report.form.agreement * 100)}% agreement)`
      : 'not detected',
  )
  row(
    'Soloists',
    report.soloists.length > 0
      ? report.soloists.map((s) => `${s.name} (bars ${s.startBar}–${s.endBar})`).join(', ')
      : 'none named',
  )

  section.appendChild(list)
  return section
}

const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const noteName = (midi: number): string =>
  `${NOTE_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`

/** The shape of the solo in numbers: what a summary would be written from. */
function profileSection(result: PipelineResult): HTMLElement {
  const { profile } = result.analysis
  const section = el('section', 'profile')
  const regions = profile.choruses.length > 1
    ? profile.choruses.map((c, i) => ({ label: `Chorus ${i + 1}`, r: c }))
    : [{ label: 'Solo', r: profile.overall }]

  const table = el('table')
  const head = el('tr')
  for (const h of ['', 'Bars', 'Notes / bar', 'Silence', 'Phrases', 'Register', 'Chromatic']) {
    head.appendChild(el('th', undefined, h))
  }
  table.appendChild(head)
  for (const { label, r } of regions) {
    const row = el('tr')
    const cells = [
      label,
      `${r.startBar}–${r.endBar}`,
      r.notesPerBar.toFixed(1),
      `${Math.round(r.silence * 100)}%`,
      `${r.phrases} of ~${Math.round(r.meanPhraseNotes)}`,
      r.register ? `${noteName(r.register.lo)}–${noteName(r.register.hi)}` : '–',
      `${Math.round(r.chromaticRatio * 100)}%`,
    ]
    for (const c of cells) row.appendChild(el('td', undefined, c))
    table.appendChild(row)
  }
  section.appendChild(table)

  const silent = profile.bars.filter((b) => b.silence >= 0.75).map((b) => b.bar)
  const busiest = [...profile.bars].sort((a, b) => b.notes - a.notes).slice(0, 3)
  section.appendChild(el('p', 'note',
    `Busiest bars ${busiest.map((b) => b.bar).join(', ')}. ` +
    (silent.length ? `Mostly silent: ${silent.join(', ')}. ` : '') +
    `Phrase starts ${Math.round(profile.phraseChromaticism.start * 100)}% chromatic, ` +
    `phrase ends ${Math.round(profile.phraseChromaticism.end * 100)}%.`))
  return section
}

function adjustmentSections(adjustments: Adjustment[]): HTMLElement[] {
  const out: HTMLElement[] = []
  const blocking = adjustments.filter((a) => a.severity === 'blocking')
  const rest = adjustments.filter((a) => a.severity !== 'blocking')

  for (const adjustment of blocking) {
    const box = el('div', 'blocking')
    box.append(
      el('strong', undefined, `Needs your decision — ${whereOf(adjustment)}`),
      el('span', undefined, adjustment.reason),
    )
    out.push(box)
  }

  if (rest.length > 0) {
    const details = el('details')
    details.appendChild(el('summary', undefined, `${rest.length} other adjustments`))
    const list = el('ul')
    for (const adjustment of rest) {
      list.appendChild(
        el('li', undefined, `${adjustment.severity} · ${whereOf(adjustment)} — ${adjustment.reason}`),
      )
    }
    details.appendChild(list)
    out.push(details)
  }

  return out
}

/** OSMD needs a container that is already in the document and has a width. */
async function renderNotation(container: HTMLElement, xml: string): Promise<void> {
  try {
    const osmd = new OpenSheetMusicDisplay(container, {
      autoResize: false,
      drawTitle: false,
      drawPartNames: false,
    })
    await osmd.load(xml)
    osmd.render()
  } catch (error) {
    container.appendChild(
      el('p', 'empty', `Could not render this exercise: ${(error as Error).message}`),
    )
  }
}

function exerciseCard(exercise: Exercise, instrument: Instrument): {
  card: HTMLElement
  notation: HTMLElement
  xml: string
} {
  const xml = exerciseToMusicXml(exercise, instrument)
  const card = el('article', 'exercise')
  card.append(
    el('h3', undefined, exercise.title),
    el('p', 'rationale', exercise.rationale),
  )

  const notation = el('div', 'notation')
  card.appendChild(notation)

  const button = el('button', undefined, 'Download MusicXML')
  button.type = 'button'
  button.addEventListener('click', () => download(fileNameOf(exercise), xml))
  card.appendChild(button)

  return { card, notation, xml }
}

// ---------------------------------------------------------------------------
// The annotated solo
//
// The transcription is the product. Findings are highlighted in it and listed
// beside it as a menu; an exercise is an action on an item in that menu.
// ---------------------------------------------------------------------------

/** `bar:beat` for a note, the key both the engine and OSMD can produce. */
const noteKey = (bar: number, beat: number): string => `${bar}:${beat.toFixed(3)}`

/**
 * Render the whole solo and return the notehead SVG elements by `bar:beat`.
 * OSMD's MeasureNumber is the MusicXML `number` attribute, the same thing
 * the engine stores as `Note.bar`; its in-measure timestamp is in whole
 * notes, where the engine's beat is in quarters.
 */
interface StaffSpan {
  top: number
  bottom: number
}

interface SoloMap {
  notes: Map<string, SVGGElement[]>
  rests: Map<string, SVGGElement>
  /** Staff line extent per bar, so markers can span the staff, not the note. */
  staves: Map<number, StaffSpan>
}

async function renderSolo(container: HTMLElement, xml: string): Promise<SoloMap> {
  const osmd = new OpenSheetMusicDisplay(container, {
    autoResize: true,
    drawTitle: false,
    drawPartNames: false,
  })
  await osmd.load(xml)
  osmd.render()

  const notes = new Map<string, SVGGElement[]>()
  const rests = new Map<string, SVGGElement>()
  const staves = new Map<number, StaffSpan>()
  for (const row of osmd.GraphicSheet.MeasureList) {
    for (const measure of row) {
      if (!measure) continue
      const stave = (measure as unknown as {
        getVFStave(): { getYForLine(line: number): number }
      }).getVFStave()
      staves.set(measure.MeasureNumber, { top: stave.getYForLine(0), bottom: stave.getYForLine(4) })
      for (const entry of measure.staffEntries) {
        const beat = entry.relInMeasureTimestamp.RealValue * 4
        for (const voiceEntry of entry.graphicalVoiceEntries) {
          for (const note of voiceEntry.notes) {
            const svg = (note as unknown as { getSVGGElement(): SVGGElement }).getSVGGElement()
            if (!svg) continue
            const key = noteKey(measure.MeasureNumber, beat)
            if (note.sourceNote.isRest()) rests.set(key, svg)
            else notes.set(key, [...(notes.get(key) ?? []), svg])
          }
        }
      }
    }
  }
  return { notes, rests, staves }
}

/** A vertical marker before a note, spanning the staff, labelled beneath it. */
function tick(
  anchor: SVGGElement,
  staff: StaffSpan,
  className: string,
  label: string,
): void {
  const svg = anchor.ownerSVGElement
  if (!svg) return
  const x = anchor.getBBox().x - 10
  const phrase = className.startsWith('phrase')
  const pad = phrase ? 14 : 8
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  g.setAttribute('class', className)
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  line.setAttribute('x', String(x))
  line.setAttribute('y', String(staff.top - pad))
  line.setAttribute('width', phrase ? '3.5' : '2.5')
  line.setAttribute('height', String(staff.bottom - staff.top + pad * 2))
  line.setAttribute('rx', '1')
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  // Below the staff: above it the label fights chord symbols and bar numbers.
  text.setAttribute('x', String(x))
  text.setAttribute('y', String(staff.bottom + pad + 13))
  text.textContent = label
  g.append(line, text)
  svg.appendChild(g)
}

/**
 * Draw a tick before the first note of every phrase, with its number, so the
 * segmentation can be judged against the ear. Geometry comes from the note's
 * own SVG group; the tick lives in the same SVG so it scrolls with it.
 */
function markPhrases(result: PipelineResult, map: SoloMap): void {
  result.analysis.phrases.forEach((phrase, i) => {
    const first = phrase.notes[0]
    // A phrase that begins on a rest inside a tuplet is marked at the rest.
    let anchor: SVGGElement | undefined
    if (phrase.onset !== first.onset) {
      const beat = (phrase.onset - (first.onset - first.beat * TICKS_PER_QUARTER)) / TICKS_PER_QUARTER
      anchor = map.rests.get(noteKey(first.bar, beat))
    }
    anchor ??= map.notes.get(noteKey(first.bar, first.beat))?.[0]
    const staff = map.staves.get(first.bar)
    if (!anchor || !staff) return
    tick(anchor, staff, `phrase-tick${phrase.confidence < 0.6 ? ' weak' : ''}`, String(i + 1))

    // Ideas are numbered within their phrase: 2.1 opens with the phrase, so
    // only 2.2 onwards get a tick of their own.
    phrase.ideas.forEach((idea, j) => {
      if (j === 0) return
      const note = idea.notes[0]
      const target = map.notes.get(noteKey(note.bar, note.beat))?.[0]
      const ideaStaff = map.staves.get(note.bar)
      if (target && ideaStaff) tick(target, ideaStaff, 'idea-tick', `${i + 1}.${j + 1}`)
    })
  })
}

function findingElements(
  finding: Finding,
  result: PipelineResult,
  byKey: Map<string, SVGGElement[]>,
): SVGGElement[] {
  const out: SVGGElement[] = []
  for (const span of finding.spans) {
    for (let i = span.startIndex; i <= span.endIndex; i++) {
      const note = result.analysis.contexts[i]?.note
      if (!note) continue
      out.push(...(byKey.get(noteKey(note.bar, note.beat)) ?? []))
    }
  }
  return out
}

function findingItem(view: FindingView, drillCount: number): HTMLLIElement {
  const item = el('li', 'finding')
  item.tabIndex = 0
  item.dataset.id = view.id
  item.append(
    el('span', 'name', view.name),
    el('span', 'where', view.location),
  )
  const meta = el('span', 'meta')
  meta.append(
    el('span', `badge ${view.confidenceLabel}`, view.confidenceLabel),
    el('span', 'by', `${view.detectedBy.join(' + ')}`),
  )
  if (drillCount > 0) meta.appendChild(el('span', 'drills', `${drillCount} drills`))
  item.appendChild(meta)
  return item
}

async function annotatedSolo(result: PipelineResult, xml: string): Promise<HTMLElement> {
  const section = el('section', 'workspace')
  const aside = el('aside', 'menu')
  const scoreBox = el('div', 'solo')
  const drills = el('div', 'drills-panel')
  section.append(aside, scoreBox)

  aside.appendChild(el('h2', undefined, `Vocabulary (${result.findingViews.length})`))
  aside.appendChild(el('p', 'hint',
    `${result.analysis.phrases.length} phrases, marked in the score in amber and numbered; ` +
    'ideas within a phrase are in blue, numbered 2.2, 2.3… A lighter tick is a boundary the engine is less sure of.'))
  if (result.findingViews.length === 0) {
    aside.appendChild(el('p', 'empty', 'Nothing recognised in this solo.'))
  }

  const list = el('ul', 'findings')
  const exercisesFor = (id: string): Exercise[] =>
    result.exercises.filter((e) => e.findingId === id)
  for (const view of result.findingViews) {
    list.appendChild(findingItem(view, exercisesFor(view.id).length))
  }
  aside.appendChild(list)

  // Attached first, rendered second: OSMD measures its container.
  resultBox.appendChild(section)
  let byKey = new Map<string, SVGGElement[]>()
  try {
    const map = await renderSolo(scoreBox, xml)
    byKey = map.notes
    markPhrases(result, map)
  } catch (error) {
    scoreBox.appendChild(el('p', 'empty', `Could not render the solo: ${(error as Error).message}`))
  }

  let highlighted: SVGGElement[] = []

  const select = async (id: string, scroll: boolean): Promise<void> => {
    const finding = result.analysis.findings.find((f) => f.id === id)
    if (!finding) return

    for (const item of list.querySelectorAll<HTMLLIElement>('li')) {
      const selected = item.dataset.id === id
      item.classList.toggle('selected', selected)
      // The drills live under the item they belong to, so choosing an
      // item and seeing what to practise is one glance, not a scroll.
      if (selected) item.appendChild(drills)
    }
    for (const node of highlighted) node.classList.remove('hit')
    highlighted = findingElements(finding, result, byKey)
    for (const node of highlighted) node.classList.add('hit')
    if (scroll && highlighted[0]) {
      highlighted[0].scrollIntoView({ block: 'center', behavior: 'smooth' })
    }

    drills.replaceChildren()
    const exercises = exercisesFor(id)
    if (exercises.length === 0) {
      drills.appendChild(el('p', 'empty',
        finding.kind === 'device'
          ? 'Devices are reported but not yet drilled.'
          : 'No drill survived the validity gate for this one.'))
      return
    }
    const pending: { notation: HTMLElement; xml: string }[] = []
    for (const exercise of exercises) {
      const { card, notation, xml: exerciseXml } = exerciseCard(exercise, result.score.instrument)
      drills.appendChild(card)
      pending.push({ notation, xml: exerciseXml })
    }
    for (const item of pending) await renderNotation(item.notation, item.xml)
  }

  list.addEventListener('click', (event) => {
    const item = (event.target as HTMLElement).closest<HTMLLIElement>('li.finding')
    if (item?.dataset.id) void select(item.dataset.id, true)
  })
  list.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    const item = (event.target as HTMLElement).closest<HTMLLIElement>('li.finding')
    if (item?.dataset.id) {
      event.preventDefault()
      void select(item.dataset.id, true)
    }
  })

  const first = result.findingViews[0]
  if (first) await select(first.id, true)

  return section
}

async function renderResult(result: PipelineResult, xml: string): Promise<void> {
  resultBox.replaceChildren()
  resultBox.hidden = false

  resultBox.appendChild(summarySection(result))
  for (const node of adjustmentSections(result.report.adjustments)) resultBox.appendChild(node)
  resultBox.appendChild(profileSection(result))
  await annotatedSolo(result, xml)
}

async function handleFile(file: File): Promise<void> {
  errorBox.hidden = true
  resultBox.hidden = true
  setStatus(`Reading ${file.name}…`)

  try {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const result = run(bytes)
    setStatus(`${file.name} — analysed.`)
    await renderResult(result, readScoreXml(bytes))
  } catch (error) {
    setStatus(null)
    if (error instanceof UnsupportedScoreError) {
      showError('This transcription cannot be analysed yet', (error as Error).message)
    } else {
      showError('Could not read this file', (error as Error).message)
    }
  }
}

fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0]
  if (file) void handleFile(file)
})

for (const type of ['dragenter', 'dragover']) {
  dropZone.addEventListener(type, (event) => {
    event.preventDefault()
    dropZone.classList.add('over')
  })
}

for (const type of ['dragleave', 'dragend']) {
  dropZone.addEventListener(type, () => dropZone.classList.remove('over'))
}

dropZone.addEventListener('drop', (event) => {
  event.preventDefault()
  dropZone.classList.remove('over')
  const file = (event as DragEvent).dataTransfer?.files?.[0]
  if (file) void handleFile(file)
})
