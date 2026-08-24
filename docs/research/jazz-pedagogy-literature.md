# Jazz pedagogy literature — findings for woodshed

Read 2026-08-24 from the owner's `~/Downloads/MusicXML Transcriptions/Jazz
Books`. Fake books in that folder were skipped as instructed.

**Licensing.** Every source here is a copyrighted book, several of them
scans from piracy sites. They are *not* in the repo and must not be. This
file records **derived statements only** — a device is described by its
degree string or contour class, never by reproducing an author's musical
example, and no lick is transcribed. Same rule as the WJD/Bopland corpora
(CLAUDE.md non-negotiables, DECISIONS 2026-08-24 "Corpus licensing"). Any
fixture that comes out of this work gets hand-written.

**Status of everything below: proposal, not decision.** Nothing here has
been implemented and ENGINE_SPEC is untouched. A literature-motivated
change to a threshold or a detector needs an `eval:wjd` / `brackets` run
and the owner's call before it lands.

## Sources

| # | Source | Text? | What it is |
|---|---|---|---|
| O | Owens, *Charlie Parker: Techniques of Improvisation*, PhD, UCLA 1974 (vol. I) | OCR | Catalogue of ~100 Parker motives with frequency counts and usage rules |
| T | *The Role of Transcription in Jazz Improvisation*, PhD (aural-imitative approach in jazz pedagogy) | OCR | Interviews with 41 US jazz faculty about what to do with a transcribed solo |
| B | David Baker, *How to Play Bebop*, vol. 1 | OCR | Explicit rule system for the bebop scales, enclosure, endings |
| C | Jerry Coker, *Elements of the Jazz Language for the Developing Improviser* | scan | An enumerated list of the devices that constitute the jazz language |
| G | Jerry Bergonzi, *Inside Improvisation vol. 1 — Melodic Structures* | scan | Four-note cell system and its permutations |
| L | Bert Ligon, *Jazz Theory Resources* I & II | scan | University theory text; motivic-development taxonomy, analysis method |

Levine's *Jazz Theory Book* and Bergonzi *Pentatonics* were triaged and
deferred — see "Not read" at the end.

Page numbers are the **printed** page, not the PDF page.

---

# Part 1 — What this means for the AI layer

The AI layer never produces or reasons about note data (CLAUDE.md
non-negotiable). Everything below is about the *words wrapped around*
numbers that deterministic code supplies.

## 1.1 Lead with style and ear, not theory

T asked 41 faculty to rank the benefits of transcribing (lower score =
more important). The result (T pp. 60–61):

| benefit | score |
|---|---|
| style | 47 |
| ear training | 48 |
| vocabulary / patterns | 73 |
| understanding chords and jazz theory | ~93 |
| historical perspective | 114 |

Theory ranks **fourth of five**. Our output is currently almost entirely
category four — "major-seventh arpeggio from the b3" is a theory label.
That is the right thing for the *engine* to compute and the wrong thing to
put first in the *prose*. The summariser should lead with what the device
sounds like and does, and treat the degree spelling as supporting detail.

**Applies to:** the SoloProfile summariser prompt (OPEN_QUESTIONS "AI
summariser").

## 1.2 The sentence shape teachers actually use

O's motive catalogue is the best available model, because every entry
follows the same four-part template (O ch. 3, pp. 17–25):

1. **What it is** — construction ("an ascending arpeggio, usually played
   as a triplet").
2. **What it does harmonically** — "its two constant notes are the 3rd and
   the b9 of a primary or secondary dominant".
3. **Where it sits** — "frequently begins a phrase"; "usually occurs at or
   near phrase endings"; "occurs most commonly in bars 8 and 9 of the
   blues"; "occurs in bars 5 and 6 of the blues".
4. **Why there** — often ergonomics: a motive lives in the keys where it
   falls under the fingers.

Point 3 is the one we cannot currently say, because `Finding` records
*where in the score* a hit is but not *where in the phrase or form* it
sits. See §2.6.

## 1.3 What the model may assert vs. what code supplies

| the model may say | only code may supply |
|---|---|
| what a device is called and what it does | the notes, intervals, degrees |
| where it typically sits in a phrase or form | where it actually sits in *this* solo |
| what to listen for on the record | counts, occurrences, bar numbers |
| practice advice | which bars an exercise uses |

## 1.4 Never narrate note-by-note

L, introduction (pp. ix–x), is a direct critique of the thing our degree
tables make easy. He prints a line labelled note-by-note against the chord
(M7, M6, m9, 1, +4, M6 …) and says:

> Identifying each pitch by its vertical alignment with the given chord
> provides no insight and serves no real purpose. We do not hear separate
> words or letters in a sentence, nor would we analyze a sentence in this
> way.

His alternative is to bracket **groups of pitches that point to a single
more important pitch** — the same line then reads as three notes of a C
triad with everything else as decoration. That is precisely what
`targets.ts` and `shapes.ts` compute, so the architecture is vindicated;
the warning is for the prose layer. **The summariser must talk in cells
and goal notes, never in a run of degree names.**

## 1.5 Send the student back to the recording

This is the sharpest risk finding in the folder, and it is about our
product rather than our engine.

- T is a study of the complaint that jazz education has abandoned the
  aural-imitative tradition. Faculty are split on transcription software:
  41% say it helps, but one (MacDonald) reports the students who use
  computer tools "are the least successful", and several call it a crutch
  (T pp. 64–65).
- The defence of the tools is conditional and worth reading as a design
  brief: "If you slow it down, you're still listening to it" (Aliquo), and
  "I don't think it hinders as long as a person is hearing the solo and
  memorising it as part of the process" (Demsey).
- T's own summary of the consensus: the student "must play along with the
  original recording without the aid of a written transcription" (p. 65).

woodshed takes an already-notated solo and hands back exercises. The whole
apparatus can be used without ever listening. **Every unit the AI layer
narrates should point back at the record** — at minimum "play this along
with the recording before you drill it". This deserves to be a rule in the
summariser prompt, not a nicety.

## 1.6 Memorisation over notation

Of 41 faculty, 22 both notated and memorised, 10 notated only, 9 memorised
without notating; several said memorising is "substantially more
beneficial" than notating (T p. 61). G reinforces this from the other
side, with a claim worth testing rather than repeating: "ten minutes of
visualisation is equivalent to two hours of physical practice" (G p. 32),
where visualisation means running the cell through the changes in your
head, away from the horn.

We have no off-instrument step. See §3.1.

## 1.7 The whole solo, not only the units

T records a real split (pp. 62–63): transcribing *parts* of solos builds
vocabulary faster, transcribing the *whole* solo is the only way to get
"the continuity and construction of a solo from beginning to end … you can
see how the thinking progresses" (Kaplan). We already produce both — units
are the parts, `SoloProfile` is the whole — which means the summariser's
two-paragraph overview is not decoration. It is the half of the value that
unit-by-unit drilling structurally cannot deliver.

## 1.8 Tone: what not to tell the student

- **Never call a note a mistake.** C ends his chapter on chromaticism with
  a strict ladder (C pp. 81–83): before concluding an error, a non-chord
  note must be checked against passing/neighbour motion, the bebop scale's
  added note, enclosure, tritone substitution or altered dominant, the
  back-door progression, #II°7 for V7, a bar-line shift, and side-slipping.
  Only if nothing reconciles it is it an error, and even then his framing
  is "no great player wants us to imitate, unknowingly, his imperfections".
  For us the ladder is mostly unimplemented, so we are in no position to
  reach its last rung. The model should never assert a wrong note.
- **Frequency is not a verdict.** O's *most frequent* motives are the core
  of Parker's identity, not filler — the top one appears about 1,600 times
  and once every eight or nine bars. Our `STOCK_PENALTY` deliberately
  demotes corpus-frequent material. The two are reconcilable and the
  existing named-cell exemption already does most of it (see §2.4), but the
  prose must not turn "common in the corpus" into "not worth your time".

---

# Part 2 — Engine findings

## 2.1 Coverage audit against Coker's list of the jazz language

C's table of contents is the closest thing in print to a definitive list of
bebop-language devices, arrived at by analysing solos. Checked against our
detectors:

| C's element | woodshed | note |
|---|---|---|
| Digital patterns / scalar patterns (ch. 2) | yes — `shapes.ts` | |
| 3-b9 (ch. 4) | yes — dominant b9 cells | see §2.3 |
| Enclosure (ch. 8) | yes — `targets.ts` | |
| Sequence (ch. 9) | yes — `recurring.ts` | interval n-grams are transposition-invariant, so sequences are caught |
| **7-3 resolution (ch. 3)** | **no** | §2.2 — the biggest gap |
| **Bebop scale (ch. 5)** | **no** | §2.5 |
| **Bebop lick (ch. 6)** | **no** | a specific cadential formula |
| **Change running (ch. 1)** | **no** | spelling each chord in turn |
| **Harmonic generalization (ch. 7)** | **no** | one scale over several chords — the *opposite* of change running; worth detecting because it explains an absence |
| **CESH (ch. 10)** | **no** | chromatic line under static harmony |
| **Quotes (ch. 11)** | **no** | quoting another tune |
| **Bar-line shifts (ch. 14)** | **no** | §2.7 |
| **Side-slipping / outside playing (ch. 14)** | **no** | |
| Named licks ("Cry Me a River", "Gone But Not Forgotten") (chs. 12–13) | **no** | named-formula dictionary entries |

Four detectors cover roughly a third of the list. That is the single most
useful map to come out of this reading: it tells us what a solo analysis is
currently blind to.

## 2.2 7-3 resolution — the highest-value missing detector

**Definition** (C ch. 3, p. 19): the b7 of II-7 moves down to the 3rd of
V7; also V7 → I. It is voice-leading between two chords, not a shape
within one.

L independently arrives at the same thing from the composing side: "Guide
Tones: Precede all 3rds with their UNT. This will often be the 7th of the
preceding chord" (L p. 484). O's whole "disguised scalar descent" thesis
(§2.8) rests on the same downward stepwise connections.

**Why it is the top candidate:** it is fully specified, we already have
everything needed (chord track, `NoteContext` degrees, tick positions), and
unlike every shape detector it looks *across* a chord change — a dimension
none of our three detectors currently examines. Sketch: at each chord
boundary, if the last note under chord N is its 7/b7 and an early note
under chord N+1 is its 3, one or two semitones below, that is a hit.

Cross-chord windows interact with the `samePhrase` rule (detectors never
match across an idea boundary) — a 7-3 resolution can plausibly straddle a
boundary, so the rule needs a deliberate decision here rather than
inheritance.

## 2.3 External confirmation of things we already do

Worth recording because it is evidence the engine is aimed correctly.

- **Dominant b9 cells** (added in commit `11834a2`). O ranks his M.3A —
  whose defining feature is "the third and the minor ninth of a primary or
  secondary dominant" — as the **third most frequent motive in Parker's
  entire vocabulary**, about 1,100 occurrences (O pp. 18, 25). C gives it
  a whole chapter. Independent confirmation from two directions that this
  was worth building.
- **`1235` and `1345`.** G's entire method is built on exactly two cells:
  1-2-3-5 for major and dominant chords, 1-3-4-5 for minor (G p. 8). Our
  shape dictionary has `1235` over all major-family and `1345` for
  minor-family. Exact agreement with the most widely used cell method in
  print.
- **`articulationSpan`.** O's summary of Parker's articulation: "the
  typical phrase of eighth notes is articulated in pairs of notes, starting
  on the weak part of a beat" (O p. 268). Our rule that an eighth plus an
  eighth rest is a staccato quarter rather than a phrase break was derived
  from the owner's Mintzer brackets; it agrees with the literature.
- **Longer motives contain shorter ones.** "Parker's longer motives
  frequently incorporate shorter motives" (O p. 19) supports the swallow
  rule (a 3-note hit sharing a note with a 4-note hit is dropped) — though
  see §2.9 for the cost of dropping rather than recording it.

## 2.4 Stock vs. signature — the tension is real but resolvable

O's frequency table (p. 25) is Zipf-shaped: M.1A ≈ 1,600 occurrences,
M.2A ≈ 1,400, M.3A ≈ 1,100, down to a long tail (M.18–M.64) of rare
motives. His stated criteria for including a *rare* motive are that it is
(1) aurally striking, (2) recurs in untranscribed pieces, or (3)
characteristic of a key or group of pieces.

Our unit rank does the same job with `STOCK_PENALTY` and `corpusShare`,
demoting corpus-frequent material. The apparent conflict — Owens'
*most frequent* motives are Parker's signature — resolves on the axis our
code already uses: **corpus-frequent *and* generic contour** (a scale run)
is stock; **corpus-frequent *and* functionally distinctive** (3-b9 over a
dominant) is signature. That is exactly what the named-cell exemption
encodes (notes inside a named cell of ≥ 4 degrees are exempt from the stock
share). The literature endorses the distinction; no change proposed, but
the rationale is now externally grounded rather than a hunch.

## 2.5 The bebop scale, and why not every scale run is stock

B's bebop dominant scale is 1-2-3-4-5-6-b7-♮7-1, and his justification is
purely metric (B p. 1):

> in the second scale all of the chord tones are on down beats; and second,
> the tonic of the scale falls on beat one of each successive measure, and
> the fifth falls on beat 3.

Every rule in his chapter serves that one invariant. Start on a chord tone
on a downbeat and it holds; start elsewhere and you "insert a half step
just before a chord tone to restore balance to the line" (B p. 17). The
bebop major scale works the same way with chord tones 1-3-5-6 (B p. 16).

This gives a **computable quality measure for a scalar run: the share of
its chord tones that fall on downbeats.** That matters because
`stockShare` currently treats any run of ≥ 4 same-direction steps as stock
regardless of placement — so a properly-constructed bebop line and an
aimless scale get the same penalty. They are not the same thing, and the
difference is the most teachable single fact in bebop. Proposal: a bebop
scale detector, and/or a chord-tone-on-downbeat term that rescues a run
from the stock penalty.

C treats the same device as an element in its own right (ch. 5) and adds
that chromatic notes are "often the result of a metric problem that
results in adding one or more notes to cause the phrase to agree with the
number of beats in a measure" (C p. 81) — chromaticism as rhythmic
book-keeping, not as colour.

## 2.6 Phrase boundaries have a metric and formal position, and four sources say so

This is the strongest convergence in the reading, and it bears directly on
**"Idea recall is 68%"** in OPEN_QUESTIONS — where the missing boundaries
are the ones with no surface cue.

- **B (p. 6):** "More often than not, phrases end on the upbeat of beats
  one or three." He also has a rule for *choosing* the ending formula so
  that this comes out right.
- **O (p. 14):** "Parker tended to construct his phrases to coincide with
  the phrase structure of the piece being performed. Thus, his solos in
  32-measure, aaba pieces generally show endings in the seventh or eighth
  measures of each section of each chorus."
- **G (p. 40):** tells the student to listen for exactly this — "where do
  their phrases begin and end, on or off the beat and on or off what beat?"
- **L (p. 483):** lists "Phrase beginnings (before the downbeat / on the
  downbeat / after the downbeat)" as a compositional parameter to control.

Our `segment()` scores gaps from rest, note length and leap only. It knows
the time signature (it takes beats per bar for the pickup test) and the
analysis knows `chorusStarts` and the form period, but **neither metric
position nor position within the form contributes to boundary strength.**
Two independent priors are available and unused:

1. a small bonus for a candidate boundary whose *following* note starts on
   a weak-beat upbeat, or whose preceding note ends on the upbeat of 1 or 3;
2. a small bonus at bars 7–8 of each 8-bar section of the form.

Both are cheap, both are testable against WJD phrase/idea F1 and the
owner's brackets, and (2) in particular can only help the boundaries that
have no surface cue — which is the population we are currently missing.

Separately: **we never tell the student where their phrases start and end
metrically**, though we compute it. `Phrase.onset` exists. A single line in
the profile — "your phrases almost all begin on the and-of-4" — is a real
observation about their playing, costs nothing, and is exactly what G tells
students to listen for.

## 2.7 Bar-line shifts, and our non-chord-tone phrase endings

OPEN_QUESTIONS asks about "8 of 18 Blake phrase ends are non-chord-tones",
offering three hypotheses, one of which is "the last note actually belongs
to the next chord (anticipation)". **C has a name and a section for this:
bar-line shifts** (C p. 83) — arriving at a chord late or early, sometimes
by a whole measure, "not intentional, necessarily, but not errors either".

His analytic discipline is directly implementable and would improve
`analyse/context.ts`, which currently decides chromaticism against the
current chord alone:

> the person who analyzes should always look at the chords both before and
> after a point where an error is suspected, before jumping to a wrong
> conclusion.

Proposal: when a note is neither a chord tone nor explicable as an
approach, test it against the neighbouring chords before labelling it
chromatic; if it fits the next chord, that is an anticipation and the
phrase ending *is* a chord-tone arrival, one chord early. That would
directly resolve the Blake question rather than leaving it to the ear.

## 2.8 The long descent

O's conclusion, offered tentatively but as his single organising claim
(pp. 269–271): across keys, tunes and years, the device linking the great
majority of Parker's solos is **descending scale passages** — "disguised
scalar descents as a basic organizing force in jazz improvisation".

This cuts against `stockShare` in an interesting way. Locally, a stepwise
run is stock vocabulary. Across a phrase, a descending line among the
structurally accented notes is *the* long-range structure. We measure the
first and are blind to the second. A phrase-level "does a stepwise descent
connect the accented notes" feature would be a genuinely different kind of
finding — about architecture rather than vocabulary — and it is the sort
of thing the overview paragraph exists to say.

Flagged as interesting, not urgent: it is the least specified claim in the
reading and O himself hedges it.

## 2.9 Naming what a variant *is*

`variantOf` builds families: against the family head, a cell joins if it is
the exact inversion, or differs in one interval by ≤ 2 semitones with the
sign kept. It records *that* two cells are related but not *how*.

L gives the standard taxonomy (L p. 483, "Compositional Devices for Motivic
Development"): repetition, sequencing, fragmentation, addition or
interpolation, embellishment/ornament, augmentation, diminution,
inversion, retrograde, retrograde inversion, displacement, mode change,
iteration.

We implement two of thirteen (inversion; and sequencing for free, since
interval n-grams are transposition-invariant). Several of the rest are
cheap given data we already hold:

- **fragmentation** — a strict prefix/suffix of the head. Note this is
  currently *destroyed* by the swallow rule, which drops the shorter cell
  rather than recording it as a fragment of the longer one.
- **augmentation / diminution** — same intervals, durations scaled ×2 or
  ÷2. We have exact tick durations.
- **displacement** — same figure at a different metric position. We
  already generate this as a practice *step*; we do not detect it when the
  player does it.
- **addition / interpolation** — the head with notes inserted.

Two payoffs. For the engine, a variant family becomes better evidence when
we can say the relation is principled. For the AI layer, it turns a bare
count into a sentence a teacher would say: *"you play this figure three
times — the second is a sequence up a fourth, the third is fragmented to
its first three notes."* That is motivic development, which is what the
overview should be about.

## 2.10 Cells as a set plus a permutation

G organises practice as the four-note set (1-2-3-5 or 1-3-4-5) times its
**24 permutations** (G p. 10), which he prints in full. Our dictionary
instead hand-lists orderings — `1235`, `1234`, `5321`, and the six triad
orders each as its own entry.

Restating the dictionary as *pitch-class set + which permutation was
played* would unify the six triad entries into one, make the ordering
explicit output rather than a naming convention, and let a finding say
"1-2-3-5 in the order 3-1-2-5". It also generates a practice step for free
(§3.1). Refactor, not new capability; worth considering next time the
dictionary is touched.

## 2.11 Key-specific vocabulary, and the twelve-keys question

OPEN_QUESTIONS asks whether the cycle exercise should print twelve keys or
one key plus "take it through the cycle", noting Coker prefers the latter.
O adds an angle neither option accounts for (O pp. 269–270):

> his use of his repertory of motives changes from one key to the next. For
> example, his typical melodies for the blues in C major are not simply
> transpositions of his typical melodies for the blues in B flat, but are
> distinctively different.

Throughout the catalogue he attributes motive/key preference to
ergonomics — a figure lives where it falls under the fingers, and Parker
ignored transpositions that were equally easy. So a master's vocabulary is
*not* key-transparent, and "take it through twelve keys" is a practice-room
convention rather than a description of how the language is actually used.
That does not make the exercise wrong — drilling in twelve keys is how you
acquire the option — but it is a reason to keep the framing modest.

## 2.12 Solos are not thematic

"His solos are normally organized without reference to the theme of the
piece being performed" (O p. 269). L frames the same choice as the two
available modes: improvise on the melody (paraphrase) or on the harmony
(L p. ix).

Two consequences. The summariser should not look for relationships between
the solo and the head. And *which mode a solo is in* is a classifiable
property of an upload — a paraphrase solo and a changes-running solo want
different things said about them, and the distinction is computable from
material we already have if we ever hold the head melody.

---

# Part 3 — Practice steps

Our steps are loop, through, write, displace. The sources supply four more,
all deterministically generatable.

## 3.1 Candidate new steps

- **Permutation** (G, ch. 1–2). Play the same four notes in a different
  order. Falls straight out of §2.10; a cell with degrees gives 24 of them
  and the interesting ones are few.
- **Editing** (G ch. 5, p. 39). Bergonzi's term for taking notes *out*:
  "from the original groupings we can now select or omit one, two, three,
  or four of the notes for each chord", to break the mechanical
  eighth-note sound. Generatable by dropping notes from the unit and
  replacing them with rests. His framing is worth keeping: "Listen for the
  spaces they leave! The silence in spaces is a solo unto itself."
- **Visualise** (G ch. 3, pp. 31–32). Run the cell through the changes in
  your head, away from the instrument. The one step that needs no notation
  at all, and the one that answers T's memorisation finding (§1.6). Also
  the cheapest thing we could add — it is a step with a rationale and no
  rendered exercise.
- **Connect** (B, exercise H, p. 27). "Playing a continuous line, move into
  each new chord by conjunct motion (by half step or whole step)" — i.e.
  join the cell to the next chord by step. This is the practice-room form
  of the 7-3 resolution (§2.2) and would pair with that detector.

B's full exercise taxonomy for a cell (pp. 26–27) is a useful superset to
measure ours against: from the tonic; from other chord tones; from
non-chord tones; all from one fixed starting pitch; each successive
repetition from the next chromatic step; each from the next chord tone in
rotation; from random starting tones; connected by conjunct motion. Ours
covers the first weakly and the last not at all.

## 3.2 Session shape

T (p. 62) on how transcription actually gets done: 27 of 41 described their
routine as "not daily" or "undisciplined", working "in binges"; 10 made it
daily. Worth knowing before we build anything that assumes a daily streak.

T (p. 90) also suggests a genuinely good product idea we do not have:
record the student playing over the changes *before* the unit and again
after, as a pre/post comparison.

## 3.3 What the student should be given, and what they choose

- 27 of 41 faculty prefer the student to **choose their own solo** (T
  p. 59). Our upload-anything model is the one the field endorses.
- The countervailing risk, also from T (p. 83): students who have listened
  little "simply do not know which instrumentalists they should listen
  to", and may never choose from the tradition. A "if you don't know what
  to transcribe next" nudge is defensible.
- Solos named repeatedly as accessible to a beginning transcriber (T
  pp. 69–70): Miles Davis (13 mentions), Hank Mobley (9), Dexter Gordon
  (8), Paul Desmond (7), Chet Baker (5), Clifford Brown and Sonny Stitt
  (4), Lester Young (3). Most-cited "canon" solos (T pp. 77, 90): *Kind of
  Blue* / "So What", "Giant Steps", "Body and Soul", "Cottontail",
  "Countdown", "Easy to Love", "Now's the Time", "Lester Leaps In",
  "St. Thomas".
- A **graded difficulty list is contested** — 41% yes, 24% with
  reservations, 24% opposed, some calling it "authoritarian" (T pp. 74–75).
  The useful caution if we ever compute solo difficulty is Blair's: solos
  can be "deceptively difficult" or deceptively simple, so a computed
  ranking should be offered as a hint, never as a curriculum.

---

# Part 4 — Ranked proposals

Everything here is a proposal. Ordered by value ÷ effort.

1. **7-3 resolution detector** (§2.2). Fully specified, uses only data we
   have, adds the cross-chord dimension we entirely lack.
2. **Summariser prompt rules** (§1.1, 1.4, 1.5, 1.8): lead with style and
   ear; talk in cells and goal notes, never note-by-note degrees; always
   point back at the recording; never assert a wrong note. Costs nothing
   and shapes every sentence the product will ever say.
3. **Report phrase-boundary metric position in the profile** (§2.6). We
   already compute it; one line of real observation about the player.
4. **Metric and form-position priors in `segment()`** (§2.6). The most
   promising lead on idea recall 68%. Must be scored against `eval:wjd`
   and `brackets` before it lands.
5. **Bebop scale detector / chord-tone-on-downbeat term** (§2.5).
   Distinguishes a real bebop line from an aimless run — the thing
   `stockShare` currently cannot see.
6. **Name the variant relation** (§2.9). Turns variant families into
   motivic development the AI layer can narrate.
7. **Check neighbouring chords before calling a note chromatic** (§2.7).
   Would resolve the Blake non-chord-tone phrase-ending question.
8. **New practice steps: visualise, edit, permutation, connect** (§3.1).
   Visualise is nearly free and answers the memorisation finding.
9. **Fill more of Coker's list** (§2.1) — change running, harmonic
   generalization, CESH, quotes, bar-line shifts, side-slipping.

---

# Not read

- **Levine, *The Jazz Theory Book*** (518 pp., image-only). Deferred: it is
  a reference text and the material bearing on our engine is covered by
  Ligon and Coker. Worth a targeted read only against a specific question.
- **Bergonzi, *Pentatonics*** (124 pp., image-only). Pentatonic cells are
  absent from our shape dictionary; medium value, revisit if pentatonic
  material starts showing up unrecognised in uploads.
- **Ligon** was read only at the introduction and appendices. Chapter 18,
  "Analysis: the Big Picture", analyses five well-known solos end to end
  and is the closest published model for what our overview paragraph is
  trying to be. Worth a targeted read when the summariser is built.
- No OCR tooling is installed (`tesseract`/`ocrmypdf` absent), so the
  image-only books were read by vision, table-of-contents first.
  `pdftotext` handled Owens, the transcription PhD and Baker.
