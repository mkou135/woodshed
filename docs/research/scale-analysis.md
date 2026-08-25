# Annotating the scales a soloist plays — research notes (2026-08-25, session 10)

Owner's ask: annotate the transcription with the scales/modes actually being
played — "the interesting different scales, for example imposing a scale which
suggests another chord" — plus a toggle for the full, every-span view, "so the
user decides if they want everything or just the spicy stuff."

**Headline: the spicy layer, as a pitch-content detector, does not survive
measurement. The full-coverage layer does, and is more than a restatement of the
chord symbol.** Four formulations were built and killed against null models on
the Weimar Jazz Database. Details in §4; the two things that survive are in §6.

## Sources

- Mark Levine, *The Jazz Theory Book* (Sher Music). Chord/scale theory ch.3;
  "Playing Outside" ch.8.
- Barrie Nettles & Richard Graf, *The Chord Scale Theory & Jazz Harmony*
  (Advance Music, 1997). The Berklee chord-scale doctrine. Printed page = PDF+1.
- Ron Miller, *Modal Jazz Composition & Harmony* Vol 1 (Advance Music, 1996).
- Jerry Bergonzi, *Inside Improvisation* Vol 1 *Melodic Structures*, Vol 2
  *Pentatonics*.
- Steve Larson, *Analyzing Jazz: A Schenkerian Approach* (Pendragon, 2009);
  Thomas Owens, *Charlie Parker: Techniques of Improvisation* (UCLA diss. 1974);
  Bert Ligon, *Jazz Theory Resources*; Jerry Coker, *Elements of the Jazz Language*.
- Weimar Jazz Database, `~/dev/woodshed-data/wjazzd.db` (ODbL, never committed).
  456 solos; 27k chord spans; 15,414 human-annotated IDEA and 11,082 PHRASE
  sections. Only aggregate statistics appear below.

Books are the owner's local copies at `~/Downloads/MusicXML Transcriptions/Jazz
Books/`; nothing from them is vendored. Claims are paraphrased with page cites.

## 1. What the pedagogy actually claims

**A chord scale is chord tones + available tensions + avoided note(s)**
(Nettles p.25). Arranged as a scale the seven pitches match a modal pattern, and
"the modal name is used regardless of the compositional context" (p.26). Nettles
is explicit (p.13) that outside ch.11 the modal names are *functional labels for
an intervallic pattern*, not a claim that the music is modal.

**The choice of scale is decided by function, not by the chord symbol alone**
(Nettles p.92, and the glossary p.177: "The appropriate scale for a given chord
is determined by the function of the chord"):

- chord with a diatonic root → use the diatonic non-chord tones;
- dominant resolving **down a perfect 5th** → some form of **Mixolydian**;
- dominant resolving **otherwise** → **Lydian ♭7**;
- nondiatonic root → the scale needs a specific justification.

This is the finding that makes a full-coverage layer worth building: the same
symbol `C7` takes a different scale depending on where it goes, so the layer is
not merely re-printing what is already above the staff.

**Avoid notes are a voicing prohibition, not a melodic one.** Nettles p.26: an
avoid note is a non-chord tone a half step above a chord tone — a rule, not a
lookup table. But all seven chord-scale pitches "are melodically available"
(p.25), and decisively (p.27): "Although avoid notes do not occur harmonically,
their inclusion melodically is what defines a specific function for a chord.
Avoid notes are the pitches from which each chord derives its characteristic
sound." **A departure detector must therefore not treat an avoid note as
evidence of anything.** The departure signal the book supports is a pitch
*outside the seven-note chord scale*, or a chord scale other than the default.

**Character notes.** Three sources converge on one concept:
- Nettles ch.11 p.152: modes differ "by the specific location within the mode of
  one particular pitch — the character note". **One per mode**, and as an
  observation (p.153) each is one of the two pitches of the diatonic tritone and
  "must be present": Ionian ♮4, Lydian ♯4, Mixolydian ♭7, Dorian ♮6, Aeolian ♭6,
  Phrygian ♭2, Locrian ♭5.
- Levine p.77 gives the melodic-minor analogue as a four-note set (§2).
- Ron Miller ch.IV is titled "Characteristics of the Unaltered Diatonic Modes".

Note Nettles gives no identification *procedure* — the tritone relation is stated
as an observation, not a derivation.

**Devices named for playing away from the chord.** Levine ch.8: sequences
(p.185), playing a half step away (p.187), a tritone away (p.188), playing
scales to get outside (p.189), the chromatic scale (p.191). "Side stepping" is a
half or whole step away; the shape is *inside-outside-inside*. Levine's own
caveat (p.183) is worth keeping: "what's considered outside is subjective and
changeable" — Bird was heard as out in the 40s, Coltrane in the 60s. **Evidence
class: taste. Any threshold we set is a convention, not a fact.**

Levine p.187 also observes that a D triad over Cmaj7 sounds *inside* (9, ♯11, 6)
while a D♭ triad is maximally outside — i.e. **distance along the cycle of
fifths, not semitone distance, predicts how outside a superimposition sounds**.
Ron Miller's independent brightness ordering (Lydian > Ionian > Mixolydian >
Dorian > Aeolian > Phrygian > Locrian, p.28) is the same axis: cumulative
flatting. Two sources agreeing gives a computable spiciness axis, if one is
ever wanted.

## 2. Levine's witness sets — verified, and their limits

Levine p.77 claims the 3rd, 5th, 7th and 9th of any melodic minor scale, played
together, occur in no other melodic minor key, no major key, no diminished and
no whole-tone scale; likewise root-3-5-7.

**Verified computationally, and it is exhaustive**: those are the *only* two
unique 4-note subsets, and every 3-note subset fails. Four notes is the minimum.

Witness size is a function of the candidate universe, which is ours to choose:

| universe | major | melodic minor | diminished | whole-tone |
|---|---|---|---|---|
| Levine's (major, melodic minor, diminished, whole-tone) | 4 | 4 | 4 | 6 |
| the same + harmonic minor | 5 | 5 | 4 | 6 |

C melodic minor's 3-5-7-9 (D E♭ G B) is a subset of C harmonic minor, so adding
harmonic minor breaks the four-note claim. Levine is correct within the universe
he names. This is a design choice with a number attached, not an error.

## 3. How many notes a span actually gives you

Distinct pitch classes available to a claim (WJD):

| unit | median pcs | ≥4 pcs | ≥5 pcs | median notes |
|---|---|---|---|---|
| chord span | 4 | 58.5% | 39.2% | 5 |
| IDEA (human-annotated) | 6 | 82.3% | 68.6% | 10 |
| PHRASE (human-annotated) | 7 | 87.7% | 78.3% | 13 |

A four-note witness is simply unavailable on 41% of chord spans. If a
collection-level claim is ever made, **the idea is the only unit with enough
notes** — which agrees with the engine's existing rule that detectors never
cross an idea boundary (`samePhrase`, ENGINE_SPEC "Note context").

## 4. Five formulations, measured and killed

Every number below is paired with a null model. A detector that fires no more on
real music than on randomised music is detecting nothing.

**DEAD 1 — witness sets over a chord span's pitch classes.** Label when the span
contains a witness for a collection other than its default chord scale and every
note fits that collection.
real **5.29%** of spans · null 8.00% / 8.07% · **ratio 0.66x**

**DEAD 2 — the same, requiring the notes consecutive** (sliding windows under one
chord):

| window | real | null (chord moved) | null (notes moved) |
|---|---|---|---|
| 5 notes | 7.58% | 7.97% | 7.86% |
| 6 notes | 9.97% | 10.97% | 10.83% |
| 7 notes | 10.64% | 12.27% | 12.17% |
| 8 notes | 10.34% | 12.32% | 12.27% |

Below null at every length. Contiguity does not rescue it.

**DEAD 3 — degree-based character notes relative to the chord** (dominant
carrying 3 of {♭9,♯9,♯11,♭13} → altered; maj7 with ♯11 → Lydian; …).
real **49.4%** · null 59.2% / 50.4% · **ratio 0.90x**. Also far too chatty to be
usable even had it worked.

**DEAD 4 — metric and durational weight (the Baker hypothesis).** The idea being
that placement, not presence, carries the meaning: a ♯11 as a passing eighth is
nothing, a ♯11 that is long or on a strong beat is a colour choice. 18,839 spans,
444 solos, six weighting schemes, ~130 (scheme, gate, subset) cells, no threshold
tuning.

The clean instrument is **LIFT** = (share of a span's weight carried by
non-chord-scale notes) ÷ (share of its notes that are non-chord-scale), which
divides out *how much* outsider material a span has and tests only *where it
sits*. Null = permute the weights within the span, holding pitches and chord
fixed; expected LIFT is 1.0 by construction and measures 1.000–1.002.

| weighting | real LIFT | null | ratio |
|---|---|---|---|
| duration | 0.911 | 1.001 | **0.910** |
| metric position only | 0.971 | 0.999 | **0.972** |
| duration × metric | 0.884 | 1.000 | **0.884** |
| duration² | 0.852 | 1.002 | **0.850** |
| duration × metric × salience | 0.845 | 1.001 | **0.844** |

The sign is backwards from the hypothesis, the effect is large, and it is
**monotone in how hard the scheme leans on placement**. A non-chord-scale note
carries about three quarters of an average note's weight in the same span.

**Baker's rule is confirmed by this, and that is precisely why the detector
cannot work**: the idiom deliberately places chromatic notes where metric weight
is lowest, so the very notes a departure detector needs to see are the ones the
style hides. Tightening the gate makes every variant monotonically worse
(threshold sweep 0.83 → 0.38; character-note gate 0.77 → 0.60), which is also
the evidence against "it is a rare event that aggregate statistics miss" — a real
high-precision tail would make tightening better, not worse. The IDEA unit does
not help (0.35–0.41).

**DEAD 5 — voice-leading behaviour.** The one formulation that ever showed a
ratio above 1.0, and the reason it did. The idea: an approach note and a colour
note differ in what *follows* them — a passing #11 resolves by step to a chord
tone, a Lydian #11 that is the point of the line is dwelt on or leapt away from.

193,018 notes across 456 solos, under the corrected function-aware defaults
(§1) with blues identified from `composition_info.tonalitytype` (**97 of the
456 solos**) and Mixolydian #9 on the blues I7.

**The earlier encouraging 1.659 was a composition artefact.** Reproducing it
exactly — outsider resolution against an undifferentiated "everything else"
bucket — gives 1.611. Split the bucket by what the notes actually are and it
evaporates:

| note class | resolves by step to a chord tone | n |
|---|---|---|
| chord tones | 0.0969 | 96,605 |
| available tensions | 0.4366 | 46,342 |
| avoid notes | 0.4447 | 7,589 |
| **outsiders** | **0.3550** | 42,482 |

Outsiders resolve *less* than either insider dissonance class. The pooled
comparator was dragged down by chord-tone arithmetic alone — chord tones mostly
leap, because they are the notes a line arpeggiates.

Against a proper null (permute note order within the span, holding the pitch
multiset and chord fixed) every class lifts 1.9–2.4x, which is melodies being
stepwise, not voice leading. The double ratio — outsider lift over comparator
lift — runs **0.862 to 1.195 across a pre-declared 144-cell grid, median 1.067,
with not one cell above 1.2.** The headline cell bootstraps to 1.141 ± 0.019, a
few sigma above 1 but with a specification spread ten times the error bar.

**The markers point the wrong way.** Outsiders are **0.750x** as likely as
chance to end a phrase or idea or precede a rest, and **0.871x** as likely to be
longer than both neighbours — depleted in exactly the positions a deliberate
colour note should occupy. This is attempt 4's finding again in another domain.

Why it cannot work: an out-of-scale pitch class is geometrically almost always a
semitone from an in-scale one, so widening the resolution window from a semitone
to a whole tone adds 0.062 to outsider resolution but 0.324 to tensions — the
shuffle absorbs the resolution automatically. And non-resolving outsiders are
**12% of all notes**, which is not a detector that stays silent.

**What the same measurements say is real:** lines fit the default chord scale
exactly on **37.6%** of spans against **16.4%** under the null — a 2.3x effect.
(To be re-measured under the corrected, function-aware default table of §1.)

### Methodological trap, recorded so it is not repeated
Never average a null shift into an aggregate when the default collection is
invariant under that shift. A tritone chord shift is a **no-op** on diminished
spans (the octatonic is tritone-invariant), which made diminished appear to carry
signal; against valid nulls only it is 16 spans of 330 with a flat permutation
ratio. The same latent bug exists for augmented under whole-tone shifts.

## 5. How analysts mark up a transcription

Surveyed across Coker, Owens, Ligon and Larson. **Levine's convention is the
minority one** — three of the four independently converge on a different device,
and Larson is compatible with it.

**The analysis band sits ABOVE the staff, between the staff and the chord
symbols.** A span is a **solid** horizontal line with a short tick at each end
pointing *down* at the staff, the ticks aligned to the first and last
**notehead** — not to the barline. A short plain-text label sits on or interrupts
the line.

```
      Fmaj7       Em7b5   A7(alt.)        <- tier 2: chord symbols
   |-- bebop scale --|  |- encl. -|       <- tier 1: analysis, ticks point DOWN
 --+-----------------+--+---------+--     <- staff
```

- **Nesting is vertical**: the longer span goes on the higher tier (Coker and
  Owens arrive at this separately).
- **Solid always; dashed is reserved for *inferred*.** Larson uses dashed for
  implied connections, Owens for uncertain span starts, and in Coker a dashed
  horizontal already means *8va*. This contradicts Levine (p.187/189), who uses
  dashed for everything and puts it below the staff; follow the majority.
- **Only harmonic material goes below the staff** (Larson: figured intervals,
  roman-numeral spans at two depths). The rule fitting all four sources:
  *melodic/motivic above, harmonic below*.
- **System breaks** (Coker, worth copying exactly): drop the terminal tick at the
  right margin, resume at the left margin with no opening tick, and hyphenate the
  label across the break.
- Coker already notates departure two ways we can reuse: a **parenthesised chord
  symbol** on the chord tier means "not in the tune's changes" — `(A7)`, `(Fmaj7)` —
  and his label grammar is `element (implied chord or scale)`, e.g. "bar-line
  shift (A7 alt.)", "harmonic generalization (F Blues scale)". Where a passage is
  ambiguous he **prints both readings** rather than resolving.

### Density — the number that sizes the feature

Counted label-by-label on Coker's densest analysed page (printed 91, bars 29-64):

| what is counted | marks | per bar |
|---|---|---|
| all 19 of his element types | 28 | 0.78 |
| spans asserting an implied harmony *other than the written chord* | 7 | **0.19** |
| spans naming an explicit scale | 1 | 0.03 |

The middle row is this feature: **about 0.2 marks per bar, one per four or five
bars.** Owens reaches the same figure by an independent route (one catalogued
motive roughly every four bars).

Three of the authors state in prose that marking everything is the failure mode:
Ligon p.126 (a numeral on every chord imparts no information), Coker p.84 (the
untagged residue is the creative part), Larson p.2 (clutter without informing).
Larson's 50 pages of full transcriptions carry **zero** analytical marks — his
analysis lives in separate reduced graphs, never on the transcription itself.

**Caveat: no book prints a legend.** This is observed practice, not a documented
standard.

## 6. Where this leaves the feature

Two things survive, and neither requires inference:

1. **The baseline chord-scale layer** — the owner's "show everything" toggle.
   Well founded (2.3x above chance), and thanks to Nettles p.92 it carries real
   content: a dominant resolving down a fifth takes Mixolydian, one resolving
   otherwise takes Lydian ♭7. Same symbol, different scale, decided by function.
2. **Chart-declared departures.** `Chord.tensions` already carries `['b13',
   '#11']` from `<kind>` and nothing consumes it. `C7alt`, `F7#11`, `Cmaj7#11`
   are cases where the transcriber *heard* the non-default scale and wrote it
   down. Naming those is deterministic and never wrong. It is a fraction of the
   spicy layer imagined, but it is the part with evidence behind it.

Open, and blocking any label: **enharmonic spelling.** `Note.midi` gives pitch
classes only, so "D♭ melodic minor" vs "C♯ melodic minor" has no answer from the
data. The render section already resolves this for exercises via
`Score.keyFifths`; the annotation layer should reuse that rule.

## 7. What would reverse the negative result

- A **different evidence class**, not another gate on pitch content. Voice-leading
  behaviour is the strongest candidate — an approach note and a colour note differ
  in what *follows* them, not in what they are.
- **Human-labelled departures** to score against, replacing the null-model framing.
  The null answers "is this better than chance"; it cannot answer "does this find
  the six spots a teacher would circle."
- A corpus of deliberately outside playing (late Coltrane, Woody Shaw, Liebman)
  rather than the WJD's mainstream weighting.
