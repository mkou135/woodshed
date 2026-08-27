# PLAN — chorus-start prior sprint (session 15)

Spec: `docs/superpowers/specs/2026-08-27-chorus-start-prior.md`
Branch: `sprint/chorus-prior-and-design`
Base: `f98a8fe`

## Global Constraints

Copy these verbatim into every dispatch and every review.

- `src/` is DOM-free. Only `app/` may touch the DOM. `tsconfig.json`
  (src-only, no DOM lib) is what enforces it — do not widen its `include`.
- Run tests with **`npm run test:run`**. Bare `npm test` is watch mode and
  hangs the tool call.
- `npm run typecheck` runs `tsc --noEmit` (src) **and**
  `tsc --noEmit -p tsconfig.app.json` (app + scripts + src). Both must pass.
- **Never modify `fixtures/`** — tests assert their exact values.
- External corpora (WJD, Bopland, Omnibook) live in `~/dev/woodshed-data/`
  and **never enter the repo or the bundle**. Derived aggregate statistics
  may be committed with an attribution note. Never commit a lick, a note
  sequence, or a solo title lifted from a corpus.
- Chord quality comes from MusicXML `<kind>`, never the `text` attribute.
- `Score` is immutable; `prepare/` emits `Adjustment[]` and never edits.
- The agent layer judges, never generates.
- Style: no semicolons, single quotes, 2-space indent, ESM with explicit
  `.ts` extensions in imports. Match the surrounding code's comment density
  — this codebase comments the *why*, in prose, and expects it.
- Any accepted parameter or rule change updates `docs/ENGINE_SPEC.md` in
  the same commit.
- Green tests are not evidence the output is good. Every task that changes
  engine behaviour runs the pipeline on a real solo and reads what comes
  out.

## Dependency order

```
T1 (crash fix) ──> T2 (golden) ──┐
                                  ├──> T5 (chorus prior)
T3 (export tests) ────────────────┘
T4 (UI/UX overhaul) ── independent, runs alongside everything
```

T1 → T2 because the golden cannot be generated while three solos crash.
T2 → T5 because the golden's purpose is to show T5's blast radius.
T3 and T4 touch nothing T1/T2/T5 touch.

---

## Task 1 — fix the `corpus:wjd` `events` crash

**Files:** `src/practice/steps/loop.ts`, a new or existing test beside it.

Melids **78** (Potter), **135** (Gillespie) and **189** (Higginbotham) throw
`Cannot read properties of undefined (reading 'events')` at
`src/practice/steps/loop.ts:50`, inside `excerpt`, reached via
`throughStep`. Reproduces at commit `823a4a9`, before the common-language
work — a latent bar-indexing bug, not a regression.

`ensure(b)` returns `undefined` for some bar index. Line 50 is inside the
note-placement loop, where a note whose duration spills past the end of the
excerpt's bar range increments `b` past the last bar `ensure` knows about.
**Diagnose before fixing** — confirm that is the actual mechanism rather
than assuming it.

Reproduce with:
```bash
npm run corpus:wjd 2>&1 | tail -40
```
The WJD lives at `~/dev/woodshed-data/`. If it is missing, say so in your
report and stop — do not fabricate a fix.

**Requirements:**
- Find the real mechanism and state it in your report.
- Fix it so all three melids run.
- Add a regression test that fails before your fix and passes after,
  written from **hand-authored notes** — never a sequence copied from the
  WJD (licensing).
- `npm run corpus:wjd` completes with zero crashes.
- `npm run test:run` and `npm run typecheck` green.

Move the OPEN_QUESTIONS entry "corpus:wjd `events` crash on three solos"
into `docs/DECISIONS.md` with the mechanism and the fix.

**Model:** standard. **Report:** `task-1-report.md`.

---

## Task 2 — a `corpus:wjd` golden file

**Depends on Task 1.** **Files:** `scripts/corpus-wjd.ts`, a new golden
under `goldens/`, a check script or test.

`pipeline.test.ts` pins Blake so a change shows its blast radius. The
456-solo sweep has no such pin: `npm run corpus:wjd` prints numbers nobody
diffs.

**Requirements:**
- `npm run corpus:wjd -- --write-golden` writes `goldens/corpus-wjd.json`:
  per-solo **melid → {findings, units, phrases, ideas}**. Counts only.
  **No titles, no performer names, no note data** — the licensing rule
  permits derived aggregate statistics and nothing else. Head the file with
  an ODbL attribution note for the Weimar Jazz Database.
- `npm run corpus:wjd` without the flag compares against the golden and
  prints a summary: solos unchanged, solos changed (with the deltas), solos
  added or removed. Non-zero exit on any difference, so it can gate.
- It must degrade gracefully when `~/dev/woodshed-data/` is absent — print
  a clear skip, exit 0. This is not a CI gate; it is a local blast-radius
  tool.
- Generate the golden and commit it.
- `npm run test:run` and `npm run typecheck` green.

**Model:** standard. **Report:** `task-2-report.md`.

---

## Task 3 — tests for the annotation export

**Files:** a new `app/export.test.ts`, possibly `app/score.ts`.

`app/export.ts` and `ScoreView.exportAnnotations` shipped in commit
`719a6db` with no tests. The export was verified once by hand in Chrome (32
annotations, 37 badges, one SVG, legend renders, no console errors); that
verification is not repeatable.

**Requirements for `annotationExportHtml`:**
- Given a title, SVG markup and a hand-built `OverlayItem[]` covering every
  vector, it produces a document that: contains the SVG markup verbatim;
  has one section per non-empty vector with the right count in its heading;
  omits sections for vectors with no items; renders every item's id, label,
  where and detail; and renders the full legend.
- **HTML escaping is the load-bearing case.** An item whose label or detail
  contains `<`, `>`, `&` or `"` must appear escaped in the output. Assert
  this — an unescaped label would corrupt the document.
- The `<title>` is set from the title argument.

Vitest runs in a Node environment by default; `annotationExportHtml` is a
pure string function and needs no DOM, so test it directly. Do **not**
introduce jsdom or a browser test runner for this task. If
`exportAnnotations` (which needs a live OSMD render) cannot be unit-tested
without one, say so in your report and test the pure function only —
that is an acceptable outcome, not a failure.

`npm run test:run` and `npm run typecheck` green.

**Model:** cheap. **Report:** `task-3-report.md`.

---

## Task 4 — UI/UX design overhaul

**Files:** `app/` only. Never `src/`.

Runs alongside every other task. The brief is deliberately open: the owner
asked to "see some improvement" and delegated the judgement.

Read `docs/superpowers/briefs/2026-08-27-design-brief.md` — it is the full
brief for this task and supersedes this summary.

**Model:** most capable. **Report:** `task-4-report.md`.

---

## Task 5 — the chorus-start prior

**Depends on Tasks 1 and 2.** **Files:** `src/analyse/segment.ts`,
`src/analyse/index.ts`, `scripts/eval-wjd.ts`, `docs/ENGINE_SPEC.md`,
segmentation tests, possibly `src/pipeline.test.ts`.

Read the spec at `docs/superpowers/specs/2026-08-27-chorus-start-prior.md`
in full. It is the authority; this task text summarises it.

### 5a — wire chorus starts into `eval:wjd` first

`scripts/eval-wjd.ts:82` calls `segment(notes, [], opts)` with an empty
forced list, so the corpus has never scored the chorus rule at all. Derive
chorus starts from the WJD `form` column (`src/ingest/wjd.ts:119-121`
already reads it for rehearsal letters) and pass them in.

**Land this and report the numbers before touching the rule.** The
before/after of "hard wall on 456 solos vs no chorus rule at all" is the
baseline everything else is measured against. If it turns out chorus starts
cannot be derived reliably from the WJD form column, say so with evidence,
and fall back to `eval:owner` + `brackets` as the acceptance harness —
that is a legitimate outcome, recorded, not a reason to stop.

### 5b — the prior

Per spec §3: `wChorus` in `SegmentOptions` (start 0.30), an
`atChorusStart` term in `boundaryCue`, and the `kind: 'structural'` branch
plus `STRUCTURAL_CONFIDENCE` deleted. Find every consumer of
`'structural'` and of the 0.6 confidence before deleting.

### Acceptance (all three, per spec §4)

1. `npm run eval:wjd` phrase F1 within **0.5** of the hard-wall number.
2. `npm run eval:owner` on `annotations/blues-in-all-keys-bob-mintzer.json`:
   the owner's deletions at **13.1, 25.1 and 73.1** are no longer engine
   phrase starts; the chorus boundaries they kept survive.
3. `npm run brackets` does not regress.

Sweep `wChorus` over {0, 0.15, 0.20, 0.25, 0.30, 0.35, 0.45} on
`eval:wjd`, pick by phrase F1, and **disqualify any value that re-breaks
the owner's three deletions regardless of F1**. Put the sweep table in your
report and in ENGINE_SPEC.

Then run `npm run corpus:wjd` and report the golden's diff — that is the
blast radius, and Task 2 exists to give you it.

If `pipeline.test.ts` counts move, explain why in the report and update the
pin deliberately. Never silently.

Update `docs/ENGINE_SPEC.md` (the Segmentation table and the two-levels
paragraph) in the same commit as the code.

**Model:** most capable. **Report:** `task-5-report.md`.

---

## What is NOT in this sprint

- The repetition-binds parallelism term (spec §6).
- The metric/form-position idea term (spec §6).
- The outside-seeding relative threshold — **already implemented**
  (`scripts/viteAnnotate.ts`, `SPICE_MARGIN`, phrase-range confinement,
  dominant handling). Its OPEN_QUESTIONS entry is stale; the controller
  moves it to DECISIONS at the end of the sprint.
