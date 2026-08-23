# Generating exercises from detected vocabulary — research notes (2026-08-23)

## Prior art in software

- **Impro-Visor** (Robert Keller, Harvey Mudd; free, open source, SourceForge).
  Generates licks and whole choruses from a user-modifiable grammar. Can *learn*
  that grammar from a corpus: abstracts solos into melodic fragments, encodes the
  connections as a Markov chain inside a stochastic context-free grammar, and
  re-instantiates new melodies. Ships with grammars learned from named players,
  some from a single solo.
  => Closest prior art by far, but aimed elsewhere: its output is *a new solo in
  the style of*. Ours is *a drill for the vocabulary in this one*. Style transfer
  vs pedagogy.
- **Dig That Lick / PatternExplorer** (Frieler) — corpus search with regex-style
  queries. Analysis, no generation.
- **Band-in-a-Box** — rhythm section to play against. Context, no derivation.
- **Birdmode** (CCRMA Stanford) — algorithmic rhythm-changes solos in Parker's
  style. Generation as imitation.

**The gap:** every mature tool either searches a corpus or generates imitations of
it. None takes a solo the player brought, identifies what is in it, and returns
graded material to practise that specific thing.

## Prior art in print

- **Bergonzi, _Inside Improvisation Vol. 1: Melodic Structures_.** Four-note cells
  defined by scale degree — 1235 over major/dominant, 1345 over minor — generated
  by *permuting the order of the four notes* (24 orderings), then plugged into a
  tune one cell per chord change. Effectively a published generator spec. Note it
  is NOT inversion/augmentation/sequence: it reorders a fixed pitch set and moves
  that set through harmonic contexts.
- **Coker et al., _Patterns for Jazz_.** 400+ patterns on chords and scales.
  Patterns given in ONE key by design; the student works out the other eleven by
  ear. => Design warning: auto-generating all twelve keys removes the exercise.
- **Slonimsky, _Thesaurus of Scales and Melodic Patterns_ (1947).** Exhaustive
  enumeration of interval space, corpus-independent. The boundary marker for what
  purely systematic generation looks like.
- **Crook, _How to Improvise_.** Treats motive development, rhythmic displacement
  and over-the-barline phrasing as topics practised deliberately.

**Common thread:** the dominant operations across the practice literature are
*context variation* (same material, new harmony/key/position) and *permutation*
(same pitches, new order). The classical developmental toolkit is largely absent.

## Mintzer — read from the books directly

Two volumes, opposing theses, stated in the introductions:
- _14 Jazz & Funk Etudes_ — the complex end: chromaticism, dissonance,
  syncopation, over-the-barline rhythm.
- _14 Blues & Funk Etudes_ — written as the corrective. Deliberately less
  chromatic; about (1) playing a simple melody slowly and beautifully, (2) making
  it groove, (3) interacting with the rhythm section — the soloist becoming
  "a member of the rhythm section".
So a *book has an axis* and every etude serves it.

Stated method: learn the etude slowly, play it against the accompaniment, THEN
read the text. Further uses: solo over the whole etude, play with a live rhythm
section, use the tunes as models for your own writing.

**Commentary structure — this is a spec for our output.** Each etude is prefaced
by an explanation plus a numbered "things to look for" list, nearly every item
anchored to a bar number or rehearsal letter, with small engraved examples where
needed. Items fall into five kinds:
1. **Architecture over time** — one etude described chorus by chorus: first sparse
   and melodic, each successive one more intense, sixteenths by the seventh; the
   stated aim is showing how a solo is built with shape, evolution and momentum.
2. **Located devices** — tritone sub in bar 4; Coltrane changes in bars 1-4 and
   9-12 as an organised way outside; pentatonic and triadic material bars 7-9;
   ascending fifths a major third apart.
3. **Space, and the reason for it** — first eight bars sparse for two stated
   reasons: leave the solo somewhere to go, and leave room for the rhythm section.
4. **Harmonic setting in a sentence** — "in the G7sus zone; G pentatonic works
   across every change; both thirds in play".
5. **The caveat** — the written notes are only part of it; the rest is listening.

### What that changes for us
- **Rests are content.** The best observation in either book is about notes that
  aren't there. Phrase density and silence must be first-class measurements.
- **A detector class we hadn't planned:** implied reharmonisation — comparing what
  was *played* against the changes that were *written* to infer the substitution
  the soloist implied.
- **Output format settled:** numbered, location-anchored items, one device each,
  engraved example where it earns one.

## The validity test (ours, not from the literature)

A transformation is valid for a finding if **re-running the detector on the output
still finds the same thing.** Turns "is inversion allowed?" from an argument into
an executable check, and gives answers matching musical intuition:

| Transformation | Preserves | Cells | Devices | Verdict |
|---|---|---|---|---|
| Transpose through cycle | intervals + degrees | safe | safe | MVP |
| Apply over changes | degrees | safe | safe | MVP |
| Permutation | pitch set, harmony | safe | — | MVP |
| Re-targeting | the procedure | — | safe | MVP |
| Rhythmic displacement | all pitch content | safe | safe | next |
| Tonal sequence | degrees, not intervals | safe | usually | next |
| Real sequence | intervals, not key | safe | safe | next |
| Inversion | interval sizes only | FAILS | passes | gated |
| Augmentation / diminution | pitch, not character/playability | marginal | marginal | low |
| Retrograde | pitch multiset only | FAILS | FAILS | defer |
| Retrograde-inversion | interval multiset | FAILS | FAILS | defer |

Why inversion splits: invert 1235 and you get 1-b7-b6-4 — good material, different
harmonic object. Invert an enclosure and you have bracketed the target from the
other side — still an enclosure.

Why retrograde fails everything: bebop lines are directional, built to arrive.
Reversed, they begin on the resolution and travel away from it. Pitch multiset
identical, function destroyed.

## Consequences for the design
- Exercises render in **even eighth notes**, as the method books do. Sidesteps
  rhythmic transcription noise entirely — we aren't reproducing the rhythm.
  (Only holds for drills. An etude *is* its rhythm.)
- An `Exercise` carries **notes + changes + provenance + the finding it drills**,
  or the re-detection gate cannot run.
- Etudes are a categorically harder problem: composition, not transformation.
  Needs voice-leading between cells, phrase rhythm across a form, breathing space,
  build and release. And a *set* needs a thesis, per Mintzer. Roadmap, not v1.
