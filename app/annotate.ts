// Blind marking: this module may import parse/render helpers but nothing
// from src/analyse — the page must never show the engine's opinion.
import { mountScore } from './score.ts'
import type { SoloMap, StaffSpan } from './score.ts'
import { el, svgEl, button } from './dom.ts'
import { AnnotationStore } from '../src/annotation/store.ts'
import type { AnnotationFile } from '../src/annotation/store.ts'
import { formatPosition, parsePosition } from '../src/core/position.ts'
import type { Position } from '../src/core/position.ts'
import { readScoreXml } from '../src/index.ts'

type Mode = 'phrase' | 'idea' | 'outside' | 'stars' | 'variations'
type SpanKind = 'outside' | 'stars'

interface NoteEntry {
  pos: Position
  key: string
  nodes: SVGGElement[]
}

interface FileEntry {
  name: string
  annotated: boolean
}

const pick = document.getElementById('pick') as HTMLSelectElement
const modes = document.getElementById('modes') as HTMLDivElement
const counts = document.getElementById('counts') as HTMLDivElement
const saved = document.getElementById('saved') as HTMLDivElement
const errorBox = document.getElementById('ann-error') as HTMLDivElement
const saveBtn = document.getElementById('save-btn') as HTMLButtonElement
const engineBtn = document.getElementById('engine-btn') as HTMLButtonElement
const scalesBtn = document.getElementById('scales-btn') as HTMLButtonElement

interface EngineSeed {
  phrases: string[]
  ideas: string[]
  outside: { from: string; to: string; confidence: number }[]
  variations: { from: string; to: string }[][]
  stars: { from: string; to: string }[]
  scales: { at: string; name: string; because: string; declared: boolean }[]
}
const dropZone = document.getElementById('drop') as HTMLDivElement
const sheet = document.getElementById('sheet') as HTMLDivElement
const help = document.getElementById('ann-help') as HTMLParagraphElement
const offline = document.getElementById('ann-offline') as HTMLParagraphElement

/**
 * Whether the `/__annotate` routes exist. They are served by `annotatePlugin()`
 * in scripts/viteAnnotate.ts, which is `apply: 'serve'`, so they are present in
 * `npm run dev` and absent from every built bundle — exactly the condition
 * `import.meta.env.DEV` names, and known before the first click rather than
 * after a probe request has raced a dropped file. Without them the page can
 * still read a score, so it says so and stands the dead controls down instead
 * of offering a picker with nothing in it and a save that fails in silence.
 */
const BRIDGE = import.meta.env.DEV

let map: SoloMap | null = null
let store: AnnotationStore | null = null
let filename: string | null = null
let mode: Mode = 'phrase'

let noteEntries: NoteEntry[] = []
let tickNodes: SVGGElement[] = []
let spanNodes: SVGGElement[] = []
let highlightedNodes: SVGGElement[] = []

let pendingFrom: Position | null = null
let pendingNodes: SVGGElement[] = []

/**
 * The variation group new spans join. Entering variations mode (or Escape)
 * clears it, so each visit to the mode marks one fresh group: the idea first,
 * then its variations.
 */
let currentGroup: number | null = null

/**
 * Seed confidence per outside span, keyed by its from-position. Display-only
 * triage for the correction pass — not persisted, gone after a reload.
 */
const outsideConfidence = new Map<string, number>()

let scalesShown = false
let scaleData: EngineSeed['scales'] | null = null
let scaleNodes: SVGGElement[] = []

const spanKind = (m: Mode): SpanKind | null => (m === 'outside' ? 'outside' : m === 'stars' ? 'stars' : null)

/** Same ordering the store uses internally, so "inside this span" agrees with it. */
const order = (p: Position): number => p.bar * 1000 + p.beat

// ---- mode toolbar ----
const modeButtons = new Map<Mode, HTMLButtonElement>()

function cancelPending(): void {
  for (const n of pendingNodes) n.classList.remove('pending')
  pendingFrom = null
  pendingNodes = []
}

function setMode(next: Mode): void {
  mode = next
  cancelPending()
  currentGroup = null
  for (const [m, b] of modeButtons) b.classList.toggle('on', m === next)
}

const MODE_LABELS: [Mode, string][] = [
  ['phrase', '1 phrase'],
  ['idea', '2 idea'],
  ['outside', '3 outside'],
  ['stars', '4 star'],
  ['variations', '5 variations'],
]
for (const [m, label] of MODE_LABELS) {
  const b = button('', label, () => setMode(m))
  modeButtons.set(m, b)
  modes.appendChild(b)
}
setMode('phrase')

document.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLSelectElement || e.target instanceof HTMLInputElement) return
  if (e.key === '1') setMode('phrase')
  else if (e.key === '2') setMode('idea')
  else if (e.key === '3') setMode('outside')
  else if (e.key === '4') setMode('stars')
  else if (e.key === '5') setMode('variations')
  else if (e.key === 'Escape') {
    cancelPending()
    currentGroup = null
  }
})

// ---- positions ----

/**
 * `map.notes`/`map.rests` keys carry printed bar + 0-based beat; the printed
 * Position is 1-based. Rests are clickable too: a pickup rest is often part
 * of the phrase, so a boundary must be markable on it.
 */
function buildEntries(m: SoloMap): void {
  const byKey = new Map<string, NoteEntry>()
  const add = (k: string, nodes: SVGGElement[]): void => {
    const [barText, beatText] = k.split(':')
    const pos: Position = { bar: Number(barText), beat: Number(beatText) + 1 }
    const key = formatPosition(pos)
    const existing = byKey.get(key)
    if (existing) existing.nodes.push(...nodes)
    else byKey.set(key, { pos, key, nodes: [...nodes] })
  }
  for (const [k, nodes] of m.notes) add(k, nodes)
  for (const [k, rest] of m.rests) add(k, [rest])
  noteEntries = [...byKey.values()].sort((a, b) => order(a.pos) - order(b.pos))
}

// ---- boundary ticks ----

function drawTick(entry: NoteEntry, level: 'idea' | 'phrase', label: string): void {
  const anchor = entry.nodes[0]
  const svg = anchor?.ownerSVGElement
  const staff = map?.staves.get(entry.pos.bar)
  if (!anchor || !svg || !staff) return
  const x = anchor.getBBox().x - 10
  const phrase = level === 'phrase'
  const pad = phrase ? 14 : 8
  const g = svgEl('g')
  g.setAttribute('class', phrase ? 'ann-phrase' : 'ann-idea')
  const rect = svgEl('rect')
  rect.setAttribute('x', String(x))
  rect.setAttribute('y', String(staff.top - pad))
  rect.setAttribute('width', phrase ? '3.5' : '2.5')
  rect.setAttribute('height', String(staff.bottom - staff.top + pad * 2))
  rect.setAttribute('rx', '1')
  g.appendChild(rect)
  // Below the staff, like the main page's ticks: above it the label fights
  // chord symbols and bar numbers.
  const text = svgEl('text')
  text.setAttribute('x', String(x))
  text.setAttribute('y', String(staff.bottom + pad + 13))
  text.textContent = label
  g.appendChild(text)
  svg.appendChild(g)
  tickNodes.push(g)
}

/**
 * Numbering shifts whenever a mark is added or removed earlier in the solo,
 * so every change relabels the lot: phrases count 1..N in playing order, and
 * ideas inside a phrase read n.2, n.3 … (the phrase start itself is idea .1),
 * mirroring the main page. Ideas before the first phrase mark show as 0.n.
 */
function redrawAllBoundaries(): void {
  for (const g of tickNodes) g.remove()
  tickNodes = []
  if (!store) return
  let phrase = 0
  let idea = 1
  for (const entry of noteEntries) {
    const level = store.boundaryAt(entry.pos)
    if (!level) continue
    let label: string
    if (level === 'phrase') {
      phrase += 1
      idea = 1
      label = String(phrase)
    } else {
      idea += 1
      label = `${phrase}.${idea}`
    }
    drawTick(entry, level, label)
  }
}

// ---- spans ----

function drawSpan(cls: string, span: { from: Position; to: Position }, label?: string): void {
  if (!map) return
  const lo = order(span.from)
  const hi = order(span.to)
  const bySystem = new Map<number, { staff: StaffSpan; entries: NoteEntry[] }>()
  for (const entry of noteEntries) {
    const v = order(entry.pos)
    if (v < lo || v > hi) continue
    const staff = map.staves.get(entry.pos.bar)
    if (!staff) continue
    const bucket = bySystem.get(staff.top) ?? { staff, entries: [] }
    bucket.entries.push(entry)
    bySystem.set(staff.top, bucket)
    // Outside marks colour the notes themselves — a departure reads best on
    // the noteheads, the underline just keeps it findable in dense passages.
    if (cls === 'ann-outside') {
      for (const n of entry.nodes) {
        n.classList.add('ann-outside-note')
        highlightedNodes.push(n)
      }
    }
  }
  let labelled = false
  for (const { staff, entries } of bySystem.values()) {
    const svg = entries[0]?.nodes[0]?.ownerSVGElement
    if (!svg) continue
    const boxes = entries.flatMap((entry) => entry.nodes.map((n) => n.getBBox()))
    const x0 = Math.min(...boxes.map((b) => b.x))
    const x1 = Math.max(...boxes.map((b) => b.x + b.width))
    const g = svgEl('g')
    g.setAttribute('class', cls)
    // A seeded outside span wears its confidence: pale = check first, ignore
    // last. Owner-added spans (no entry in the map) render at full strength.
    const confidence = cls === 'ann-outside' ? outsideConfidence.get(formatPosition(span.from)) : undefined
    if (confidence !== undefined) {
      g.setAttribute('opacity', String(0.35 + confidence * 0.65))
      const title = svgEl('title')
      title.textContent = `engine seed, ${Math.round(confidence * 100)}% off-scale`
      g.appendChild(title)
    }
    const rect = svgEl('rect')
    rect.setAttribute('x', String(x0))
    rect.setAttribute('y', String(staff.bottom + 6))
    rect.setAttribute('width', String(x1 - x0))
    rect.setAttribute('height', '5')
    g.appendChild(rect)
    if (label !== undefined && !labelled) {
      labelled = true
      const text = svgEl('text')
      text.setAttribute('x', String(x0 - 14))
      text.setAttribute('y', String(staff.bottom + 16))
      text.textContent = label
      g.appendChild(text)
    }
    svg.appendChild(g)
    spanNodes.push(g)
  }
}

/** A, B, … Z, then AA, AB … for the pathological 27th group. */
function groupLetter(g: number): string {
  return g < 26 ? String.fromCharCode(65 + g) : groupLetter(Math.floor(g / 26) - 1) + groupLetter(g % 26)
}

function redrawSpans(): void {
  for (const g of spanNodes) g.remove()
  spanNodes = []
  for (const n of highlightedNodes) n.classList.remove('ann-outside-note')
  highlightedNodes = []
  if (!store) return
  for (const span of store.spans('outside')) drawSpan('ann-outside', span)
  for (const span of store.spans('stars')) drawSpan('ann-star', span, '★')
  store.variations().forEach((group, g) => {
    group.forEach((span, i) => drawSpan('ann-variation', span, `${groupLetter(g)}${i + 1}`))
  })
}

// ---- scales ----

/**
 * The engine's chord scales (chart tensions win, else the function rule),
 * printed under the staff at each chord's first solo note. Clicking one
 * strikes it out: "the solo does not imply this scale" — the owner's filter
 * the failed pitch-content detector never had. Fetched on demand so a file
 * can still be marked without seeing any engine opinion.
 */
function redrawScales(): void {
  for (const g of scaleNodes) g.remove()
  scaleNodes = []
  if (!scalesShown || !scaleData || !store) return
  for (const scale of scaleData) {
    const target = order(parsePosition(scale.at))
    const entry = noteEntries.find((e) => order(e.pos) >= target)
    const anchor = entry?.nodes[0]
    const svg = anchor?.ownerSVGElement
    const staff = entry && map?.staves.get(entry.pos.bar)
    if (!entry || !anchor || !svg || !staff) continue
    const g = svgEl('g')
    g.setAttribute('class', 'ann-scale' + (store.scaleRejected(scale.at, scale.name) ? ' off' : ''))
    const text = svgEl('text')
    text.setAttribute('x', String(anchor.getBBox().x))
    text.setAttribute('y', String(staff.bottom + 34))
    text.textContent = scale.name
    const title = svgEl('title')
    title.textContent = scale.declared ? 'the chart says so' : scale.because
    text.appendChild(title)
    g.appendChild(text)
    g.addEventListener('click', (e) => {
      e.stopPropagation()
      if (!store) return
      store.toggleScaleRejected(scale.at, scale.name)
      g.classList.toggle('off')
      scheduleSave()
    })
    svg.appendChild(g)
    scaleNodes.push(g)
  }
}

async function fetchEngine(name: string): Promise<EngineSeed> {
  const res = await fetch(`/__annotate/engine/${encodeURIComponent(name)}`)
  if (res.status !== 200) throw new Error(`engine run failed (${res.status})`)
  return await res.json() as EngineSeed
}

// ---- errors ----

function showLoadError(): void {
  errorBox.textContent = 'could not load existing annotations — marking disabled for this file'
  errorBox.hidden = false
}

function hideLoadError(): void {
  errorBox.hidden = true
  errorBox.textContent = ''
}

// ---- counts + save ----

function updateCounts(): void {
  if (!store) {
    counts.textContent = ''
    return
  }
  const c = store.counts()
  counts.textContent =
    `${c.phrases} phrases · ${c.ideas} ideas · ` +
    `${c.outside} outside · ${c.stars} stars · ${c.variations} variation groups`
}

async function doSave(target: AnnotationStore, name: string): Promise<void> {
  const body = target.toJSON(new Date().toISOString().slice(0, 10))
  const res = await fetch(`/__annotate/save/${encodeURIComponent(name)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  // Only the still-current file's dot reflects this save; switching files
  // mid-debounce leaves the old file's write to finish silently.
  if (res.status === 204) {
    if (target === store) saved.classList.remove('dirty')
  } else {
    console.warn('annotation save failed', res.status)
  }
}

/**
 * A debounced save in flight. `flush` cancels the timer and runs the save
 * immediately — used both when a *different* file's edit would otherwise
 * clear this timer, and when the page navigates away from this file, so no
 * path ever drops a scheduled write; the worst that happens is one runs early.
 */
interface PendingSave {
  target: AnnotationStore
  name: string
  timer: ReturnType<typeof setTimeout>
  flush(): void
}

let pendingSave: PendingSave | null = null

function scheduleSave(): void {
  if (!store || !filename) return
  const target = store
  const name = filename
  saved.classList.add('dirty')
  if (pendingSave) {
    if (pendingSave.target === target && pendingSave.name === name) {
      // Same file: this is a plain debounce re-arm.
      clearTimeout(pendingSave.timer)
    } else {
      // A different file's save is still owed — flush it now rather than
      // letting this timer's re-arm cancel it outright.
      pendingSave.flush()
    }
  }
  const timer = setTimeout(() => { pendingSave = null; void doSave(target, name) }, 500)
  pendingSave = { target, name, timer, flush: () => { clearTimeout(timer); pendingSave = null; void doSave(target, name) } }
}

// ---- interaction ----

function onNoteClick(entry: NoteEntry): void {
  if (!store) return
  if (mode === 'phrase' || mode === 'idea') {
    store.toggleBoundary(entry.pos, mode)
    redrawAllBoundaries()
    updateCounts()
    scheduleSave()
    return
  }
  if (mode === 'variations') {
    if (store.removeVariationAt(entry.pos)) {
      cancelPending()
      // Removal can renumber groups, so the next span starts a fresh one.
      currentGroup = null
      redrawSpans()
      updateCounts()
      scheduleSave()
    } else if (pendingFrom) {
      currentGroup = store.addVariation(pendingFrom, entry.pos, currentGroup ?? undefined)
      cancelPending()
      redrawSpans()
      updateCounts()
      scheduleSave()
    } else {
      pendingFrom = entry.pos
      pendingNodes = entry.nodes
      for (const n of entry.nodes) n.classList.add('pending')
    }
    return
  }
  const kind = spanKind(mode)
  if (!kind) return
  if (store.removeSpanAt(kind, entry.pos)) {
    cancelPending()
    redrawSpans()
    updateCounts()
    scheduleSave()
    return
  }
  if (pendingFrom) {
    store.addSpan(kind, pendingFrom, entry.pos)
    cancelPending()
    redrawSpans()
    updateCounts()
    scheduleSave()
  } else {
    pendingFrom = entry.pos
    pendingNodes = entry.nodes
    for (const n of entry.nodes) n.classList.add('pending')
  }
}

function attachHandlers(): void {
  for (const entry of noteEntries) {
    for (const node of entry.nodes) {
      node.classList.add('ann-clickable')
      node.addEventListener('click', (e) => {
        e.stopPropagation()
        onNoteClick(entry)
      })
    }
  }
}

// ---- loading ----

async function openScore(bytes: Uint8Array, name: string): Promise<void> {
  // Leaving this file behind must not drop a mark still waiting to be saved.
  pendingSave?.flush()
  filename = name
  // Fail closed for the duration of the load: a throw from the fetch below
  // (dropped connection, malformed JSON) must not leave clicks mutating the
  // previous file's store under the new filename.
  store = null
  cancelPending()
  currentGroup = null
  tickNodes = []
  spanNodes = []
  highlightedNodes = []
  scaleNodes = []
  outsideConfidence.clear()
  scaleData = null
  scalesShown = false
  scalesBtn.classList.remove('on')
  const xml = readScoreXml(bytes)
  sheet.replaceChildren()
  map = await mountScore(sheet, xml)
  buildEntries(map)
  attachHandlers()

  if (!BRIDGE) {
    // Nothing to load and nowhere to save. A null store is already this
    // module's "marking disabled" state — clicks are inert and no tick is
    // drawn — so reading the score is all that is offered, and honestly.
    redrawAllBoundaries()
    redrawSpans()
    updateCounts()
    return
  }

  const annRes = await fetch(`/__annotate/annotation/${encodeURIComponent(name)}`)
  if (annRes.status === 200) {
    store = AnnotationStore.fromJSON(await annRes.json() as AnnotationFile)
    hideLoadError()
  } else if (annRes.status === 404) {
    store = new AnnotationStore(name)
    hideLoadError()
  } else {
    // Anything other than "no annotations yet" (404) could mean the existing
    // file just failed to load — creating a fresh store here would let a
    // later autosave silently overwrite it. Leave clicks inert instead.
    console.error('could not load existing annotations', annRes.status)
    store = null
    showLoadError()
  }

  redrawAllBoundaries()
  redrawSpans()
  updateCounts()
  saved.classList.remove('dirty')
}

async function loadFile(name: string): Promise<void> {
  const res = await fetch(`/__annotate/file/${encodeURIComponent(name)}`)
  const bytes = new Uint8Array(await res.arrayBuffer())
  await openScore(bytes, name)
}

async function loadFileList(): Promise<void> {
  const res = await fetch('/__annotate/files')
  const files = await res.json() as FileEntry[]
  const blank = el('option', undefined, '— choose —')
  blank.value = ''
  pick.replaceChildren(blank)
  for (const f of files) {
    const opt = document.createElement('option')
    opt.value = f.name
    opt.textContent = f.annotated ? `${f.name} ●` : f.name
    pick.appendChild(opt)
  }
}

saveBtn.addEventListener('click', () => {
  if (pendingSave) pendingSave.flush()
  else if (store && filename) void doSave(store, filename)
})

/**
 * Seed start marks from the engine so a long solo is a correction pass, not
 * a from-scratch one. This trades away blind marking for that file — the
 * saved JSON carries `seeded: true` so eval reads it with the bias in mind.
 */
engineBtn.addEventListener('click', async () => {
  if (!store || !filename) return
  const existing = store.counts()
  const marked = existing.phrases + existing.ideas + existing.outside + existing.variations + existing.stars
  if (marked > 0 && !window.confirm(
    `Replace your ${existing.phrases + existing.ideas} start marks, ` +
    `${existing.outside} outside spans, ${existing.stars} stars and ` +
    `${existing.variations} variation groups with the engine's? ` +
    'Struck-out scales stay.',
  )) return
  engineBtn.disabled = true
  try {
    const seed = await fetchEngine(filename)
    scaleData = seed.scales
    store.seedBoundaries(seed.phrases.map(parsePosition), seed.ideas.map(parsePosition))
    store.seedSpans('outside', seed.outside.map((s) => ({ from: parsePosition(s.from), to: parsePosition(s.to) })))
    outsideConfidence.clear()
    for (const s of seed.outside) outsideConfidence.set(formatPosition(parsePosition(s.from)), s.confidence)
    store.seedSpans('stars', seed.stars.map((s) => ({ from: parsePosition(s.from), to: parsePosition(s.to) })))
    store.seedVariations(seed.variations.map((group) =>
      group.map((s) => ({ from: parsePosition(s.from), to: parsePosition(s.to) }))))
    hideLoadError()
    redrawAllBoundaries()
    redrawSpans()
    redrawScales()
    updateCounts()
    scheduleSave()
  } catch (error) {
    errorBox.textContent = `could not seed from engine — ${String(error)}`
    errorBox.hidden = false
  } finally {
    engineBtn.disabled = false
  }
})

scalesBtn.addEventListener('click', async () => {
  if (!store || !filename) return
  if (scalesShown) {
    scalesShown = false
    scalesBtn.classList.remove('on')
    redrawScales()
    return
  }
  scalesBtn.disabled = true
  try {
    scaleData ??= (await fetchEngine(filename)).scales
    scalesShown = true
    scalesBtn.classList.add('on')
    redrawScales()
  } catch (error) {
    errorBox.textContent = `could not fetch scales — ${String(error)}`
    errorBox.hidden = false
  } finally {
    scalesBtn.disabled = false
  }
})

pick.addEventListener('change', () => {
  // Give the keyboard back to the mode shortcuts: a focused select swallows
  // 1–5 (the keydown guard skips them), which read as "the mode is broken".
  pick.blur()
  if (pick.value) void loadFile(pick.value)
})

async function handleDroppedFile(file: File): Promise<void> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  await openScore(bytes, file.name)
}

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
  if (file) void handleDroppedFile(file)
})

if (BRIDGE) {
  void loadFileList()
} else {
  offline.hidden = false
  // Hidden, not disabled: a row of greyed-out buttons and a paragraph of
  // keyboard shortcuts for modes that cannot mark anything is the dead
  // control the notice above exists to replace.
  for (const dead of [pick, modes, counts, saved, saveBtn, engineBtn, scalesBtn, help]) dead.hidden = true
  dropZone.textContent = 'Drop a transcription here to read it'
}
