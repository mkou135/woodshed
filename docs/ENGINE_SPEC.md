# ENGINE_SPEC — every rule, parameter and formula in force

Single source of truth for the numbers. **Never quote a value from memory;
re-read this file.** Update on every accepted change, in the same commit as
the code. Each section names the file that implements it — if this file and
the code disagree, that is a bug to fix immediately, in whichever direction
the DECISIONS log supports.

Last updated: 2026-08-24 (session 3).

## Units

- Ticks: 960 per quarter note (`TICKS_PER_QUARTER`, `core/types.ts`).
- Pitch: written MIDI numbers (tenor reads B♭; iReal charts are concert and
  transposed by `instrument.transpose.chromatic` before use).
- `Note.beat`: 0-based quarters within the bar. 1-based only in user-facing
  text.

## Segmentation (`analyse/segment.ts` DEFAULTS)

Boundary strength per gap = min(1, wRest·rest + wLength·length + wLeap·leap):

| parameter | value | meaning |
|---|---|---|
| wRest | 0.6 | rest cue weight |
| wLength | 0.45 | held-note cue weight |
| wLeap | 0.25 | leap cue weight |
| threshold | 0.45 | boundary when total ≥ this |
| minRest | 240 ticks (16th) | below: articulation, rest = 0 |
| fullRest | 960 ticks (quarter) | rest = 1 at/above this |
| lengthFrom | 2 × median duration | held-note cue starts |
| lengthFull | 6 × median duration | held-note cue = 1 (≈3 beats among 8ths) |
| leap | (semitones − 4) / 8, clamped 0–1 | from a 5th, full at a 12th |
| minGroup | 3 notes | GPR 1: smaller groups dissolve weaker edge |
| ideaRest | ∞ (off) | short-rest idea cue over-fires; see DECISIONS |

Two levels: boundary with rest > 0 (or structural, confidence 0.6) ends a
**phrase**; with rest = 0 ends an **idea** within the phrase. A phrase whose
first note is off the eighth grid starts on its quarter-note beat
(`Phrase.onset`). Scores vs Weimar Jazz Database (456 solos,
`npm run eval:wjd`): phrases P 82.3 / R 85.4 / F1 **83.8** (human ceiling
.83); ideas 87.0 / 67.9 / **76.3**.

## Form (`prepare/form.ts`)

- Period: smallest p ≥ 2 with bar-symbol agreement > 0.75 (`MIN_AGREEMENT`),
  absolute root+quality first, then root intervals (`relative`). Needs ≥ 8
  bars with chords.
- Phase, from marks: rehearsal letters if any exist, else double bars
  (`Mark.kind 'double-bar'`, placed at ingest on the bar *after* a
  `light-light` barline; none for the last measure). Phase = residue class
  (mod period) holding the most marks of that kind, ties to the earliest
  mark; choruses start on every bar in that class from the first ≥ 1 (the
  head before the first letter is a chorus; bars before that are an intro).
  `agreesWithMarks` = ≥ 2 marks of either kind in the class. No marks →
  bar 1, `phaseFrom: 'none'`. Rationale: docs/research/notation-conventions.md.
- Adjustment confidence 0.95 when phased by marks, else the agreement.

## Soloist choice (`prepare/soloists.ts`)

Regions come from capitalised single words / "… Solo" text (see
`DIRECTIONS` for the exclusion list). `chooseSoloist` analyses the named
region with the **most notes** (ties → earlier); unnamed only if nothing
is named. Two named regions still raise the blocking adjustment.

## Note context (`analyse/context.ts`, `core/pitch.ts`)

- Chromatic = altered AND not a chord tone (the b7 of a dominant is not
  chromatic).
- Degree tables: major family (minor 3rd = '#9') vs minor family (minor 3rd
  = '3', major 3rd = '#3', b7 = '7', maj7 = 'n7'). Minor family =
  {minor, minor-seventh, minor-major, half-diminished, diminished,
  diminished-seventh}.
- Chords compared by rootPc + quality, never object identity.
- Detectors never match a window that crosses an idea boundary
  (`samePhrase`, which checks `NoteContext.idea`).

## Shape dictionary (`analyse/detectors/shapes.ts`)

Cell length 4. Keyed by degree string AND allowed qualities (not family):
1235/1234/5321 over all major-family; 3572 major/maj7 = "3-5-7-9 upper
structure", dominant = "3-5-b7-9" (as 35b72); 1357 maj = "major-seventh
arpeggio", 135b7 dominant; minor: 1345, 1235, 5321 (all minor-family), 3572
= "major-seventh arpeggio from the b3" (minor/m7 only), 1357 (minor/m7),
13b57 half-diminished. Hits carry intervals **as played** (contour kept).

## Target detector (`analyse/detectors/targets.ts`)

- Window 2–5 notes; target strength ≥ 0.3; last step 1–2 semitones.
- Strength: beat 1/3 +0.4, other integer beat +0.2; longer than next +0.3;
  new harmony (by value) +0.3; degree 3/7/b7 +0.2.
- Not a device: diatonic monotone walk into the target; diatonic approach
  with more than 3 lead notes.
- Hit score = strength·0.5 + (enclosure 0.3 | approach 0.1) +
  min(0.2, chromatics·0.1) − (window−2)·0.03. **Score is used**: it is the
  detector's weight in confidence.

## Recurring (`analyse/detectors/recurring.ts`)

Interval n-grams length 3–6, ≥2 occurrences; trivia (all steps, one
direction) excluded; shorter cells swallowed by longer/overlapping ones.

## Finding confidence (`analyse/index.ts`)

min(1, min(0.6, Σ 0.3·weight_detector) + 0.25 if degrees + 0.15 if >1 span
+ 0.15·chordTrackConfidence). Weight is 1 for shape/recurring, the hit
score for target. Findings below **0.4** are dropped. Labels
(`pipeline.ts`): strong ≥ 0.7, moderate ≥ 0.45.

Merge: pass 1 by identity (degrees+family, else name, else interval
vector); pass 2 by overlap adds detectedBy/weights only, never spans.

## Practice units (`practice/unit.ts`)

- Unit = idea, split at bar lines into parts of ≤ 2 bars (tail of < 3 notes
  joins the previous part).
- Rank = 4·max(confidence) + Σ confidence (distinct names) +
  0.25·Σ occurrences + 0.5 if arrival is a chord tone + 2 if any finding
  has degrees.
- Steps: loop (always), through + write (only with a degree-cell), displace
  (always; placements beat 1, and-of-1, beat 2, pickup; smallest shift
  modulo bar; dropped if a chord-tone arrival stops being one).

## Exercise rendering (`render/musicxml.ts`)

Even eighths (divisions 2) unless `ExerciseBar.events` present, then
divisions 48 per quarter, exact plain/dotted/triplet types, `cue` notes
small. Flats-preferred spelling.

## iReal charts (`practice/ireal.ts`)

`irealb://` only. 50-char block unscramble; one cell = one beat; cells per
bar from T-signature table (T44→4 … T12→4). Quality from the explicit CORE
table + stripped tensions; `7`+`#5` → augmented-seventh, `-7`+`b5` →
half-diminished. Unknown suffix throws with the token. 1,458/1,460 forum
jazz standards parse.

## Verification targets

Blake (`npm run solo`): form 56 bars, chorus starts **9 and 65** (8-bar
intro, head, solo from a pickup at 63); profile regions 63–64, 65–122.
Top finding "major-seventh arpeggio from the b3",
bars 73+77, all three detectors, 12 findings; 18 phrases (numbered in the
score), 21 ideas, 32 practice units, u1 = bars 76–77 with that cell; cycle
exercise bars all ascend. WJD scores as above.
