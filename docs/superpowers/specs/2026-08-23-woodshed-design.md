# woodshed — design

**Date:** 2026-08-23
**Status:** draft for review

Turn a transcribed jazz solo into practice material: identify the vocabulary the
player actually used, and generate exercises that drill it.

Research behind every decision here is in `docs/research/`:
`what-is-a-pattern.md`, `exercise-generation.md`, `corpus-survey-cleanup.md`.
References below of the form (F1), (F5) point at the corpus survey's findings.

---

## 1. Scope

**In scope for v1**

- Ingest a MusicXML solo transcription (`.mxl` / `.musicxml`).
- Clean it up — with the user in the loop — into a trustworthy analysable form.
- Detect vocabulary using four independent methods and score by their agreement.
- Generate drills from findings, validated by re-detection.
- Present findings and exercises as a numbered, bar-anchored report, with
  notation, plus MusicXML export of the exercises.

**Explicitly not in v1**

| Deferred | Why |
|---|---|
| PDF / OMR ingestion | Error-prone on jazz charts; poisons everything silently. Ingest is an adapter so it can land later. |
| Corpus surprisal, n-gram discovery of unnamed cells | Needs the Weimar corpus as a second ingestion path (SQLite + unquantised MIDI) and raises an ODbL question about shipping derived statistics. v1 can say *present*, not *distinctive*. |
| Density / silence measurement, "architecture over time" | Named in the architecture, unimplemented. The most interesting Mintzer material, and scope creep. |
| Implied-reharmonisation detection | Same. Raw material already falls out of form detection (F6). |
| Etude generation | A composition problem, not a transformation problem. See §11. |
| Play-along / pitch-detection scoring | `tune-arcade` territory. |

**Non-negotiable constraint.** The model never produces or reasons about note
data. Every count, interval, degree and generated note comes from deterministic
code. A model that miscounts a semitone puts a wrong note into someone's practice
routine, which is worse than no exercise.

---

## 2. Architecture

```
.mxl ──▶ ingest ──▶ Score ──▶ prepare ──▶ Score + Adjustments
                                                  │
                                                  ▼
                                            analyse ──▶ Findings
                                                  │
                                                  ▼
                                           generate ──▶ Exercises ──▶ render
                                                  ▲            │
                                                  └── validity gate (re-detect)

           agent/ wraps analyse + generate as tools; selects, names, explains
```

```
src/
  core/       types; pitch, interval and degree math; instrument table
  ingest/     MusicXML adapter; chord-symbol text parser
  prepare/    cleanup checks, Adjustments, form detection, soloist segmentation
  analyse/    phrase segmentation, representations, four detectors, convergence
  generate/   transformations, exercise assembly, validity gate
  render/     MusicXML out; OSMD view
  agent/      tool definitions over analyse + generate; prompts
app/          Vite web app
```

The engine is a plain TypeScript library with no DOM and no AI in it. The web app
is one consumer; a MuseScore plugin or CLI could be others. `analyse/` and
`generate/` public APIs double as the agent's tool schema — one thing to build,
two ways to call it.

---

## 3. Data model

```ts
type Provenance = 'file' | 'reference' | 'user' | 'inferred'

interface Note {
  midi: number          // written pitch
  onset: number         // ticks from start of score, normalised
  duration: number
  bar: number
  beat: number          // 0-based within the bar
  tiedFrom?: boolean
}

interface Chord {
  onset: number
  bar: number
  rootPc: number
  quality: Quality      // from <kind>, never <text>  (F1)
  tensions: Degree[]    // from <degree> elements
}

interface ChordTrack {
  chords: Chord[]
  provenance: Provenance
  confidence: number
}

interface Instrument {
  name: string
  transpose: { chromatic: number; octave: number }   // declared in every file
  writtenRange: { lo: number; hi: number }
  altissimoTo?: number
}

interface Score {
  notes: Note[]                 // single part, single voice
  chordTracks: ChordTrack[]     // 0..n; one is active
  instrument: Instrument
  divisions: number
  timeSig: [number, number]
  marks: Mark[]                 // rehearsal marks and words, verbatim
}
```

`Score` is immutable. Cleanup does not edit it.

```ts
interface Adjustment {
  kind: AdjustmentKind
  target: { bar: number; beat?: number } | { range: [number, number] }
  before: unknown
  after: unknown
  reason: string
  decidedBy: 'engine' | 'model' | 'user'
  confidence: number
}
```

Analysis consumes `Score` **plus** an `Adjustment[]`. Nothing is ever silently
rewritten; every change is inspectable and revertible. This is what makes "the
tool never quietly alters the transcription" enforceable rather than aspirational.

```ts
type Finding =
  | { type: 'cell';   degrees: string[]; intervals: number[]; quality: Quality; … }
  | { type: 'device'; procedure: DeviceKind; target: Note; window: Note[]; … }

interface FindingCommon {
  occurrences: { bar: number; beat: number }[]
  detectedBy: DetectorId[]        // convergence — see §6.4
  confidence: number
  chordProvenance: Provenance
}

interface Exercise {
  notes: Note[]
  chords: Chord[]                 // required, or the validity gate cannot run
  finding: FindingId
  transformation: TransformationId
  sourceBars: [number, number]
  rationale: string               // written by the model
}
```

---

## 4. Ingest

Reads `.mxl` (zipped) and `.musicxml`. Normalises `divisions` (12/24/60/120 seen
in the corpus) to a common tick base. Merges tied notes. Reads `<transpose>` for
instrument identity — present in every corpus file, so instrument is never asked
for or guessed.

**Chord quality comes from `<kind>`. The `text` attribute is read only as a
display hint and never as semantics.** (F1) Under `use-symbols="yes"` MuseScore
writes `text="7"` for `major-seventh`, `minor-seventh`, `half-diminished`,
`diminished-seventh` and `augmented-seventh` alike — 112 of 220 harmonies in the
Coltrane 26-2 file. The failure is silent and unidirectional: everything becomes
a dominant, which looks plausible in a jazz chart while corrupting every degree.

**Chord-symbol text parser.** One corpus file in eight has no `<harmony>` at all
and stores chords as `<words>` (F2), in its own dialect (`D-`, `Fmaj`, `E7+9`),
sometimes two per bar with no offset — position inferred from the `<direction>`'s
place in the element stream. Required in v1, not a fallback. It emits a
`ChordTrack` with `provenance: 'file'` and a lower confidence than `<harmony>`.

Supported qualities must cover what the corpus actually uses: dominant,
minor-seventh, major-seventh, major, minor, diminished, diminished-seventh,
half-diminished, major-minor, augmented, augmented-seventh, dominant-ninth,
dominant-13th.

**Refuse rather than guess** when `<repeat>`, `<ending>`, `<segno>` or `<coda>`
appear (F9). None occur in the corpus, so written order equals played order — but
a single repeat barline would silently break chorus counting and every bar
reference in the output. Surface it and ask.

---

## 5. `prepare/` — the cleanup phase

Runs before any analysis. Emits `Adjustment[]`, never mutations.

**Three deciders.** The *engine* detects anomalies deterministically. The *model*
judges the ambiguous ones — held chord or missing chord, which annotation
convention this file uses — returning a typed verdict via structured outputs, not
prose. The *user* confirms anything above a confidence threshold, and always the
region selection.

Checks, ordered by the damage their failure does:

1. **Soloist segmentation.** (F3) "Tenor Madness" marks `Trane` at m1 and `Sonny`
   at m85 — 15 choruses, two players, attribution only in free text. Analysing
   across that boundary blends two vocabularies into findings belonging to
   neither. Runs first because everything downstream inherits the error.
2. **Region selection.** Which bars are the solo. Intros and heads vary (Autumn
   Leaves starts at m2, Bartley m5, Blake m65 after a 62-bar head). Proposed from
   marks, always user-confirmed.
3. **Form detection.** (F5) Autocorrelate the bar-by-bar chord sequence; take the
   smallest period with >75% agreement. Correct in 6 of the 7 chorded corpus
   files (99%, 97%, 97%, 100%, 100%, 79%), and it agrees with rehearsal marks
   wherever both exist — two independent methods cross-checking give a confidence
   score for free. Fall back to **root-interval** periodicity for forms that
   transpose each chorus ("Blues in All Keys" is 12 choruses in 12 keys, which
   defeats absolute-root matching).
4. **Structure-annotation interpretation.** (F4) Present in 5 of 8 files in three
   incompatible conventions — chorus numbers, section letters, or nothing.
   Cannot be parsed by convention; the model reads the marks and proposes.
5. **Chord track validation and replacement.** Flag implausible persistence and
   section boundaries with no change. Allow replacing the track wholesale from a
   reference source, carrying `provenance: 'reference'`.
6. **Unmarked pickup detection.** (F8) Exactly one bar across eight files fails to
   sum to its time signature — bar 1 of the Mintzer rhythm changes, an anacrusis
   not marked `implicit="yes"`. Cheap check; an unmarked pickup shifts every
   downstream beat position and silently corrupts every metrical judgment.
7. **Transcriber annotations as confidence signals.** (F10) The corpus contains
   `sloppy` (26-2 m49), `flat` (26-2 m112), `lay back`, `(straight 8ths)`,
   `growl`, `half-tonguing`. The first two are the transcriber saying *this is
   not what was meant* — machine-readable, already in the file. They lower
   confidence for findings in those bars and may exclude the region from
   vocabulary extraction.
8. **Flag, never correct:** range outliers (F7) and enharmonic spelling (F11).
   Bartley has 50 notes above written F6 because he plays altissimo; range is a
   stylistic signal, not an error signal. Spelling is inconsistent across the
   corpus but irrelevant to a pitch-class-based analysis — it matters only when
   rendering generated exercises.

**Rhythmic re-quantisation is out of scope.** It is the highest-risk edit, entry
is near-clean in the corpus (F8), and the pitch-domain detectors discard timing
anyway (§6).

---

## 6. `analyse/`

### 6.1 Phrase segmentation — the highest-risk component

Everything positional depends on it: phrase-ending findings, and later the
density and architecture layer. It gets its own module and its own tests.

Rests and inter-onset gaps carry it most of the time, but at bebop tempo phrases
run together with no rest at all. A naive rest-threshold segmenter run over the
Blake solo produced a 1-note phrase, a 3-note phrase, and phrases of 25, 26 and
29 notes — both over- and under-segmenting in the same 16 bars. v1 combines rest
duration, inter-onset gap, contour reversal at a long note, and bar/section
boundaries, and reports a per-boundary confidence.

Corpus sanity check: the Weimar figures say phrase beginnings run ~20% chromatic
against endings at ~5%. A segmenter that does not reproduce that asymmetry is
wrong.

### 6.2 Representations

- **Intervals** — successive semitone differences. Transposition-invariant.
- **Scale degrees** — chord-relative, with explicit chromatic labels (♯11, ♯9,
  ♭9, ♭13), computed against the active `ChordTrack`. **Degree strings carry the
  chord quality**, because the same shape over a different quality is a different
  object: `3572` over C major is 3-5-7-9; over Cm7 it is the relative-major
  maj7 arpeggio off the ♭3, which is what it actually was in the Blake solo.

### 6.3 The four detectors

| Detector | Finds | Needs chords | Source |
|---|---|---|---|
| Shape matcher | dictionary vocabulary, quality-aware | for degree matching | Frieler's n-gram work |
| WBA atom parser | scale runs, arpeggios, trills, 3-note approaches | no | Frieler 2019, implemented from the paper |
| Target/approach detector | multi-note enclosures and approaches | helps, not required | **ours** |
| Convergence scorer | agreement between the above | — | **ours** |

**WBA atom parser.** Nine classes (R, D, C, A, J, T, F, X, L) over the interval
sequence, timing discarded. Class-sweep parse in priority order — repetitions,
scales, arpeggios, trills, approaches, then residuals — taking maximal length at
each step, no overlaps. Approach (F) is exactly two intervals with a direction
change, net motion ≤ a whole tone, no interval wider than a major third, and at
least one interval a semitone or tone; enclosure when the first interval is
absolutely larger than the second.

It is substrate, not output. Real parses look like `-X4 -F2 +A4 +D7 -A3 -D3 +X2`
— dominated by residuals and diatonic runs, matching the distribution Frieler
reports. Nothing a player would read.

**Target/approach detector — the one contribution not in the literature.**
Motivated by a case all three published methods miss: Parker's `G♯ G C A B♭ B`
fails WBA's approach rule twice (five intervals against a limit of two; a +5 leap
against a ±4 ceiling) and parses as `+X3 +C2`, with "enclosure" appearing
nowhere. Shape-matching misses it for a different reason — the notes are
generated around whatever target the changes supply, so there is no fixed shape.

Invert the search:

1. Score candidate targets — metrically strong, long relative to neighbours,
   on or just after a chord change, a chord tone (3rds and 7ths weighted highest).
2. Look back over a window of 2–6 notes; prefer the smallest window that fits.
3. Test the relationship to the target.
4. Classify.

**Approach and enclosure are separate outputs.** A first pass that only reported
bracketed cases missed `G5 F5 G5 A♭5` — a real approach from below into the ♭3,
played identically in two different bars. Every gate is a weighted score, not a
boolean: a note a sixteenth late is still a target, with slightly less confidence.
The first conjunctive version fired 4 times in 16 bars of dense bebop, which is
too few.

This abstraction is also the noise filter. A shape-matcher copies literal notes,
so a transcription error propagates into the drill forever. A device detector
re-derives the figure from its rule, so re-targeting produces a correct figure
from a flawed source.

### 6.4 Convergence scoring

Findings carry which detectors produced them. Agreement across independent
methods raises confidence and partly substitutes for the deferred corpus
surprisal. In the Blake sample the shape matcher, the interval miner and the WBA
arpeggio class independently converged on the same span — a far stronger signal
than any one firing alone.

Confidence also inherits chord provenance and any transcriber annotation (F10).

---

## 7. `generate/`

Four transformations in v1:

1. **Through the cycle of fourths** — degree-preserving; works for cells and devices.
2. **Over the tune's own changes** — highest value per unit of work, since the
   changes are already parsed and the form is known.
3. **Selected permutations** for cells — a handful of the 24, not all. Bergonzi's
   own method says not to grind all of them.
4. **Re-targeting** for devices — the same procedure aimed at new chord tones.

Next, not v1: rhythmic displacement, tonal and real sequence. Gated behind the
validity test: inversion. Deferred: retrograde, retrograde-inversion,
augmentation, diminution.

**Exercises render in even eighth notes**, as the method books do. This sidesteps
rhythmic transcription noise entirely, because we are not reproducing the rhythm.
The source rhythm stays visible in the citation back to the solo. (Holds for
drills only — an etude *is* its rhythm.)

**Range clamping** against the instrument's written range, read from
`<transpose>`. Transposing-instrument handling is in the data model from the
start, not retrofitted.

### 7.1 The validity gate

> A transformation is valid for a finding if re-running the detector on the
> output still finds the same finding.

An executable test rather than a hardcoded allow-list, and it produces the right
answers unprompted: inversion **fails** for a digital pattern (1235 becomes
1-♭7-♭6-4 — good material, different harmonic object) and **passes** for an
enclosure (mirrored, it still brackets the target). Retrograde fails everything,
because bebop lines carry their information in the destination.

This is why `Exercise` carries its chords: without harmonic context a
degree-based finding cannot be re-detected.

### 7.2 Pedagogical restraint

Coker gives 400+ patterns in one key on purpose — the transposition *is* the
exercise. Generating all twelve keys can generate the learning away. v1 default:
print one key and name the cycle, with all-twelve as an option.

---

## 8. `agent/`

**Model:** `claude-opus-5`, adaptive thinking, TypeScript SDK
(`@anthropic-ai/sdk`), tool runner for the loop. Structured outputs for every
decision step so verdicts come back typed rather than as prose to parse. Effort
tuned per stage — commentary needs more thinking than a held-chord classification.
Prompt caching over the stable analysis document.

**No fine-tuning.** Not offered for Claude, and it would not be the lever anyway:
of the model's three jobs — selecting among engine-supplied candidates, naming
them in jazz vernacular, writing the commentary — none is a musical computation.
All are in distribution. The levers that matter, in order: tool design, few-shot
examples in the system prompt, structured outputs, effort.

**The model's jobs**

- In `prepare/`: judge ambiguous cleanup cases, interpret annotation conventions.
- In `analyse/`: choose which findings are worth teaching; **name them**. The
  engine correctly returns `3572 over Cm7`; turning that into "the relative-major
  maj7 arpeggio off the ♭3, approached by semitone from below" is language work.
- In `generate/`: choose which transformations serve a finding.
- Write the report.

### 8.1 Output format

Adopted from Mintzer's etude commentary, which is already the right shape: a
numbered *things to look for* list, each item anchored to a bar or rehearsal
letter, each naming one device, with a small engraved example where it earns one.
Every claim carries its location so it can be checked against the score.

Each exercise carries a one-line rationale naming the vocabulary it drills and
the bar it came from — model-written prose, engine-written notes.

---

## 9. `render/`

OSMD in the browser for display; MusicXML export for the stand and for MuseScore.
Exercise output only — the source transcription is never re-exported.

---

## 10. Testing

The nine-file corpus in `docs/research/corpus-survey-cleanup.md` is the fixture
set. Golden tests that can actually fail:

| Test | Expectation |
|---|---|
| Chord quality trap (F1) | Coltrane 26-2 bar with `kind=minor-seventh text="7"` reads as minor, not dominant |
| Chord-text parser (F2) | Parker file yields a usable `ChordTrack` from `<words>` |
| Soloist split (F3) | Tenor Madness splits at m85 |
| Form detection (F5) | 26-2 → 32; Sandu → 12; Tenor Madness → 12; Bartley → 40 |
| Transposing form (F5) | Blues in All Keys → 12 via root-interval fallback |
| Pickup (F8) | Mintzer rhythm changes bar 1 flagged |
| Known finding | Blake bars 73 and 77 both yield the `[+1,+4,+3,+4]` device over a minor chord |
| Segmentation | phrase-start vs phrase-end chromaticism asymmetry reproduced |
| Validity gate | inversion passes for an enclosure, fails for 1235; retrograde fails both |

The Weimar Jazz Database can be added later as dev-time fixtures for broader
ground truth; it is not a shipped dependency.

---

## 11. Milestones

- **M1 — ingest + prepare.** The riskiest and highest-value work; the corpus
  survey says most real failures live here.
- **M2 — analyse.** Segmentation first, then the four detectors and convergence.
- **M3 — generate** and the validity gate.
- **M4 — agent** and the report.
- **M5 — web app.**

**Beyond v1**, in the order they earn their place: density and silence
measurement; implied reharmonisation (F6 gives it raw material for free); corpus
surprisal and discovery of unnamed cells; head-quotation detection (the same
files contain the tune, and Mintzer's framing is that a good solo extends it);
then etudes.

Etudes are a categorically harder problem — voice-leading between cells, phrase
rhythm across a form, breathing space, build and release. And a *set* of etudes
needs a thesis: Mintzer's two volumes have explicit opposing theses, with every
etude serving the book's axis. Fourteen individually-coherent studies that do not
add up to an argument would miss what makes those books work.

---

## 12. Risks

| Risk | Mitigation |
|---|---|
| Phrase segmentation is unsolved and everything positional depends on it | Own module, own tests, per-boundary confidence, corpus asymmetry check |
| Target detector is unvalidated — it is ours, not from the literature | Golden tests on known figures; convergence scoring so it is never the sole evidence |
| Silent chord misreads corrupt every degree | `kind` never `text`; provenance on every track; findings report the provenance they rest on |
| Findings are trivia | Convergence scoring; curated quality-aware dictionary; deferred surprisal is the real fix |
| Agent asserts something the engine did not compute | Every note-level fact comes from a tool; every claim carries a bar reference the user can check |
