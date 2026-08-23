import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay'
import { run, exerciseToMusicXml, UnsupportedScoreError } from '../src/index.ts'
import type { Adjustment, Exercise, Instrument, PipelineResult } from '../src/index.ts'

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

function findingsSection(result: PipelineResult): HTMLElement {
  const section = el('section')
  section.appendChild(el('h2', undefined, `Vocabulary (${result.findingViews.length})`))

  if (result.findingViews.length === 0) {
    section.appendChild(el('p', 'empty', 'Nothing recognised in this solo.'))
    return section
  }

  const list = el('ul', 'findings')
  for (const view of result.findingViews) {
    const item = el('li')
    item.append(
      el('span', 'name', view.name),
      el('span', 'where', view.location),
      el('span', `badge ${view.confidenceLabel}`, view.confidenceLabel),
      el('span', 'by', `found by ${view.detectedBy.join(' + ')}`),
    )
    list.appendChild(item)
  }
  section.appendChild(list)
  return section
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

async function renderResult(result: PipelineResult): Promise<void> {
  resultBox.replaceChildren()
  resultBox.hidden = false

  resultBox.appendChild(summarySection(result))
  for (const node of adjustmentSections(result.report.adjustments)) resultBox.appendChild(node)
  resultBox.appendChild(findingsSection(result))

  const section = el('section')
  section.appendChild(el('h2', undefined, `Exercises (${result.exercises.length})`))
  resultBox.appendChild(section)

  if (result.exercises.length === 0) {
    section.appendChild(el('p', 'empty', 'No exercise survived the validity gate for this solo.'))
    return
  }

  const pending: { notation: HTMLElement; xml: string }[] = []
  for (const exercise of result.exercises) {
    const { card, notation, xml } = exerciseCard(exercise, result.score.instrument)
    section.appendChild(card)
    pending.push({ notation, xml })
  }

  // Attached first, rendered second: OSMD measures its container.
  for (const item of pending) await renderNotation(item.notation, item.xml)
}

async function handleFile(file: File): Promise<void> {
  errorBox.hidden = true
  resultBox.hidden = true
  setStatus(`Reading ${file.name}…`)

  try {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const result = run(bytes)
    setStatus(`${file.name} — analysed.`)
    await renderResult(result)
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
