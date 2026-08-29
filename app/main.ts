import { run, runWithAgent, liveClient, readScoreXml, UnsupportedScoreError } from '../src/index.ts'
import type { AgentOutput, PipelineResult, PracticeUnit } from '../src/index.ts'
import { agentKey, agentKeyRow, agentModel, agentPersona } from './agentKey.ts'
import { button, el } from './dom.ts'
import { renderScore } from './score.ts'
import type { OverlaySettings, ScaleMode } from './score.ts'
import { OVERLAY_DEFAULTS } from './score.ts'
import { annotationExportHtml, downloadHtml } from './export.ts'
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

/**
 * The agent phase is four model calls and can take a minute; a silent page
 * reads as a stalled one. One bar, one line of what is happening now.
 */
const AGENT_STAGES = [
  'reading the score',
  'judging the ambiguous phrase boundaries',
  're-reading the solo with the adjudicated phrases',
  'ordering the practice menu',
  'writing the narration',
  'assembling the practice session — the long one',
]

function progressLine(): { element: HTMLElement; stage: (text: string) => void; done: () => void } {
  const box = el('div', 'progress')
  const bar = document.createElement('progress')
  bar.max = AGENT_STAGES.length + 1
  bar.value = 0
  const label = el('span')
  box.append(bar, label)
  return {
    element: box,
    stage: (text) => {
      const at = AGENT_STAGES.indexOf(text)
      bar.value = at === -1 ? bar.value : at + 1
      label.textContent = `${text}…`
    },
    done: () => box.remove(),
  }
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
const OVERLAYS_KEY = 'woodshed.overlays'

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

/** The agent's menu: kept units in its order, the rest behind them, untouched on failure. */
function agentOrder(units: PracticeUnit[], agent: AgentOutput): PracticeUnit[] {
  const order = agent.ranking?.order ?? []
  const position = new Map(order.filter((o) => o.keep).map((o, i) => [o.unitId, i]))
  const cut = new Set(order.filter((o) => !o.keep).map((o) => o.unitId))
  const kept = units.filter((u) => position.has(u.id)).sort((a, b) => position.get(a.id)! - position.get(b.id)!)
  const rest = units.filter((u) => !position.has(u.id) && !cut.has(u.id))
  const cuts = units.filter((u) => cut.has(u.id))
  return [...kept, ...rest, ...cuts]
}

/** Everything model-written is marked agent-sourced; the engine's numbers never move. */
function agentSection(agent: AgentOutput): HTMLElement {
  const box = el('section', 'agent agent-sourced')
  const head = el('div', 'dh')
  head.append(el('h2', undefined, 'What the agent hears'), el('span', undefined, 'model-written; every number is the engine\u2019s'))
  box.append(head)
  for (const p of agent.narration?.overview ?? []) box.append(el('p', undefined, p))
  if (agent.narration?.lookFors.length) {
    box.append(el('small', undefined, 'Look-fors are marked on the score — the amber dots.'))
  }
  if (agent.degraded.length === 4) {
    box.append(el('p', undefined, 'The agent could not be reached — every job fell back to the engine. Check the key, and the browser console for the reason.'))
  } else if (agent.degraded.length) {
    box.append(el('small', undefined, `deterministic path stood for: ${agent.degraded.join(', ')}`))
  }
  return box
}

async function renderResult(result: PipelineResult, xml: string, filename: string): Promise<void> {
  resultBox.replaceChildren()
  resultBox.hidden = false
  landing.hidden = true

  const soloKey = `${soloTitle(result, filename)}:${result.score.notes.length}:${result.score.barCount}`
  const done = doneStore(soloKey)

  // Layout first: OSMD measures its container, so it must be in the document.
  const sheet = el('section', 'sheet')
  // One bar, two lines: what the score marks (line 1), how to read and take
  // it away (line 2). The old split — a colour legend beside a separate
  // checkbox strip — said the same thing twice in two visual languages.
  const controls = el('div', 'controls')
  const goto = el('label', 'field goto')
  const gotoInput = el('input')
  gotoInput.type = 'number'
  gotoInput.min = '1'
  gotoInput.setAttribute('aria-label', 'Go to bar')
  goto.append(el('span', 'field-lbl', 'Go to bar'), gotoInput)
  // The only mark on the score nothing toggles: it follows the selected idea.
  const hl = el('span', 'key hl'); hl.append(el('i'), document.createTextNode('Now practising'))
  const scales = el('label', 'field scales')
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
  scales.append(el('span', 'field-lbl', 'Scales'), scalesSelect)

  // Engine-evidence overlays: opt-in checkboxes for auditing what the
  // detectors guessed, drawn where they guessed it. Choices stick per browser.
  // Each box is styled as the swatch of the mark it toggles, so the row is
  // its own legend — nothing else on the page has to repeat these colours.
  const overlays = el('span', 'overlays')
  const overlaySettings: OverlaySettings = { ...OVERLAY_DEFAULTS }
  try {
    Object.assign(overlaySettings, JSON.parse(localStorage.getItem(OVERLAYS_KEY) ?? '{}'))
  } catch { /* defaults stand */ }
  // 'ticks' draws both the phrase and the idea marks, which is why its swatch
  // is split between the two colours rather than carrying one of them.
  const overlayBoxes: [keyof OverlaySettings, string][] = [
    ['ticks', 'phrases & ideas'],
    ['cells', 'cells'],
    ['devices', 'devices'],
    ['recurring', 'recurring'],
    ['language', 'common language'],
    ['candidates', 'boundary candidates'],
    ['stock', 'stock'],
  ]
  const onOverlayChange: { fn: () => void } = { fn: () => {} }
  for (const [key, label] of overlayBoxes) {
    const wrap = el('label', `ov ov-${key}`)
    const box = document.createElement('input')
    box.type = 'checkbox'
    box.checked = overlaySettings[key]
    box.addEventListener('change', () => {
      overlaySettings[key] = box.checked
      try { localStorage.setItem(OVERLAYS_KEY, JSON.stringify(overlaySettings)) } catch { /* ignore */ }
      onOverlayChange.fn()
    })
    wrap.append(box, el('span', undefined, label))
    overlays.appendChild(wrap)
  }

  const exportButton = button('btn quiet export-annotations', 'Export annotations', () => {})
  const marks = el('div', 'ctl-row ctl-marks')
  marks.append(el('span', 'ctl-lbl', 'Engine marks'), overlays)
  const reading = el('div', 'ctl-row ctl-read')
  reading.append(el('span', 'ctl-lbl', 'Score'), hl, scales, goto, exportButton)
  controls.append(marks, reading)
  const solo = el('div', 'solo')
  sheet.append(controls, solo)

  const deskHost = el('section', 'desk')
  const drawer = el('section', 'drawer')
  drawer.hidden = true
  const drawerHead = el('div', 'dh')
  const drawerTitle = el('h2')
  drawerHead.append(drawerTitle, el('span', undefined, 'ranked by how much of the player is in them; stock scales and arpeggios sink'))
  const drawerScroll = el('div', 'scroll')
  drawer.append(drawerHead, drawerScroll)

  const { button: detailsButton, drawer: detailsBox } = detailsDrawer(result)
  const agent = (result as PipelineResult & { agent?: AgentOutput | null }).agent ?? null
  const agentBox = agent ? agentSection(agent) : null
  // The desk first: the exercises are the work, the transcription the reference.
  resultBox.append(detailsBox, ...blocking(result), ...(agentBox ? [agentBox] : []), deskHost, drawer, sheet)

  const view = await renderScore(solo, result, xml)
  if (agent?.narration?.lookFors.length) view.showLookFors(agent.narration.lookFors, result.units)
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

  onOverlayChange.fn = () => view.showOverlays(overlaySettings)
  view.showOverlays(overlaySettings)

  // Everything on, badged, snapshotted to a standalone file — then the
  // score is put back the way the checkboxes have it.
  exportButton.addEventListener('click', () => {
    const snap = view.exportAnnotations()
    if (snap) {
      const title = soloTitle(result, filename)
      downloadHtml(`${title.replace(/[^\w-]+/g, '-').toLowerCase()}-annotations.html`,
        annotationExportHtml(title, snap.svg, snap.items))
    }
    view.showOverlays(overlaySettings)
  })

  const desk = practiceDesk(deskHost, result, view, done)
  let units = agent?.ranking ? agentOrder(result.units, agent) : result.units
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

/** One solo the site offers; the shape written by `npm run solos:manifest`. */
interface SoloEntry {
  file: string
  title: string
}

/**
 * Solos the site ships with, for a visitor who has no transcription of their
 * own to drop. The control is hidden until the manifest proves it has
 * something to offer — an empty select is a dead control.
 *
 * URLs resolve against `document.baseURI`, never `import.meta.url`: the
 * bundle lives in `assets/`, so module-relative would ask for
 * `/woodshed/assets/solos/…`, and root-absolute would miss the `/woodshed/`
 * subpath Pages serves from.
 */
function soloPicker(): HTMLElement {
  const row = el('label', 'solo-pick')
  row.hidden = true
  const pick = document.createElement('select')
  pick.setAttribute('aria-label', 'Choose a solo')
  const blank = document.createElement('option')
  blank.value = ''
  blank.textContent = '— choose —'
  pick.appendChild(blank)
  row.append(el('span', undefined, 'Or take one of these'), pick)

  const byFile = new Map<string, SoloEntry>()
  pick.addEventListener('change', () => {
    // Hand the keyboard back: a focused select swallows keys the page uses.
    pick.blur()
    const entry = byFile.get(pick.value)
    if (entry) void loadSolo(entry)
  })

  async function loadSolo(entry: SoloEntry): Promise<void> {
    setStatus(`Fetching ${entry.title}…`)
    try {
      const url = new URL(`solos/${encodeURIComponent(entry.file)}`, document.baseURI)
      const res = await fetch(url)
      // A Pages 404 answers with an HTML page; unchecked, it would reach the
      // MusicXML parser and fail there with a baffling message.
      if (!res.ok) throw new Error(`the server answered ${res.status}`)
      await handleBytes(new Uint8Array(await res.arrayBuffer()), entry.file)
    } catch (error) {
      setStatus(null)
      showError(`Could not fetch ${entry.title}`, (error as Error).message)
    }
  }

  void (async () => {
    try {
      const res = await fetch(new URL('solos/manifest.json', document.baseURI))
      if (!res.ok) return
      const entries: unknown = await res.json()
      if (!Array.isArray(entries)) return
      for (const entry of entries as SoloEntry[]) {
        if (typeof entry?.file !== 'string' || typeof entry?.title !== 'string') continue
        byFile.set(entry.file, entry)
        const option = document.createElement('option')
        option.value = entry.file
        option.textContent = entry.title
        pick.appendChild(option)
      }
      // Any failure — missing manifest, bad JSON, nothing listed — leaves the
      // control hidden rather than offering an empty menu.
      row.hidden = byFile.size === 0
    } catch { /* no solos on offer: the drop zone is the whole story */ }
  })()

  return row
}

const landDo = document.getElementById('land-do')!
landDo.append(soloPicker())
// The key belongs with the drop zone: both are things you hand the page.
landDo.append(agentKeyRow())

/**
 * Analyse a score already in memory. Split out of `handleFile` so a solo
 * fetched from `public/solos` — which never becomes a `File` — travels the
 * same path, error handling included.
 */
async function handleBytes(bytes: Uint8Array, name: string): Promise<void> {
  errorBox.hidden = true
  resultBox.hidden = true
  setStatus(`Reading ${name}…`)
  try {
    const key = agentKey()
    let progress: ReturnType<typeof progressLine> | null = null
    if (key) {
      setStatus(null)
      progress = progressLine()
      statusLine.after(progress.element)
      progress.stage(AGENT_STAGES[0])
    }
    const result = key
      ? await runWithAgent(bytes, liveClient(key, { browser: true, model: agentModel() }), (stage) => progress?.stage(stage), agentPersona())
      : run(bytes)
    progress?.done()
    setStatus(null)
    await renderResult(result, readScoreXml(bytes), name)
  } catch (error) {
    setStatus(null)
    document.querySelector('.progress')?.remove()
    if (error instanceof UnsupportedScoreError) {
      showError('This transcription cannot be analysed yet', (error as Error).message)
    } else {
      showError('Could not read this file', (error as Error).message)
    }
  }
}

async function handleFile(file: File): Promise<void> {
  let bytes: Uint8Array
  // Reading the local file can fail on its own (a file moved between the pick
  // and the read); that is the same "could not read this file" to the player.
  try {
    bytes = new Uint8Array(await file.arrayBuffer())
  } catch (error) {
    showError('Could not read this file', (error as Error).message)
    return
  }
  await handleBytes(bytes, file.name)
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
