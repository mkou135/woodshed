# SPEC — chorus-start prior, and the sprint around it

Date: 2026-08-27 (session 15). Owner delegated design and execution;
review on completion.

## 1. The problem

`analyse/index.ts` passes `report.form.chorusStarts` into `segment()` as
**forced** boundaries. In `segment()` that produces:

```ts
} else if (forced.has(next.bar) && notes[i].bar !== next.bar && !pickupInto(i + 1)) {
  all.push({ at: i + 1, strength: STRUCTURAL_CONFIDENCE, kind: 'structural' })
}
```

An unconditional wall at every chorus downbeat, at confidence 0.6, with one
exemption (a phrase that opened as a pickup into the chorus bar).

The owner's Blues in All Keys annotation deleted the forced starts at
**13.1, 25.1 and 73.1** — the boundary cue is 0.00 at all three, meaning no
rest at all: Mintzer plays straight through the double bar. The other ~11
chorus boundaries the owner kept. So the rule is right most of the time and
wrong when the line does not breathe — exactly what a prior, not a wall,
models.

## 2. The evidence problem, found while specifying

`scripts/eval-wjd.ts:82` calls `segment(notes, [], opts)` — **an empty
forced-boundary list**. The 456-solo corpus has never scored the chorus
rule in either direction. Tuning a prior against the owner's three
deletions alone would be tuning on three data points.

The WJD carries a `form` column per beat (`src/ingest/wjd.ts:119-121`
already reads it to place rehearsal letters). Chorus starts are derivable
from it. **Wiring that into `eval:wjd` is a prerequisite, not a nicety** —
it is what turns this change from anecdote into measurement, and it is what
the OPEN_QUESTIONS entry always intended ("score against eval:owner blind
files + eval:wjd + brackets").

## 3. The change

### 3.1 Chorus starts become a cue term

`SegmentOptions` gains `wChorus` (default **0.30**). `boundaryCue()` gains
an optional `atChorusStart: boolean` argument; when true the phrase total
becomes:

```
total = min(1, wRest·rest + wLength·length + wLeap·leap + wChorus)
```

The idea total is unchanged — a chorus start is a phrase-level claim.

### 3.2 The wall comes out

The `kind: 'structural'` branch and `STRUCTURAL_CONFIDENCE` are deleted.
A gap at a chorus start now takes the ordinary phrase-boundary path:
`cue.total >= threshold && cue.rest > 0`. Consequences, all intended:

- **Cue 0.00 with no rest** (owner's 13.1 / 25.1 / 73.1): 0.00 + 0.30 =
  0.30 < 0.45, and `rest > 0` fails anyway. No break. ✅
- **A real breath at the chorus top**: an eighth rest gives rest 0.5 →
  0.6·0.5 + 0.30 = 0.60 ≥ 0.45. Breaks. ✅
- **A marginal gap** (16th rest, rest ≈ 0.25): 0.15 + 0.30 = 0.45. Breaks,
  just. This is the band the prior exists to tip.
- The `pickupInto` exemption becomes unnecessary for chorus starts (a
  pickup phrase has no rest at the bar line, so no boundary fires). Delete
  it **only if** no other caller depends on it; otherwise leave it inert
  and say so in the spec.

### 3.3 What "at a chorus start" means

The gap between note `i` and note `i+1` is at a chorus start when
`forced.has(notes[i+1].bar) && notes[i].bar !== notes[i+1].bar` — the same
predicate the wall used. Unchanged, so the population being scored is the
same one.

### 3.4 Confidence

A phrase that broke at a chorus start no longer reports a fixed 0.6; it
reports its actual boosted cue total. `Phrase` consumers that special-cased
`STRUCTURAL_CONFIDENCE` must be found and updated.

## 4. Acceptance

Machine-checkable, all three required:

1. **`npm run eval:wjd`** with chorus starts wired: phrase F1 must not fall
   below the current hard-wall number by more than **0.5**. Report the
   before/after for the hard wall, `wChorus` 0, and `wChorus` 0.30, so the
   prior's value is visible rather than asserted.
2. **`npm run eval:owner`** on the Blues in All Keys file: the three owner
   deletions at 13.1, 25.1 and 73.1 must no longer be engine phrase
   starts, and the ~11 chorus boundaries the owner kept must survive.
3. **`npm run brackets`** must not regress.

`pipeline.test.ts` pins Blake; if its counts move, the move must be
explained in the report and the pin updated deliberately, never silently.

## 5. Tuning

`wChorus` 0.30 is a starting value derived from the arithmetic in §3.2, not
a measured optimum. Sweep it over {0, 0.15, 0.20, 0.25, 0.30, 0.35, 0.45}
on `eval:wjd` and pick by phrase F1, with the owner's three deletions as a
hard constraint (any value that re-breaks them is disqualified regardless
of F1). Record the sweep table in the report and in ENGINE_SPEC.

## 6. Out of scope

The repetition-binds parallelism term and the metric/form-position idea
term are the other two segmenter candidates. They modify the same cue and
are scored on the same harnesses; running any of them concurrently makes
the deltas uninterpretable. **One segmenter change this sprint.**

## 7. The rest of the sprint

Independent of the segmenter, and of each other:

- **The `corpus:wjd` `events` crash.** Melids 78, 135 and 189 throw
  "Cannot read properties of undefined (reading 'events')" at
  `src/practice/steps/loop.ts:50` via `excerpt`. Pre-existing at 823a4a9,
  a latent bar-indexing bug. Fix with a regression test.
- **A `corpus:wjd` golden file.** Per-solo findings/units counts, so a
  segmenter change shows its blast radius the way `pipeline.test.ts` does
  for Blake. Aggregate counts keyed by melid only — no titles, no notes —
  with an ODbL attribution note, per the corpus-licensing rule.
- **Tests for the annotation export.** `app/export.ts` and the
  `exportAnnotations` collector shipped with none.
- **A UI/UX pass over the app.** Open brief: make it better. `app/` only.

## 8. Global constraints (bind every task)

- `src/` is DOM-free. Only `app/` may touch the DOM.
- `npm run test:run` — **never** bare `npm test` (watch mode, hangs).
- `npm run typecheck` now runs both configs; `npm run build` runs it first.
- Never modify `fixtures/`; tests assert their exact values.
- External corpora never enter the repo or the bundle. Derived aggregate
  statistics may, with an attribution note.
- Chord quality comes from MusicXML `<kind>`, never `text`.
- `Score` is immutable; `prepare/` emits `Adjustment[]` and never edits.
- Style: no semicolons, single quotes, 2-space indent, ESM with explicit
  `.ts` extensions in imports.
- Any accepted parameter change updates `docs/ENGINE_SPEC.md` in the same
  commit.
