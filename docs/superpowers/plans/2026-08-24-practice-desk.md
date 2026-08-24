# Practice Desk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the woodshed page as the "practice desk" the owner approved: full-width score with the current idea highlighted, a tune chip that is never silently wrong, engine data behind Details, and the four steps as a path with a remembered done state.

**Architecture:** `src/` gains one structured field (`PracticeUnit.summary`) so the page never formats note data itself. `app/main.ts` is split into five DOM modules plus `dom.ts`; state lives in closures, no framework. Fonts are self-hosted woff2 files in `app/fonts/`.

**Tech Stack:** TypeScript, Vite, OSMD 2.1, vitest (src only — `app/` is verified in Chrome).

**Spec:** `docs/superpowers/specs/2026-08-24-practice-desk-design.md`

## Global Constraints

- `src/` is DOM-free; only `app/` touches the DOM.
- Every bar number shown is a printed one (`core/bars.ts` `barLabel` / `barRange`).
- Exercise XML for display: `exerciseToMusicXml(ex, instrument, { keyFifths, forDisplay: true })`; download XML omits `forDisplay`.
- Style: no semicolons, single quotes, 2-space indent, explicit `.ts` import extensions.
- `npm run test:run`, never bare `npm test`.
- No CDN: fonts are files under `app/fonts/`.
- Do not modify `fixtures/`.

---

### Task 1: `PracticeUnit.summary` — structured header

**Files:**
- Modify: `src/practice/unit.ts` (interface at ~line 24, `header()` at ~66, build at ~205)
- Test: `src/practice/unit.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface UnitSummary {
    bars: string            // 'Bars 76–77' (printed, capitalised, from barRange)
    chords: string[]        // ['Fm7', 'Bb7'] via chordName
    cells: string[]         // distinct finding names, in order
    landing: string | null  // arrival degree, e.g. '3'
    alsoAt: string[]        // printed bar labels of the unit's findings' other spans, deduped, ascending
    stock: boolean          // stock >= 0.5
  }
  // PracticeUnit gains `summary: UnitSummary`
  ```

- [ ] **Step 1: Write the failing test** — append to `src/practice/unit.test.ts`, using whatever fixture/score the file already builds units from (look for an existing `buildUnits(` call and reuse its arguments):

```ts
it('carries a structured summary the page can lay out', () => {
  const unit = units[0]
  expect(unit.summary.bars).toMatch(/^Bars? \d/)
  expect(unit.summary.chords).toEqual(unit.harmony.map(chordName))
  expect(unit.summary.cells).toEqual([...new Set(unit.findings.map((f) => f.name))])
  expect(unit.summary.landing).toBe(unit.arrival?.degree ?? null)
  expect(unit.summary.stock).toBe(unit.stock >= 0.5)
  for (const label of unit.summary.alsoAt) expect(label).not.toBe(unit.summary.bars)
})
```

- [ ] **Step 2: Run** `npm run test:run -- src/practice/unit.test.ts` — expect FAIL (`summary` undefined).

- [ ] **Step 3: Implement** in `unit.ts`:

```ts
export interface UnitSummary { bars: string; chords: string[]; cells: string[]; landing: string | null; alsoAt: string[]; stock: boolean }

/** Stock share at or above this reads as "mostly a scale run" on the page. */
const STOCK_SHOWN = 0.5

function summary(unit: Omit<PracticeUnit, 'header' | 'summary' | 'steps' | 'rank' | 'id'>, score: Pick<Score, 'repeats'>): UnitSummary {
  const first = unit.notes[0]
  const last = unit.notes[unit.notes.length - 1]
  const inside = new Set<number>()
  for (const n of unit.notes) inside.add(writtenBar(score, n.bar).bar)
  const also = new Set<string>()
  for (const f of unit.findings) for (const s of f.spans) {
    if (!inside.has(writtenBar(score, s.bar).bar)) also.add(barLabel(score, s.bar))
  }
  return {
    bars: barRange(score, first.bar, last.bar, true),
    chords: unit.harmony.map(chordName),
    cells: [...new Set(unit.findings.map((f) => f.name))],
    landing: unit.arrival?.degree ?? null,
    alsoAt: [...also].sort((a, b) => parseInt(a) - parseInt(b)),
    stock: unit.stock >= STOCK_SHOWN,
  }
}
```
Import `barLabel, writtenBar` from `../core/bars.ts`; add `summary: summary(partial, score)` next to `header:` in the build; add `summary: UnitSummary` to the interface; export `UnitSummary` from `src/index.ts` alongside `PracticeUnit`.

- [ ] **Step 4: Run** `npm run test:run` and `npm run typecheck` — all green (292 tests).
- [ ] **Step 5: Commit** `feat: PracticeUnit.summary — structured header for the page`

---

### Task 2: Fonts and stylesheet

**Files:**
- Create: `app/fonts/*.woff2` (8 files, already fetched to `$CLAUDE_JOB_DIR/tmp/fonts/`), `app/fonts/LICENSE.md` (SIL OFL note, three families, source URLs)
- Replace: `app/style.css`
- Modify: `index.html` (landing markup per spec §Landing)

- [ ] **Step 1:** Copy fonts; write LICENSE.md naming Barlow Condensed (Jeremy Tribby), Source Serif 4 (Adobe), JetBrains Mono (JetBrains), all SIL OFL 1.1, latin subsets from Google Fonts.
- [ ] **Step 2:** Write `app/style.css`: the eight `@font-face` rules (`src: url(./fonts/X.woff2) format('woff2')`), tokens from the spec (`--ground --paper --ink --pencil --rule --marker --marker-ink --phrase --idea --warn --warn-bg --ok`), then the component rules from the mockup (`.top .tune .btn .start .sheet .legend .desk-head .idea-no .idea-line .steps .path .pane .ex .drawer .pop .land .drop .then .details`) — port the mockup CSS, dropping the `.frame`/`.note` demo chrome. Keep `.phrase-tick`/`.idea-tick`/`.solo g.hit path` selectors (renamed hit fill to `var(--marker-ink)`), add `.solo rect.hl-bar { fill: var(--marker); opacity: .85 }`.
- [ ] **Step 3:** `index.html`: `<main>` holds `<header id="top" hidden>`, `<section id="landing" class="land">` (h1 WOODSHED, lede, `#drop` with `#file`, the four-step `.then` grid), `#status`, `#error`, `<div id="result" hidden>`.
- [ ] **Step 4:** `npm run dev`, open, confirm the landing renders in the three faces (Chrome screenshot). Commit `feat: practice-desk stylesheet, self-hosted fonts, landing page`.

---

### Task 3: `app/dom.ts` and `app/score.ts`

**Files:**
- Create: `app/dom.ts`, `app/score.ts`
- Source: move from `app/main.ts` — `el`, `download`, `renderNotation`, `renderSolo`, `tick`, `markPhrases`, `unitElements`, `noteKey`, `SoloMap`, `StaffSpan`.

**Interfaces:**
- `dom.ts`: `el(tag, className?, text?)`, `download(name, xml)`, `svgEl(tag)`.
- `score.ts`:
  ```ts
  export interface ScoreView {
    highlight(unit: PracticeUnit | null): void   // marker rect per bar + .hit on noteheads; scrolls first hit into view
    goTo(printedBar: number): void               // scrolls that bar's staff into view
  }
  export async function renderScore(container: HTMLElement, result: PipelineResult, xml: string): Promise<ScoreView>
  export async function renderNotation(container: HTMLElement, xml: string): Promise<void>
  ```
- `highlight` draws one `<rect class="hl-bar">` per printed bar of the unit spanning `staves.get(bar)` (top−12 … bottom+12) from the first hit note's x to the last hit note's x + 14, inserted as the SVG's first child so it sits behind the notes. Previous rects removed on each call.

- [ ] **Step 1:** Create both files; `main.ts` compiles against them (temporary imports). `npm run typecheck` green.
- [ ] **Step 2:** Commit `refactor: app/dom.ts and app/score.ts split out of main.ts`.

---

### Task 4: `app/tune.ts` — chip and picker

**Files:**
- Create: `app/tune.ts` (from `tuneControl` in main.ts)

**Interfaces:**
```ts
export interface TuneChoice { units: PracticeUnit[]; title: string | null }
export function tuneChip(result: PipelineResult, filename: string, onChange: (c: TuneChoice) => void): { chip: HTMLButtonElement; picker: HTMLElement }
```
Behaviour:
- Chip text: confident → `Through · {title} ({key}) · {pct} % ✓ ▾`; else class `unsure`, text `Through · which tune? ▾`; "own changes" → `Through · this solo's changes ▾`.
- Initial: `guessTitle` → `searchTunes(…, 1)`; take it **only if** `inferTransposition(...).confident`; otherwise `onChange({ units: result.units, title: null })` and the unsure chip. (Same rule as today; the difference is the chip is always visible.)
- Picker: `<div class="pop" hidden>`; h3 "Take it through which tune?"; search input seeded with the guess; result rows show `title`, `key`, and the vote: `agreement ≥ 0.5 → "{pct} % of bars agree ✓"` in `--ok`, else `"{pct} % — probably not"` in `--warn`; row "This solo's own changes"; paste input for `irealb://` (localStorage `woodshed.tune` as today). Clicking the chip toggles `hidden`; Escape closes.

- [ ] **Step 1:** Write the module. **Step 2:** Wire into main.ts header temporarily; verify St Thomas shows "which tune?" amber and St. Thomas ranks first with 9x % in the picker. **Step 3:** Commit `feat: tune chip — always visible, amber when the vote is not confident`.

---

### Task 5: `app/details.ts` — drawer

- Create `app/details.ts` exporting `detailsDrawer(result: PipelineResult): { button: HTMLButtonElement; drawer: HTMLElement }`. Move `summarySection`, `profileSection`, non-blocking `adjustmentSections` here; blocking adjustments stay in main (they render inline above the score). Drawer is `<section class="details" hidden>`; button toggles.
- Commit `refactor: engine diagnostics behind a Details drawer`.

---

### Task 6: `app/desk.ts` — idea head, step path, done state

**Files:** Create `app/desk.ts`; create `app/done.ts`.

**Interfaces:**
```ts
// done.ts
export function doneStore(soloKey: string): { has(unitId: string, step: Step['kind']): boolean; mark(unitId, step): void; reset(): void }
// key `woodshed.done.${soloKey}`, JSON array of `${unitId}:${kind}`; try/catch around storage
// desk.ts
export function practiceDesk(host: HTMLElement, result: PipelineResult, view: ScoreView, done: ReturnType<typeof doneStore>): {
  setUnits(units: PracticeUnit[]): void
  select(id: string): Promise<void>
  onSelect(cb: (unit: PracticeUnit, index: number) => void): void
}
```
- Desk head: `.idea-no` `{index+1}<small>of N</small>`; `.where` `{summary.bars} · {summary.chords.join(' → ')}`; `.what` cells as `.cell` spans, `· lands on the {landing}`, `· same shape at bars {alsoAt.join(', ')}`, `· mostly a scale run` when `summary.stock` and no cells. Buttons ‹ Prev, Next ›, All ideas (toggles the drawer, Task 7), Reset (clears done for this solo).
- Step path `<ol class="path">` with the four titles and intents (copy from the spec mockup: "Sing it, then play along with the record from bar {n}." / "Same shape over every chord in {tune} that takes it; all twelve keys." / "Moved in the bar, then your own variations." / "Three lines into the targets; drop the file back to check."). `.on` for current, `.done` when `done.has`.
- Pane: prompt, exercise cards (`.ex` with h3 title, italic rationale except the loop step, "Download MusicXML" link-button, notation rendered lazily on first show via `renderNotation`), write step's template button + file check + verdict (port from today's `stepPanels`). Footer button: `Done — {next title} →` (last step: `Done — next idea →`) marks done and advances; selecting a unit opens its first undone step.
- Commit `feat: practice desk — idea head from unit.summary, step path with remembered done state`.

---

### Task 7: `app/main.ts` — wiring, start-here, all-ideas drawer

- Rewrite `main.ts`: file handling → `run` → header (title from `score.title ?? filename`, instrument name, bar count; chip; Details; New solo = reload landing) → start-here strip (text from unit 1's summary; hidden once `done.mark` fires or a different unit is selected; × dismiss) → blocking adjustments → `.sheet` with legend and `renderScore` → desk → all-ideas `.drawer` table (rank, `summary.bars` without the word, chords, cells / "mostly a scale run"; click selects; selected row `.sel`). `landing` hides when a result shows.
- Delete the old functions from main.ts; `npm run typecheck`, `npm run build`.
- Chrome: Blake (top idea highlighted at 76–77, chip confident), St Thomas (amber chip, picker), Mintzer. Screenshots for the owner.
- Commit `feat: practice-desk page`.

---

### Task 8: Docs

- ENGINE_SPEC: new section "Page (`app/`)" listing the modules, the summary field, the done-state key, the confident-only auto-take rule (already in Tune identification — cross-reference).
- LEDGER entry; HANDOFF "Session 6" paragraph.
- Commit `docs: session 6 page redesign`.

## Self-review
- Spec coverage: header ✓ T4/T7, start-here ✓ T7, blocking inline ✓ T7, score+highlight ✓ T3, desk head ✓ T6, steps ✓ T6, drawer ✓ T7, tune chip/picker ✓ T4, details ✓ T5, state ✓ T6, code shape ✓ T3–7, summary field ✓ T1, fonts ✓ T2.
- Names used consistently: `renderScore`, `ScoreView.highlight/goTo`, `tuneChip`, `detailsDrawer`, `practiceDesk`, `doneStore`, `UnitSummary`.
