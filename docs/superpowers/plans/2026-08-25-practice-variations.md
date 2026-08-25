# Practice Variations & Score Look-fors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild practice steps 2–4 (through-legibility, vary-with-onramps, write-with-worked-examples) and put agent look-fors on the score as tooltips.

**Architecture:** Pure device transforms in `src/practice/variations.ts` feed a new `vary` step (replacing `displace`) and worked examples in `write`. Step kind renames ripple to the agent enum and fixtures. Page work extends `ScoreView` with agent markers/tooltips.

**Tech Stack:** house TS style; vitest; existing `excerpt`, `isValid`, `degreeOf`/`semitonesOfDegree`/`CHORD_TONES` helpers.

**Spec:** `docs/superpowers/specs/2026-08-25-practice-variations-design.md`

## Global Constraints

- All generated notes deterministic; every variation validity-gated (`isValid` for device/cell findings; arrival-degree-unchanged + instrument range always).
- `src/` DOM-free; page work only in `app/`.
- `npm run test:run` only; read Blake output before claiming done.
- On-ramp set (pinning the spec's "replaced or preceded"): all four are *prepended* eighth-note approaches — chord tone below the first note, chord tone above, chromatic step below, chromatic enclosure (above then below). The spec's "connected by step out of the previous chord" is covered by the chord-tone-below ramp when the previous chord's tones coincide; a true cross-chord connect step needs context the unit does not carry and is out of scope.

### Task 1: `variations.ts` device transforms

Create `src/practice/variations.ts` + test. Pure functions over `Note[]` (never mutate):

```ts
export function fragment(notes: Note[], take: 'prefix' | 'suffix'): Note[] | null  // ≥3 notes and strictly shorter, else null
export function augment(notes: Note[], factor: 2 | 0.5): Note[]  // onsets re-spaced from the first onset, durations scaled
export function edit(notes: Note[], keepLast: boolean): { notes: (Note | null)[] } | null
// drop 1–2 middle notes (never first; never last when keepLast) — nulls mark rests, caller renders them
```

- [ ] Failing tests: fragment prefix of 6 = first 3+; fragment of 3 notes → null; augment ×2 doubles every duration and gap; edit keeps first and last, drops 1–2, positions preserved.
- [ ] Implement; `npm run test:run -- src/practice/variations.test.ts`; commit `feat: compositional device transforms`.

### Task 2: `vary` step replacing `displace`

Create `src/practice/steps/vary.ts` (absorb displacement logic from `displace.ts`, delete it; rename `displace.test.ts` → `vary.test.ts` + new tests). Modify `src/practice/unit.ts` (Step type + buildSteps), `app/desk.ts` labels.

```ts
export function varyStep(unit: Omit<PracticeUnit, 'steps'>, score: Score): Extract<Step, { kind: 'vary' }>
// Step: { kind: 'vary'; exercises: Exercise[]; prompt: string }
```

On-ramps: chord = chord under `unit.notes[0]` (last `unit.harmony` entry with `onset <= first.onset`, else first). Candidate approach midis via `CHORD_TONES`/`pitchClass` (nearest chord-tone pc below/above the first note, within range), chromatic `first.midi - 1`, enclosure `[first.midi + 1, first.midi - 1]`. Prepend as eighths ending at `first.onset`; build bars with `excerpt`; keep only ramps where (a) every finding with degrees+quality still passes `isValid` on the new exercise and (b) the last note's `degreeOf` vs its chord is unchanged. Titles name the approach ("From the chord tone below — land the same way"). Displacement: two placements only ('on the "and" of 1', 'as a pickup into beat 1'), titled as variations, prompt gains metronome instructions. Prompt: the arrival-is-identity sentence from the spec.

- [ ] Failing tests: ramp from chord tone below starts on a chord-tone pc below original; enclosure ramp adds two notes; arrival midi of every exercise equals the original last midi; displacement exercises match old displace output for the same unit; kind is 'vary'.
- [ ] Implement; suite; commit `feat: vary step — on-ramps into a fixed arrival`.

### Task 3: agent enum + fixtures rename

Modify `src/agent/verdicts.ts` (`'displace'` → `'vary'` in SessionPlan), `fixtures/agent/blake/construct.json` (u2 steps `["loop","vary"]`, note reworded), construct tests if they name displace.

- [ ] Update; full suite green (pinned pipeline test must still pass); commit `feat: session plans speak vary`.

### Task 4: through provenance

Modify `src/practice/steps/through.ts`: for each cell drill, locate the finding's span inside the unit (`finding.spans` overlapping `[unit.startIndex, unit.endIndex]`), compute 1-based note positions relative to `unit.startIndex`, and append to the drill's `rationale` and the step lines: `"${finding.name} is notes ${a}–${b} of the line (bar ${bar}): the cell isolated from its approach."` Prompt gains one sentence: the cell is the transferable part; the drill installs it under every compatible chord so it stops belonging to one tune.

- [ ] Failing test in `through.test.ts`: rationale/lines contain `notes ` positions for a unit whose finding span is known.
- [ ] Implement; commit `feat: cell drills say where in the line they come from`.

### Task 5: write worked examples

Modify `src/practice/steps/write.ts` (+ its test): Step gains `examples: Exercise[]`; build from `variations.ts` — fragment prefix, augment ×2 (or ÷0.5 when the unit is already long notes: median duration ≥ quarter), edit keepLast — rendered via `excerpt` over `unit.harmony`, titled with device + listening cue from the spec, gate-checked like vary. Prompt prepends "three ways the line already knows how to change — now write a fourth." `app/desk.ts` renders examples above the template (follow how through renders its exercise list).

- [ ] Failing tests: examples present and labelled; a gate-failing device absent; template unchanged.
- [ ] Implement; commit `feat: write step opens with worked variations`.

### Task 6: look-for markers on the score

Modify `app/score.ts`: `ScoreView` gains `showLookFors(lookFors: { unitId: string; text: string }[], units: PracticeUnit[]): void` — for each look-for, find the unit, anchor at its first note's SVG group (same bar:beat map as `highlight`), draw a small amber circle above the staff (clearing chord symbols the way `bandY` measures), class `agent-marker agent-sourced`; click/hover positions one shared HTML tooltip div (`.agent-tip`) with the text; click elsewhere or Escape dismisses. Modify `app/main.ts`: call `view.showLookFors(...)` when agent narration exists; `agentSection` drops the look-for list for the line 'look-fors are marked on the score'. CSS in `app/style.css`.

- [ ] Implement; `npm run build` green; verify in the dev server with the Blake fixtures replayed (AGENT_FIXTURES has no page path — verify with live key if present, else check the no-agent path renders unchanged and the marker code is exercised by a small DOM-free position helper test if practical).
- [ ] Commit `feat: agent look-fors as tooltips on the score`.

### Task 7: docs + read the output

`docs/ENGINE_SPEC.md` practice-units section (vary step, on-ramp set, worked examples, look-for markers), `docs/DECISIONS.md` (owner decision: steps 2–4 redesign, evidence class: owner read + literature), `docs/LEDGER.md`. Run `npm run solo` on Blake and read the vary/write output.

- [ ] Update docs; full suite + typecheck + build; commit `docs: practice variations in spec, decisions, ledger`.
