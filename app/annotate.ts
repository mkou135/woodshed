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

/** `map.notes` keys carry printed bar + 0-based beat; the printed Position is 1-based. */
function buildEntries(m: SoloMap): void {
  noteEntries = []
  for (const [k, nodes] of m.notes) {
    const [barText, beatText] = k.split(':')
    const pos: Position = { bar: Number(barText), beat: Number(beatText) + 1 }
    noteEntries.push({ pos, key: formatPosition(pos), nodes })
  }
}

// ---- boundary ticks ----

function drawTick(entry: NoteEntry, level: 'idea' | 'phrase'): SVGGElement | null {
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
  svg.appendChild(g)
  return g
}

function redrawBoundary(entry: NoteEntry): void {
  const existing = ticks.get(entry.key)
  if (existing) {
    existing.remove()
    ticks.delete(entry.key)
  }
  const level = store?.boundaryAt(entry.pos) ?? null
  if (!level) return
  const g = drawTick(entry, level)
  if (g) ticks.set(entry.key, g)
}

function redrawAllBoundaries(): void {
  for (const g of ticks.values()) g.remove()
  ticks.clear()
  for (const entry of noteEntries) redrawBoundary(entry)
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
  if (res.status === 204 && target === store) saved.classList.remove('dirty')
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
    redrawBoundary(entry)
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
  cancelPending()
  ticks.clear()
  spanNodes = []
  const xml = readScoreXml(bytes)
  sheet.replaceChildren()
  map = await mountScore(sheet, xml)
  buildEntries(map)
  attachHandlers()

  const annRes = await fetch(`/__annotate/annotation/${encodeURIComponent(name)}`)
  store = annRes.status === 200
    ? AnnotationStore.fromJSON(await annRes.json() as AnnotationFile)
    : new AnnotationStore(name)

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
