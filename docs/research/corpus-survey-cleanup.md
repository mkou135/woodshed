# Cleanup-phase findings from a corpus survey (2026-08-23)

Sample: 9 MusicXML transcriptions — 8 community `.mxl` files (Coltrane 26-2,
Parker "All The Things You Are", Cannonball "Autumn Leaves", Mintzer "Blues in
All Keys", Mintzer rhythm changes, Clifford Brown "Sandu", Patrick Bartley
"After You've Gone", Rollins/Coltrane "Tenor Madness") plus the Seamus Blake
"Hey Lock!" transcription analysed earlier.

Instruments present: Bb tenor x4, Eb alto x3, Bb trumpet x1, C-instrument-8vb x1.
Transposition was **declared in every file** — instrument identity is free.

(The `archive.zip` in the same folder is not a solo dataset — it is the deepjazz
demo assets: 3 mp3s and 2 MIDI files.)

---

## F1. The chord `text` attribute is systematically wrong — HIGHEST IMPACT

Whenever MuseScore writes `use-symbols="yes"`, the `text` attribute is a *suffix
fragment*, not the chord symbol. Observed pairings:

| `kind` | `text` | what a text-reader concludes |
|---|---|---|
| `major-seventh` | `7` | dominant |
| `minor-seventh` | `7` | dominant |
| `half-diminished` | `7` | dominant |
| `diminished-seventh` | `7` | dominant |
| `augmented-seventh` | `7` | dominant |
| `major-minor` | `t7` | dominant |

Confirmed independently in 5 files. In Coltrane 26-2 this affects **112 of 220
harmonies**; in Bartley 72 of 146; in the Mintzer rhythm changes 50 of 208.

Why it is dangerous: the failure is silent and always in the same direction —
*everything becomes a dominant 7th*, which looks entirely plausible in a jazz
context. Every scale degree in the affected bars is then wrong. This bug was
present in my own first probe (it mislabelled Cm7 as C7 in the Blake solo).

**Rule: read `kind`. Never read `text` except as a display hint.**

## F2. 1 in 8 files has no `<harmony>` at all

The Parker "All The Things You Are" transcription stores its chords as `<words>`
staff text: `D-`, `G-`, `C7`, `Fmaj`, `Bbmaj`, `B-`, `E7+9`, `Amaj`.
Note the dialect: `-` for minor, `maj` for major, `+9` for #9. Two chords can
share a measure with no offset, so position must be inferred from where the
`<direction>` sits in the element stream.

=> A chord-symbol **text parser is a required v1 component**, not a fallback,
and it must handle multiple notation dialects.

## F3. One file contains two different soloists

"Tenor Madness" has `words` `Trane` at m1 and `Sonny` at m85 — 15 blues choruses
split between two players. Analysing it as one solo blends two vocabularies and
produces findings that belong to neither. Attribution lives only in free text
("Cannonball Solo" marks the same thing in Autumn Leaves).

**Must-catch case for region selection.**

## F4. Structure annotation is present in 5/8 files, in three incompatible conventions

- **chorus numbers**: 26-2 (`1,2,3,4` at m1/33/65/97), Blues in All Keys (`1..12` every 12 bars)
- **section letters**: Autumn Leaves (`A,A,B,C` every 8 bars from m2), Bartley (`A..E` every 40 from m5)
- **nothing at all**: Mintzer rhythm changes, Clifford Brown, Tenor Madness

Rehearsal marks also confirm intros of varying length (Autumn Leaves starts at
m2, Bartley at m5, Blake at m65 after a 62-bar head).

=> Cannot be parsed by convention. Interpreting which convention a file uses is
a judgment call — a model job, with the human confirming.

## F5. Form is recoverable from harmony alone, with high confidence

Autocorrelating the bar-by-bar chord sequence and taking the smallest period with
>75% agreement:

| file | period | agreement | choruses | annotations present? |
|---|---|---|---|---|
| Coltrane 26-2 | 32 | 99% | 4 | yes — agrees |
| Autumn Leaves | 32 | 97% | 2 | yes — agrees (4 x 8-bar letters) |
| Mintzer rhythm changes | 32 | 97% | 4 | **none — recovered anyway** |
| Clifford Brown Sandu | 12 | 100% | 2 | **none — recovered anyway** |
| Tenor Madness | 12 | 100% | 15 | **none — recovered anyway** |
| Bartley | 40 | 79% | 5 | yes — agrees |
| Blues in All Keys | — | — | — | fails, see below |

Correct in 6 of the 7 files that have chords, and **agrees with the rehearsal
marks wherever both exist** — two independent methods cross-checking each other
is a natural confidence score.

The failure is instructive: "Blues in All Keys" is 12 choruses of blues, each in
a *different key*, so absolute-root periodicity finds nothing. Running the same
test on **root intervals rather than absolute roots** would catch it.

## F6. Low periodicity agreement is itself a finding

Bartley's 79% (against 97-100% elsewhere) marks precisely the choruses where the
changes were substituted. That is free raw material for the implied-reharmonisation
detector — the disagreement locations *are* the substitutions.

## F7. Range violations are NOT reliable error signals — REVISES EARLIER ADVICE

Notes above the normal written range, by file: Bartley 50, Autumn Leaves 4,
Mintzer rhythm changes 2, everything else 0. Bartley is a well-known altissimo
player; these are real notes, not octave errors.

**Flag, never correct.** I previously suggested range as an octave-error check;
this data says it would fire overwhelmingly on legitimate playing.

## F8. Bar durations are clean; the one exception is an unmarked pickup

Exactly one bar across all 8 files fails to sum to its time signature: bar 1 of
the Mintzer rhythm changes, 12 divisions against 48 — an anacrusis not marked
`implicit="yes"`. Unmarked pickups shift every downstream beat position by the
missing amount, which silently corrupts every metrical-position judgment.

Cheap, worthwhile check. Genuine mis-entered rhythm is rare.

## F9. No repeats, endings, codas or segnos in any file

Written bar order equals played order everywhere in this sample. Good news, but
do not bake the assumption in: a single repeat barline would silently break
chorus counting and every bar reference in the output.

## F10. Transcribers annotate their own uncertainty in free text

Observed `words`: `sloppy` (26-2 m49), `flat` (26-2 m112), `lay back`
(Tenor Madness m115, Autumn Leaves m14), `(straight 8ths)`, `half-tonguing`,
`growl`, `quick F`, `(8ve`.

`sloppy` and `flat` are the transcriber explicitly saying *what came out is not
what was meant* — machine-readable, in the file, addressing exactly the tolerance
problem. These should lower confidence for findings in those bars, and arguably
exclude the region from vocabulary extraction entirely.

## F11. Enharmonic spelling is inconsistent but irrelevant to analysis

26-2 uses D# (30x) and Eb (30x); most files mix sharps and flats freely. Since
every representation we use is pitch-class based, this does not affect detection
at all. It matters only when *rendering generated exercises*, where we must pick
a spelling.

**Negative finding: do not build a spelling normaliser for the analysis path.**

## F12. Everything else normalises trivially

All 8 files: single part, single voice, 4/4 throughout, no key or meter changes.
`divisions` varies (12, 24, 60, 120) — straightforward to normalise.
Tuplets are common (up to 25% of notes in Autumn Leaves); grace notes appear in 4
files (up to 23 in Tenor Madness) and need an explicit policy.

---

## Consequences for the cleanup phase

Ordered by how much damage the failure does:

1. **Chord quality from `kind`, never `text`** (F1) — silent, widespread, corrupts every degree.
2. **Chord-text parser** for files with no `<harmony>` (F2) — 1 in 8.
3. **Soloist segmentation** before anything else (F3) — mixing two players invalidates everything.
4. **Form detection by harmony autocorrelation** (F5), cross-checked against rehearsal marks where present, with the relative-root variant for transposing forms.
5. **Unmarked pickup detection** (F8) — cheap, and corrupts all metrical positions.
6. **Ingest transcriber annotations as confidence signals** (F10).
7. **Flag but never auto-correct** range outliers (F7) and spelling (F11).
8. **Refuse to guess** when repeats/endings appear (F9) — ask.
