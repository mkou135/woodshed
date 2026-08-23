# What is a "pattern"? — research notes (2026-08-23)

## Sources
- Frieler, "Constructing Jazz Lines: Taxonomy, Vocabulary, Grammar" (Jazzforschung heute, 2019)
  https://jazzforschung.hfm-weimar.de/wp-content/uploads/2019/06/JazzforschungHeute2019_Frieler-Constructing-Jazz-Lines.pdf
- Frieler, "Patternology: Melodic Pattern Usage in Charlie Parker's Solos" (2017)
  http://www.mu-on.org/download/frieler_patternology_2017_en.pdf
- Frieler/Pfleiderer/Zaddach/Abesser, "Midlevel analysis of monophonic jazz solos" (Musicae Scientiae, 2016)
- Owens, "Charlie Parker: Techniques of Improvisation" (UCLA diss., 1974) — archive.org
- Jazzomat / Weimar Jazz Database: https://jazzomat.hfm-weimar.de/

## Three different senses of "pattern" (they are NOT the same object)

1. SHAPE — a fixed sequence, matched literally.
   Representations, in increasing musical meaning:
   - absolute pitch
   - interval sequence (transposition-invariant): 1235 => [+2,+2,+3]
   - CDPCX = extended chordal diatonic pitch class (chord-relative scale degree,
     with chromatic labels #11, #9, b9, b13, ...). 1235 => "1235"; the common
     Parker cell "3572" is 3-5-7-9.
   Frieler's Parker study mines n-grams over all three. CDPCX is the one that
   produces names a musician recognises, and it REQUIRES time-aligned chords.

2. DEVICE — a relationship to a target note, not a fixed shape.
   Frieler's Weimar Bebop Alphabet (WBA): parse the interval sequence of a phrase
   into non-overlapping "melodic atoms", 9 classes:
     R repetition, D diatonic scale extract, C chromatic scale extract,
     A arpeggio, J jump arpeggio, T trill, F approach, X residual (>=2 intervals),
     L link (residual, 1 interval)
   Operational definitions (from the paper):
   - drop all timing; work on semitone interval sequence
   - R/D/C/A/J/T each need >= 2 intervals (3 notes)
   - D, C, A, J: "maximal length in one direction" — atom extends as far as the
     run continues ascending or descending
   - T: two alternating pitches a semitone or whole tone apart
   - F (approach): exactly 2 intervals (3 notes) with (a) change of direction,
     (b) net movement <= a whole tone, (c) max interval size <= major 3rd (+/-4),
     (d) at least one interval is a semitone or whole tone.
     => 8 possible approaches. Sub-types:
        ENCLOSURE: target tone lies between the framing tones; characterised by
          |first interval| > |second interval|.  e.g. [2,-1], [-2,1]
        ESCAPING: third tone outside the range of the first two, e.g. [-1,3], [1,-2]
     The four "intrinsically chromatic" approaches (not a subset of any diatonic
     scale) are [2,-1], [-2,1] (enclosures) and [1,-2], [-1,2] (escaping).
   - Parsing is made unique by (i) priority order: repetitions > scales >
     arpeggios > trills > approaches > X/links, taking maximal length at each step;
     (ii) no overlaps allowed.
   - Notation: [direction][type][length], direction in {+,-,=}, length = number of
     intervals. e.g. =R7, +A7, -X6, -F.
   - Corpus result: 80,600 atoms over 456 WJD solos; mean atom length 2.4 notes.
     Most common: D, L, X.
   NOTE: multi-note enclosures like Parker's G# G C A Bb B are chains of atoms,
   not a single F atom. WBA's F is strictly 3 notes. Longer circling figures need
   either an atom-sequence pattern (e.g. F followed by F) or a separate
   target-note-relative detector layered on top.

3. FUNCTION / POSITION — where the thing sits.
   MLU (midlevel units): 9 categories — line, lick, theme, quote, melody, rhythm,
   expressive, fragment, void (+19 sub, 41 sub-sub). Human-annotated in WJD, 140
   solos, 4939 units. Distribution: lick 44.3%, line 33.5%, melody 7.0%,
   expressive 4.9%, rhythm 4.9%.
   Cheaper machine-derivable positional features that matter for us:
   - position within phrase (start / interior / end)
   - metrical position of the pattern's first note (Frieler: short n-grams are
     metrically dependent)
   - relation to a chord change (does it land on / lead into the change?)
   - what note it targets and that note's chord function (3rd, 7th, b9...)
   WJD data point: phrase beginnings are more chromatic (20.4%), phrase endings
   more diatonic (5.0% chromatic). Parker's chromatics are mostly offbeat.

## The single-solo problem (important)
Frieler's Parker n-gram results show naive frequency mining surfaces trivia:
top interval patterns are [-1,-1,-1], [-2,-1,-2], [-1,-2,-1] — chromatic and
diatonic runs. Also: "Parker plays basically ONLY patterns" — interval-pattern
coverage of his solos is ~100% at min length 3 / >=2 solos. So "recurs often"
is nearly vacuous as a criterion on its own.
=> To say a pattern is CHARACTERISTIC rather than merely frequent, you need a
   background corpus and a surprisal / TF-IDF-style weighting, or a curated
   dictionary of named vocabulary, or both.

## Corpus availability
Weimar Jazz Database v2.1: 456 solo transcriptions, SQLite3, with beat and chord
annotations, plus unquantized MIDI of all solos.
Licence: Open Data Commons ODbL (attribution + share-alike on derived DBs).
MeloSpySuite tooling: GPL.
=> Usable as (a) ground truth for tests, (b) the background corpus for surprisal.
   ODbL/GPL terms need checking before any redistribution.
