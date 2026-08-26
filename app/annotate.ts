// Blind marking: this module may import parse/render helpers but nothing
// from src/analyse — the page must never show the engine's opinion.
import { mountScore } from './score.ts'
import type { SoloMap, StaffSpan } from './score.ts'
import { el, svgEl, button } from './dom.ts'
import { AnnotationStore } from '../src/annotation/store.ts'
import type { AnnotationFile } from '../src/annotation/store.ts'
import { formatPosition } from '../src/core/position.ts'
import type { Position } from '../src/core/position.ts'
import { readScoreXml } from '../src/index.ts'

type Mode = 'boundary' | 'outside' | 'stars'
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
const dropZone = document.getElementById('drop') as HTMLDivElement
const sheet = document.getElementById('sheet') as HTMLDivElement

let map: SoloMap | null = null
let store: AnnotationStore | null = null
let filename: string | null = null
let mode: Mode = 'boundary'

let noteEntries: NoteEntry[] = []
const ticks = new Map<string, SVGGElement>()
let spanNodes: SVGGElement[] = []

let pendingFrom: Position | null = null
let pendingNodes: SVGGElement[] = []

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
  for (const [m, b] of modeButtons) b.classList.toggle('on', m === next)
}

for (const [m, label] of [['boundary', '1 boundaries'], ['outside', '2 outside'], ['stars', '3 star']] as [Mode, string][]) {
  const b = button('', label, () => setMode(m))
  modeButtons.set(m, b)
  modes.appendChild(b)
}
setMode('boundary')

document.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLSelectElement || e.target instanceof HTMLInputElement) return
  if (e.key === '1') setMode('boundary')
  else if (e.key === '2') setMode('outside')
  else if (e.key === '3') setMode('stars')
  else if (e.key === 'Escape') cancelPending()
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

function drawTick(entry: NoteEntry, level: 'idea' | 'phrase', label: string): SVGGElement | null {
  const anchor = entry.nodes[0]
  const svg = anchor?.ownerSVGElement
  const staff = map?.staves.get(entry.pos.bar)
  if (!anchor || !svg || !staff) return null
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
  return g
}

/**
 * Numbering shifts whenever a mark is added or removed earlier in the solo,
 * so every change relabels the lot: phrases count 1..N in playing order, and
 * ideas inside a phrase read n.2, n.3 … (the phrase start itself is idea .1),
 * mirroring the main page. Ideas before the first phrase mark show as 0.n.
 */
function redrawAllBoundaries(): void {
  for (const g of ticks.values()) g.remove()
  ticks.clear()
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
    const g = drawTick(entry, level, label)
    if (g) ticks.set(entry.key, g)
  }
}

// ---- spans ----

function drawSpan(kind: SpanKind, span: { from: Position; to: Position }): void {
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
  }
  for (const { staff, entries } of bySystem.values()) {
    const svg = entries[0]?.nodes[0]?.ownerSVGElement
    if (!svg) continue
    const boxes = entries.flatMap((entry) => entry.nodes.map((n) => n.getBBox()))
    const x0 = Math.min(...boxes.map((b) => b.x))
    const x1 = Math.max(...boxes.map((b) => b.x + b.width))
    const g = svgEl('g')
    g.setAttribute('class', kind === 'outside' ? 'ann-outside' : 'ann-star')
    const rect = svgEl('rect')
    rect.setAttribute('x', String(x0))
    rect.setAttribute('y', String(staff.bottom + 6))
    rect.setAttribute('width', String(x1 - x0))
    rect.setAttribute('height', '5')
    g.appendChild(rect)
    if (kind === 'stars') {
      const text = svgEl('text')
      text.setAttribute('x', String(x0 - 14))
      text.setAttribute('y', String(staff.bottom + 16))
      text.textContent = '★'
      g.appendChild(text)
    }
    svg.appendChild(g)
    spanNodes.push(g)
  }
}

function redrawSpans(): void {
  for (const g of spanNodes) g.remove()
  spanNodes = []
  if (!store) return
  for (const kind of ['outside', 'stars'] as const) {
    for (const span of store.spans(kind)) drawSpan(kind, span)
  }
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
  counts.textContent = `${c.phrases} phrases · ${c.ideas} ideas · ${c.outside} outside · ${c.stars} stars`
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
  if (mode === 'boundary') {
    store.cycleBoundary(entry.pos)
    redrawAllBoundaries()
    updateCounts()
    scheduleSave()
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
  ticks.clear()
  spanNodes = []
  const xml = readScoreXml(bytes)
  sheet.replaceChildren()
  map = await mountScore(sheet, xml)
  buildEntries(map)
  attachHandlers()

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

pick.addEventListener('change', () => {
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

void loadFileList()
