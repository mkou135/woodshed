# 7-3 resolution — design

2026-09-01. Session 20. Owner-approved in chat before writing.

The device: the b7 of a chord falls to the 3 of the chord a fourth above it
— II-7 → V7, V7 → I. Coker gives it a chapter; Ligon and Owens arrive at it
independently. `docs/OPEN_QUESTIONS.md` carries it under "From the jazz
pedagogy literature", together with the linked question about Ligon's three
melodic outlines.

## What the evidence said before anything was designed

A census over Blake plus the ten peers in `~/dev/woodshed-data/peers`
(throwaway script, not in the repo), counting adjacent note pairs where a
`b7`/`7` falls to a `3` across a `+5` root move:

| | |
|---|---|
| events, adjacent, falling 1–2 semitones | **57** |
| half-step / whole-step falls | 45 / 12 |
| the 3 lands on beat 1 or 3 | 54 of 57 |
| the 7 ends a dictionary cell | **1 of 57** |
| a cell ends on the 7 **or just before it** | 4 of 57 |
| crosses an idea boundary | **4 of 57** |
| inside a plain diatonic descent | 1–4 of 57, depending on the window |
| quality pairs | min7→dom 14, dom→maj/maj7 19, dom→dom 10, dom→min 11, aug7→x 4, maj7→maj7 2 |
| Blake alone | 2 events |

Two rows decided design questions. The 7 ends an existing cell once in 57,
so a property attached to cell findings could not have been the whole
device. And only four events cross an idea boundary, so relaxing
`samePhrase` wholesale would have bought very little.

Those four, printed and read one at a time, split 2/2 by silence:

| solo | the 7 | the 3 | rest between |
|---|---|---|---|
| mintzer | 58.3 G5 (b7 of A7) | 59.1 F5 (3 of D-7) | 1 beat |
| Bartley, After You've Gone | 124.4½ F5 (b7 of G7) | 125.1 E5 (3 of Cmaj7) | 0 |
| Tenor Madness | 12.4¾ F5 (b7 of G7) | 13.1 E5 (3 of C7) | 0 |
| Tenor Madness | 37.3 Bb5 (b7 of C7) | 38.1 A5 (3 of F7) | 1½ beats |

Two are breaths the segmenter is right to split; nobody hears those as a
falling resolution. Two are contiguous — the 7 ends and the 3 begins in the
same instant — and their boundary comes from the chorus-start prior, not
from anything between the notes. That is the exception the design takes.

## A premise in OPEN_QUESTIONS that is stale

"It is the only device on Coker's list that looks *across* a chord change,
which no detector of ours does." The second half is no longer true:
`LICKS` in `analyse/detectors/shapes.ts` already matches two-segment
cross-chord entries with per-segment qualities and a `rootMove`. The
machinery for reading either side of a change exists. Fix that sentence
when this ships.

## Decisions

### D1 — its own detector module, not a `LickEntry`

`src/analyse/detectors/resolutions.ts`, exporting
`detectResolutions(ctx: NoteContext[]): ResolutionHit[]`, wired into
`analyse/index.ts` as a fourth source (`detectedBy: ['resolution']`,
weight 1).

Two mechanical reasons, either one sufficient:

- `CELL_LENGTHS` bottoms out at 3 and `matchShapes` only tries a lick whose
  two segments sum to the current length, so a 1+1 lick is never reached.
- `overlapsAny` drops any hit sharing a note with an already-matched longer
  cell. The pair is (last note of the cell, next note), so wherever the 7 is
  the tail of a `1357` the hit would be suppressed — exactly Ligon's
  outline 2, the case the linked question is about.

A third, softer reason: this is the only detector whose subject is a chord
*change* rather than notes against a chord, and that is worth being able to
read in one file.

### D2 — the rule

For each adjacent pair `i`, `i+1` in the contexts:

1. both notes carry a chord; `a.degree` is `'b7'` or `'7'` (the minor family
   labels the b7 as `'7'`; `analyse/context.ts`) and `b.degree` is `'3'`;
2. the chords differ **by value** (`rootPc` + `quality`, never object
   identity) and `b.rootPc === (a.rootPc + 5) % 12` — the `+5` convention
   `matchLick` and `chordScale.ts` already use for "resolves down a fifth";
3. the fall `a.midi - b.midi` is 1 or 2 semitones, asserted on the MIDI
   numbers and **never inferred from the degree pair**: V7 → i minor is
   `b7`|`3` and a whole step, V7 → Imaj is `b7`|`3` and a half step;
4. the idea gate of D3.

Quality comes from `<kind>` by construction, because degrees are read from
`NoteContext` and nothing here touches chord text.

Scope is any `+5` root move, per the owner's ruling: Coker's two pairs plus
V-of-V (dom→dom, for which `LICKS` already has precedent) and V→i.

### D3 — the idea-boundary exception

The pair may sit in one idea, **or** cross an idea or phrase boundary when
the gap between the two notes is below `minRest` (240 ticks) — the same
threshold `segment.ts` already uses to say "that is articulation, not a
rest".

This is the first named exception to "detectors never match a window that
crosses an idea boundary", and it is stated as a musical condition rather
than a detector privilege: a resolution is legato or it is not one. The
detector does not call `samePhrase`; it applies this gate itself, so
`samePhrase` keeps its meaning for everyone else. `ENGINE_SPEC.md` must
name the exception in the same commit.

### D4 — naming

From the quality pair, because the pair is what says what the device is
*for*:

| first chord | second chord | name |
|---|---|---|
| minor family | dominant | `ii–V 7-3 resolution` |
| dominant | major / major-seventh | `V–I 7-3 resolution` |
| dominant | minor family | `V–i 7-3 resolution` |
| dominant | dominant | `V-of-V 7-3 resolution` |
| anything else at +5 | | `7-3 resolution` |

`Finding.name` is an identity (`practice/describe.ts`), so these strings are
matched by `mergeByIdentity`, `generate/validity.ts` and `steps/write.ts`;
they are chosen once and not reworded casually.

`kind: 'device'`, `degrees: [a.degree, '3']`, `quality` = the first chord's,
`intervals` = the played step. Carrying degrees is deliberate: the device is
*defined* in degrees, which is what makes it drillable, and it is what lets
Write open on it. It also means `SHORT_CELL_FACTOR` 0.65 applies (two
notes), so confidence lands ≈0.55 — moderate, and structurally unable to
outrank Blake's maj7 arpeggio at 1.00.

### D5 — the property on cell findings

`FindingSpan` gains `resolves?: true`. A post-pass in `analyse/index.ts`,
after merging, marks any span of a cell finding that ends **on the 7 or on
the note immediately before it**: outline 2 is `1357` ending on the 7,
outline 3 is `5321` with the 7 following. It is per-span, not per-finding,
because a cell recurring in three bars may resolve in only one.

`describe.ts:detail()` gains one line — *its 7 falls to the 3 of the next
chord* — placed with the other asides. On the peers this fires 4 times in
57, which is the honest size of it: a small marker that lets a cell say
what it is for, not a second engine.

### D6 — no scale-walk exclusion

Rejected: an `isScaleWalk`-style rule dropping a resolution that sits inside
a plain diatonic descent. It would cost 1–4 events of 57. `targets.ts`
excludes scale walks because its claim is about the *shape* of an approach;
here the claim is about voice leading across a change, and a descending line
still resolves. Recorded so that a later session finding scale-run
false positives knows this was considered and why it was declined.

## Testing

Hand-written fixtures only — never a quoted corpus lick (`CLAUDE.md`,
DECISIONS 2026-08-24 "Corpus licensing"). `resolutions.test.ts`:

- ii–V, half step: D-7 C5 → G7 B4, detected, named `ii–V 7-3 resolution`.
- V–I, half step: G7 F5 → Cmaj7 E5, named `V–I`.
- V–i, **whole step**: G7 F5 → C-7 Eb5, named `V–i` — the case a
  degree-pair-derived interval would get wrong.
- V-of-V: D7 C5 → G7 B4, named `V-of-V`.
- rejected: the same pair when the root move is not +5.
- rejected: the same pair when the second chord equals the first by value.
- rejected: a b7 falling to a note that is not the 3.
- rejected: a fall of 3 semitones.
- idea gate: rejected across a boundary with a beat of rest between;
  accepted across a boundary when the notes are contiguous.
- `resolves` attaches to a `1357` whose last note is the 7, and to a cell
  ending on the note before the 7; it does not attach to an unrelated span
  of the same finding.

`describe.test.ts` gains the detail line. `pipeline.test.ts` is updated to
whatever Blake actually yields, after reading it — never adjusted to make a
test pass.

## Measurement, before and after

No eval score moves this. `eval:wjd` and `brackets` score boundaries, and
nothing here touches segmentation, so they are regression guards, not
evidence. The judgement is reading the output.

Baseline, recorded before any code:

- Blake: **13 findings**, top `major-seventh arpeggio from the b3` at bars
  73 and 77, confidence 1.00, all three detectors; 275 exercises.
- 57 candidate events across Blake + 10 peers; Blake holds 2.
- `npm run test:run`: 487 tests.
- `goldens/corpus-wjd.json` pins per-solo `findings` counts, so it **will**
  diff. Read the distribution of the change, report it, then re-pin with
  `--write-golden`.

After: Blake keeps its top finding and should land at ~14 — `mergeByIdentity`
collapses occurrences sharing degrees and quality family, so a solo gains one
or two findings, not one per event. If instead the count rises by the event
count, `sameIdentity` is not matching and that is a bug to chase before
judging the output.

The practice layer is the place a surprise could hide: unit rank carries
`+2 if any finding has degrees`, and Write opens on a degree cell. Measure
Blake's exercise counts and unit order, and report any reordering rather
than absorbing it.

## Deliberately out of scope

- **Anticipated resolution** — the 3 played before the V7 arrives. That is
  Coker's bar-line shift and already its own open question
  ("A note that fits the next chord is still called chromatic"). The 3 must
  onset under the new chord.
- **Non-adjacent resolutions** — a 7 with notes between it and the 3. The
  census shows 36 events with one note between and a long tail beyond; those
  are not the device, they are a b7 that happens to precede a change.
- **Naming Ligon's outlines as findings.** D5 marks the coincidence; whether
  an outline is a finding of its own stays open.
