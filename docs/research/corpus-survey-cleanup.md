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

---

## Addendum — phrase segmentation probe (2026-08-23)

Ran four segmentation variants over the solo regions of four real transcriptions
(Blake 335 notes, Coltrane 26-2 678, Rollins 568, Bartley 1209), scoring each by
the chromaticism asymmetry the Weimar work reports: phrase beginnings should be
markedly more chromatic than phrase endings.

| variant | mean start | mean end | spread |
|---|---|---|---|
| **rests only** (gap >= an eighth) | **14%** | **10%** | **4** |
| rests + note >= 2.0x local median duration | 11% | 11% | 0 |
| rests + note >= 2.5x local median duration | 12% | 11% | 1 |
| rests + note >= 3.0x local median duration | 12% | 11% | 1 |

**Rests alone win, and the long-note rule actively destroys the signal.** The
intuition that a held note ends a phrase is not supported: adding it splits at
points that are not phrase endings, flattening the asymmetry to nothing. It also
fragments badly — 30-108 phrases of two notes or fewer per solo.

An earlier variant keyed on inter-onset interval was worse still, for a reason
worth recording: an absolute floor of one quarter note means that at bebop tempo
*every quarter note* becomes a boundary.

### Two measurement traps found on the way

1. **Do not count every accidental as chromatic.** The first run marked the b7 of
   a dominant chromatic — spelt with a flat, but the most consonant note in the
   chord, and a very common phrase ending. That inflated end-chromaticism to 18%
   and hid the asymmetry completely. Correct definition: *altered AND not a chord
   tone*.
2. **The absolute percentages are not comparable to Frieler's** (20.4% / 5.0%).
   Those are computed relative to the key; ours are relative to the sounding
   chord, which is a stricter and different measure. Only the *direction* of the
   asymmetry is a valid check.

### Decision for v1

Segment on rests only, plus forced boundaries at soloist-region and chorus
starts. No long-note rule, no IOI rule. Report per-boundary confidence.

Honest caveat: even the best variant reproduces the expected asymmetry in only
two of four solos (Blake 18/9, Coltrane 10/1; Rollins 9/11 and Bartley 17/18 show
none). Long unbroken runs survive — up to 39-55 notes with no rest — and on this
evidence those appear to be real, not segmentation failures.

## Addendum 2 (2026-08-23): phrase boundaries, second pass

The rests-only rule above was revisited after reading the Blake output: an
eighth rest among eighths split lines at breaths (bar 66: `G Ab E` | `G G F
G Ab A` became a 3-note "phrase"), bars 110-113 shattered into 2-6 note
fragments, and 30-39 note runs survived untouched.

### What the literature says

- **Weimar Jazz Database** (Frieler, *Exploring phrase form structures II*,
  FMA 2014; 100 solos, 2,643 phrases, annotated by jazz students): median
  phrase **12 tones** (mean 15.9, range 1-129), **1.53 bars** median (mean
  2.04), **2.4 s** median (mean 2.95, "coincides with estimates for the
  subjective presence time"). "In the case of wind instruments phrase
  boundaries often coincide with breathing rests." Phrases per chorus fall
  as the solo goes on (longer lines later).
- **Lerdahl & Jackendoff** grouping preference rules: boundary after a rest
  or larger gap (GPR 2), at a change of register / articulation / length
  (GPR 3), and *avoid very small groups* (GPR 1).
- **Cambouropoulos' LBDM**: boundary *strength* per gap as a weighted sum of
  rest, inter-onset change and pitch-interval change, thresholded. The
  standard algorithm; no single cue is a rule on its own.

### What changed

`segment.ts` is now a boundary-strength profile: rest (weight 0.6, full at
a quarter, ignored below a sixteenth), held note (0.45, counts from 2x the
median duration, full at 4x — a half note among eighths), leap (0.15, from a
fifth). Threshold 0.45. GPR 1 dissolves the weaker edge of any group under
three notes. Per-boundary strength is kept as the phrase's confidence.

The earlier finding that "a long-note rule destroys the signal" was about a
**hard rule at 2x median**. That is a quarter among eighths, which is not
an arrival. At 4x it fires on held notes — Blake's G over bar 67 and F over
bar 70 — and nowhere else in this solo.

Blake: 23 phrases, median ~11 notes, which matches the Weimar median. Three
runs of 30-39 notes have no internal candidate at all (no rest, no held
note, no leap over a fifth); on this evidence they are real lines.

### The owner's ear (same day)

Read through the 23 ticks on the page. Verdict:

- Bars 66-71 (three held-note boundaries): "at first glance all one phrase
  since there is no rest, but singing through it they are like three musical
  ideas chained into one line."
- Bar 120 (held G, then a four-note tag): not a separate phrase.
- Bars 76 and 99: boundary right, tick wrong — the phrase begins on the beat
  the triplet / sixteenth group occupies, rest included; "can't split a
  triplet like that."

So rests make **phrases**; held notes and leaps make **ideas** inside a
phrase. `segment.ts` now returns both levels (`Phrase.ideas`), and a phrase
whose first note is off the eighth grid has its `onset` snapped back to the
beat. Detectors stay inside ideas. Blake: 18 phrases, 5 internal ideas.
Weimar's "midlevel units" are the same two-level intuition.
