# "Through the tune" and "Vary it" — what the sources actually mean (2026-08-24, session 6)

Owner's questions after using the page: is "through the tune" the numbered
shape or the actual lick? "Vary it" shifts the whole phrase by a beat and
the note on beat 1 clashes — that can't be what the method means.

## What the engine does today

- **Through** (`practice/steps/through.ts`): takes each *named cell* (its
  scale degrees + chord quality), and re-spells it on every chord of the
  same quality family in the tune. Blake u1 "major-seventh arpeggio from
  the ♭3" (Ab C Eb G on Fm) becomes Bb D F A on Gm, A Db E Ab on Gbm7, Eb G
  Bb D on Cm7. The rhythm and the rest of the lick are dropped. So: the
  numbered shape, not the lick.
- **Vary** (`practice/steps/displace.ts`): moves the whole idea's onsets by
  a fixed offset (on 1, and-of-1, on 2, pickup) under the *same* chords;
  only the last note's chord-tone status is checked. Nothing keeps chord
  tones on downbeats, so a passing note can land on beat 1.

## What the sources say

- **Galper, "Developing Style, Part 1"**: "Make them into exercises and
  learn them in all twelve keys. Once you've learned them, try to alter
  them to fit over other sets of changes. Reorder the components in the
  idea to find different ways to put them together." — *Alter to fit*, i.e.
  adapt the lick to each new progression, not drop a degree shape on every
  chord and not slide the lick unchanged.
  https://halgalper.com/articles/developing-style-part-1/
- **Baker, *How to Play Bebop* vol. 3**: identify the line's harmonic
  function and *the progression it fits* (ii–V, turnaround, static major…),
  then play it in twelve keys and over that progression wherever it occurs.
  The unit taken through a tune is the whole line, matched to a
  progression slot, not to single chords.
- **Coker, *Patterns for Jazz***: patterns printed in one key on purpose;
  the student transposes by ear. Same for Bergonzi: a cell "one per chord
  through a tune" — but Bergonzi's cells are 4-note pitch sets placed on
  chords of matching quality, which is exactly what our *through* step
  does. So the engine's step is Bergonzi's drill, labelled as if it were
  Baker/Galper's.
- **Barry Harris (half-step rules)**: displacement is never "shift the
  line". His rule set adds or removes passing half-steps so that chord
  tones 1-3-5-7 land on downbeats *after* you start the line on a
  different degree or beat — the line is rebalanced, not slid.
  https://www.jazzguitarlessons.net/blog/barry-harris-bebop-scales-practice-model
  https://jenslarsen.nl/why-barry-harris-approach-is-so-much-better-than-bebop-scales/
- **Crook, *How to Improvise***: rhythmic displacement and over-the-barline
  phrasing are practised as deliberate topics — as a *listening/feel*
  exercise, and he pairs it with "isolate one variable".
- **Consensus list (practice-methodology.md §2)**: step 8 "take it through
  a tune — every ii–V / turnaround / major / minor where it fits"; step 9
  "vary: rhythm, start beat, recombine fragments" with the Barry Harris
  citation on start points.

## Reading

1. **Through the tune should carry the lick, not the cell**, and it should
   be placed by *progression slot*, not by chord: find the bars of the tune
   whose chord sequence matches the harmony under the idea (same qualities,
   same root intervals — e.g. ii–V in any key, or a static m7 bar), and
   transpose the whole idea (pitches and rhythm) into each slot. What we
   have now (degree-cell on every matching chord) is a *different, valid*
   drill — Bergonzi's — and should keep its own name ("the cell on every
   Fm-family chord") or move under 12-keys.
2. **Vary it should not shift a fixed line under fixed chords.** Options
   the sources support: (a) shift *and* keep the chords moving with the
   line (the lick still fits; only the metric feel changes — Crook's
   over-the-barline); (b) shift by a whole bar/two beats so the harmonic
   rhythm re-aligns; (c) Barry Harris-style rebalancing — drop or add a
   passing tone so the chord tones return to the downbeats (only sound for
   scale-wise lines, and needs the arrival logic we already have for every
   downbeat, not just the last note). Reordering fragments (Galper) is
   pitch-safe and unimplemented.

Evidence class: published method books + one teacher's article; no
controlled study distinguishes any of these.
