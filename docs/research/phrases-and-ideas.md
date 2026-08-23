# Phrases and ideas — research notes (2026-08-23)

The engine segments a solo into *phrases* (ended by rests) containing
*ideas* (ended by a held note or a leap). The owner confirmed the shape of
that by ear on one solo and was "still not totally sure it's super
accurate". This is what the literature says, and — more usefully — what
the Weimar Jazz Database says when you measure it.

**Numbers marked [WJD] were computed directly from `wjazzd.db`** (456 solos,
11,082 annotated PHRASE sections, 15,414 annotated IDEA sections). The
database is ODbL-licensed; it lives at `~/dev/personal/woodshed-data/` and
is never committed. Everything else here is secondhand to some degree.

## 1. What the Weimar annotators actually did

**Phrases.** There is no published rule. Phrases are "annotated by the
transcriber" (Frieler, *Computational Melody Analysis*, 2017); the only
instruction is that a boundary falls between notes. So WJD phrases are
expert intuition, and a rest rule is an *approximation* of that intuition
whose quality can now be measured.

[WJD] Phrases: median **13 notes** (IQR 8–24, mean 18.1), median 2.7 s,
~7 beats. Gap before a phrase start: median 1.9 beats, Q1 1.2; only 1% of
phrase starts follow a gap under ¼ beat. Inside phrases, 3.1% of
transitions carry a rest ≥ ½ beat. **Starts and ends are spread across
beats 1/2/3/4 (32/25/25/19%) — no downbeat bias.** Fixed 2/4/8-bar
phrases are folklore.

**Ideas = midlevel units (MLUs).** Frieler, Pfleiderer, Zaddach & Abeßer
2016, *Midlevel analysis of monophonic jazz solos*, Musicae Scientiae
20(2), https://doi.org/10.1177/1029864916636440. MLUs are "sections of
sufficiently distinct character" hypothesised to be the player's "playing
ideas and action plans", on a scale of "a few seconds". Nine types: line,
lick, melody, rhythm, theme, quote, fragment, expressive, void. *Line* =
stepwise, rhythmically uniform, salient trajectory (avg 19.4 notes, 31.5%
of units); *lick* = short, gestalt-like (avg 8.3 notes, 45.7%); *void* = a
gap that "clearly exceeds the usual gaps between phrases" — ordinary
breaths are explicitly *not* void. ~25% of units are motivically derived
from a preceding unit, chains averaging 2.8.

**Relation.** "A musical phrase starts an MLU, but more than one MLU can be
contained in one musical phrase, which is called 'glueing'." [WJD] ideas
per phrase: mean 1.44; **70% of phrases contain exactly one idea**, 17%
two, 6% three. Median idea **10 notes** (IQR 6–16), 1.9 s, ~5 beats; the
mode is 5–7 notes.

**Reliability.** Boundaries κ = .81, types κ = .60, border F-score .83
against a .16 baseline (Lothwesen & Frieler 2016). "Idea splitting" is a
named disagreement problem. Human–human agreement is the ceiling.

## 2. What surface cues sit at idea boundaries [WJD]

n = 4,779 within-phrase idea boundaries:

| cue at the boundary | share |
|---|---|
| previous note ≥ 1 beat | 20% |
| previous note ≥ ¾ beat | 28% |
| leap ≥ 7 semitones | 24% |
| leap ≥ 5 semitones | 40% |
| IOI ≥ 1 beat | 52% |
| **small rest ≥ ¼ beat** | **58%** |
| any of (IOI ≥ 1, leap ≥ 7, rest ≥ ½) | 70% |
| none of (IOI ≥ ¾, leap ≥ 5, rest ≥ ¼) | 14% |

False-positive side: "IOI ≥ 1 beat or leap ≥ 7" fires on 10.1% of
*non*-boundary transitions — 18,691 false against 4,779 true, **precision
≈ 20%**. The 1,982 explicitly glued boundaries (no rest) have median gap
0.12 beat; a held note ≥ 1 beat precedes only 23% of them, a leap ≥ 7 only
22%. Also: 2,797 idea boundaries sit on a small rest (median 0.59 beat)
that the phrase annotator did *not* treat as a phrase break, and 447 phrase
boundaries fall inside an idea.

**Verdict on the current engine:** the held-note-or-leap rule recovers
about a fifth of human idea boundaries and is wrong four times in five
when it fires. **Short rests (¼–1 beat) are the single strongest idea
cue**, and they are exactly what a rest-based phrase rule absorbs as
"breaths".

## 3. Cognition

- **Pressing 1988** (*Generative Processes in Music*): improvisation is a
  sequence of *event clusters* related by *association* or *interrupt*. A
  boundary is a change of feature state; a rest is one interrupt among
  several.
- **Norgaard 2011** (JRME 59(2)): seven artist-level improvisers describe
  *sketch plans* and inserting ideas from an *idea bank*, a few units at a
  time — the MLU time scale.
- **Norgaard 2014** (*Music Perception* 31(3)): in 48 Parker solos, 82.6% of
  notes begin a recurring 4-interval pattern. The lexical unit is ~4–5
  notes and overlaps; ideas chain them. Matches the 5–7-note idea mode.
- **Lothwesen & Frieler 2012 / Schütz 2015**, "ideational flow": pianists
  interviewed "mostly agreed with the mid-level approach". The only direct
  validation that the idea level is something players experience; it is
  interview-based.
- Practitioners say *idea* / *lick* for the short item, *phrase* for the
  breath-delimited line, *line* for a long eighth-note run. **Nobody
  defines the difference by a held note.**

## 4. Perceptual segmentation

- **Lerdahl & Jackendoff 1983, GPRs:** 1 avoid small groups; 2a rest/slur,
  2b attack-point (larger IOI); 3a register, 3b dynamics, 3c articulation,
  3d length; 4 intensification; 5 symmetry; 6 parallelism. All *relative to
  neighbours*.
- **Deliège 1987** (*Music Perception* 4(4)): listeners segment at rests,
  long notes and changes; **length change (3d) was the weakest cue** for
  both musicians and non-musicians; register change strongest for
  non-musicians.
- **Cambouropoulos 2001, LBDM:** change r = |x_i − x_{i+1}| / (x_i + x_{i+1})
  per parameter, strength = x_i·(r_left + r_right), weights pitch 0.25,
  **IOI 0.50**, rest 0.25, peak-picking. 74% found / 49% extra on 52
  melodies. IOI — note plus following gap — carries half the weight and
  subsumes both held notes and rests.
- **Temperley 2001:** gap rule, **phrase-length rule (prefer ~8 notes)**,
  parallelism. A length prior is standard.
- **Bruderer, McKinney & Kohlrausch 2009** (*Musicae Scientiae* 13(2)): on
  monophonic melody lines only two GTTM rules were needed — attack-point
  (*long note between short notes*) and rest; r = .80–.89. Resolves the
  Deliège contradiction: relative length matters, absolute length does not.
- **Pearce, Müllensiefen & Wiggins 2010:** the best rule models (Grouper,
  LBDM, GPR2a, IDyOM) top out around F1 ≈ 0.6–0.66 on folk phrases.
  **Expect ~0.65 from rules; humans reach ~0.83.**
- Hierarchy: listeners do distinguish boundary levels (Popescu et al. 2021),
  but agreement drops at the lower level. No study of sub-phrase agreement
  on improvised jazz lines; WJD inter-annotator data is the closest.

## 5. Pedagogy

- **Crook, *How to Improvise*:** play/rest ratios, phrase length, pacing,
  over-the-barline phrasing. Teachers frame phrases in bars and rests; no
  claim about sub-phrase units.
- **Galper, *Forward Motion*:** beat 1 is the *destination* of a phrase;
  pickups resolve to chord tones on strong beats; hear "& 1", not "1 &".
  **A pickup belongs with what follows.**
- **Bergonzi, *Jazz Line*:** the line ends where the target is reached —
  a harmonic cue, not a duration cue.
- Schoenberg via Jazzadvice: a phrase is "what one could sing in a single
  breath". Clark Terry's "question and answer" attribution could not be
  sourced.

## 6. Where the current model is wrong or incomplete

All testable against `wjazzd.db`.

1. **Held-note rule: ~20% recall, ~20% precision** for idea boundaries.
2. **Short rests are the main idea cue and the phrase rule eats them.**
   Hypothesis: rest ≥ ~1 beat ⇒ phrase; rest in [¼, 1) ⇒ idea. Sweep both
   thresholds against the PHRASE and IDEA layers.
3. **Use relative length — "long note between short notes" — and IOI**
   (note + following gap), not duration against the solo median.
4. **Leap is miscast.** ≥ 5 semitones reaches 40% recall; combine with a
   contour reversal (LBDM's change of interval), not size alone.
5. **Ideas need a length prior**: median 10, IQR 6–16, mode 5–7. Penalise
   ideas < 4 or > ~20 notes; phrases median 13, IQR 8–24.
6. **70% of phrases are one idea.** Routinely yielding 2–3 ideas per
   phrase is over-splitting. (Blake: 23 ideas in 18 phrases — plausible.)
7. **Pickups belong to the following unit.**
8. **Phrase ends are not rest-only.** A chord-tone target on a strong beat
   followed by a change of register or rhythm can end a phrase with only a
   small gap. (Blake: 8 of 18 phrase ends are non-chord-tones under the
   current boundaries — either Blake ends on tensions or the boundary is a
   note off.)
9. **Score and peak-pick; don't threshold.** Every model with human-level
   agreement produces a strength profile and picks local peaks, with a
   length prior.
10. **14% of idea boundaries have no surface cue at all** — they are
    changes of character or motivic repetition. Detecting "same contour or
    rhythm as the previous unit" catches boundaries no duration rule can.

## 7. What to do

The database makes this an engineering problem with a number attached.
Build `scripts/eval-wjd.ts`: read WJD melodies into `Note[]`, run
`segment()`, score phrase and idea boundaries against the annotations
(precision / recall / F1, ±1 note tolerance), and report per cue. Then
tune against 456 solos instead of one ear — and keep the ear as the final
check, since the annotations are themselves one set of ears.

## 8. Evaluation against the database (same day)

`npm run eval:wjd` scores `segment()` on all 456 solos. Boundaries compared
as note indices, exact match. Human–human border F-score is .83.

| setting | phrases P / R / F1 | ideas P / R / F1 |
|---|---|---|
| before tuning (wLength .45, wLeap .15, lengthFull 4) | 80.5 / 85.2 / **82.8** | 80.6 / 69.6 / **74.7** |
| no held-note or leap cue at all | 88.8 / 77.9 / 83.0 | 94.4 / 58.9 / 72.5 |
| + any ≥ sixteenth rest opens an idea | 88.8 / 77.9 / 83.0 | 53.6 / 76.7 / 63.1 |
| + any ≥ eighth rest opens an idea | 80.5 / 85.2 / 82.8 | 70.5 / 76.4 / 73.3 |
| wLength .25, wLeap .25 | 83.5 / 85.3 / **84.4** | 91.2 / 66.4 / **76.8** |
| **adopted:** wLength .45, wLeap .25, lengthFull 6 | 82.3 / 85.4 / **83.8** | 87.0 / 67.9 / **76.3** |

What the numbers say, against the hypotheses in §6:

- **Phrase boundaries were already at the human ceiling** (82.8, humans
  .83). The rest rule is the phrase rule. Rests make phrases — the owner's
  ear and 11,000 annotations agree.
- **Hypothesis 1 was half right.** A held note *alone* is a weak cue, but
  held-note and leap cues inside the profile earn ~2 points of idea F1;
  removing them costs recall.
- **Hypothesis 2 was wrong as stated.** Short rests as a blanket idea cue
  over-fire badly (precision 53% at a sixteenth, 70% at an eighth). A
  swing-eighth breath is not an idea boundary in the annotators' ears
  either.
- Threshold, minimum group size, full-rest length and leap weight are all
  near their optimum; every change moved F1 by under a point.
- **Idea recall is the remaining gap** (68%). The literature's answer is
  the 14% of boundaries with no surface cue — changes of character,
  motivic repetition. That needs a detector of "same contour or rhythm as
  the previous unit", not more tuning of durations.

The adopted setting gives up 0.6 F1 on each level against the best found,
to keep a note held ≥ 6x the median (three beats among eighths) as an idea
cue on its own — the case the owner hears in bar 67 of the Blake solo. Blake
under it: the same 18 phrases, 21 ideas.
