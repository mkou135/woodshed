# ENGINE_SPEC — every rule, parameter and formula in force

Single source of truth for the numbers. **Never quote a value from memory;
re-read this file.** Update on every accepted change, in the same commit as
the code. Each section names the file that implements it — if this file and
the code disagree, that is a bug to fix immediately, in whichever direction
the DECISIONS log supports.

Last updated: 2026-09-02 (session 21).

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
| articulationSpan | 960 ticks (a beat) | a gap ≤ the note before it, the two together ≤ this: articulation, rest = 0 (an eighth + eighth rest is a staccato quarter; owner's Mintzer brackets) |
| fullRest | 960 ticks (quarter) | rest = 1 at/above this |
| lengthFrom | 2 × median duration | held-note cue starts |
| lengthFull | 6 × median duration | held-note cue = 1 (≈3 beats among 8ths) |
| leap | (semitones − 4) / 8, clamped 0–1 | from a 5th, full at a 12th |
| minGroup | 3 notes | GPR 1: smaller groups dissolve weaker edge — unless the group has a full rest (rest cue 1) or a score edge on both sides *and* a note ≥ lengthFrom × median (a gesture: "F#. B" between half rests) |
| ideaRest | ∞ (off) | short-rest idea cue over-fires; see DECISIONS |
| wIdeaRest / wRhythm | 0 (off) | idea-profile rest and rhythm-change terms; tested, no gain (DECISIONS 2026-08-24) |
| rhythmWindow | 4 | notes each side for the rhythm-change cue |
| ideaThreshold | 0.45 | idea profile (wIdeaRest·rest + wLength·length + wLeap·leap + wRhythm·rhythm) ≥ this opens an idea |
| pickupHeld | 3 × median | pickup gesture: note held ≥ this, then a lone note in the bar's last half-beat landing on the next downbeat → **idea** opens at the pickup (owner's ear on Blake 69→70, 70→71; costs 0.3 WJD idea F1) |
| riffMinStatements | 3 | riff binding needs a **chain**: k adjacent bindable gaps join k+1 statements, and a gap that does not bind — or a chorus boundary, which never does — ends the chain. Two statements are a repeat the ear breathes between (Hey Lock 87.2½, the owner's phrase mark); three are a riff. This is what keeps transposition tolerance from folding every pair of similar gestures into one phrase |
| riffMaxGap | 3 beats | riff binding: a rest ≤ this between two statements of the same figure (`sameFigure`: ≥ 2 notes each, same contour over the first 3 intervals with at least one move, opening durations within 2× — **not** the same starting pitch, since a player who moves the figure is still repeating it; 2026-09-01) ends an **idea**, not a phrase (owner: St Thomas printed 33–41 is one phrase). The two statements are the segments between neighbouring phrase-level boundaries, **except** that when the one before is more than `RIFF_WINDOW_RATIO` = 3 times longer than the one after, it is trimmed to its last n notes, n the length of the one after — a segment that much longer is plainly not one statement, and comparing from its first note made the answer depend on where the previous boundary landed (2026-09-01; WJD unmoved at 80.8, hey-lock phrases 0.81 → 0.84). Trimming *unconditionally* is wrong — where the two are comparable the segment's first note is the figure's first note — see DECISIONS. The 1.4 F1 the rule costs against no riff binding at all predates this and has not been re-run |
| peakMin / peakRatio / peakWindow | 0.35 / 2.5 / 4 | local peak: a gap ≥ peakMin that is the strongest within ±peakWindow gaps and ≥ peakRatio × their mean opens an **idea** (never a phrase) |
| wChorus | 0.45 | chorus-start prior: at a gap into a chorus downbeat the rest gate is lifted and the test is min(1, total + wChorus) ≥ threshold. At 0.45 (= threshold) it always fires, which is the hard wall it replaced; the boundary's confidence is that boosted total, not a constant |

Two levels: phrase-profile total ≥ threshold with rest > 0 ends a
**phrase**; so does a gap into a chorus bar (`forced`, from
`form.chorusStarts`) whose min(1, total + wChorus) ≥ threshold — skipped
when the last rest boundary opened a ≤ 3-note pickup in the last two beats
before the chorus bar. The chorus test sits **fourth** in the if-chain,
after the idea branch, so a chorus-start gap that already reads as an idea
stays one; otherwise idea profile ≥ ideaThreshold, or a local peak, or the
pickup gesture, ends an **idea** within the
phrase. `segment()` takes beats per bar (from `timeSig`) for the pickup test. A phrase whose
first note is off the eighth grid starts on its quarter-note beat
(`Phrase.onset`).

Scores vs Weimar Jazz Database (456 solos, `npm run eval:wjd`), which
since 2026-08-27 passes chorus starts (from `beats.chorus_id`) into
`segment()` instead of an empty list — earlier numbers in this file were
measured with the chorus rule unwired and are not comparable:

| wChorus | phrase P / R / F1 | idea F1 | predicted phrases |
|---|---|---|---|
| unwired (no chorus starts at all) | 81.4 / 83.6 / **82.5** | 77.6 | 10923 |
| 0 | 81.4 / 83.6 / **82.49** | 77.6 | 10923 |
| 0.15 | 81.3 / 83.7 / **82.48** | 77.6 | 10931 |
| 0.20 | 81.2 / 83.7 / **82.4** | 77.5 | 10943 |
| 0.25 | 81.2 / 83.6 / **82.4** | 77.5 | 10950 |
| 0.30 | 81.1 / 83.6 / **82.4** | 77.5 | 10955 |
| 0.35 | 80.9 / 83.6 / **82.2** | 77.4 | 10982 |
| **0.45 (in force)** | 78.1 / 83.7 / **80.8** | 76.5 | 11387 |

The 2026-09-01 riff-binding work moves this table's value in force to
78.3 / 81.2 / **79.7**, ideas 76.5, 11007 predicted phrases against 11387.
The window fix alone was neutral (80.8, 11394); the −1.1 is the cost of
transposition tolerance plus the chain rule, and it is **all recall** — the
engine binds more, the annotators split. That is the same trade as the
original riff-binding decision (2026-08-24, which cost 1.4 F1 on the same
grounds: annotators split riffs 78% of the time), taken again on the same
evidence class. Against the owner's own marks it runs the other way:
hey-lock phrases F1 0.81 → 0.90. Riff binding as a whole now costs roughly
2.5 phrase F1 against no riff binding at all.

Human ceiling on phrases is .83. The corpus prefers the prior off: the
wall costs **1.7 phrase F1** across 456 solos, all of it precision. That
cost is measured with the annotators' own chorus starts (`beats.chorus_id`
— an oracle); the app derives its own from `prepare/form.ts`, so 1.7 is
probably a lower bound on what production pays. The prior is
kept at 0.45 because the owner's own annotated blues says the opposite —
at 0.45 the engine finds all 7 chorus-start phrase marks the owner kept,
at 0 it finds 1 of 7 (DECISIONS 2026-08-27 "Chorus-start prior value").
Everything from 0 to 0.35 behaves alike, because 72% of the corpus's 1188
chorus-start gaps have a cue total of 0.00 and nothing fires until
`wChorus` reaches `threshold`.

`wChorus` moves two things at once — which chorus gaps fire, and the
strength each surviving one carries into `enforceMinimum` — so the F1
deltas are not attributable to the gate alone. The second is a rule change
worth stating carefully, because the ranges matter.

A chorus boundary reaches its branch only after the phrase and idea
branches have both declined the gap, and either way that implies
`total < threshold`: with a rest, because the phrase branch would have
taken it; without one, because `total` and `idea` are then the same number
(`wIdeaRest` and `wRhythm` are both 0) and the idea branch would have. So
a chorus boundary carries a strength in **[0.45, 0.90)** — `threshold` at
the floor, `threshold + wChorus` never reached — where a rest boundary
carries `total` in **[0.45, 1]**. `enforceMinimum` drops the weaker edge
of an undersized group and ties drop the *left* one.

The consequence is conditional, not universal. A chorus boundary with **no
cue at all** sits exactly on the shared floor, so it loses to every rest
neighbour above 0.45 (and on an exact tie only when it is the left edge) —
and that is the common case: 72% of the corpus's chorus-start gaps have a
cue total of 0.00. A chorus gap carrying a partial length or leap cue is
ranked above them and can outlast a rest neighbour; a bare full-rest
boundary is only 0.60. What actually changed is that the chorus edge's
rank stopped being constant: under the wall every chorus boundary sat at
0.6 whatever the music did, beating every rest boundary below 0.6 and
losing to every one above. Now the cue-free ones fall to the floor and the
cue-bearing ones can rise past 0.6. That is why the change moves 19 phrase
starts out and 21 in with F1 unmoved — the identity of the surviving edge
flips, boundaries do not appear or disappear.

Excluding gaps that are
also phrase boundaries, only ~25% of WJD idea boundaries are found; the
rest carry no surface cue (see DECISIONS 2026-08-24).

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
  `agreesWithMarks` = ≥ 2 marks of either kind in the class. No marks and
  bar 1's first note at or after mid-bar (and more bars than one period) →
  bar 1 is a pickup, phase from bar 2, `phaseFrom: 'pickup'`. Else bar 1,
  `phaseFrom: 'none'`. Rationale: docs/research/notation-conventions.md.
- Adjustment confidence 0.95 when phased by marks, else the agreement.

## Soloist choice (`prepare/soloists.ts`)

Regions come from capitalised single words / "… Solo" text (see
`DIRECTIONS` for the exclusion list). `chooseSoloist` analyses the named
region with the **most notes** (ties → earlier); unnamed only if nothing
is named. Two named regions still raise the blocking adjustment. With no
name at all the single `unknown` region spans first → last bar carrying a
note, not 1 → barCount. `emptyStretchCheck` (`prepare/checks.ts`) reports
each run of empty bars between played bars of ≥ one chorus (form period;
`EMPTY_STRETCH_MIN_BARS` 8 without a form) as an info `empty-stretch`
adjustment ("79 empty bars (4 choruses) … another player's solo,
skipped"); the region is not split, because it is the same soloist
returning. `npm run solo` prints every adjustment under the header.

## Note context (`analyse/context.ts`, `core/pitch.ts`)

- Chromatic = altered AND not a chord tone (the b7 of a dominant is not
  chromatic).
- Degree tables: major family (minor 3rd = '#9') vs minor family (minor 3rd
  = '3', major 3rd = '#3', b7 = '7', maj7 = 'n7'). Minor family =
  {minor, minor-seventh, minor-major, half-diminished, diminished,
  diminished-seventh}.
- Chords compared by rootPc + quality, never object identity.
- Detectors never match a window that crosses an idea boundary
  (`samePhrase`, which checks `NoteContext.idea`). **One named exception:**
  the 7-3 resolution detector may cross an idea or phrase boundary when the
  two notes are separated by less than `MIN_REST` (240 ticks) — see below. It
  does not call `samePhrase`; it applies its own gate, so `samePhrase` keeps
  its meaning for every other detector.

## Chord scales (`analyse/chordScale.ts`)

`Analysis.scaleSpans` — one `ScaleSpan` per chord, in order, naming the scale
that chord is played on. **Never inferred from the played notes.** Four
formulations that tried to infer a departure from pitch content were measured
against null models on the WJD and all fired at or below chance (0.66/0.87/0.90/
0.84x); see DECISIONS 2026-08-25 and docs/research/scale-analysis.md §4.

Two rules, in order:

1. **The chart wins** (`declared: true`, because `'the chart says so'`). From
   `Chord.tensions`, which comes from `<kind>`: a dominant or sus carrying ≥ 2 of
   {b9, #9, b13, #5, b5}, or b13 alone → **altered**; else #11 → **Lydian b7**.
   A major or maj7 with #11 → **Lydian**. A minor or m7 with b13 → **Aeolian**.
2. **Otherwise function, not quality** (Nettles & Graf p.92). A **dominant**
   resolving **down a perfect fifth** (the next chord of a different root or
   quality is +5 semitones) → **Mixolydian**; resolving anywhere else, or last in
   the track → **Lydian b7**. Every other quality takes its default: maj/maj7
   Ionian, min/m7 Dorian, minor-major melodic minor, half-diminished Locrian,
   diminished(-seventh) whole-half diminished, augmented(-seventh) whole-tone,
   suspended-fourth Mixolydian. `unknown` produces no span rather than a guess.

Parent collections: major `0 2 4 5 7 9 11`, melodic minor `0 2 3 5 7 9 11`,
whole-tone `0 2 4 6 8 10`, diminished `0 2 3 5 6 8 9 11`. `ScaleSpan.pcs` is the
parent built from `rootPc − mode.offset`; offsets Ionian 0, Dorian 2, Phrygian 4,
Lydian 5, Mixolydian 7, Aeolian 9, Locrian 11, melodic minor 0, Lydian b7 5,
altered 11.

Spelling comes from `Score.keyFifths` — sharps when fifths > 0, flats otherwise,
the same rule the exercise renderer uses, because `Note.midi` carries pitch
classes only.

Blake: 113 spans, **15 declared by the chart** (≈0.12 marks/bar against the
≈0.19 implied-harmony marks/bar counted in Coker). `npm run solo` prints the
first 24.

## Shape dictionary (`analyse/detectors/shapes.ts`)

Stated as **cells** (since 2026-09-02): a `lemma` ("major triad"), a
canonical degree `set` ('135'), the `orders` it permits (omitted = the
canonical order only; a bare triad permits all six), a `name` per ordering
(omitted = the lemma) and the qualities. `CELLS` compiles at load to the
flat `DICTIONARY` the matcher searches — one entry per permitted ordering,
in table order, so `lookup` finds exactly what it found before. Every hit
and every cell finding carries `lemma` and `ordering` ("5-3-1", the degrees
as played); `Finding.name` remains the identity (§ "Naming what a player
sees") and nothing reads the two fields yet.

**Bergonzi cells** (2026-09-02, later the same day): the major-family
`1235` and the minor-family `1345` accept **all 24 orderings**
(`bergonzi()`); the minor `1235` stays canonical, since Bergonzi's minor
set is 1345. The canonical order keeps the bare lemma as its name; any
other order is named "digital pattern 1235 in the order 3-1-2-5". Two
rules keep this honest: (1) **table order resolves collisions** — the
5-3-2-1 descent is listed before the widened 1235, of which it is an
ordering, so `lookup` returns the descent and its lick-table key still
applies; a load-time check throws on any other duplicate degree string
within a quality. (2) **Canonical before permuted at equal length**:
`matchShapes` runs each cell length twice, `lookup(…, canonicalOnly)`
first, so a permuted window that starts earlier cannot swallow a
canonical 1-2-3-5 it overlaps (St Thomas bar 104: Gb A D E Gb A). A bare
triad's six orders are all canonical (`everyOrderCanonical`). Measured:
Blake and St Thomas byte-identical; corpus +37 findings over 7,124, 37
solos moved (+1 to +5, five solos −1 where a permuted cell absorbed a
triad); units, phrases, ideas unmoved; 17 permuted-cell findings across
Blake + the ten peers, none on Blake.

Cell lengths 8 down to 3, longest first; a shorter hit sharing any note
with a longer one is dropped (1357 contains 135; 3-5-1 across two 1235s is
no triad). At equal length, cross-chord licks (below) are tried before
single-chord cells — a lick is the more specific claim. Keyed by degree string AND allowed qualities (not family):
1235/1234/5321 over all major-family; 3572 major/maj7 = "3-5-7-9 upper
structure", dominant = "3-5-b7-9" (as 35b72); 1357 maj = "major-seventh
arpeggio", 135b7 dominant; dominant b9 cells b7#9b91, 3b91, 1b9b7
("dominant b9 cell b7-#9-b9-1" etc., dominant only); minor: 1345, 1235, 5321 (all minor-family), 3572
= "major-seventh arpeggio from the b3" (minor/m7 only), 1357 (minor/m7),
13b57 half-diminished. Triads: 1 3 5 in all six orders, each its own
entry ("major triad 5-3-1" over major-family, "minor triad 5-3-1" over
minor-family; diminished/augmented never match because their 5/3 carry
accidentals). Hits carry intervals **as played** (contour kept).

Named clichés (`language: 'bebop'`, hand-written from the pedagogy
literature, spec 2026-08-27-common-language-design.md): single-chord
17b765 "bebop dominant descent", 176b135 "bebop major descent" (maj),
b9b753 "b9 diminished arpeggio descent", 35b7b9 "dominant arpeggio 3 to
the b9" (all dominant unless noted). Cross-chord `LickEntry` — two
segments, each with degrees + qualities on its own chord, second root =
first + `rootMove` (mod 12), whole window inside one idea: "dominant b9
resolution" (3 b9 | 5, dom→major-family, +5), "ii–V digital pattern 1235
into 3-5-7-9" (min→dom, +5) and its V-of-V twin (dom→dom, +5). The
3-note b9 resolution still takes `SHORT_CELL_FACTOR` by the existing
degrees-length rule. Hits (and Findings/FindingViews) carry `language`
and, when the mined table has the pattern, `lickShare` = its WJD document
share.

## Common language (`analyse/language.ts`, `src/data/corpusLicks.ts`)

Exact degree-pattern matching only — never inference from pitch content
(DECISIONS 2026-08-25 stands; DECISIONS 2026-08-27 "Corpus-derived lick
table" and "Common-language identification"). Keys: quality collapsed to
maj/dom/min buckets; single-chord windows of 4–8 notes
(`'1 7 b7 6 5@dom'`), windows spanning exactly one chord change with 2–4
notes a side (`'1 2 3 5@min|3 5 b7 2@dom+5'`); windows never cross an
idea boundary or a null degree. `npm run corpus:licks` mines document
frequency per WJD solo and per Bopland treble-clef lick (locally, from
`~/dev/woodshed-data`) and writes the aggregate table with attribution:
441 solos + 1,785 licks, keep at WJD share ≥ **0.10** or Bopland count ≥
**8**, 1,291 patterns kept (115 cross-chord). `languageShare(ctx)` =
per-note max WJD share of any covering window, mean over notes — the
degree-aware mirror of `corpusShare`.

Surfacing is descriptive only, ranking untouched:
`PracticeUnit.stockParts` = { run: stockShare, corpus: corpusShare,
language: languageShare }; `stock` (and `STOCK_PENALTY`) remains
max(run, corpus). `UnitSummary.stockKind` (at `STOCK_SHOWN` 0.5 over any
part): 'scale-run' when run dominates, else 'common-language' ("mostly
common jazz language" on the page). Loop rationale and Write prompt gain
one framing sentence when a unit finding carries `language`. The CLI
prints "common language (in N% of recorded solos)". The agent's analysis
document carries the per-finding language marker + share and the per-unit
stock split; rank/narrate prompts may weigh and name them (judging only).

## Target detector (`analyse/detectors/targets.ts`)

- Window 2–5 notes; target strength ≥ 0.3; last step 1–2 semitones.
- Strength: beat 1/3 +0.4, other integer beat +0.2; longer than next +0.3;
  new harmony (by value) +0.3; degree 3/7/b7 +0.2.
- Not a device: diatonic monotone walk into the target; diatonic approach
  with more than 3 lead notes.
- Hit score = strength·0.5 + (enclosure 0.3 | approach 0.1) +
  min(0.2, chromatics·0.1) − (window−2)·0.03. **Score is used**: it is the
  detector's weight in confidence.

## 7-3 resolution (`analyse/detectors/resolutions.ts`)

Coker's device: the b7 of a chord falls to the 3 of the chord a fourth above
it. The only detector whose subject is a chord *change* rather than notes
against a chord. Design: `docs/superpowers/specs/2026-09-01-7-3-resolution-design.md`.

For each **adjacent** pair of contexts `i`, `i+1`, all five must hold:

1. both notes carry a chord;
2. `a.degree` is `'b7'` or `'7'` (the minor family labels the b7 as `'7'`)
   and `b.degree` is `'3'`;
3. `b.chord.rootPc === (a.chord.rootPc + ROOT_MOVE) % 12`, `ROOT_MOVE` = **5**
   — the house convention for "resolves down a fifth". Because +5 ≠ 0, this
   also rejects the same chord;
4. the fall `a.midi − b.midi` is **1 or 2** semitones, read off the MIDI
   numbers and never inferred from the degree pair: V7 → Imaj is `b7`|`3` and
   a half step, V7 → i minor is `b7`|`3` and a whole step;
5. the pair sits in one idea, **or** crosses an idea/phrase boundary with a
   gap below `MIN_REST` = `TICKS_PER_QUARTER / 4` = **240 ticks** — the same
   threshold `segment.ts` uses to call a gap articulation rather than a rest.
   Stated as a musical condition, not a detector privilege: a resolution is
   legato or it is not one.

Named from the quality pair, because the pair says what the device is *for*.
Dominant family = {dominant, augmented-seventh}; major = {major,
major-seventh}; minor family as in "Note context".

| first chord | second chord | name |
|---|---|---|
| minor | dominant | `ii–V 7-3 resolution` |
| dominant | dominant | `V-of-V 7-3 resolution` |
| dominant | major | `V–I 7-3 resolution` |
| dominant | minor | `V–i 7-3 resolution` |
| anything else at +5 | | `7-3 resolution` |

Findings: `kind: 'device'`, `detectedBy: ['resolution']`, weight **1**,
`degrees: [a.degree, '3']`, `quality` from the first chord, `intervals` the
played step. Two degrees, so `SHORT_CELL_FACTOR` applies and confidence lands
**0.455** for a single span, **0.553** with the repeat bonus — moderate, and
structurally unable to outrank a full figure at 1.00.

`FindingSpan.resolves?: true` — `markResolvingSpans` runs after the merge and
marks any span of a **cell** finding that ends on a resolving 7 or on the note
immediately before one (Ligon's outlines 2 and 3). Per span, not per finding.
`describe.ts:detail()` prints *its 7 falls to the 3 of the next chord*.

Deliberately out: anticipated resolutions (the 3 must onset under the new
chord), non-adjacent resolutions, and any scale-walk exclusion — a descending
line still resolves (design D6).

## Recurring (`analyse/detectors/recurring.ts`)

Interval n-grams length 3–6, ≥2 occurrences; trivia (all steps, one
direction) excluded; shorter cells swallowed by longer/overlapping ones.

Variant families (`variantOf`): cells of length ≥ `variantMinLength` 4
join a family when, against the family **head** (most frequent exact form,
earliest on a tie — never chained), they are its exact inversion or differ
in exactly one interval by ≤ `bend` 2 semitones with the sign kept. A
family counts with ≥ 2 occurrences in total, so A → A′ → A″ with no exact
repeat is found. Finding keeps the head's `intervals` (generators unchanged)
and all spans; `Finding.variants` / `FindingView.variants` carry the rest.

## Finding confidence (`analyse/index.ts`)

min(1, min(0.6, Σ 0.3·weight_detector) + 0.25 if degrees + 0.15 if >1 span
+ 0.15·chordTrackConfidence), then × `SHORT_CELL_FACTOR` **0.65** when the
finding is a degree cell of fewer than 4 notes (a bare triad is stock by
definition and never scores as a full figure; without this a 17-note
mostly-scalar unit at Blake 74–75 outranked the maj7 figure). Weight is 1
for shape/recurring/resolution, the hit score for target. Findings below **0.4** are dropped. Labels
(`pipeline.ts`): strong ≥ 0.7, moderate ≥ 0.45.

Merge: pass 1 by identity (degrees+family, else name, else interval
vector); pass 2 by overlap adds detectedBy/weights only, never spans.
**A resolution finding merges only with another resolution finding**, in
both passes: a two-note resolution and a two-note target device share an
interval vector, and without the guard the interval-vector branch of
`sameIdentity` matched them and the absorbing finding overwrote the other's
name, degrees and kind.

## Practice units (`practice/unit.ts`)

- Unit = idea, split at bar lines into parts of ≤ 2 bars (tail of < 3 notes
  joins the previous part).
- Rank = 4·max(confidence) + Σ confidence (distinct names) +
  0.25·Σ occurrences + 0.5 if arrival is a chord tone + 2 if any finding
  has degrees − `STOCK_PENALTY` 2 × `stock`.
- `stock` (`PracticeUnit.stock`) = max(`stockShare`, `corpusShare`), both
  over the part's notes with notes inside a named cell of ≥ 4 degrees
  **exempt** (a bare triad's notes are not exempt).
  - `stockShare(notes)`: share of notes inside a run of ≥ `STOCK_RUN` 4
    notes moving in **one direction**, whatever the interval sizes; a
    repeated note breaks a run. (Until 2026-09-02 a run also had to keep
    one interval *kind* — all steps, or all thirds/fourths — which read
    1-2-3-5-7 as no run at all and ignored octave leaps. The direction-only
    predicate separates the WJD annotators' lines from their licks better
    in every length bin; see "Stock signals vs the WJD midlevel-unit
    labels" and DECISIONS 2026-09-02 "stockShare runs by direction".)
  - `corpusShare(notes)` (`practice/corpus.ts`): each note takes the largest
    `CORPUS_FREQUENCY` share of any 4-note window covering it (0 if none is
    in the table); mean over notes. A bebop scale fragment ≈ 0.7, a bare
    maj7 arpeggio contour ≈ 0.4, an unseen figure 0.
- Steps, in path order: loop (always); through when the idea's
  progression or a degree-cell has somewhere to go; **visualise** (always,
  2026-09-02); vary (always); write (only with a degree-cell).
- Visualise (`practice/steps/visualise.ts`, step kind `visualise`):
  Bergonzi's off-horn step — no exercise, a prompt and `cues`: the changes
  (`summary.chords`), what to hear (the named cells via `namedCells`,
  with the landing degree; "the line as played" when nothing is named),
  where it comes back (`summary.alsoAt`, omitted when empty), and one
  check against the record at the unit's first printed bar. Sits after
  Through so the player already knows the tune's other places for the
  line (DECISIONS 2026-09-02 "Visualise sits after Through"). The desk
  renders the cues as a list with the usual done button; the report and
  CLI count it as zero exercises; the agent's construct schema accepts it.
- Through (`practice/slots.ts`, `practice/steps/through.ts`): the idea's slot
  is its distinct chord classes + root intervals, followed by the first new
  chord after the final note ends when it arrives within one bar. The whole line
  (pitches and exact rhythm) is transposed to every matching occurrence in
  the tune; the nearest octave fitting the normal
  written range is used; a rest bar prints a cross-bar resolution. A named
  cell on each compatible chord remains as a separate Bergonzi drill,
  followed by the twelve-key cycle.
  - **Play it in another order** (`generate/transform.ts` `permutationDrill`,
    2026-09-02): for each finding whose lemma the dictionary permutes
    (`shapes.ts` `orderingsOf` — today 1235 major-family, 1345 minor-family;
    triads and single-order cells get nothing), one exercise of **four
    bars** on the cell's own chord, inserted between the Bergonzi cell drill
    and the cycle: the order as played, then the rotations of the canonical
    set that start on each *other* degree (one per starting degree — his
    "one from each column"). Bars are the same four pitches in one octave of
    the root, reordered (raw degree differences, so 5 → 1 falls a fifth),
    then octave-clamped. Gate: every bar must re-detect as a hit with the
    same lemma (`validity.ts` `barHasLemma`), fail-closed like `isValid`.
    Transformation kind `permutation`. Measured on Blake + the ten peers: 27
    drills (Blake 0 — no Bergonzi cell in it; St Thomas 1; Mintzer blues 8;
    Bartley 6; Tenor Madness 6; 26-2 4; Autumn Leaves 2); findings, units,
    order and every other step count unchanged.
  - Matches are **grouped by transposition**, in tune order, capped at 8
    *keys*: one entry per key listing every bar that shares it, written onto
    the first occurrence's chords. The same progression in the same key at
    three bars is one exercise played in three places.
  - The idea's own bar is dropped from its group, and a group with no bars
    left is dropped — a form repeats, so the line's own spot matches like
    any other. Home is matched against the **run** a chord holds (its bar
    until the next distinct chord), because `tuneChords` merges a chord
    written again in the next bar, and named by that run's first bar
    (`chordRunStart`). Only when `Tune.startBar` is set — `tuneFromScore`
    sets it to the chorus it took the changes from; a chart from elsewhere
    leaves it undefined and every occurrence stands.
- Excerpt layout (`practice/steps/loop.ts` `excerpt`, shared by loop,
  through, write and vary): notes go into bars as played, rests fill the
  gaps, chords ride along at the same shift. Bar 0 is the bar **containing
  the first note**, found by flooring, not by `%` — Through moves a line so
  its first chord meets the match's, which puts a pickup note at a negative
  absolute onset when the match sits at the top of the form, and truncating
  division asked for bar −1 (DECISIONS 2026-08-27). The layout therefore
  depends only on where the notes sit relative to each other and to the
  chords, never on the timeline's origin.
- Vary (`practice/steps/vary.ts`, step kind `vary`): the arrival is fixed,
  the way in varies (Ligon goal notes; Bergonzi ex. A–H; design
  2026-08-25-practice-variations). Four prepended eighth-note **on-ramps**
  — chord tone below the first note, chord tone above, chromatic step
  below, enclosure above-then-below — deduped, range-clamped, and kept
  only when every degree-bearing finding re-detects over the new line
  (`lineContains`) and the arrival keeps its degree. Then **displacement**
  demoted to two placements (and-of-1, pickup), smallest shift modulo the
  bar, notes and chord changes moving together.
- Worked examples in Write (`practice/steps/write.ts`): the step opens
  with device variations of the line — fragmentation (strict half ≥ 3
  notes, prefix else suffix), augmentation ×2 / diminution ÷2 (median
  duration ≥ quarter picks diminution), Bergonzi editing (1–2 middle
  notes removed, arrival kept) — each gated by `lineContains`, so an
  augmented line that drifts across the changes is dropped rather than
  shown. Transforms live in `practice/variations.ts`.
- Cell-drill provenance in Through: each Bergonzi drill's rationale names
  the notes of the line the cell is ("notes 1–4 of the line (bar 76)").
- Agent look-fors render as amber markers at each unit's first notehead
  with a hover/click tooltip (`ScoreView.showLookFors`); the section text
  points at them instead of listing them.

## Naming what a player sees (`practice/describe.ts`)

`Finding.name` is an **identity**, not display text: `mergeByIdentity`
compares it, `generate/validity.ts` matches on it, `steps/write.ts` looks
findings up by it, and exercise titles embed it. Where the engine detects a
shape the dictionary has no word for, that name is an interval vector
(`recurring cell [5, -5, 0]`) and the finding carries `unnamed: true`
(`analyse/index.ts`; `absorb` clears the flag when a named description is
taken). This module is the only place that turns findings into prose, so the
CLI, the idea head and the all-ideas table cannot drift apart.

- `displayName(finding, names?, terse?)` — the agent's name for that id,
  else the engine's, else **null** when `unnamed`. A **permuted** cell
  (`Finding.permuted`, set by the dictionary for a non-canonical order of
  a Bergonzi set — never for a triad, whose six orders are each their own
  figure) shows its **lemma** ("digital pattern 1235"); the order lives in
  `name` as identity and reaches the player through `detail` (2026-09-02). An agent name arrives as
  "what it is — why it matters"; `terse` keeps the half before the dash,
  since a table row wants a name and not a sentence.
- `headline(unit, names?, terse?)` — one clause: the strongest **named**
  finding, else, in order, "A figure the player keeps returning to — the
  score shows it" (something detected, nothing nameable), the
  common-language line, the scale-run line, "No named vocabulary — still
  the player's idea". `terse` picks the table-row wording of the same four
  ("a figure the player returns to", "mostly a scale run", …).
- `detail(unit, names?)` — the asides, one line each, in the order a player
  asks: further named cells, `played in the order 3-1-2-5` (once per
  distinct permuted order in the unit; nothing for the canonical order),
  `lands on the <degree>`, `N variants of the
  same shape`, `also at bars <spans>`, and finally a count of the shapes no
  name could stand for (`2 shapes the engine cannot name`; `N more …` when
  the headline was itself the unnamed fallback). A nameless shape still
  happened — it is counted, never dropped.
- `barSpans(labels)` — consecutive printed bars collapse into ranges
  (194…209 → `194–200, 202–203, 206, 208–209`). A label that is not a plain
  number ("17 (2nd time)") never joins a run.

**Agent names** (`Narration.findingNames`, already filtered to real ids in
`narrate.ts`) are applied **per finding at render time**, with the engine
name as the fallback — units are built before `narrate` runs, so nothing is
stored on the unit. The narrate prompt asks for "each finding worth naming",
so partial coverage is the normal case, and an id that has drifted since the
fixture was recorded falls back rather than failing. Keyless runs read the
engine's own names. The **CLI header is engine-only**: `header` is composed
inside `buildUnits`, before `narrate` runs, so `npm run solo` prints the
agent's names in their own list (`scripts/run.ts`) and not in the unit
lines. The engine overlays, the details drawer and the annotation export are
unchanged: they are the audit view, where the interval vector is the right
thing to say.

## The exports (`app/export.ts`, `app/report.ts`, `app/engrave.ts`)

Two standalone HTML files, both printed to PDF by the browser rather than
built by a PDF library: the score and the exercises are inline SVG, which
print keeps vector-sharp and a rasterising library would not.

- **Annotation export** — the annotated score, the annotation tables and
  the legend. The audit view, engine-only.
- **Session report** — the whole run: the agent's overview, every idea in
  the desk's order with its headline, detail, the agent's keep/reason and
  its look-for, then the annotated score, tables and legend. Drills are
  engraved for the first **`REPORT_DRILLED_IDEAS` = 8** ideas only; the
  rest are listed without notation. Blake is 34 units holding 271
  exercises (loop 34, through 47, vary 174, write 16), which prints to
  about a hundred pages; the top eight is 69 exercises. (275 / vary 178 /
  top eight 85 before the 7-3 resolution detector, 2026-09-01; a write step
  counts here by the examples it generates, which is not how
  `scripts/run.ts:123` prints it — that rule reads 268 → 266.)

Prose in the report composes through `practice/describe.ts`, never from
`Finding.name` (§ "A finding's name is an identity"). A keyless run drops
the agent sections **entirely** rather than heading an empty one. An
exercise OSMD cannot lay out drops that one drill and keeps the report.

Print rules: `.drill` and `.entry` refuse to break inside; an `.idea` does
not, because one runs longer than a page and a block that cannot fit is
pushed whole, which stranded two near-empty pages before the fix. The
first section shares page 1 with the title; the score and the legend each
start a new page.

The legend's parameter prose is a copy of the values above — update it in
the same commit as any parameter change, the same rule the spec sets for
itself.

## Exercise rendering (`render/musicxml.ts`)

Key: `Score.keyFifths` (first `<key><fifths>`, 0 if none) is written into
every exercise; black keys spell as sharps when fifths > 0, flats
otherwise. The page renders a copy without `<transpose>` (`forDisplay`)
because OSMD applies it and drew tenor parts a tone below their chord
symbols; downloads keep it for MuseScore.

Rests: a compacted rest is split into exact written values, largest first
(plain, dotted, then triplet), because `notatedType` otherwise falls back
to the *nearest* plain type — a 3.5-quarter rest was written
`<type>whole</type>` against a duration of 3.5, so the symbol and the bar
arithmetic disagreed. 91 of 384 rests in the Blake exercises were such
values.

Tuplets: three consecutive events of the same triplet duration carry
`<tuplet type="start"/>`…`"stop"`, which MusicXML needs to draw the bracket
and number; a triplet group whose first member is a rest is marked too.

Beams: notes shorter than a quarter beam within a beat (quarter of the
bar's time signature); a rest, a longer note or the beat line ends the
group; adjacent 16ths inside a group carry beam 2. Lone notes unbeamed.

Even eighths (divisions 2) unless `ExerciseBar.events` present, then
divisions 48 per quarter, exact plain/dotted/triplet types, `cue` notes
small. Flats-preferred spelling.

## iReal charts (`practice/ireal.ts`)

`irealb://` only. 50-char block unscramble; one cell = one beat; cells per
bar from T-signature table (T44→4 … T12→4). Quality from the explicit CORE
table + stripped tensions; `7`+`#5` → augmented-seventh, `-7`+`b5` →
half-diminished. Unknown suffix throws with the token. 1,458/1,460 forum
jazz standards parse.

## Tune identification (`practice/tuneSearch.ts`, `practice/tuneMatch.ts`)

- Book: the 1,460-standard forum playlist bundled at
  `app/data/jazz1460.irealb.txt`; `parseIRealBook` keeps what parses
  (1,458; skips "Martha's Prize", "You Taught My Heart To Sing").
- Query: `guessTitle` = `<work-title>` (else `<movement-title>`; a
  placeholder like "Title" → file name) minus NOISE words (solo,
  transcription, instrument names, articles …).
- Ranking: exact title 4 > title prefix 3 > title wholly inside query 2.5
  > every query word matches (prefix) 2 > fraction of words matched.
  Top 6 shown, top 1 auto-taken if the vote is confident.
- Transposition vote: for each solo bar (from the first chorus start,
  cycling the chart) the first roots' difference mod 12 votes; winner
  wins if agreement ≥ **0.5** and ≥ **2×** the runner-up
  (`MIN_AGREEMENT`, `MIN_MARGIN`). Confident → its shift overrides the
  file's `<transpose>`; else the file's instrument is used and the page
  asks "Right tune?".
- Omnibook corpus (50 files, `~/dev/woodshed-data/omnibook`, concert
  pitch, pickup bars): all parse; 24 of 32 title-matched tunes vote
  confident, 0 wrong titles do.
- Corpus (9 files): 6 identified from the title alone, every correct match
  confident (79–100%), no wrong match confident (≤ 29%).

## This solo's changes (`practice/tune.ts` `tuneFromScore`)

One chorus: the first chorus (from `chorusStarts`) with chord symbols under
at least half its bars, else the last examined; a chordless intro counted
as a chorus (St Thomas bars 1–16) is skipped. Bars without a symbol carry
the previous chord.

## Repeats (`ingest/parseScore.ts` `playedMeasures`)

Written order → played order before either parser walks the measures. A
forward repeat (else the start of the piece / the bar after the last
backward repeat) opens a section; a backward repeat plays it again. With
endings, pass two stops before ending 1 and continues after it; ending 2
plays once. Two passes only (`times` ignored). Played bar = written bar +
bars inserted before it, so a score without repeats keeps its own numbers.
`Score.repeats` lists the sections by written bar; `prepare` emits an
info `repeat-unrolled` adjustment. **Every bar number shown to the player
is the printed one**: `core/bars.ts` `writtenBar` / `barLabel` ("17 (2nd
time)") / `barRange`, used by findings, unit headers, steps, the profile,
the CLI and the page; the page keys the rendered score by printed bar and
draws no ticks for a second pass. Segno / coda remain
`UnsupportedScoreError`.

## Weimar Jazz Database ingest (`ingest/wjd.ts`, `npm run corpus:wjd`)

- Rows in (`melody`, `beats`, `solo_info`), Score out; `src/` never
  touches SQLite. Bar 1 = the earliest bar in either table.
- Onset = (bar, beat, tatum/division) on the tick grid; duration =
  seconds / beatdur, rounded to the tatum grid, clipped at the next onset.
- Pitch is concert; written = concert − (chromatic + 12·octave) per
  instrument code: ts/bcl (−2,−1), ss/tp/cor/cl (−2,0), as (−9,0),
  bs (−9,−1), others C.
- Chords: one per beat where given; WJD `j7`→`maj7`, `alt` dropped, slash
  bass dropped; `NC` skipped. Track confidence 0.9.
- Form labels (A1, B2, I1 …) become rehearsal marks (letters only) on the
  bar they start, so the phase comes from them.
- A solo whose `period` changes is rejected (one meter per score).
- Corpus, 2026-08-24: 453 solos run, 3 rejected (mixed meter), 0 unparsed
  chords, form found in 305, findings median 13 (max 132), units median
  35.
- Corpus, 2026-08-27: 452 solos run, 4 rejected (mixed meter), 0 unparsed
  chords, **0 crashes**, form found in 305, findings median 13 (max 121),
  units median 36 (max 659). The maxima were re-measured from the
  committed `goldens/corpus-wjd.json` at the close of the chorus-prior
  sprint; the medians, the run/rejection counts and the form count were
  measured before it and are unchanged by it, so the line mixes a
  pre- and a post-`wChorus` reading that happen to agree everywhere the
  medians look. Only the crash count is attributable to a
  measured change (DECISIONS 2026-08-27 "`excerpt` lays bars out by
  flooring"; the three
  solos that threw now run). The rest of the drift since 2026-08-24 is
  **unattributed**: `ingest/wjd.ts` has not changed in the window, so the
  extra mixed-meter rejection has no explanation at all, and while
  `src/analyse/` changed in some sixteen commits over the same days — any
  of which could move findings max 132 → 121 — none was measured against
  the corpus, so naming one would be a guess. Both lines stand until
  someone re-measures the intermediate points. Going forward the golden
  (`goldens/corpus-wjd.json`) makes this drift visible per solo, so a
  future line should not need this note.

## Corpus frequency table (`src/data/corpusFrequency.ts`, `npm run corpus:freq`)

Aggregate statistic derived from the WJD (attribution in the file header;
no note data). Key = three semitone intervals as played, each clipped to
±12 (`patternKey`); value = share of the 452 solos containing the pattern
at least once (document frequency, not count). Patterns below 0.05 are
omitted (6,482 of 7,742). Regenerate after any ingest change.

## Page (`app/`, DOM only; design in docs/superpowers/specs/2026-08-24-practice-desk-design.md)

- Modules: `main.ts` (wiring, landing, header, start-here strip, All-ideas
  drawer), `score.ts` (OSMD, phrase/idea ticks, highlighter, go-to-bar),
  `desk.ts` (idea head, step path, panes), `tune.ts` (chip + picker),
  `details.ts` (engine diagnostics behind a button), `done.ts`, `dom.ts`.
  No framework; fonts self-hosted in `app/fonts/` (SIL OFL), never a CDN.
- Idea head is laid out from `PracticeUnit.summary` (`practice/unit.ts`):
  `bars` (printed, "Bars 76–77"), `chords`, `landing`, `alsoAt` (printed
  bars outside the unit where its findings recur), `stock` (unit stock ≥
  `STOCK_SHOWN` **0.5**), `stockKind`. **No note names on the page** — the
  score shows them. What the head *says* comes from
  `practice/describe.ts` (below), never from `Finding.name` directly:
  one headline, then the asides behind a `<details>` disclosure.
  `header` string remains for the CLI and the loop step's rationale, and
  is itself composed from `describe.ts`.
- Tune chip: the file-name/title guess is taken only when
  `inferTransposition` is confident (same rule as before); otherwise the
  chip is amber "which tune?", units come from the solo's own changes, and
  the picker shows agreement per candidate (< 0.5 → "probably not").
- Done state: `localStorage` key `woodshed.done.<title>:<notes>:<bars>`,
  JSON array of `<unit id>:<step kind>`; a unit opens at its first undone
  step; "Reset ticks" clears the solo's set. `woodshed.tune` keeps a pasted
  irealb link (as before).
- **Scale band** (`score.ts` `scaleBand`, toggle in `main.ts`): one span per
  chord from `Analysis.scaleSpans`, drawn **above** the staff — a solid line
  with `BAND_TICK` 5px ticks pointing *down*, x-aligned to the first and last
  notehead, terse label at the left edge. Convention from Coker/Owens/Ligon,
  not Levine (docs/research/scale-analysis.md §5); dashed is reserved for
  inferred and nothing here is inferred. `.declared` spans (the chart's own)
  draw in `--ink` at 1.8px and bold; the rest in `--pencil` at 1.2px.
  - The y is **measured, not fixed**: `bandY` scans every non-band `<text>` in
    the gap above that staff (within `BAND_SEARCH` 130px) and clears the
    highest by `BAND_CLEAR` 7px. A fixed offset lands on the chord symbols —
    which is why the phrase ticks put their labels below the staff instead.
  - Which system a notehead belongs to comes from **its own printed bar**
    (`map.staves`), never from its y: a high note with ledger lines reaches
    into the staff above and geometry-matching drew bands across the staff.
  - A span crossing a system break draws once per system, Coker's way: no
    terminal tick at the right margin, none where it resumes, label hyphenated.
  - Toggle `woodshed.scales` in `localStorage`: `declared` (default, 10 bands
    drawn on Blake), `all` (57), `off`. The default is the quiet one because
    three of the four sources say in print that marking every bar is the
    failure mode.
- **Phrase ticks draw faint** (`score.ts:336`, class `phrase-tick weak`)
  when the phrase's confidence is **strictly below** `WEAK_CONFIDENCE` =
  `threshold + CANDIDATE_BAND` = **0.60** — the same width the agent's
  segment job adjudicates within, so a faint tick means "the engine opened
  this phrase on a call it would have taken advice on". The two marks
  measure different quantities: the tick tests **phrase confidence**
  against that ceiling, the boundary-candidate caret tests **cue total**
  against a band around `threshold`, and for a chorus boundary they differ
  by exactly `wChorus`. What follows from that is provable, not just
  observed, and each step names the parameter equality it stands on:
  - A chorus boundary's strength is `min(1, total + wChorus)`, so faint
    means `total < WEAK − wChorus` = **0.15**.
  - A candidate needs `total >= threshold − CANDIDATE_BAND` = **0.30**.
    0.15 ≤ 0.30, so the predicates are **disjoint**: a faint chorus tick
    can never carry a caret. The general condition is
    `wChorus >= 2 × CANDIDATE_BAND` (0.45 ≥ 0.30, margin 0.15).
  - `total >= wRest × rest`, so `rest < 0.15 / 0.6` = **0.25**; and a
    nonzero rest cue is at least `minRest / fullRest` = **0.25**
    (`boundaryCue` floors anything shorter to 0). So `rest = 0`
    *necessarily* — every faint chorus tick is rest-free. This one is a
    knife edge: `wRest × (minRest/fullRest)` = 0.15 = `WEAK − wChorus`
    **exactly**, and only the strict `<` at `score.ts:336` keeps a gap
    with `rest = 0.25` and no length or leap out of it. (Such a gap would
    still draw no caret — 0.15 < 0.30 — so `<=` would cost the
    "rest-free" half of this rule, not the caret half.)
  - Symmetrically, a faint **rest** boundary carries `total ∈ [0.45,
    0.60)`, and a full quarter alone gives `wRest × 1` = 0.60 exactly — so
    `rest = 1.00` is excluded, again by the strict `<`.
  Measured over the ten peer solos (2026-08-28), and matching the
  derivation: 37 faint ticks, 19 rest-free chorus starts with no caret and
  18 rest boundaries with one, every one at `rest 0.50` (0.25 and 0.75 are
  permitted too; 1.00 is not). **Both knife edges are pinned** by
  `app/score.test.ts` — as relationships between the parameters, not their
  values, so a tuning pass that breaks the rule fails a test that says
  which product claim it just falsified. DECISIONS 2026-08-28 "A faint
  phrase tick with no caret is a rest-free chorus start" and its
  correction.
- **Engine overlays** (`score.ts` `showOverlays`, strip in `main.ts`,
  `localStorage` `woodshed.overlays` JSON): opt-in audit view of what the
  detectors guessed, drawn where they guessed it. Checkboxes: phrases
  (the existing ticks, the one default-on switch), cells / devices /
  recurring / common language (underlines below the tick labels,
  `LANE_BASE` 32 + `LANE_GAP` 6 px per fixed lane, opacity 0.35 +
  0.65·confidence — the seeder's convention), boundary candidates (grey
  carets at the near-threshold gaps the agent's segment job adjudicates,
  tooltip with the cue numbers), stock (grey wash behind units whose
  stockParts max ≥ 0.5, tooltip naming the dominant signal). Common
  language draws marked findings plus `languageRuns` ≥ `LANGUAGE_RUN_MIN`
  **0.25** WJD share (merged overlapping windows, best share kept —
  `analyse/language.ts`, tested). Tooltips reuse the agent-tip element
  without the amber agent-sourced class; finding tips carry id, name,
  confidence, detectors, corpus share.
- Scrolling to an SVG note group must be instant and deferred with
  `setTimeout`, not `requestAnimationFrame` (never fires in a background
  tab) and not `smooth` (Chrome ignores it on SVG groups).

## Owner brackets (`scripts/brackets.ts`, `npm run brackets`)

`scripts/brackets.json`: per peers file, a printed-bar range and the
owner's phrase starts as printed bar.beat ("4.4½"). A start matches within
**0.5** beat (`TOLERANCE`); a `knownMisses` entry absorbs the engine's
displaced start within 2 beats. Exit 1 on any other miss or false start.
Sets: Mintzer written 3–34 (13 owner starts, 22.1 known), St Thomas
printed 57–76 (7, frozen from the engine in session 6 — see OPEN_QUESTIONS).

## Annotation app (`annotate.html` + `app/annotate.ts`, `scripts/viteAnnotate.ts`,
`src/annotation/`, `npm run eval:owner`; spec
docs/superpowers/specs/2026-08-26-annotation-app-design.md)

Owner ground truth on the score, dev-only.

- Second Vite entry, absent from `build.rollupOptions.input` so `npm run
  build`/Pages are byte-identical. Blind marking: `app/annotate.ts` calls
  only `readScoreXml`/`parseScore`/`mountScore` — nothing from `analyse/`,
  so the engine's opinion cannot bias the owner's ear.
- `scripts/viteAnnotate.ts` (dev middleware, `apply: 'serve'`): `GET
  /__annotate/files` lists `~/dev/woodshed-data/peers/*.mxl|.musicxml`
  with an `annotated` flag; `GET /__annotate/file/<name>` serves the bytes;
  `GET /__annotate/annotation/<name>` serves the existing JSON (404 if
  none); `POST /__annotate/save/<name>` writes it. Every route rejects a
  name that isn't its own `basename` or contains `..` (400); a malformed
  save body is a 400, not a crash.
- Five-mode toolbar (keys 1–5): **1 phrase** / **2 idea** — click a
  notehead *or a rest* (a pickup rest is often part of the phrase, owner's
  call 2026-08-26) to toggle a start mark at that level (split from a
  single cycling mode 2026-08-27; clicking with the other level active
  switches the level). A phrase start counts as an idea start too but is
  stored only once, in `phrases`, never duplicated in `ideas`. Ticks are
  numbered like the main page — phrases 1..N in playing order, ideas n.2,
  n.3 within their phrase (0.n before the first phrase mark) — relabelled
  on every change. **3 outside** / **4 star** — click first note, click
  last note to close a span; outside colours the noteheads themselves
  (`--outside` magenta, `!important` to beat OSMD's inline fills) plus an
  underline, star keeps the underline + glyph; click a span to delete; Esc
  cancels a half-made span. **5 variations** — grouped ranges: entering
  the mode (or Esc) starts a new group; each click-pair marks one range,
  first the idea then its variations; drawn as green underlines labelled
  A1, A2 … B1; clicking a range deletes it and an emptied group disappears
  (adding to a closed group means delete + re-mark, accepted 2026-08-27).
  The ends mode (2026-08-27 morning) was retired the same day — the owner
  didn't use it; `phraseEnds`/`ideaEnds` stay in the file format and load
  fine, there is just no UI writing them. Picking a file blurs the
  dropdown so keys 1–5 always reach the mode switcher (a focused select
  swallowed them — the 2026-08-26 "outside mode doesn't work" bug). The
  toolbar row is sticky. Autosave is debounced and flushed (not dropped)
  when switching files; a **save** button flushes on demand. A **seed
  from engine** button (dev middleware `GET /__annotate/engine/<name>`
  runs the pipeline lazily) replaces all start marks with engine output —
  after a confirm when any exist; spans/variations untouched — so a long
  solo is a correction pass. The seed also proposes **outside spans**:
  each note carries an off-scale weight (0 in the declared scale; over a
  **dominant** an altered tension weighs 0.5 — vocabulary, not departure;
  the natural 7, the one truly wrong pc, weighs 1; elsewhere off-scale
  weighs 1), a 6-note window is hot when its mean weight ≥ the solo's own
  baseline + 0.15 (absolute thresholds flooded: the 2026-08-27 mintzer
  audit marked 40% of notes), windows never cross a seeded phrase start,
  runs trim to their weighted notes (≥ 3), top 12 by density; rendered at
  opacity 0.35 + 0.65·confidence with a tooltip. Three grammar exemptions
  (2026-08-27 three-solo re-audit): a note inside a detected enclosure or
  approach finding weighs 0 (chromaticism that resolves is grammar — Sandu
  was flooded by F#-A-G over Gm7); a repeated pitch carries weight only on
  the first note of its same-pc run (the mintzer C-pedal); the blue notes
  (b3/b7) over a major-family chord weigh 0.5. It finds the
  chromatic-intense species only (DECISIONS 2026-08-25 stands: nothing
  stronger is inferred from pitch content). **Variation groups**:
  occurrences of one finding within 16 printed bars of the previous
  occurrence (development, not vocabulary), clusters of ≥ 2, top 6 —
  substance-gated: every occurrence must run ≥ 4 notes (3-note enclosures
  and triad spellings are vocabulary), and an occurrence overlapping the
  previous one is dropped (a passage matched against its own offset copy,
  26-2's opening). **Stars**: substance-gated findings with ≥ 3 occurrences — the player's recurring
  vocabulary, what drilling wants — one star at the first occurrence,
  top 5 by occurrence count. One confirm replaces starts + outside +
  stars + variations; scale strike-outs survive. That file's JSON carries `seeded: true`
  forever after, and eval:owner tags it `(seeded)`: corrected-from-engine
  agreement is biased toward the engine and never pools with blind files'
  evidence class. See DECISIONS 2026-08-27 "Seeded annotation".
- A **scales** toggle (off by default, so blind files stay blind) fetches
  the same engine payload (middleware caches by file mtime) and prints
  each `chordScales` name — chart tensions win, else the function rule,
  never inferred from the melody — in small grey text under the first
  solo note at/after its chord. Clicking a name strikes it out: "the solo
  does not imply this scale", saved as `scalesRejected: {at, name}[]` in
  the annotation JSON and listed by eval:owner. The kept-minus-rejected
  list is the owner's ground truth on which chart scales the solo
  actually expresses — the filter the four failed pitch-content detectors
  (DECISIONS 2026-08-25) never had.
- Storage: `annotations/<mxl-basename>.json`, one file per solo,
  `AnnotationStore` (`src/annotation/store.ts`, DOM-free, tested — cycle/
  span/serialise round-trips). Fields: `phrases`, `ideas`, `phraseEnds`,
  `ideaEnds` (position-string arrays; the end arrays are optional — older
  files load as none), `outside`, `stars` (`{from,to}` lists),
  `variations` (optional array of groups, each a `{from,to}` list — first
  span the idea, the rest its variations, groups in creation order).
  Positions are printed `bar.beat` strings via `core/position.ts`
  (`parsePosition`/`formatPosition`), quantised to 3 decimal places
  (`Position { bar, beat }`), the same dialect `brackets.json` uses
  ("4.4½").
- `npm run eval:owner` (`scripts/eval-owner.ts`): for each
  `annotations/*.json`, resolves the `.mxl`/`.musicxml` from `peers/`,
  runs the pipeline, and matches owner vs. engine phrase/idea starts with
  the same **0.5**-beat tolerance as `brackets` (`src/annotation/eval.ts`
  `matchStarts` — greedy in-order, each engine mark claimed by at most one
  owner mark — and `prf`). A **report, not a gate**: `brackets` stays the
  gate on phrase starts. `--misses` prints the `boundaryCue` evidence
  (rest/length/leap/total vs. `DEFAULTS.threshold`) at every miss and
  false start, per level. Owner end marks (when present) are matched
  against the engine's phrase/idea last-note positions with the same
  matcher and tolerance, reported as matched/total per level, never
  pooled with start metrics (they're sparse by design). Variation groups
  are listed only — nothing in the engine detects variations yet. Outside
  and star spans are printed against overlapping `analysis.findings` only
  (no positional score yet — see OPEN_QUESTIONS "what formally scores
  outside spans and stars").
  `ANNOTATIONS_DIR`/`PEERS_DIR` override the default paths; exits 0 always.

## Stock signals vs the WJD midlevel-unit labels (`scripts/eval-stock.ts`, `npm run eval:stock`)

A report, not a gate (like `eval:owner`). The Weimar `sections` rows of type
`IDEA` carry Frieler's midlevel-unit labels in `value`; `mluBase`
(`practice/stockFeatures.ts`) reduces `~#-lick` / `line_w_alds` /
`void->melody` to a base class. Unit of measurement is the **annotated
section** (never an engine unit, so segmentation error stays out), notes
rebuilt by `scoreFromWjd`, contextualised against the solo's chords,
sections of < `MIN_NOTES` **3** dropped. Target: base `line` (the
annotators' scale and arpeggio runs) vs `lick` (vocabulary); every other
class is counted and excluded. Per signal: AUC for "line" (0.5 chance,
threshold-free), P/R for "line" at `STOCK_SHOWN` **0.5**, and AUC within
four length bins (3–5, 6–9, 10–15, 16+ notes), because length alone
separates the classes and every share-type signal grows with it.

Measured 2026-09-02, 451 solos, 12,393 lick/line sections (4,598 line,
7,795 lick; 5.1% line among 3–5-note sections, 76.9% among 16+):

| signal | pooled AUC | 3–5 | 6–9 | 10–15 | 16+ |
|---|---|---|---|---|---|
| `stockShare` (run, one interval kind) | 0.754 | 0.717 | 0.719 | 0.702 | 0.714 |
| `corpusShare` | 0.729 | 0.721 | 0.676 | 0.672 | 0.670 |
| max(run, corpus) = `stock` | 0.729 | 0.778 | 0.722 | 0.686 | 0.679 |
| `languageShare` | 0.698 | 0.541 | 0.609 | 0.616 | 0.639 |
| `stepShare` | 0.630 | 0.556 | 0.641 | 0.644 | 0.634 |
| `runShare` (direction only) | **0.753** | **0.837** | **0.798** | **0.724** | 0.711 |
| `intervalVariety` (inverted: high = lick) | 0.163 | 0.402 | 0.346 | 0.330 | 0.293 |
| `chordToneDownbeatShare` | 0.522 | 0.527 | 0.503 | 0.501 | 0.489 |
| length in notes | **0.842** | — | — | — | — |

Reading (the `stockShare` row is the **pre-swap** rule, kept as the
record): the one-kind run was a real, length-independent but modest line
detector (≈0.71 in every bin; at ≥ 0.5 it flagged 47.9% of lines at 61.7%
precision against a 37% base rate). The direction-only run predicate
beats it in every bin, most where it matters for the page (short units),
and **is the rule in force since 2026-09-02** — re-running the eval now
prints identical `stockShare` and `runShare` rows (0.837 / 0.798 / 0.724 /
0.711), which is the check that the swap changed the right function.
`chordToneDownbeatShare` is chance in every bin — Baker's metric rule does
not separate vocabulary from running, because both put chord tones on
beats. `languageShare` never reaches 0.5 (document shares top out ≈ 0.24),
so the P/R row for it reads 0 by construction. Nothing in the rank changed
on this evidence; see DECISIONS 2026-09-02.

## Benchmarks (`scripts/bench.ts`, `goldens/benchmarks.json`, `bench.html` + `app/bench.ts`)

`npm run bench` writes one **snapshot** per day (a re-run replaces the
day's measured entry): date, short commit, `source: 'measured'`, and the
JSON line each eval script prints under `--json` — `eval:wjd` (P/R/F1
exact, phrases and ideas), `brackets` (matched/owner/false per set),
`eval:owner` (per-file P/R/F1 + `seeded`), `eval:stock` (pooled AUC and
the four length-bin AUCs per signal) — plus the Blake targets read from
`run()` (findings, units, phrases, top finding and its bars, exercises per
step kind) and **timing**: `PipelineResult.timing` (ms per stage —
ingest, prepare, analyse, practice — from `run()`'s own clock), the
median over Blake + the peers after one warm-up run, and Blake alone. Two
entries are `source: 'spec'`, copied by hand from ENGINE_SPEC / DECISIONS
for 2026-08-27 and 2026-09-01 so the charts have a past; they draw hollow.
The file holds aggregate numbers only (DECISIONS 2026-08-24 "Corpus
licensing"; 2026-08-27 "What may live in a corpus golden"). The analyse
page stores the last run's timings in `localStorage` `woodshed.timing`;
the bench page shows them beside the Node numbers. Charts are inline SVG
(no library): two-series line charts in `--phrase` / `--idea` (validated as
a pair), the human ceiling **83** drawn on the corpus chart, a legend and
direct end labels, crosshair tooltip, a table under every chart.
First measured snapshot 2026-09-02 at 705b23b: Node median over 11 files
of 671 notes — ingest 51.4 ms, prepare 0.4, analyse 13.2, practice 27.3,
total 96.9; Blake 102.1 ms. (Wall clock on one laptop; expect ±10% between runs.)

## Agent layer (`src/agent/`, spec docs/superpowers/specs/2026-08-25-agent-layer-design.md)

Judge yes, generate never: verdicts are strict zod schemas referencing engine
ids; no pitch, count or interval can ride in one. Runs whenever a key is
present (CLI env `ANTHROPIC_API_KEY`; page BYOK from localStorage,
browser-direct); keyless runs are byte-identical to the engine alone.

- Model: default `claude-opus-5`; the page's model dropdown (next to the
  BYOK key, `localStorage` `woodshed.agentModel`: Opus 5 / Sonnet 5 /
  Haiku 4.5) or the CLI env `ANTHROPIC_MODEL` override it
  (`LiveOptions.model`). `max_tokens` 16000, structured outputs on every
  call, analysis document cached (`cache_control` ephemeral on the system
  block, identical prefix across jobs).
- Jobs, runtime order: **segment** (batch-adjudicate `boundaryCandidates` —
  rest > 0 and |total − threshold| ≤ `CANDIDATE_BAND` 0.15 — into
  `SegmentOptions.overrides`, keyed by left-note index) → re-analyse →
  **rank** (menu order; a verdict keeping nothing degrades) → **narrate**
  (2-paragraph overview + names + look-fors; must send the player to the
  record) → **construct** (the one tool loop: `list_steps`, `unit_detail`;
  ceiling 15 turns; only engine-generated steps survive).
- Degrade rule: any failure → null verdict → deterministic path stands,
  job listed in `AgentOutput.degraded`, one warning line, never a crash.
  Ids a verdict invents are discarded, not patched.
- Replay: `replayClient` + `fixtures/agent/<solo>/<job>.json`
  (`narrate`/`rank`/`segment`/`construct`). Committed fixtures are
  Blake-derived or hand-written only; WJD recordings live in
  `~/dev/woodshed-data/agent-fixtures/<melid>/`. `AGENT_FIXTURES=<dir>`
  replays in the CLI; `AGENT_RECORD=<dir>` records live verdicts.
- `npm run eval:agent`: idea recall on the first 20 WJD solos, engine vs
  adjudicated, recordings only. Ship rule: job 3 does not run live by
  default until the adjudicated number beats the engine's.

## Verification targets

Blake (`npm run solo`): form 56 bars, chorus starts **9 and 65** (8-bar
intro, head, solo from a pickup at 63); profile regions 63–64, 65–122.
Top finding "major-seventh arpeggio from the b3", bars 73+77, all three
detectors; **15 findings** including "dominant arpeggio 3 to the b9" at
bar 92 marked common language and two 7-3 resolutions at 0.455 (bar 85
`7-3 resolution`, bar 116 `V–i 7-3 resolution`); 15 phrases, 34 practice
units, u1 = bars 76–77 with that cell; cycle exercise bars all ascend.
(13 findings before the resolution detector, 2026-09-01. The "16 phrases"
recorded here reads **15**, measured on both sides of this change, so the
drift predates it; it was not traced further.) (The 18/21/32
counts recorded in session 10 had already drifted by session 13 — the
2026-08-27 baseline check measured 16 phrases / 13 findings / 34 units
*before* the common-language change. The change itself swapped one
finding: the enclosure-into-the-3 device was absorbed into the new bar-92
b9 arpeggio by the existing overlap merge, so the count stayed 13.) St Thomas: top unit is the bar-114 b9-arpeggio unit
(unit.test.ts pin). WJD sweep 2026-08-27: findings median 13, units
median 36, 4 meter rejections, **0 crashes** (DECISIONS 2026-08-27
"`excerpt` lays bars out by flooring" — the three solos that threw now
run). Bopland bench, first 300 licks: named coverage 72.7%
→ **74.7%** with the lick entries.

## Peers golden (`goldens/peers.txt`, `src/peers.test.ts`, `src/test/solos.ts`)

The owner's transcriptions live in `~/dev/woodshed-data/peers` (override
`PEERS_DIR`; Blake is `hey-lock.mxl` there, byte-identical to the MuseScore
original, which remains the file that is edited — a re-export means
re-copying it). Every file in the folder runs through the invariants any
solo must satisfy: a view per finding, confidence in [0, 1], one finding
per identity (degrees within a quality family, else name — the pass-1
rule above), no interval vector grafted onto a degree cell, no finding
claiming a third of the solo's bars, every 7-3 resolution a two-note
device landing on the 3, phrases that hold notes, units of ≤ 2 bars
opening with the loop step. Then one line per solo is pinned:
`findings`, `units`, `phrases`, `ideas`, the form-phase token (the same
closed vocabulary as the WJD golden) and the top finding's dictionary
name and bars — nothing richer, per DECISIONS 2026-08-27 "What may live
in a corpus golden". Without the folder the suites skip; they never fail.
Re-pin after an intended engine change with `npm run test:run -- -u` and
read the diff as a list of solos that moved. First pin 2026-09-03, ten
solos, 623 tests.
