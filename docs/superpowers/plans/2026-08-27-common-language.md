# Common-Language Identification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Identify common bebop / jazz language in an analysed solo by name (cross-chord lick matcher + longer cells), by corpus share (mined Bopland + WJD table), surface it descriptively, and feed it to the agent layer.

**Architecture:** The shape detector gains cross-chord `LickEntry` matching and 5–8-note cells; a new `src/analyse/language.ts` owns pattern-key building and `languageShare`, consumed by the matcher, `practice/unit.ts` and a new mining script `scripts/corpus-licks.ts` that emits `src/data/corpusLicks.ts`. `Finding.language`/`lickShare` flow to `FindingView`, unit summaries, step rationales and the agent's analysis document.

**Tech Stack:** TypeScript ESM (`.ts` imports, no semicolons, single quotes, 2-space), vitest (`npm run test:run`), node:sqlite for WJD, existing `ingest`/`contextualise`.

**Spec:** `docs/superpowers/specs/2026-08-27-common-language-design.md`

## Global Constraints

- `src/` is DOM-free; corpus files never enter the repo or bundle — only the aggregate table with attribution header.
- Fixtures hand-written only; never quote a Bopland/WJD lick.
- Ranking untouched: `PracticeUnit.stock`, `STOCK_PENALTY`, rank formula unchanged.
- Blake pinned target survives: top finding "major-seventh arpeggio from the b3" bars 73+77, all three detectors.
- Update ENGINE_SPEC.md in the same commit as each accepted behaviour change.
- `npm run test:run`, never bare `npm test`.

---

### Task 1: Lick pattern keys + `languageShare` (`src/analyse/language.ts`)

**Files:**
- Create: `src/analyse/language.ts`, `src/analyse/language.test.ts`
- Create: `src/data/corpusLicks.ts` (stub until Task 5 regenerates)

**Interfaces (Produces):**
- `bucket(q: Quality): 'maj' | 'dom' | 'min' | null` — maj = major/major-seventh; dom = dominant/augmented-seventh; min = the minor family; anything else null.
- `singleKey(degrees: string[], q: Quality): string | null` → `'1 7 b7 6 5@dom'`
- `crossKey(d1: string[], q1: Quality, d2: string[], q2: Quality, rootMove: number): string | null` → `'1 2 3 5@min|3 5 b7 2@dom+5'`
- `languageWindows(ctx: NoteContext[]): { start: number; end: number; key: string }[]` — single-chord runs of 4–8 notes (all same chord by rootPc+quality, all degrees non-null, inside one idea via `samePhrase`) and cross-chord windows spanning exactly one change, 2–4 notes a side.
- `languageShare(ctx: NoteContext[], table?: Record<string, { wjd: number; bop: number }>, solos?: number): number` — per-note max cover of `wjd/solos` over matching windows, mean over notes (mirror of `corpusShare`).
- Stub `src/data/corpusLicks.ts`: `export const LICK_WJD_SOLOS = 0`, `LICK_BOP_LICKS = 0`, `LICK_PATTERNS: Record<string, { wjd: number; bop: number }> = {}`.

- [ ] Write failing tests: key builders (bucket collapse, null on `unknown`), windows on a hand-built `NoteContext[]` (helper constructing contexts via `contextualise` from hand-written notes + chords over Dm7→G7), `languageShare` with an injected table hits 1.0 when one window covers all notes, 0 on empty table.
- [ ] `npm run test:run -- src/analyse/language.test.ts` → FAIL (module missing)
- [ ] Implement module + stub data file
- [ ] Tests pass; `npm run typecheck`
- [ ] Commit `feat: language pattern keys + languageShare`

### Task 2: Cross-chord lick matcher + longer cells (`analyse/detectors/shapes.ts`)

**Files:**
- Modify: `src/analyse/detectors/shapes.ts`, test `src/analyse/detectors/shapes.test.ts`

**Interfaces:**
- `Entry` gains `language?: 'bebop'`; `ShapeHit` gains `language?: 'bebop'` and `lickShare?: number` (WJD share from `LICK_PATTERNS` via `singleKey`/`crossKey`, omitted when absent or `LICK_WJD_SOLOS` 0).
- New `LickEntry { name; segments: { degrees: string[]; qualities: Quality[] }[]; rootMove: number; language: 'bebop' }` with the spec §2 cross-chord entries; new single-chord entries `17b765` bebop dominant descent (dominant), `176b135` bebop major descent (maj), `b9b753` b9 diminished arpeggio descent (dominant), `35b7b9` dominant arpeggio 3 to the b9 (dominant), all `language: 'bebop'`.
- `matchShapes` walks window lengths 8→3 descending; at each length tries licks of that total length, then dictionary cells (`CELL_LENGTHS` → `[8,7,6,5,4,3]`); existing overlap suppression covers both. Lick window: split at the one chord change, degrees + qualities per segment, `B.rootPc === (A.rootPc + rootMove) % 12`, chords actually differ, `samePhrase` across the whole window.

- [ ] Failing tests: ii–V `1235→3572` over Dm7→G7 (D E F A | B D F A) matches as one 8-note hit named `ii–V digital pattern 1235 into 3-5-7-9`, `language: 'bebop'`, and suppresses the inner 1235/35b72 hits; b9 resolution 3-note hit over G7→C (B Ab G); no match when rootMove wrong (G7→B); no match across an idea boundary; bebop dominant descent `1 7 b7 6 5` matches over one G7.
- [ ] Run → FAIL
- [ ] Implement
- [ ] Tests pass; full `npm run test:run` (existing shape tests unchanged)
- [ ] Commit `feat: cross-chord lick matcher + bebop cell entries`

### Task 3: `Finding.language` through analyse + pipeline + CLI

**Files:**
- Modify: `src/analyse/index.ts` (Finding gains `language?: 'bebop'`, `lickShare?: number`; copied from ShapeHit; `absorb` keeps them `into.language ??= from.language`), `src/pipeline.ts` (`FindingView` gains both; `describeFinding` copies), `scripts/run.ts` (print `common language` + share % on such findings)
- Tests: `src/analyse/index.test.ts`, existing pipeline tests

- [ ] Failing tests: analyse of a hand-built ii–V score yields a finding with `language: 'bebop'`; `describeFinding` carries it and the share
- [ ] Run → FAIL, implement, pass
- [ ] Commit `feat: language marker on findings and views`

### Task 4: Unit summary split + step framing

**Files:**
- Modify: `src/practice/unit.ts`, `src/practice/steps/loop.ts`, `src/practice/steps/write.ts`, `app/desk.ts` (copy), tests `src/practice/unit.test.ts`

**Interfaces:**
- `PracticeUnit.stockParts: { run: number; corpus: number; language: number }` (run = `stockShare`, corpus = `corpusShare`, language = `languageShare` over the part's contexts — buildUnits already receives `Analysis`, slice `analysis.contexts`). `PracticeUnit.stock` formula unchanged.
- `UnitSummary.stock` stays; new `UnitSummary.stockKind?: 'scale-run' | 'common-language'`, present when `max(run, corpus, language) ≥ STOCK_SHOWN`; `scale-run` when run is the largest, else `common-language`. Page prints "mostly a scale run" / "mostly common jazz language".
- Loop and write steps: when any unit finding has `language`, append one sentence to the loop rationale / write template: `A standard bebop cliché — worth having in every key; listen for where the player places it.`

- [ ] Failing tests: stockParts computed; stockKind split both ways; framing sentence present only with a language finding
- [ ] Run → FAIL, implement, pass (`STOCK_PENALTY` tests untouched)
- [ ] Commit `feat: common-language unit summary + step framing`

### Task 5: Mining script `scripts/corpus-licks.ts` → `src/data/corpusLicks.ts`

**Files:**
- Create: `scripts/corpus-licks.ts`; Modify: `package.json` (`corpus:licks` script); Regenerate: `src/data/corpusLicks.ts`

**Interfaces (Consumes):** `languageWindows` from Task 1 (mining and runtime share one window/key definition); WJD access copied from `scripts/corpus-freq.ts` plus `contextualise(score.notes, chords)`; Bopland ingest + `chordsFor`/`symbol` copied from `scripts/bench-bopland.ts`.

- Document frequency per corpus: per WJD solo / per Bopland lick, `new Set(languageWindows(ctx).map(w => w.key))`. Keep when `wjd/n ≥ 0.10` or `bop ≥ 8` (tune so the table stays under ~2,000 entries; record final values in ENGINE_SPEC). Header attributes both sources (WJD ODbL; Bopland licks local-only per DECISIONS 2026-08-27) with counts, regeneration command.
- [ ] Write script, run `npm run corpus:licks`, inspect top patterns for sanity (scalar degree runs should dominate; a named lick like `3 5 b7 2@dom` should appear with a plausible share)
- [ ] `npm run test:run` (tests inject tables — must stay green), typecheck
- [ ] Commit `feat: corpus:licks mined lick table (aggregate only)`

### Task 6: Agent document + prompts

**Files:**
- Modify: `src/agent/evidence.ts` (findingLine: ` · common language (in NN% of recorded solos)` when `language`; unitLine: `stock 0.42 (run 0.10, corpus 0.42, language 0.61)`), `src/agent/prompts.ts` (rank: may weigh player's-own vs stock cliché; narrate: may identify clichés by name and point at records), tests `src/agent/evidence.test.ts`

- [ ] Failing tests on both line formats; run → FAIL, implement, pass. Replay fixtures unaffected (verdicts keyed by job, prompt text not asserted).
- [ ] Commit `feat: common-language evidence for the agent`

### Task 7: End-to-end verification + docs

- [ ] `npm run test:run`, `npm run typecheck`, `npm run build` all green; build output contains no corpus filenames beyond the table.
- [ ] `npm run solo -- ~/Documents/MuseScore4/Scores/Hey\ Lock!\ -\ Seamus\ Blake\ Solo\ Transcription.mxl --no-agent`: pinned top finding survives; read every new finding against the score; update `pipeline.test.ts` pins + ENGINE_SPEC verification targets deliberately if counts change.
- [ ] `npm run bench:bopland -- --limit 300`: named-coverage should rise vs. the pre-change run (record both numbers).
- [ ] `npm run corpus:wjd`: no named lick fires in > 60% of solos (else demote to table, per spec §6).
- [ ] ENGINE_SPEC: new sections (lick matcher, corpusLicks table, summary split, agent fields); LEDGER entry; final commit.

## Self-review

Spec coverage: §1→Tasks 1–2, §2→Task 2, §3→Tasks 1+5, §4→Tasks 3–4, §5→Task 6, §6→every task's test steps + Task 7. Placeholders: none (thresholds carry initial values + tuning criterion). Type consistency: `language?: 'bebop'`, `lickShare?: number`, `stockParts`, `stockKind` used identically across Tasks 1–6.
