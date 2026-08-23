import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay'
import {
  run, readScoreXml, exerciseToMusicXml, UnsupportedScoreError, TICKS_PER_QUARTER,
  parseIReal, practiseOver, transposeTune, checkWriting, chordName, noteName,
} from '../src/index.ts'
import type {
  Adjustment, Exercise, Instrument, PipelineResult, PracticeUnit, Step, IRealSong,
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

const noteOctave = (midi: number): string => `${noteName(midi)}${Math.floor(midi / 12) - 1}`

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
      r.register ? `${noteOctave(r.register.lo)}–${noteOctave(r.register.hi)}` : '–',
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

function unitElements(
  unit: PracticeUnit,
  result: PipelineResult,
  byKey: Map<string, SVGGElement[]>,
): SVGGElement[] {
  const out: SVGGElement[] = []
  for (let i = unit.startIndex; i <= unit.endIndex; i++) {
    const note = result.analysis.contexts[i]?.note
    if (note) out.push(...(byKey.get(noteKey(note.bar, note.beat)) ?? []))
  }
  return out
}

const STEP_TITLES: Record<Step['kind'], string> = {
  loop: '1 · Loop it as played',
  through: '2 · Through the tune',
  displace: '3 · Vary it',
  write: '4 · Write your own',
}

function unitItem(unit: PracticeUnit): HTMLLIElement {
  const item = el('li', 'finding unit')
  item.tabIndex = 0
  item.dataset.id = unit.id
  const first = unit.notes[0]
  const last = unit.notes[unit.notes.length - 1]
  const where = first.bar === last.bar ? `bar ${first.bar}` : `bars ${first.bar}–${last.bar}`
  const part = unit.part ? ` · part ${unit.part.n} of ${unit.part.of}` : ''
  item.append(
    el('span', 'name', `${where}${part} · ${unit.harmony.map(chordName).join(' → ') || 'no chord'}`),
    el('span', 'where', unit.notes.map((n) => noteName(n.midi)).join(' ')),
  )
  const chips = el('span', 'chips')
  for (const name of new Set(unit.findings.map((f) => f.name))) chips.appendChild(el('span', 'chip', name))
  if (unit.findings.length === 0) chips.appendChild(el('span', 'chip faint', 'no named vocabulary'))
  item.appendChild(chips)
  return item
}

/** The four steps under a selected idea. Notation renders when a panel opens. */
async function stepPanels(unit: PracticeUnit, result: PipelineResult, host: HTMLElement): Promise<void> {
  host.appendChild(el('p', 'header', unit.header))
  const renderers: (() => Promise<void>)[] = []

  unit.steps.forEach((step, index) => {
    const details = el('details', 'step')
    details.open = index === 0
    details.appendChild(el('summary', undefined, STEP_TITLES[step.kind]))
    details.appendChild(el('p', 'prompt', step.prompt))
    const exercises =
      step.kind === 'loop' ? [step.exercise]
        : step.kind === 'write' ? []
          : step.exercises
    const pending: { notation: HTMLElement; xml: string }[] = []
    for (const exercise of exercises) {
      const { card, notation, xml } = exerciseCard(exercise, result.score.instrument)
      details.appendChild(card)
      pending.push({ notation, xml })
    }
    const renderMine = async (): Promise<void> => {
      for (const item of pending.splice(0)) await renderNotation(item.notation, item.xml)
    }
    details.addEventListener('toggle', () => { if (details.open) void renderMine() })
    if (details.open) renderers.push(renderMine)

    if (step.kind === 'write') {
      const button = el('button', undefined, 'Download the template')
      button.type = 'button'
      button.addEventListener('click', () => download(`${unit.id}-write-your-own.musicxml`, step.template))
      details.appendChild(button)
      const check = el('label', 'check')
      check.append(el('span', undefined, 'Then check your writing: '))
      const input = el('input')
      input.type = 'file'
      input.accept = '.mxl,.musicxml,.xml'
      const verdict = el('p', 'verdict')
      input.addEventListener('change', async () => {
        const file = input.files?.[0]
        if (!file) return
        try {
          const res = checkWriting(new Uint8Array(await file.arrayBuffer()), unit)
          verdict.replaceChildren()
          for (const name of res.found) {
            verdict.appendChild(el('span', 'ok', `✓ ${name} — bars ${res.bars[name].join(', ')}`))
          }
          for (const name of res.missing) verdict.appendChild(el('span', 'miss', `✗ ${name} not found`))
        } catch (error) {
          verdict.textContent = `Could not read that file: ${(error as Error).message}`
        }
      })
      check.appendChild(input)
      details.append(check, verdict)
    }
    host.appendChild(details)
  })
  for (const render of renderers) await render()
}

const TUNE_KEY = 'woodshed.tune'

function tuneControl(
  result: PipelineResult,
  onChange: (units: PracticeUnit[]) => void,
): HTMLElement {
  const box = el('div', 'tune')
  const select = el('select')
  const own = el('option', undefined, 'this solo')
  own.value = 'solo'
  select.appendChild(own)
  const paste = el('input')
  paste.type = 'text'
  paste.placeholder = 'paste an irealb:// link'
  const note = el('span', 'faint')

  let songs: IRealSong[] = []
  const apply = (): void => {
    if (select.value === 'solo') { onChange(result.units); return }
    const song = songs[Number(select.value)]
    if (!song) return
    // Charts are concert pitch; the player reads written pitch.
    const written = transposeTune(song.tune, -result.score.instrument.transpose.chromatic)
    onChange(practiseOver(result, written, song.title))
  }
  const load = (link: string): void => {
    try {
      songs = parseIReal(link)
      for (const o of [...select.options]) if (o.value !== 'solo') o.remove()
      songs.forEach((s, i) => {
        const o = el('option', undefined, `${s.title} (${s.key})`)
        o.value = String(i)
        select.appendChild(o)
      })
      select.value = '0'
      note.textContent = songs.length > 1 ? `${songs.length} tunes loaded` : ''
      try { localStorage.setItem(TUNE_KEY, link) } catch { /* private mode */ }
      apply()
    } catch (error) {
      note.textContent = (error as Error).message
    }
  }
  paste.addEventListener('change', () => { if (paste.value.trim()) load(paste.value) })
  select.addEventListener('change', apply)
  box.append(el('span', undefined, 'Take it through: '), select, paste, note)
  try {
    const saved = localStorage.getItem(TUNE_KEY)
    if (saved) { paste.value = saved; load(saved) }
  } catch { /* no storage */ }
  return box
}

async function annotatedSolo(result: PipelineResult, xml: string): Promise<HTMLElement> {
  const section = el('section', 'workspace')
  const aside = el('aside', 'menu')
  const scoreBox = el('div', 'solo')
  const panels = el('div', 'drills-panel')
  section.append(aside, scoreBox)

  let units = result.units
  let selected: string | null = null
  const list = el('ul', 'findings')
  const heading = el('h2', undefined, `Ideas (${units.length})`)
  const hint = el('p', 'hint',
    `${result.analysis.phrases.length} phrases, marked in the score in amber and numbered; ` +
    'ideas within a phrase are in blue, numbered 2.2, 2.3… Pick an idea to see how to practise it.')

  const fill = (): void => {
    list.replaceChildren()
    for (const unit of units) list.appendChild(unitItem(unit))
    heading.textContent = `Ideas (${units.length})`
  }

  // Attached first, rendered second: OSMD measures its container.
  resultBox.appendChild(section)
  let byKey = new Map<string, SVGGElement[]>()
  let highlighted: SVGGElement[] = []

  const select = async (id: string, scroll: boolean): Promise<void> => {
    const unit = units.find((u) => u.id === id)
    if (!unit) return
    selected = id
    for (const item of list.querySelectorAll<HTMLLIElement>('li.unit')) {
      const on = item.dataset.id === id
      item.classList.toggle('selected', on)
      if (on) item.appendChild(panels)
    }
    for (const node of highlighted) node.classList.remove('hit')
    highlighted = unitElements(unit, result, byKey)
    for (const node of highlighted) node.classList.add('hit')
    if (scroll && highlighted[0]) highlighted[0].scrollIntoView({ block: 'center', behavior: 'smooth' })
    panels.replaceChildren()
    await stepPanels(unit, result, panels)
  }

  const control = tuneControl(result, (next) => {
    units = next
    fill()
    if (selected) void select(selected, false)
  })
  aside.append(heading, hint, control, list)

  try {
    const map = await renderSolo(scoreBox, xml)
    byKey = map.notes
    markPhrases(result, map)
  } catch (error) {
    scoreBox.appendChild(el('p', 'empty', `Could not render the solo: ${(error as Error).message}`))
  }

  list.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('.drills-panel')) return
    const item = (event.target as HTMLElement).closest<HTMLLIElement>('li.unit')
    if (item?.dataset.id) void select(item.dataset.id, true)
  })
  list.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    if ((event.target as HTMLElement).closest('.drills-panel')) return
    const item = (event.target as HTMLElement).closest<HTMLLIElement>('li.unit')
    if (item?.dataset.id) { event.preventDefault(); void select(item.dataset.id, true) }
  })

  fill()
  if (units[0]) await select(units[0].id, true)
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
