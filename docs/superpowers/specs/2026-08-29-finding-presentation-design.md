# Finding presentation — what the page says an idea is

2026-08-29. Owner-approved in chat the same day.

## The complaint

The idea head reads, verbatim, on one solo:

> Bars 204–205 · part 2 of 2 · Gmaj7 → C7
> recurring cell [5, -5, 0, 5, -5, 0] with 3 variants recurring cell
> [5, -7, 2] · lands on the b13 · same shape at bars 194, 195, 196, 197,
> 198, 199, 200, 202, 203, 206, 208, 209

Three faults are stacked in it.

1. **The engine prints its internal id as a display name.**
   `analyse/index.ts:162` names an unnamed recurring finding
   `recurring cell [${intervals}]`. That vector is the engine's identity
   for a shape it has no word for. The page already forbids note names —
   "the score shows them" — and an interval vector is the notes with the
   readability removed.
2. **The least informative finding gets the most words.** A recognised
   figure is terse ("major-seventh arpeggio from the b3"); an
   unrecognised one emits two vectors, a variant count, a degree and
   twelve bar numbers.
3. **Everything sits at one altitude.** `desk.ts:104–111` joins cells,
   landing and also-at with `·`, so a player scanning for "what am I
   drilling" reads bar numbers first.

## Not in scope, and worth restating

The twelve consecutive bars are not a formatting problem. They are the
recurring detector correctly finding a figure the player develops across
bars 194–209, and `buildUnits` slicing it into a dozen units that each
cite the other eleven. Collapsing the list makes it readable, not
correct. That is OPEN_QUESTIONS "Repetition binds — `boundaryCue` has no
similarity term" and "Engine 'variations' are vocabulary, not
development", and it wants its own sprint.

## 1. `Finding.name` does not change

It is load-bearing as an **identity**: `mergeByIdentity`
(`analyse/index.ts:225`) compares it, `generate/validity.ts:33,46` matches
on it, `practice/steps/write.ts` looks findings up by it, and exercise
titles embed it. Renaming it would silently change what merges with what.

The one engine change: a vector-named recurring finding carries
`unnamed: true`. That is the engine stating a fact it currently hides —
it detected a shape and has no word for it.

## 2. `src/practice/describe.ts` owns the player-facing voice

DOM-free and pure, so the CLI, the desk and the all-ideas table stop each
composing their own sentence (which is how the registers drifted apart).

- `displayName(finding, teacherNames?)` → the agent's name for that id if
  one exists, else the engine's name, else `null` when `unnamed`.
- `headline(unit, teacherNames?)` → one clause, in priority order:
  1. the strongest named finding's display name;
  2. "A figure the player keeps returning to — the score shows it."
     (an unnamed recurring finding and nothing named);
  3. the existing stock lines — "Mostly common jazz language — the
     language, not the player", "Mostly a scale run — …", "No named
     vocabulary — still the player's idea".
- `detail(unit, teacherNames?)` → the asides as separate lines: `lands on
  the b13`; `3 variants of the same shape`; `also at bars 194–200,
  202–203, 206, 208–209`; any further named cells.

`barSpans` collapses consecutive printed bars into ranges. Twelve numbers
become three tokens — collapsed, not hidden.

`UnitSummary.cells` is **removed** rather than reshaped. The design first
had it carry `{ id, name }[]` so a renderer could substitute agent names;
once the desk, the table and the CLI all call `headline`/`detail`, nothing
reads it, and a second list of finding names is exactly the duplication
that let the registers drift. `headline`/`detail` are computed at render
time and never stored on the unit.

`headline` takes a `terse` flag: the same four fallbacks at table-row
length ("mostly a scale run", "no named vocabulary"), because thirty-four
rows of the full clause read worse than the clause reads once.

## 3. The agent's names reach the page

`Narration.findingNames` is already produced, already filtered to real ids
(`narrate.ts:23`), and currently dies in `scripts/run.ts:136`. Units are
built before `narrate` runs, so substitution happens at render time:
`desk.ts`, `main.ts` (table and Start-here strip) and the CLI header pass
the map to `displayName`. **Per finding, not per verdict** — the prompt
says "each finding worth naming", so partial coverage is normal and the
engine string is the fallback. `FindingView` is **left alone**: nothing on the page reads
`findingViews`, and the overlays and details drawer that do read findings
are the audit view, where the interval vector is the right thing to say.

Keyless runs stay byte-identical to today's engine output apart from this
document's copy changes: with no map, `displayName` is the engine name.

## Page layout

The head becomes a headline plus a `<details>` disclosure:

```
Bars 204–205  (part 2 of 2)        Gmaj7 → C7
A figure the player keeps returning to — the score shows it.
▸ detail
    lands on the b13
    2 recurring cells, 3 variants
    also at bars 194–200, 202–203, 206, 208–209
```

The all-ideas table shows the headline only. The Start-here strip
interpolates the headline instead of `cells[0]`.

The engine overlays and the details drawer are unchanged: they are the
audit view, and an interval vector is the right thing to say there.

## Testing

- `describe.test.ts`: headline priority order, the unnamed case, the range
  collapse, agent-name-wins-with-fallback, per-finding partial coverage.
- Pins that move: `unit.test.ts:74` (`summary.cells` shape), the four
  test-file `summary` literals, `unit.test.ts:67` if `header` changes text.
- No detector, ranking or exercise output changes. This sprint is text.
