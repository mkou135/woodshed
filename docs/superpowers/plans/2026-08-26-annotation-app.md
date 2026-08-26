# Annotation App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A dev-only page for blind-marking phrases, ideas, outside spans and drill stars on a transcription, autosaved to `annotations/*.json`, scored by `npm run eval:owner`.

**Architecture:** A second Vite entry (`annotate.html` + `app/annotate.ts`) reuses the OSMD mount extracted from `app/score.ts` and runs no analysis. A Vite dev middleware lists/serves `.mxl` files from `~/dev/woodshed-data/peers` and writes annotation JSON into the repo. DOM-free logic (position codec, annotation store, eval maths) lives in `src/` with unit tests; the page and the eval CLI are thin shells over it.

**Tech Stack:** TypeScript (ESM, `.ts` extensions in imports), Vite 7 dev server, OpenSheetMusicDisplay, vitest, node `--experimental-strip-types` scripts.

**Spec:** `docs/superpowers/specs/2026-08-26-annotation-app-design.md`

## Global Constraints

- `src/` is DOM-free; only `app/` touches the DOM.
- Style: no semicolons, single quotes, 2-space indent, explicit `.ts` extensions in imports.
- Never modify `fixtures/`; never run bare `npm test` — always `npm run test:run`.
- The annotate page must import nothing from `src/analyse/` — blind marking.
- `annotate.html` must NOT be added to build inputs; `npm run build` output stays byte-identical.
- Transcriptions stay in `~/dev/woodshed-data/peers` (never in the repo); annotation JSON is the owner's own and lives in `annotations/` in the repo.
- Position strings are printed bar + 1-based beat, ½ for .5: `"4.4½"` (dialect of `scripts/brackets.json`). Engine `Note.beat` and the OSMD map's key beat are 0-based quarters — always +1 when formatting, −1 when comparing.

---

### Task 1: Position codec in `src/core/position.ts`

`scripts/brackets.ts` has private `parse`/`fmt` for `"4.4½"`. Extract them to a shared, tested module; brackets.ts, the store, the eval and the page all speak this.

**Files:**
- Create: `src/core/position.ts`, `src/core/position.test.ts`
- Modify: `scripts/brackets.ts` (delete its local `parse`/`fmt`, import instead)

**Interfaces:**
- Produces: `interface Position { bar: number; beat: number }` (printed bar, 1-based beat), `parsePosition(s: string): Position`, `formatPosition(p: Position): string`, `positionsClose(a: Position, b: Position, beatsPerBar: number, tolerance: number): boolean`

- [ ] **Step 1: Write the failing test** (`src/core/position.test.ts`)

```ts
import { describe, it, expect } from 'vitest'
import { parsePosition, formatPosition, positionsClose } from './position.ts'

describe('position codec', () => {
  it('round-trips whole, half and dotted beats', () => {
    for (const s of ['4.1', '4.4½', '12.2.25']) {
      expect(formatPosition(parsePosition(s))).toBe(s)
    }
  })
  it('parses ½ and .5 alike', () => {
    expect(parsePosition('4.4½')).toEqual({ bar: 4, beat: 4.5 })
    expect(parsePosition('4.4.5')).toEqual({ bar: 4, beat: 4.5 })
  })
  it('bare bar means beat 1', () => {
    expect(parsePosition('7')).toEqual({ bar: 7, beat: 1 })
  })
  it('positionsClose works across a bar line', () => {
    expect(positionsClose({ bar: 4, beat: 4.5 }, { bar: 5, beat: 1 }, 4, 0.5)).toBe(true)
    expect(positionsClose({ bar: 4, beat: 4 }, { bar: 5, beat: 1 }, 4, 0.5)).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/core/position.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** (`src/core/position.ts`) — move the logic verbatim from `scripts/brackets.ts:48-58` and add `positionsClose` from its `close`:

```ts
/** A spot on the printed page: bar number as printed, 1-based beat, 4.5 = the "and" of 4. */
export interface Position {
  bar: number
  beat: number
}

/** "4.4½" (the owner's notation) or "4.4.5"; a bare "7" is beat 1. */
export function parsePosition(s: string): Position {
  const [b, f = '1', rest] = s.replace('½', '.5').split('.')
  return { bar: Number(b), beat: Number(rest === undefined ? f : `${f}.${rest}`) }
}

export function formatPosition(p: Position): string {
  const whole = Math.floor(p.beat)
  const frac = p.beat - whole
  return `${p.bar}.${whole}${frac === 0 ? '' : frac === 0.5 ? '½' : `.${frac}`}`
}

/** Within `tolerance` beats of each other, bar lines crossed as `beatsPerBar`. */
export function positionsClose(a: Position, b: Position, beatsPerBar: number, tolerance: number): boolean {
  return Math.abs((a.bar - b.bar) * beatsPerBar + (a.beat - b.beat)) <= tolerance
}
```

- [ ] **Step 4: Refactor `scripts/brackets.ts`** — delete its `parse`, `fmt` and `close`, add `import { parsePosition, formatPosition, positionsClose } from '../src/core/position.ts'`, and substitute call sites (`parse(...)` → `parsePosition(...)`, `fmt(...)` → `formatPosition(...)`, `close(a, b, beatsPerBar)` → `positionsClose(a, b, beatsPerBar, TOLERANCE)`).

- [ ] **Step 5: Verify**

Run: `npx vitest run src/core/position.test.ts` — PASS.
Run: `npm run brackets` — same ok/FAIL lines as before the change (run it before starting the task and keep the output to compare).
Run: `npm run test:run && npm run typecheck` — green.

- [ ] **Step 6: Commit** — `git commit -m "refactor: shared printed-position codec"`

---

### Task 2: Annotation store in `src/annotation/store.ts`

DOM-free state: boundary marks that cycle none → idea → phrase → none, two span kinds, serialize/deserialize to the file format.

**Files:**
- Create: `src/annotation/store.ts`, `src/annotation/store.test.ts`

**Interfaces:**
- Consumes: `Position`, `parsePosition`, `formatPosition` from `src/core/position.ts`
- Produces:

```ts
type BoundaryLevel = 'idea' | 'phrase'
interface Span { from: Position; to: Position }
interface AnnotationFile {
  file: string
  phrases: string[]
  ideas: string[]
  outside: { from: string; to: string }[]
  stars: { from: string; to: string }[]
  annotated: string
}
class AnnotationStore {
  constructor(file: string)
  cycleBoundary(p: Position): BoundaryLevel | null   // returns the new state
  boundaryAt(p: Position): BoundaryLevel | null
  addSpan(kind: 'outside' | 'stars', from: Position, to: Position): void
  removeSpanAt(kind: 'outside' | 'stars', p: Position): boolean
  readonly boundaries: Map<string, BoundaryLevel>    // key: formatPosition
  spans(kind: 'outside' | 'stars'): Span[]
  counts(): { phrases: number; ideas: number; outside: number; stars: number }
  toJSON(date: string): AnnotationFile
  static fromJSON(json: AnnotationFile): AnnotationStore
}
```

- [ ] **Step 1: Write the failing test** (`src/annotation/store.test.ts`)

```ts
import { describe, it, expect } from 'vitest'
import { AnnotationStore } from './store.ts'

const p = (bar: number, beat: number) => ({ bar, beat })

describe('AnnotationStore', () => {
  it('cycles a boundary none → idea → phrase → none', () => {
    const s = new AnnotationStore('x.mxl')
    expect(s.cycleBoundary(p(4, 1))).toBe('idea')
    expect(s.cycleBoundary(p(4, 1))).toBe('phrase')
    expect(s.cycleBoundary(p(4, 1))).toBe(null)
    expect(s.boundaryAt(p(4, 1))).toBe(null)
  })
  it('adds and deletes spans; a span is normalised earliest-first', () => {
    const s = new AnnotationStore('x.mxl')
    s.addSpan('outside', p(12, 4), p(12, 2))
    expect(s.spans('outside')).toEqual([{ from: p(12, 2), to: p(12, 4) }])
    expect(s.removeSpanAt('outside', p(12, 3))).toBe(true)
    expect(s.spans('outside')).toEqual([])
  })
  it('round-trips through the file format, positions sorted', () => {
    const s = new AnnotationStore('hey-lock.mxl')
    s.cycleBoundary(p(8, 3.5))
    s.cycleBoundary(p(4, 1))
    s.cycleBoundary(p(4, 1))   // phrase
    s.addSpan('stars', p(73, 1), p(74, 4.5))
    const json = s.toJSON('2026-08-26')
    expect(json).toEqual({
      file: 'hey-lock.mxl',
      phrases: ['4.1'],
      ideas: ['8.3½'],
      outside: [],
      stars: [{ from: '73.1', to: '74.4½' }],
      annotated: '2026-08-26',
    })
    expect(AnnotationStore.fromJSON(json).toJSON('2026-08-26')).toEqual(json)
  })
  it('counts phrases and ideas separately', () => {
    const s = new AnnotationStore('x.mxl')
    s.cycleBoundary(p(1, 1))
    s.cycleBoundary(p(1, 1))
    s.cycleBoundary(p(2, 1))
    expect(s.counts()).toEqual({ phrases: 1, ideas: 1, outside: 0, stars: 0 })
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/annotation/store.test.ts`

- [ ] **Step 3: Implement** (`src/annotation/store.ts`). Internals: `boundaries: Map<string, BoundaryLevel>` keyed by `formatPosition`; spans as `Span[]` per kind, normalised so `from` ≤ `to` (compare `bar * 1000 + beat`); `removeSpanAt` removes the first span whose range contains `p` (inclusive, same ordering). `toJSON` sorts each list by (bar, beat). A phrase mark lives only in `phrases`, never duplicated into `ideas` — the WJD/engine convention that a phrase start is implicitly an idea start is applied at eval time, not in the file.

- [ ] **Step 4: Verify** — `npx vitest run src/annotation/store.test.ts` PASS; `npm run test:run && npm run typecheck` green.

- [ ] **Step 5: Commit** — `git commit -m "feat: annotation store"`

---

### Task 3: Eval maths in `src/annotation/eval.ts`

The matching arithmetic `eval:owner` reports, pure and pinned by tests.

**Files:**
- Create: `src/annotation/eval.ts`, `src/annotation/eval.test.ts`

**Interfaces:**
- Consumes: `Position`, `positionsClose` from `src/core/position.ts`
- Produces:

```ts
interface MatchResult {
  matched: [Position, Position][]   // [owner, engine]
  missed: Position[]                // owner marks the engine lacks
  falseStarts: Position[]           // engine marks the owner lacks
}
matchStarts(owner: Position[], engine: Position[], beatsPerBar: number, tolerance: number): MatchResult
prf(matched: number, missed: number, falseStarts: number): { precision: number; recall: number; f1: number }
```

- [ ] **Step 1: Write the failing test** (`src/annotation/eval.test.ts`)

```ts
import { describe, it, expect } from 'vitest'
import { matchStarts, prf } from './eval.ts'

const p = (bar: number, beat: number) => ({ bar, beat })

describe('matchStarts', () => {
  it('greedy one-to-one within tolerance', () => {
    const r = matchStarts([p(4, 1), p(8, 3)], [p(4, 1.5), p(12, 1)], 4, 0.5)
    expect(r.matched).toEqual([[p(4, 1), p(4, 1.5)]])
    expect(r.missed).toEqual([p(8, 3)])
    expect(r.falseStarts).toEqual([p(12, 1)])
  })
  it('an engine mark matches at most one owner mark', () => {
    const r = matchStarts([p(4, 1), p(4, 1.5)], [p(4, 1)], 4, 0.5)
    expect(r.matched.length).toBe(1)
    expect(r.missed.length).toBe(1)
  })
})

describe('prf', () => {
  it('computes precision, recall, f1', () => {
    const { precision, recall, f1 } = prf(3, 1, 2)
    expect(precision).toBeCloseTo(0.6)
    expect(recall).toBeCloseTo(0.75)
    expect(f1).toBeCloseTo(2 * 0.6 * 0.75 / 1.35)
  })
  it('zero everywhere yields zeros, not NaN', () => {
    expect(prf(0, 0, 0)).toEqual({ precision: 0, recall: 0, f1: 0 })
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/annotation/eval.test.ts`

- [ ] **Step 3: Implement** (`src/annotation/eval.ts`): walk owner marks in order; each takes the nearest unclaimed engine mark within tolerance (`positionsClose`). `prf` guards division by zero.

- [ ] **Step 4: Verify** — test file PASS; `npm run test:run && npm run typecheck` green.

- [ ] **Step 5: Commit** — `git commit -m "feat: annotation eval maths"`

---

### Task 4: Extract `mountScore` from `app/score.ts`

`renderSolo` (app/score.ts:62-89) is already the pure mount — rename and export it, export the types, keep everything else identical.

**Files:**
- Modify: `app/score.ts`

**Interfaces:**
- Produces: `export async function mountScore(container: HTMLElement, xml: string): Promise<SoloMap>` (the current `renderSolo` body, unchanged), `export interface SoloMap`, `export interface StaffSpan`, `export const noteKey`

- [ ] **Step 1: Refactor** — rename `renderSolo` → `mountScore`, add `export` to it, `SoloMap`, `StaffSpan` and `noteKey`; update the one call site in `renderScore` (line 253). No behaviour change.

- [ ] **Step 2: Verify** — `npm run test:run && npm run typecheck && npm run build` green. Manual guard: `npm run dev`, drop the Blake .mxl, confirm score, phrase ticks and highlight render as before (or note it for the end-to-end task if the browser is not available in this session — the annotate page task exercises `mountScore` too).

- [ ] **Step 3: Commit** — `git commit -m "refactor: export mountScore for the annotate page"`

---

### Task 5: Dev middleware `scripts/viteAnnotate.ts`

Serve the peers listing, file bytes and annotation JSON; accept saves. Dev-server-only (`apply: 'serve'`), so the build cannot ship it.

**Files:**
- Create: `scripts/viteAnnotate.ts`
- Modify: `vite.config.ts`
- Create: `annotations/.gitkeep`

**Interfaces:**
- Produces HTTP (all under `/__annotate`, JSON unless noted):
  - `GET /__annotate/files` → `{ name: string, annotated: boolean }[]` — `.mxl`/`.musicxml` in `~/dev/woodshed-data/peers`, `annotated` true when `annotations/<stem>.json` exists
  - `GET /__annotate/file/<name>` → the raw bytes (`application/octet-stream`)
  - `GET /__annotate/annotation/<name>` → the saved `AnnotationFile` JSON, or 404
  - `POST /__annotate/save/<name>` with an `AnnotationFile` body → writes `annotations/<stem>.json` (2-space indent, trailing newline), 204

  `<name>` is the .mxl basename; `<stem>` strips the extension. Reject any `<name>` containing `/` or `..` with 400.

- [ ] **Step 1: Implement** (`scripts/viteAnnotate.ts`):

```ts
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { homedir } from 'node:os'
import type { Plugin } from 'vite'

const PEERS = join(homedir(), 'dev', 'woodshed-data', 'peers')
const ANNOTATIONS = new URL('../annotations/', import.meta.url).pathname

const stem = (name: string): string => name.replace(/\.(mxl|musicxml|xml)$/, '')

/** Dev-only bridge for annotate.html: list peers files, serve bytes, save JSON. */
export function annotatePlugin(): Plugin {
  return {
    name: 'annotate',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__annotate', (req, res) => {
        const [route, raw = ''] = (req.url ?? '').replace(/^\//, '').split('/')
        const name = decodeURIComponent(raw)
        if (name !== basename(name) || name.includes('..')) { res.statusCode = 400; res.end(); return }
        const json = (body: unknown): void => {
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify(body))
        }
        try {
          if (route === 'files') {
            json(readdirSync(PEERS).filter((f) => /\.(mxl|musicxml)$/.test(f)).sort()
              .map((f) => ({ name: f, annotated: existsSync(join(ANNOTATIONS, `${stem(f)}.json`)) })))
          } else if (route === 'file') {
            res.setHeader('content-type', 'application/octet-stream')
            res.end(readFileSync(join(PEERS, name)))
          } else if (route === 'annotation') {
            const path = join(ANNOTATIONS, `${stem(name)}.json`)
            if (!existsSync(path)) { res.statusCode = 404; res.end(); return }
            json(JSON.parse(readFileSync(path, 'utf8')))
          } else if (route === 'save' && req.method === 'POST') {
            let body = ''
            req.on('data', (c) => { body += c })
            req.on('end', () => {
              writeFileSync(join(ANNOTATIONS, `${stem(name)}.json`),
                JSON.stringify(JSON.parse(body), null, 2) + '\n')
              res.statusCode = 204
              res.end()
            })
          } else { res.statusCode = 404; res.end() }
        } catch (error) {
          res.statusCode = 500
          res.end(String(error))
        }
      })
    },
  }
}
```

- [ ] **Step 2: Wire into `vite.config.ts`** — `import { annotatePlugin } from './scripts/viteAnnotate.ts'` and `plugins: [annotatePlugin()]` in the config object. Create empty `annotations/.gitkeep`.

- [ ] **Step 3: Verify by hand** — `npm run dev &`, then:

```bash
curl -s localhost:5173/__annotate/files              # the two/three peers files, annotated:false
curl -s localhost:5173/__annotate/file/mintzer.mxl | head -c 4   # "PK" zip magic
curl -s -o /dev/null -w '%{http_code}' localhost:5173/__annotate/annotation/mintzer.mxl  # 404
curl -s -X POST -d '{"file":"probe.mxl","phrases":[],"ideas":[],"outside":[],"stars":[],"annotated":"x"}' \
  localhost:5173/__annotate/save/probe.mxl           # then: cat annotations/probe.json
curl -s -o /dev/null -w '%{http_code}' 'localhost:5173/__annotate/file/..%2Fpackage.json'  # 400
rm annotations/probe.json
```

Also `npm run build` — succeeds, and `grep -r __annotate dist/` finds nothing.

- [ ] **Step 4: Verify** — `npm run test:run && npm run typecheck` green.

- [ ] **Step 5: Commit** — `git commit -m "feat: annotate dev middleware"`

---

### Task 6: The annotate page

**Files:**
- Create: `annotate.html`, `app/annotate.ts`
- Modify: `app/style.css` (append an `/* ---- annotate ---- */` section)

**Interfaces:**
- Consumes: `mountScore`, `SoloMap`, `StaffSpan`, `noteKey` from `./score.ts`; `el`, `svgEl`, `button` from `./dom.ts`; `AnnotationStore` from `../src/annotation/store.ts`; `Position`, `formatPosition` from `../src/core/position.ts`; `readScoreXml` from `../src/index.ts`; the Task 5 HTTP routes.

- [ ] **Step 1: `annotate.html`** — same skeleton as `index.html` (charset, viewport, stylesheet link) with:

```html
<title>woodshed · annotate</title>
...
<main class="annotate">
  <header class="ann-head">
    <h1>Annotate</h1>
    <select id="pick" aria-label="Choose a transcription"></select>
    <div id="modes" role="toolbar" aria-label="Annotation mode"></div>
    <div id="counts"></div>
    <div id="saved" title="saved"></div>
  </header>
  <p class="ann-help">
    <b>1</b> boundaries: click a note to cycle idea → phrase → off ·
    <b>2</b> outside: click first + last note ·
    <b>3</b> star: click first + last note ·
    click a span to delete · Esc cancels
  </p>
  <div id="drop" class="drop">Drop a transcription here, or pick one above</div>
  <div id="sheet"></div>
</main>
<script type="module" src="./app/annotate.ts"></script>
```

Do NOT touch `vite.config.ts` build inputs — Vite serves the page in dev by URL (`localhost:5173/annotate.html`) without it.

- [ ] **Step 2: `app/annotate.ts`** — the wiring, in this shape:

```ts
// Blind marking: this module may import parse/render helpers but nothing
// from src/analyse — the page must never show the engine's opinion.
```

  - **Load**: on boot, `GET /__annotate/files` fills `#pick` (each option labelled `name` + ` ●` when annotated); picking fetches `/__annotate/file/<name>` → `Uint8Array` → `readScoreXml` → `mountScore(sheet, xml)`. Drag-and-drop onto `#drop` also accepted (same as `index.html`, reading `file.arrayBuffer()`). Then `GET /__annotate/annotation/<name>`; on 200, `AnnotationStore.fromJSON`, else `new AnnotationStore(name)`. Redraw all marks.
  - **Positions**: while iterating `map.notes` entries, parse each key (`bar:beat`, beat 0-based quarters) into `{ bar, beat: keyBeat + 1 }` — the printed 1-based `Position`. Attach one click listener per notehead group carrying its `Position`.
  - **Modes**: `type Mode = 'boundary' | 'outside' | 'stars'`; toolbar buttons labelled `1 boundaries`, `2 outside`, `3 star`; keys 1/2/3 switch, Escape cancels a pending span start. Active button gets class `on`.
  - **Boundary click**: `store.cycleBoundary(pos)`, redraw that position's tick: idea = short blue tick, phrase = full-staff amber tick — reuse the geometry of `tick()` in `score.ts` but implement locally with classes `ann-idea` / `ann-phrase` (no label text needed; keep a `Map<string, SVGGElement>` of drawn ticks to remove/replace on cycle).
  - **Span click**: first click stores the pending `from` and paints the note group with class `pending`; second click `store.addSpan(kind, from, pos)` and redraws spans. Clicking any note inside an existing span of the active kind deletes it (`removeSpanAt`) instead of starting a new one.
  - **Span drawing**: for each span, collect noteheads whose `Position` falls inside it (inclusive), group by system (`map.staves.get(bar).top` — same trick as `highlight()` in score.ts:270-298), and per system draw a rect under the staff: `y = staff.bottom + 6`, `height 5`, `x0/x1` from the noteheads' bboxes, class `ann-outside` or `ann-star`; for stars also a `text` element `★` at `x0 - 14, staff.bottom + 16`.
  - **Counts + save**: after every mutation update `#counts` from `store.counts()` ("14 phrases · 23 ideas · 2 outside · 3 stars"), set `#saved` to unsaved (class `dirty`), and debounce 500 ms → `POST /__annotate/save/<name>` with `store.toJSON(new Date().toISOString().slice(0, 10))`; on 204 clear `dirty`.
- [ ] **Step 3: Styles** (append to `app/style.css`): `.ann-help` muted small text; `.ann-idea rect` blue ~2.5px, `.ann-phrase rect` amber ~3.5px (match the main page's phrase/idea tick colours — read them from the existing `.phrase-tick` / `.idea-tick` rules and reuse the custom properties if any); `.ann-outside` amber translucent fill; `.ann-star` gold; `.pending` outline on the clicked notehead; `#saved` a dot, green when saved, grey+pulse when `dirty`; `#modes button.on` filled.

- [ ] **Step 4: Verify in the browser** (agent-browser skill, or the owner): `npm run dev`, open `localhost:5173/annotate.html`:
  - dropdown lists mintzer + st-thomas (+ hey-lock after Task 8); picking renders the score with no ticks
  - clicking a note cycles idea tick → phrase tick → none; counts update
  - mode 2: two clicks draw an outside underline; clicking inside it deletes it
  - mode 3: same with star glyph; Esc cancels a half-made span
  - after a click, `annotations/<stem>.json` appears within a second and matches the marks; reload restores them
  - no console errors; `npm run build` still green and `dist/` contains no annotate assets

- [ ] **Step 5: Commit** — `git commit -m "feat: annotation page — blind phrase, idea, outside and star marking"`

---

### Task 7: `scripts/eval-owner.ts` + `npm run eval:owner`

**Files:**
- Create: `scripts/eval-owner.ts`
- Modify: `package.json` (add `"eval:owner": "node --experimental-strip-types --no-warnings scripts/eval-owner.ts"`)

**Interfaces:**
- Consumes: `run`, `TICKS_PER_QUARTER` from `src/index.ts`; `writtenBar` from `src/core/bars.ts`; `matchStarts`, `prf` from `src/annotation/eval.ts`; `parsePosition` from `src/core/position.ts`; `boundaryCue`, `DEFAULTS` from `src/analyse/segment.ts`; `AnnotationFile` type from `src/annotation/store.ts`.

- [ ] **Step 1: Implement.** Directories come from `process.env.ANNOTATIONS_DIR` / `process.env.PEERS_DIR`, defaulting to `annotations/` (resolved from the script URL) and `~/dev/woodshed-data/peers`. For each `annotations/*.json` (skip if the .mxl is missing from the peers dir, with a warning):
  - `run(bytes)` → engine **phrase starts** exactly as `engineStarts` in `scripts/brackets.ts:35-46` computes them (copy that function — it is 10 lines and scripts don't import each other), and engine **idea starts** the same way over `analysis.phrases.flatMap((p) => p.ideas)` using each idea's `notes[0]` (`beat + 1`), which includes every phrase's first idea.
  - Owner phrases = `parsePosition` over `phrases`; owner ideas = `phrases` ∪ `ideas` (a phrase start is an idea start — the file never duplicates them).
  - `matchStarts(owner, engine, beatsPerBar, 0.5)` per level; print per-solo and pooled `prf` lines:

```
hey-lock.mxl        phrases P 0.81 R 0.79 F1 0.80 (19 owner / 18 engine)   ideas P 0.74 R 0.66 F1 0.70 (31 / 28)
pooled              phrases P ... R ... F1 ...                             ideas P ... R ... F1 ...
```

  - **`--misses`**: for every missed owner mark and false engine start, locate the note whose printed position (via `writtenBar`, `beat + 1`) is nearest the mark; take `notes = result.analysis.contexts.map((c) => c.note)`, `medianDuration` = median of their durations (copy the 3-line median from `src/analyse/segment.ts:150-154`), and print `boundaryCue(notes, i - 1, medianDuration)` for the gap *before* that note plus the metric position:

```
  missed phrase 6.2½ → gap before n41: rest 0.00 length 0.31 leap 0.13 total 0.17 (threshold 0.45), beat 2.5 of 4
```

  - Outside spans and stars: print each with the engine findings whose printed-bar span overlaps it (`result.findings` — use `describeFinding` for the label), or "no engine finding overlaps". No scoring.
  - Exit 0 always (this is a report, not a gate — `brackets` remains the gate).
- [ ] **Step 2: Fixture check.** Hand-write `/private/tmp/.../scratchpad/eval-owner-check/altissimo-tenor.json` against `fixtures/altissimo-tenor.musicxml` (read the fixture, choose one obviously-correct phrase start and one wrong one), point the script at it with an env override (`ANNOTATIONS_DIR` and `PEERS_DIR` env vars, defaulting to the real paths), and confirm the P/R arithmetic by hand. This is a scratch check, not a committed test — the maths is already pinned by `src/annotation/eval.test.ts`.

- [ ] **Step 3: Verify** — `npm run eval:owner` with no annotation files prints a friendly "no annotations yet" and exits 0. `npm run test:run && npm run typecheck` green.

- [ ] **Step 4: Commit** — `git commit -m "feat: eval:owner scores the engine against the owner's annotations"`

---

### Task 8: Consolidate files, docs, end-to-end

**Files:**
- Modify: `docs/ENGINE_SPEC.md` (Commands + a short "Annotation app" section next to "Owner brackets"), `CLAUDE.md` (commands block: `npm run eval:owner`; one line in the practice/annotation notes), `docs/DECISIONS.md` (append the design decision), `docs/OPEN_QUESTIONS.md` (note that owner annotation now unblocks the departure/ranking label questions; add "what formally scores outside/stars"), `docs/LEDGER.md`
- Filesystem: copy Hey Lock into peers

- [ ] **Step 1: Consolidate** — `cp ~/Documents/MuseScore4/Scores/"Hey Lock! - Seamus Blake Solo Transcription.mxl" ~/dev/woodshed-data/peers/hey-lock.mxl` (copy, not move; the shorter name is what annotations will reference).

- [ ] **Step 2: Docs** — ENGINE_SPEC: commands table gains `eval:owner`; new section documenting the annotation file dialect (shared with brackets), the middleware routes, blind-marking rule, and that `brackets` remains the gate while `eval:owner` is the report. DECISIONS entry dated 2026-08-26 ("Annotation app: blind marking, dev-only, JSON in repo; what would reverse: the tool goes unused or biases differently than screenshots did"). LEDGER entry before this task starts, per protocol.

- [ ] **Step 3: End-to-end** — with the owner or agent-browser: annotate the first line of `hey-lock.mxl` (a few phrases/ideas, one star), confirm `annotations/hey-lock.json` content reads correctly, run `npm run eval:owner --misses` and read the output. `npm run test:run && npm run typecheck && npm run build` all green; `npm run solo` on Blake unchanged.

- [ ] **Step 4: Commit** — `git commit -m "docs: annotation app in spec, decisions, ledger; hey-lock joins peers"`
