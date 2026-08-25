import { run, readScoreXml, UnsupportedScoreError } from '../src/index.ts'
import type { PipelineResult, PracticeUnit } from '../src/index.ts'
import { button, el } from './dom.ts'
import { renderScore } from './score.ts'
import type { ScaleMode } from './score.ts'
import { tuneChip } from './tune.ts'
import { detailsDrawer, whereOf } from './details.ts'
import { doneStore } from './done.ts'
import { practiceDesk } from './desk.ts'

/**
 * The page: a landing with a drop zone, then the practice desk — header
 * with the tune chip, a "start here" strip, the score full width with the
 * idea in hand highlighted, the desk with the four steps, and the list of
 * every idea behind "All ideas". Engine diagnostics sit behind "Details".
 */

const top = document.getElementById('top') as HTMLElement
const landing = document.getElementById('landing') as HTMLElement
const dropZone = document.getElementById('drop') as HTMLDivElement
const fileInput = document.getElementById('file') as HTMLInputElement
const statusLine = document.getElementById('status') as HTMLParagraphElement
const errorBox = document.getElementById('error') as HTMLDivElement
const resultBox = document.getElementById('result') as HTMLDivElement

function setStatus(text: string | null): void {
  statusLine.textContent = text ?? ''
  statusLine.hidden = text === null
}

function showError(title: string, detail: string): void {
  errorBox.replaceChildren(el('strong', undefined, title), el('span', undefined, detail))
  errorBox.hidden = false
}

function soloTitle(result: PipelineResult, filename: string): string {
  const t = result.score.title?.trim()
  if (t && t.toLowerCase() !== 'title') return t
  return filename.replace(/\.[a-z0-9]+$/i, '')
}

/** Which scales the band shows; one setting for the browser, not per solo. */
const SCALES_KEY = 'woodshed.scales'

function header(result: PipelineResult, filename: string, chip: HTMLElement, picker: HTMLElement, details: HTMLElement): void {
  const title = el('span', 'solo-title', soloTitle(result, filename))
  const soloist = result.report.soloists.find((s) => s.name.toLowerCase() !== 'unknown')?.name
  title.appendChild(el('small', undefined,
    [soloist, result.score.instrument.name, `${result.score.barCount} bars`].filter(Boolean).join(' · ')))
  const right = el('div', 'right')
  right.append(chip, details, button('btn quiet', 'New solo', () => location.reload()), picker)
  top.replaceChildren(el('span', 'brand', 'Woodshed'), title, right)
  top.hidden = false
}

function startHere(unit: PracticeUnit, total: number): HTMLElement {
  const strip = el('div', 'start')
  const s = unit.summary
  const p = el('p')
  p.append(
    document.createTextNode(`Idea 1 of ${total} is highlighted in the score — `),
    el('em', undefined, `${s.bars.toLowerCase()}${s.cells[0] ? `, ${s.cells[0]}` : ''}${s.chords[0] ? ` over ${s.chords[0]}` : ''}`),
    document.createTextNode('. Four steps below; do them in order, then Next › to the next idea. The transcription is under the desk.'),
  )
  const close = button('close', '×', () => strip.remove())
  close.setAttribute('aria-label', 'Dismiss')
  strip.append(el('span', 'k', 'Start here'), p, close)
  return strip
}

function blocking(result: PipelineResult): HTMLElement[] {
  return result.report.adjustments
    .filter((a) => a.severity === 'blocking')
    .map((a) => {
      const box = el('div', 'blocking')
      box.append(el('strong', undefined, `Needs your decision — ${whereOf(a, result.score)}`), el('span', undefined, a.reason))
      return box
    })
}

function ideaTable(units: PracticeUnit[], selectedId: string | null, onPick: (id: string) => void): HTMLTableElement {
  const table = el('table')
  for (const [i, u] of units.entries()) {
    const tr = el('tr')
    tr.dataset.id = u.id
    tr.classList.toggle('sel', u.id === selectedId)
    tr.tabIndex = 0
    const s = u.summary
    const where = s.bars.replace(/^Bars? /, '') + (u.part ? ` · part ${u.part.n} of ${u.part.of}` : '')
    const f = el('td', 'f')
    for (const name of s.cells) f.appendChild(el('span', 'cell', name))
    if (s.cells.length === 0) f.appendChild(el('span', 'stock', s.stock ? 'mostly a scale run' : 'no named vocabulary'))
    else if (s.stock) f.appendChild(el('span', 'stock', 'mostly a scale run'))
    tr.append(el('td', 'n', String(i + 1)), el('td', 'w mono', where), el('td', 'c', s.chords.join(' → ')), f)
    tr.addEventListener('click', () => onPick(u.id))
    tr.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(u.id) } })
    table.appendChild(tr)
  }
  return table
}

async function renderResult(result: PipelineResult, xml: string, filename: string): Promise<void> {
  resultBox.replaceChildren()
  resultBox.hidden = false
  landing.hidden = true

  const soloKey = `${soloTitle(result, filename)}:${result.score.notes.length}:${result.score.barCount}`
  const done = doneStore(soloKey)

  // Layout first: OSMD measures its container, so it must be in the document.
  const sheet = el('section', 'sheet')
  const legend = el('div', 'legend')
  const goto = el('label', 'goto')
  const gotoInput = el('input')
  gotoInput.type = 'number'
  gotoInput.min = '1'
  gotoInput.setAttribute('aria-label', 'Go to bar')
  goto.append(el('span', undefined, 'go to bar'), gotoInput)
  const ph = el('span', 'ph'); ph.append(el('i'), document.createTextNode('Phrase'))
  const id = el('span', 'id'); id.append(el('i'), document.createTextNode('Idea'))
  const hl = el('span', 'hl'); hl.append(el('i'), document.createTextNode('Now practising'))
  const scales = el('label', 'scales')
  const scalesSelect = document.createElement('select')
  for (const [value, label] of [
    ['declared', 'where the chart says'],
    ['all', 'every chord'],
    ['off', 'off'],
  ] as const) {
    const option = document.createElement('option')
    option.value = value
    option.textContent = label
    scalesSelect.appendChild(option)
  }
  scalesSelect.setAttribute('aria-label', 'Which scales to show')
  scales.append(el('span', undefined, 'scales'), scalesSelect)
  legend.append(ph, id, hl, scales, goto)
  const solo = el('div', 'solo')
  sheet.append(legend, solo)

  const deskHost = el('section', 'desk')
  const drawer = el('section', 'drawer')
  drawer.hidden = true
  const drawerHead = el('div', 'dh')
  const drawerTitle = el('h2')
  drawerHead.append(drawerTitle, el('span', undefined, 'ranked by how much of the player is in them; stock scales and arpeggios sink'))
  const drawerScroll = el('div', 'scroll')
  drawer.append(drawerHead, drawerScroll)

  const { button: detailsButton, drawer: detailsBox } = detailsDrawer(result)
  // The desk first: the exercises are the work, the transcription the reference.
  resultBox.append(detailsBox, ...blocking(result), deskHost, drawer, sheet)

  const view = await renderScore(solo, result, xml)
  gotoInput.addEventListener('change', () => { const n = Number(gotoInput.value); if (n > 0) view.goTo(n) })

  // Marking every bar is the failure mode the sources warn about, so the
  // chart-declared handful is the default; the choice sticks per browser.
  const scaleMode = (localStorage.getItem(SCALES_KEY) as ScaleMode | null) ?? 'declared'
  scalesSelect.value = scaleMode
  view.showScales(scaleMode)
  scalesSelect.addEventListener('change', () => {
    const mode = scalesSelect.value as ScaleMode
    localStorage.setItem(SCALES_KEY, mode)
    view.showScales(mode)
  })

  const desk = practiceDesk(deskHost, result, view, done)
  let units = result.units
  let selectedId: string | null = null
  let strip: HTMLElement | null = null

  const fillDrawer = (): void => {
    drawerTitle.textContent = `All ${units.length} ideas`
    drawerScroll.replaceChildren(ideaTable(units, selectedId, (pick) => { void desk.select(pick) }))
  }
  desk.onSelect((unit, index) => {
    selectedId = unit.id
    for (const tr of drawerScroll.querySelectorAll<HTMLTableRowElement>('tr')) {
      tr.classList.toggle('sel', tr.dataset.id === unit.id)
    }
    // Once the player moves off idea 1, the strip has done its job.
    if (index !== 0 && strip) { strip.remove(); strip = null }
  })
  desk.onDone(() => { if (strip) { strip.remove(); strip = null } })

  const allIdeas = button('btn', 'All ideas', () => {
    drawer.hidden = !drawer.hidden
    allIdeas.textContent = drawer.hidden ? 'All ideas' : 'Hide ideas'
    if (!drawer.hidden) drawer.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  })

  const { chip, picker } = tuneChip(result, filename, (choice) => {
    units = choice.units
    desk.setUnits(units)
    fillDrawer()
  })
  header(result, filename, chip, picker, detailsButton)
  // The nav element survives re-renders of the desk head; join it once.
  desk.onSelect(() => {
    const nav = deskHost.querySelector('.nav')
    if (nav && !nav.contains(allIdeas)) nav.appendChild(allIdeas)
  })

  if (units[0]) {
    // Strip first, then select: the selection scrolls the score into view.
    strip = startHere(units[0], units.length)
    deskHost.before(strip)
    fillDrawer()
    await desk.select(units[0].id)
  }
}

async function handleFile(file: File): Promise<void> {
  errorBox.hidden = true
  resultBox.hidden = true
  setStatus(`Reading ${file.name}…`)
  try {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const result = run(bytes)
    setStatus(null)
    await renderResult(result, readScoreXml(bytes), file.name)
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
