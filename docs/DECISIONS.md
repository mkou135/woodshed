# DECISIONS — append-only

One entry per decision: date, question, decision, evidence class, who
decided, what would reverse it. Newest at the bottom. Never edit old
entries; supersede them with a new one.

---

2026-08-23 · **Chord quality source** · From MusicXML `<kind>`, never the
`text` attribute · corpus evidence (F1: 112/220 harmonies in one file have
text="7" for five different qualities) · owner+engine · reversed only if a
corpus file appears whose `<kind>` is wrong and text right.

2026-08-23 · **Scoring** · Convergence of independent detectors instead of
corpus surprisal · literature (Frieler: frequency near-vacuous) + Blake
validation · owner · reversed if a background corpus becomes practical and
beats it on ranking quality.

2026-08-23 · **Thesis** · The findings list is a menu, not a verdict; the
annotated transcription is the product; a wrong note in a drill is worse
than no drill; any model describes, never curates · owner, in conversation ·
reversed only by the owner.

2026-08-23 · **Exercise contour** · Shape hits carry intervals as played;
never rebuild from degrees mod 12 · bug evidence (drill ended on a leap
down a 7th Blake never played) · engine review · permanent.

2026-08-23 · **Dictionary keying** · By chord quality, not family; validity
gate re-runs matchShapes · bug evidence (maj7 arpeggio drilled over
dominants and sus) · engine review · permanent.

2026-08-23 · **Segmentation** · LBDM-style strength profile, two levels:
rests → phrases, held notes/leaps → ideas within phrases; pickups snap to
the beat · owner's ear on Blake (three specific corrections) + Weimar
statistics · owner + data · re-tune only against `npm run eval:wjd`.

2026-08-23 · **Segmentation tuning** · wLength .45 / wLeap .25 /
lengthFull 6, giving up 0.6 F1 vs the best grid point to keep a ≥6×-median
held note as an idea cue on its own · WJD eval (456 solos) + owner hears
the bar-67 held G as a boundary · engine + owner · re-run the sweep before
changing any weight.

2026-08-23 · **Short-rest idea cue rejected** · A blanket "rest ≥ 16th/8th
opens an idea" rule over-fires (precision 53%/70% vs baseline) despite the
raw cue statistics suggesting it · WJD eval · engine · revisit only with a
smarter form (e.g. rest + metric position).

2026-08-23 · **Practice unit** · The idea (option B), not the finding or a
fixed chunk; findings are labels inside it; ideas longer than 2 bars split
at bar lines into parts · owner chose B; splitting is an engine judgement
call flagged and accepted · reversible by owner.

2026-08-23 · **Tunes** · This solo's changes by default; iReal `irealb://`
links pasted by the player (own parser, no bundled collections, nothing
uploaded) · owner ("cant we just use the irealb pro forum thingies") ·
reversed if licensing view changes.

2026-08-23 · **Variation generation** · Generate rhythmic displacement
only; everything else is a text prompt (option A) · owner + Coker/Galper
(the transposition/variation IS the exercise) · reversible.

2026-08-23 · **Write-your-own** · Template with cue-note targets + re-drop
check via the detectors (option B) · owner · —.

2026-08-23 · **Hosting** · GitHub Pages on mkou135/woodshed, deploy via
Actions on push to main · owner (peers need a link) · —.

2026-08-23 · **Weimar DB** · Lives outside the repo
(~/dev/personal/woodshed-data/), ODbL, never committed · licence · —.

2026-08-24 · **Context between sessions** · Four continuous files
(ENGINE_SPEC, DECISIONS, OPEN_QUESTIONS, LEDGER) replace one-shot handover
prompts; HANDOFF.md remains as narrative history, no longer authoritative ·
owner (friend's system) · owner.

## 2026-08-24 — How is the form's phase found?

**Question.** Autocorrelation gives the chorus length but assumes the
first chorus starts at bar 1; Blake has an 8-bar intro.
**Decision.** Phase from the transcriber's marks: rehearsal letters, then
double bars (parsed at ingest as `double-bar` marks on the following bar).
Earliest mark with another mark a whole number of periods later starts the
first chorus. No marks → bar 1, flagged `phaseFrom: 'none'`.
**Evidence.** Notation convention research (double bars mark section ends,
not fixed intervals; letter A is the head) — docs/research/
notation-conventions.md. Blake: double bars after 8, 24, 40, 48, 64, 80,
96, 104, 120 → starts 9 and 65; profile now splits the solo correctly.
**Who.** Owner asked for the research before accepting; engine change by
Claude.
**Would reverse it.** A body of transcriptions where double bars fall at
arbitrary bars (e.g. every 8 regardless of form), or where the earliest
aligned mark is not the head.

## 2026-08-24 — Phase: residue class, not aligned pairs

**Question.** Letters sit inside the chorus (Autumn Leaves A A B C at 2, 10,
18, 26) or only on the solo choruses (Blake A–G at 65–113); no two are a
period apart, so "earliest mark with an aligned partner" fell through to
the double bars or the wrong chorus.
**Decision.** Phase = residue class mod period with the most marks, ties
to the earliest; walk back to the first bar in that class. Corroboration
counts either mark kind.
**Evidence.** 8-file corpus in ~/Downloads/MusicXML Transcriptions: Autumn
Leaves [2, 34], Blake [9, 65], Bartley [5, 45, …], 26-2 [1, 33, …].
**Who.** Claude, from the corpus run.
**Would reverse it.** A chart whose head is a different length from the
solo form (walk-back would then invent a chorus).

## 2026-08-24 — Which soloist to analyse by default

**Question.** Autumn Leaves has "Miles" over bar 1 (the tag of the
previous solo) and "Cannonball Solo" from bar 2; the engine analysed bar 1.
**Decision.** Named region with the most notes. The user-choice adjustment
stays blocking.
**Evidence.** Autumn Leaves: 0 findings → 28. Tenor Madness unchanged
(Trane, 84 bars, has more notes than Sonny).
**Who.** Claude. **Would reverse it.** Owner preferring "first named" or a
page control that makes the default moot.

## 2026-08-24 — The player names the tune; the changes name the instrument

**Question.** Charts without `<transpose>`/part-name read as C
instruments; the iReal tune then lands in the wrong key. And "paste a
link" was the only way to pick a tune.
**Decision.** Bundle the 1,460-tune book; a type-ahead search prefilled
from the score title / file name. Once a tune is chosen, a bar-by-bar
root vote between the solo's changes and the concert chart gives the
transposition, overriding the file when confident. Owner's caveat honoured:
comping substitutions and alterations only cost votes.
**Evidence.** Corpus run: 6/9 identified from title; votes 79–100% on
correct tunes, ≤ 29% on wrong ones, recovering −2/−9 (tenor/alto) from
changes alone.
**Who.** Owner (search, not a dropdown; "there is only so much we can do"
about substitutions); Claude for the vote.
**Would reverse it.** A chart whose comping diverges on most bars, or a
book chart in a different form length from the solo.

## 2026-08-24 — A pickup written as a full bar 1

**Question.** Omnibook files start with a pickup bar numbered 1 whose
chord is the form's last bar; with no marks the form phased from bar 1
and every tune vote compared against the wrong chart bar.
**Decision.** No marks + first note of bar 1 at or after mid-bar → pickup,
phase from bar 2. Marks always take precedence.
**Evidence.** Omnibook: Anthropology 31→77%, Billie's Bounce 36→77%,
Ornithology 38→94%, Now's The Time 42→69/71%, Suede Shoes 50→100%; the
9-file corpus unchanged.
**Who.** Claude. **Would reverse it.** A solo that genuinely starts on
the "and of 3" of bar 1 of the form with no pickup — the vote would then
disagree and the page would say so.

## 2026-08-24 — WJD as a full-pipeline corpus

**Question.** Only one real MusicXML solo (Blake) exercised the pipeline;
`eval:wjd` used the Weimar database for phrase boundaries alone.
**Decision.** Ingest WJD rows into `Score` (notes, chords per beat, form
labels as rehearsal marks, instrument transposition) and run the whole
pipeline over all 456 solos with `npm run corpus:wjd`. Mixed-meter solos
are rejected, not fudged. Slash chords parse as their upper chord.
**Evidence.** 453/456 run clean; 0 unparsed chord symbols after the slash
fix (was 233 beats).
**Who.** Owner asked for more data; Claude picked WJD as the largest
curated source already on disk.
**Would reverse it.** Nothing — it is additive. Fixtures stay MusicXML.

2026-08-24 · **Idea cues from the ChatGPT comparison rejected on evidence** ·
Over the 187k WJD gaps not already marked, no surface cue reaches 20%
precision for an idea boundary (base rate 2%): short rest 7%, rest+held
16%, rest+leap 14%, held+leap 15%, rhythm-vocabulary change (steady→steady,
window 3–6) lowers F1 at every weight, chord-tone 1/3/5 arrival 2–7%,
1/3/5 on a strong beat 3%, chord change 4%, downbeat/on-beat ≈ base rate.
Same at phrase level (harmonic arrival 1–5%). The missed idea boundaries
are motivic/perceptual, not surface events · `npm run diag:wjd` reproduces the table · engine · reverses if a similarity-based
(repetition/transformation) cue is shown to add recall at ≥ 50% precision.

2026-08-24 · **Local peak picking for ideas** · A gap ≥ 0.35 that is the
strongest within ±4 gaps and ≥ 2.5× their mean opens an idea even below
the 0.45 threshold. Ideas F1 76.3 → 77.6 (±1: 78.0 → 79.5); applied to
phrases it costs 0.5 F1, so ideas only. Blake output unchanged · WJD sweep
(peakMin .25–.4, ratio 2–3, window 3–8 all plateau at 77.6) · engine ·
re-sweep before changing.

2026-08-24 · **Variant clustering in the recurring detector** · Cells ≥ 4
intervals form families by one-interval bend (≤ 2 semitones, contour kept)
or exact inversion, tested against the family head only · Blake: the
bars-63/73 figure gains its bar-83 form (last interval bent to Gb), 12 → 13
findings, top unchanged; Confirmation: C Db D Bb G A C at 46/94 gains 78;
corpus:wjd median findings 13 → 13, max 132 → 120, no zero-finding solo ·
engine, owner asked for it · reverse if the page shows bent forms that are
not the same idea (raise variantMinLength or lower bend first).

2026-08-24 · **Similarity as an idea cue rejected; idea recall ceiling
accepted** · The start (or end) of a recurring-family occurrence is at 14%
of missed WJD idea boundaries vs 9% of ordinary gaps — 3% precision, 6–8%
with a rest/held/leap alongside. With surface, harmonic, metric and motivic
cues all tested, the ~75% of intra-phrase WJD idea boundaries we miss are
not recoverable from features the engine has; ideas F1 77.6 stands as the
working ceiling · `npm run diag:wjd` (fam* rules) · engine · reverses only
with a new class of evidence (e.g. annotator-style listening tests).

2026-08-24 · **Stock-vocabulary discount in unit rank** · Rank loses 2 ×
the share of notes inside a ≥4-note scale run or plain arpeggio (option b
of the owner's idea; corpus frequency deferred) · Blake: u1 holds; the
run-heavy bars 74–76 and 81–82 fall from u2/u3 to u5/u6, the enclosure
line at 70–71 rises to u2 · owner asked, engine chose the form · reverse or
exempt named-finding notes if a named arpeggio unit is seen to sink.

2026-08-24 · **Pickup gesture opens an idea** · A note held ≥ 3× the median,
then a lone note in the last half-beat of the bar landing on the next
downbeat: the idea ends on the held note and the pickup starts the next.
Owner drew two boxes on Blake bars 70 and 71 (cues there were 0.11 and
0.23, under every threshold). WJD annotators mark it rarely (9%
precision): ideas F1 77.6 → 77.3, phrases unchanged; Blake 21 → 23 ideas ·
owner's ear over annotators, as with the bar-67 held G · reverse if it
splits things the owner hears as one on other solos.

2026-08-24 · **Repeats unrolled at ingest** · Was: any <repeat>/<ending>
rejected ("flatten before importing"). Now `playedMeasures` unrolls simple
repeats and first/second endings for both the note and harmony parsers;
segno/coda still rejected · owner hit it on St Thomas (Rollins, head
written 17–32 with a repeat; 257 → 273 played bars, head = choruses 1–2) ·
owner asked, engine · reverse if a score with nested or `times` > 2
repeats needs more than two passes (then extend, not reject).

2026-08-24 · **Riff repeats across rests stay separate phrases** · Owner
felt St Thomas's calypso riffs (A E A Eb A D … rest … again) were split
too finely. WJD: where the notes after a rest repeat the three intervals
that opened the previous phrase, annotators still mark a phrase 78% of the
time (83% for other rests) · `LEVEL=phrase npm run diag:wjd` (riffRepeat)
· engine keeps rests as phrase ends · reverse if the owner, on hearing the
record, wants riff statements grouped — then as a display grouping, not a
segmentation change.

2026-08-24 · **This solo's changes come from the first chorus with chords** ·
St Thomas has a 16-bar chordless intro that the double-bar phase counts as
chorus 1; `tuneFromScore` returned an empty tune and the book vote had
nothing to compare. Now the first chorus with symbols under ≥ half its
bars. Book match St. Thomas 88% (the two differing bars: a tritone-sub
first chord in bar 11, a D before the A7 in bar 15); 6/9 chords are
irrelevant to the vote, which compares roots only · owner's report, engine.

2026-08-24 · **Two segmentation bugs from the owner's St Thomas brackets** ·
(1) The GPR 1 exemption for a tiny rest-bounded group tested total
strength ≥ 1, which a rest boundary (0.6) never reaches; now: full rest
both sides and a held note in the group. (2) A forced chorus-start boundary
cut a phrase that began as a pickup into the chorus; now skipped when the
last rest boundary opened ≤ 3 notes in the last two beats before. Owner's 8
brackets on printed 57–76 all match after the fix (6 before); WJD phrases
83.8 → 83.8, ideas 77.3 → 77.8 · owner's ear + eval · engine.

2026-08-24 · **Riff binding** · A rest of ≤ 3 beats between two statements
of the same figure (same first pitch class, same contour over the first
three intervals, comparable opening length) ends an idea, not a phrase.
Owner: St Thomas printed 33–41 is one unit; now one phrase of 7 riff
ideas. Printed 49–56 stays three phrases (the riff there starts on D, the
answer on A) — noted, not forced. WJD phrases 83.8 → 82.4 (annotators
split riffs 78% of the time; see the earlier entry), ideas 77.8 unchanged.
Sweep 2/3/4 beats: 82.8/82.4/82.2; 3 covers Rollins' 2.5-beat rests ·
owner's ear over annotators · reverse by riffMaxGap 0.

2026-08-24 · **Corpus licensing** · Bopland licks
(github.com/MathieuLd/BoplandLicksForDevelopers, CC BY-SA 4.0) adopted as a
local reference corpus at ~/dev/woodshed-data/bopland, alongside the WJD
(ODbL). Two layers: the CC licence would put share-alike on anything we
distribute containing the licks; and the uploader scraped Bopland without
a reply, so cannot grant rights to the content at all. Therefore: local
use only (benchmarks, frequency tables, tuning); derived aggregate numbers
may be committed with attribution; no lick, no WJD note data, in the repo
or the app bundle; fixtures written by hand. Owner asked for a standing
note: this entry, CLAUDE.md non-negotiables, and Claude's memory · owner +
engine · reverse only with written permission from the rights holder.

2026-08-24 · **Bare triads in the dictionary** · 1 3 5 in all six orders
as 3-note cells (cell lengths 4 then 3, shorter hits sharing a note with a
longer hit dropped), named per order, confidence × 0.65 for cells under 4
notes. Before/after: Bopland named/unnamed/nothing 37.1/39.0/23.9 →
66.7/18.5/14.8; Blake 12 → 13 findings, top unchanged; WJD median
findings 13 → 13. Rejected on the way: a smaller named bonus for short
cells alone left "minor triad 5-3-1" at 1.00 and moved Blake's first
practice unit · engine, under the owner's before/after protocol · reverse
by removing the triad entries if the app starts naming triads in every
solo to no useful end.

2026-08-24 · **Dominant b9 cells** · b7 #9 b9 1, 3 b9 1, 1 b9 b7 over
dominant only, named per order like the triads. Bopland
66.7/18.5/14.8 → 69.3/16.4/14.3; Blake 13 findings, top unchanged; WJD
median 13 → 13 · engine, owner's protocol · reverse by deleting the three
entries.

2026-08-24 · **Empty stretches are reported, not split** · St Thomas:
Rollins rests 79 bars (played 130–208, printed 114–192) while others solo,
then returns. The unnamed region is now bounded to played bars (17–257
printed) and an info `empty-stretch` adjustment names the gap in bars and
choruses. Not split into two regions: `chooseSoloist` would then drop the
second stretch, and it is the same player · engine · reverse if a score
arrives where the returning bars are a different soloist (then a name
mark should exist anyway).

2026-08-24 · **Stock discount, corpus version** · `corpusShare`: share of
WJD solos containing each 4-note interval pattern (document frequency,
table committed as aggregate numbers), a unit's share being the mean over
its notes of the best covering pattern; unit `stock` = max(run rule,
corpus share). Notes inside a named cell of ≥ 4 degrees are exempt from
both — the maj7 contour '4,3,4' is in 38% of WJD solos and without the
exemption Blake u1 (the maj7-from-the-b3 line) sank to u2, the case the
earlier stock entry named as the reversal trigger. Bare triads stay
counted (stock by definition). Result: Blake u1 holds (7.96 vs 7.91), St
Thomas top 3 unchanged, WJD medians unchanged — the corpus mostly agrees
with the run rule on these solos · engine, owner asked · reverse by
dropping `corpusShare` from the max; the owner's page read is the real
test (OPEN_QUESTIONS).

2026-08-24 · **Articulation rest** · A gap no longer than the note before
it, the two together within a beat (`articulationSpan` 960), is
articulation, rest cue 0. Owner's diagnosis on the Mintzer rhythm changes:
transcribers write a staccato quarter as eighth + eighth rest, and with a
leap that scored 0.49–0.52 and split bars 27–31 into three phrases. Owner
bracketed written bars 3–34 (13 phrases, "95% confident, none were
ideas"): engine 12 matched / 4 false → 12 matched / 0 false (the one
"miss" at 22.1 vs engine 22.2½ is Claude's reading of the bracket). WJD
phrases 82.4 → 82.5, ideas 77.8 → 77.6; Blake 16 phrases unchanged, St
Thomas 55 → 54 · owner's ear, corpus agrees · reverse by articulationSpan
0.

## 2026-08-24 · Page redesign (session 6)

**Question.** How should the page look and behave for a working jazz
musician? **Decision.** The "practice desk" design in
docs/superpowers/specs/2026-08-24-practice-desk-design.md: single column,
score full width, highlighter marks the idea in hand, tune chip always
visible and amber when unsure, engine diagnostics behind Details, four
steps as a path with a done state. No framework in `app/` (plain DOM,
split into modules). Fonts self-hosted, never a CDN. Step completion
remembered per solo in localStorage. **Evidence class.** Owner's usability
feedback from sessions 4–5 plus a mockup reviewed by the owner. **Who.**
Owner. **Reverses it.** A player test showing the step path or the
highlighter confuses rather than guides; or the app needing state a
framework would make cheaper.

## 2026-08-24 · Through the tune and Vary (session 8)

**Question.** Does “through the tune” mean the detected four-note cell or
the player's whole line, and how can “Vary” change its start without making
passing notes clash with the old harmony? **Decision.** Through carries the
whole line, exact rhythm and resolution through every matching progression
slot (same chord classes and root motion). The previous cell-on-compatible-
chords exercise remains, explicitly named as Bergonzi's drill, with the
twelve-key cycle separate. Vary moves the line and its harmonic frame by the
same metric offset; it does not slide fixed pitches under fixed changes.
**Evidence class.** Published methods: Baker/Galper for progression slots,
Bergonzi for cell-per-chord practice, Crook for isolated metric displacement;
real-solo goldens on Blake and St Thomas. **Who.** Owner approved shipping the
complete researched plan. **Reverses it.** A player test showing the full-line
exercise is unreadable or that a different harmonic adaptation produces more
usable practice material.

## 2026-08-25 — Slot matches group by key, and exclude the line's own bar

**Question.** `findProgressionSlots` returned every occurrence in tune
order. On "Hey Lock!" u1's progression (G7 Cm7 F7 E7) comes round at bars
12, 28 and 52 — all in the same key — so the exercise was the identical
line printed three times; and bar 12 is where u1 is written, so the step
offered the line its own spot as somewhere to take it.
**Decision.** Group occurrences by transposition: one entry per key listing
every bar that shares it, the cap counting keys rather than bars. Drop the
idea's own bar, and any group it empties; name it in the prompt instead.
Home is matched against the run a chord holds, not its first bar.
**Evidence.** Blake u1: 9 bars of notation (three copies, home included) →
3 bars, "bars 28 and 52", "The line is written at bar 12". Blake writes Fm
at score bars 73 and 74, which `tuneChords` merges to one chord at tune bar
9, so u2 computed home 10 by arithmetic and offered bar 9 — its own spot;
the run rule fixes it. Omnibook 12 files, 477 units: 373 have a match, 123
include a transposed key, 120 correctly fall back to the cell drills
because their only place was home. 313 tests.
**Who.** Claude, from the pre-grouping match dump.
**Would reverse it.** A form so repetitive that a group's bar list becomes
unreadable — cap the list rather than the group.

## 2026-08-25 — A one-chord slot is a slot

**Question.** An idea sitting over a single chord with no resolution inside
a bar makes a one-chord slot, which matches every bar of that quality in
the tune — close to the Bergonzi cell drill with the rhythm kept.
**Decision.** Keep it. Baker's static bar is a real practice item, and the
rhythm and shape are what the cell drill throws away.
**Evidence.** Owner, asked directly.
**Who.** Owner. **Would reverse it.** The owner finding at the horn that
these read as filler next to the multi-chord slots.

## 2026-08-25 — Departure detection by chord-relative pitch content: rejected

**Question.** The owner asked for annotations naming "the interesting different
scales being played — for example imposing a scale which suggests another
chord", with a toggle for the full every-span view. Can a departure from the
default chord scale be detected from the notes?

**Decision.** No. Five formulations were built and measured against null models
on the Weimar Jazz Database; all four fire at or below chance. Do not build a
pitch-content departure detector. Build the full-coverage chord-scale layer
(which is well founded) and, for "spicy", report only what the chart itself
declares via `Chord.tensions`.

**Evidence.** Five deaths. Ratios of real to null firing rate: witness sets over a chord
span **0.66x**; the same requiring consecutive notes **0.87x** (four window
lengths, all below null); degree-based character notes **0.90x**; metric and
durational weighting **0.84–0.97x** across six schemes and ~130 cells, using a
LIFT statistic against a within-span weight-permutation null that is 1.000–1.002
by construction. The effect is monotone in how hard a scheme leans on placement,
and tightening any threshold makes it monotonically worse (0.83 → 0.38), which
also rules out "a real rare event that aggregates miss". Baker's rule is
confirmed — chord tones take the downbeats — and that is *why* it fails: the
idiom places chromatic notes exactly where weight is lowest. What is real: lines
fit the default chord scale on 37.6% of spans vs 16.4% under the null (2.3x).
Full detail in docs/research/scale-analysis.md §4.

**Who.** Claude, from the corpus measurements; brought to the owner as a scope
change before any design.

**Would reverse it.** Not another gate on pitch content, and not voice leading
— that was tested as attempt 5 and died too (real 0.862-1.195 across a
144-cell grid, median 1.067, nothing above 1.2; the encouraging 1.659 seen
mid-run was a composition artefact from pooling chord tones, which mostly leap,
into the comparator). What is left: **human-labelled departures to score
against**, replacing the null-model framing entirely — a null answers "better
than chance", not "does it find the six spots a teacher would circle". Or a
corpus of deliberately outside playing (late Coltrane, Woody Shaw, Liebman)
rather than the WJD's mainstream weighting. Both change the target, not the
detector.

## 2026-08-25 — The default chord scale is chosen by function, not quality

**Question.** For the full-coverage layer, what scale does a chord get?

**Decision.** Follow Nettles & Graf p.92: a diatonic root takes the diatonic
non-chord tones; a dominant resolving **down a perfect 5th** takes Mixolydian; a
dominant resolving **otherwise** takes Lydian b7; a nondiatonic root needs a
specific justification. Not a quality-keyed lookup table.

**Evidence.** Nettles & Graf, *The Chord Scale Theory & Jazz Harmony* p.92, and
glossary p.177 "The appropriate scale for a given chord is determined by the
function of the chord". This is also what makes the layer worth building: the
same symbol C7 takes a different scale depending on where it resolves, so the
annotation is not a restatement of what is already printed above the staff.

**Who.** Claude, from the source; not yet implemented.

**Would reverse it.** Nettles p.166/169 notes that in non-functional passages
(contiguous dominants, constant structures) there is no controlling tonic and
Lydian is appropriate — a function-driven default will misfire exactly there.
If that proves common in real transcriptions, the rule needs a non-functional
escape.

## 2026-08-25 — Voice leading does not detect a departure either

**Question.** Attempts 1–4 all tested *what a note is*. Attempt 5 tested *what
follows it*: an approach note resolves by step to a chord tone, a colour note is
dwelt on or leapt away from. A mid-run figure of 1.659 made this look like the
first live result of the investigation.

**Decision.** Dead. The 1.659 was a composition artefact and no rule is offered,
because none is warranted.

**Evidence.** 193,018 notes, 456 solos, function-aware defaults, blues split out
(97 solos, `composition_info.tonalitytype`). Reproducing the earlier statistic —
outsider resolution against an undifferentiated "everything else" bucket — gives
1.611. Splitting the bucket kills it: chord tones resolve by step to a chord tone
only **0.0969** of the time (they mostly leap, being what a line arpeggiates),
available tensions 0.4366, avoid notes 0.4447, outsiders **0.3550**. Outsiders
resolve *less* than either insider dissonance class; the pooled comparator was
dragged down by chord-tone arithmetic. Against a within-span order-permutation
null every class lifts 1.9–2.4x, which is melodies being stepwise. The double
ratio runs **0.862–1.195 over a pre-declared 144-cell grid, median 1.067, zero
cells above 1.2** (~220 cells searched in total). The markers point the wrong
way: outsiders are 0.750x chance to end a phrase or precede a rest and 0.871x
chance to be longer than both neighbours — depleted where a colour note should
sit. Geometrically, an out-of-scale pitch class is nearly always a semitone from
an in-scale one, so the shuffle absorbs the resolution for free; and
non-resolving outsiders are 12% of all notes, not a detector that stays silent.

**Who.** Claude, from the corpus measurements.

**Would reverse it.** As above: change the target, not the detector — score
against human-labelled departures, or against a corpus of deliberately outside
playing.

2026-08-25 · **Agent layer scope** · The AI layer is designed
(`docs/superpowers/specs/2026-08-25-agent-layer-design.md`), settling five
questions. (1) The note-data non-negotiable is amended to *judge yes,
generate never*: the model may weigh engine-computed evidence and cast
judgments, never produce a note, count or interval; CLAUDE.md reworded in
the same commit. (2) The agent is a required stage wherever a key is
present; keyless contexts degrade to the deterministic engine. (3) Four
jobs, build order narrate+name → rank → segmentation adjudication →
exercise construction; runtime order 3→2→1→4. (4) Hybrid interaction:
staged evidence→verdict calls, with a tool-runner loop only for exercise
construction. (5) The public GitHub Pages build is bring-your-own-key —
the bundle carries no secret and the owner's key can never be charged by
visitors; the owner's key lives only in the shell env for CLI and local
Vite proxy. Segmentation adjudication ships only if `eval:agent` beats
68% idea recall on recorded runs · owner + Claude, brainstormed ·
reverse: (1) only if agent judgments prove untestable in replay; (2) by
owner if cost per solo exceeds tolerance; (3–5) normal design revision.

2026-08-25 · **Practice steps 2–4 redesigned around the fixed arrival** ·
The owner read the Blake practice output: the Bergonzi cell drill read as
generic changes-running, displace was opaque, write unseeded. Decided:
(1) Through keeps its generation and gains provenance — each cell drill
says which notes of the line it is. (2) Displace becomes `vary`: four
prepended on-ramps into the unchanged arrival (chord tone below/above,
chromatic below, enclosure), validity-gated by re-detection over the
actual line (`lineContains` — the old `isValid` reads `bar.midis` and
cannot certify excerpt-shaped bars), displacement demoted to two
placements with practising instructions. (3) Write opens with gated
worked examples from Ligon's device taxonomy (fragment, augment/diminish,
edit). (4) Agent look-fors moved onto the score as amber tooltip markers.
Evidence class: owner reading + literature (Ligon p.483, Bergonzi pp.26–27,
39, Gonzalez) · owner + Claude · reverse: owner finds the on-ramps
unmusical on the horn, or gating starves the examples on most solos.

2026-08-26 · **Annotation app: blind marking, dev-only, JSON in repo** ·
Refining segmentation, ranking and departure detection is blocked on
labels only the owner's ear can produce — today that means screenshots
and dictation, cumbersome enough that it rarely happens (St Thomas
brackets were never written down). Decided: a second Vite entry
(`annotate.html`) that runs no analysis and shows no engine output —
the engine's opinion must not bias the owner's ear — for marking phrase
starts, idea starts, outside/colour spans and drill stars directly on the
rendered score. Served by the dev server only, absent from the Pages
build; a dev middleware (`scripts/viteAnnotate.ts`) writes one JSON per
solo to `annotations/`, printed `bar.beat` dialect shared with
`brackets.json`. Committing is licence-clean (the owner's own labels).
`npm run eval:owner` reports precision/recall against them; `brackets`
stays the gate. Evidence class: design brainstormed with the owner,
spec docs/superpowers/specs/2026-08-26-annotation-app-design.md · owner +
Claude · would reverse: the tool goes unused, or the owner's marks bias
differently than screenshots did (e.g. the page's own ticks anchor
attention even blind).

2026-08-27 · Seeded annotation amends blind marking. Question: long solos
(Blues in All Keys) make from-scratch marking too slow — may the owner seed
starts from the engine and correct? Decision: yes, per file, via an explicit
button; the file carries `seeded: true` permanently and eval:owner tags it
`(seeded)`. Seeded files are a weaker evidence class than blind ones —
correction anchors on the engine's proposal, so agreement is inflated in an
unmeasured way; blind files remain the reference class for boundary-term
experiments. The ends mode shipped the same morning is retired unused (file
format keeps the fields). Evidence class: owner request in session ·
owner + Claude · would reverse: seeded files disagreeing with blind files
systematically (then seeding is retuning the owner's ear, not saving time).

2026-08-27 · **Corpus-derived lick table** · Question: may Bopland and the
WJD notes power common-language matching, given DECISIONS 2026-08-24 keeps
both corpora out of the repo? Owner's position: the language itself is
nobody's property. Decision: mine locally, commit the abstraction — a new
`npm run corpus:licks` emits `src/data/corpusLicks.ts`, degree-string
patterns (single-chord and one-chord-change) with document frequency per
corpus, attribution in the header. Raw lick files still never enter the
repo or bundle, so 2026-08-24 stands unreversed; names come only from the
hand-written dictionary. Spec
docs/superpowers/specs/2026-08-27-common-language-design.md. Evidence
class: owner decision in session · owner + Claude · would reverse: the
table's patterns proving too generic to identify anything (then the named
dictionary alone carries the feature).

2026-08-27 · **Common-language identification is descriptive, exact-match
only** · Question: how does the engine say "this is common bebop
language"? Decision: cross-chord lick matcher + longer single-chord cells
in the shape detector (named, hand-written entries), `languageShare` from
the mined table, unit summary split ("mostly a scale run" vs "mostly
common jazz language"), one framing sentence in step rationales, and the
per-finding/per-unit language fields serialized into the agent's analysis
document. No ranking change (`STOCK_PENALTY` untouched); no statistical
inference — every hit is a literal degree-string match, so DECISIONS
2026-08-25 (pitch-content inference fires at chance) is not contradicted.
Evidence class: owner-approved design · owner + Claude · would reverse:
lick hits mislabelling on real solos (a wrong name is worse than none), or
the summary split confusing rather than informing practice.

## 2026-08-27 — `excerpt` lays bars out by flooring, not by `%`

Question: why did `corpus:wjd` throw "Cannot read properties of undefined (reading
'events')" at `loop.ts:50` on melids 78 (Potter), 135 (Gillespie) and 189
(Higginbotham), and where does it belong fixed? Mechanism: `throughStep`
moves a line by `match.chords[0].onset − sourceStart` so the line's first
*chord* meets the match's chord. When the idea begins with a pickup — its
first note before its first chord — and the match sits at the top of the
form, that puts the pickup at a **negative** absolute onset (melid 78:
−480 ticks in a 3840-tick bar). `excerpt` derived its bar origin with
`onset − (onset % ticks)`, and JS `%` truncates towards zero, so the
pickup came out at bar **−1**; `ensure(−1)` never enters its grow loop and
returns `bars[−1]` — `undefined` — and the `.events!` assertion threw. Not
"a note spilling past the end", which `ensure` grows to cover: the failure
is at the bottom of the range. Decision: fix it in `excerpt`, not at the
call site — negative onsets are the honest consequence of aligning a line
to a chord, and an excerpt is defined only up to its origin. `firstOffset`
and `notes[0].onset` are both reduced with the floor-modulo the codebase
already uses in `vary.ts`, and `base` becomes
`Math.floor(onset / ticks) * ticks`, so `rel(notes[0]) === offset` for
either sign and bar 0 is always the bar holding the first note. The pickup
now gets its own leading bar and the match's chord lands on the next
downbeat. Identical arithmetic for `onset ≥ 0`, so nothing else moved
(420 tests green, Blake and St Thomas pins unchanged); `corpus:wjd` runs
452 solos with 0 crashes, the 4 remaining errors all being the deliberate
mixed-meter rejection. Regression test `practice/steps/loop.test.ts` from
hand-authored notes — it failed before the fix with the production error.
Evidence class: reproduced and instrumented on the corpus · Claude · would
reverse: an excerpt whose pickup bar reads wrong on a real solo (then the
line wants trimming to the bar, not a pickup bar).

## 2026-08-27 — What may live in a corpus golden

Question: `corpus:wjd` now pins itself against `goldens/corpus-wjd.json`, a committed file derived
from the ODbL Weimar Jazz Database, which under CLAUDE.md may never enter
the repo. The counts (`findings`, `units`, `phrases`, `ideas`) are plainly
derived aggregate statistics and are permitted. Two further per-solo fields
are not counts: `form` (the chorus grid's phase provenance — `rehearsal`,
`double-bar`, `pickup`, `none`, `no-form`) and, for the solos the engine
refuses, `rejected` (`mixed-meter`, `too-few-notes`, `error`). May they be
committed, and by what test? Decision: yes, both, and the test is **derived
and de minimis** — not "it is about the engine, not the recording". That
weaker distinction was the first justification written and it does not
hold: `form: 'rehearsal'` reports that this melid's `beats.form` column
carried rehearsal annotations, which is a fact about the source data's
annotation coverage; `rejected: 'mixed-meter'` reports that four specific
recordings change meter. Both are true facts about WJD entries. They are
permitted because each is a single token from a closed five- or three-value
vocabulary — a couple of bits per solo, reconstructing nothing about the
music — and because the golden is not legible without them: a grid that
silently re-locks while the counts hold would pass, and a deliberate
rejection that silently stops happening is a regression the counts cannot
see. On the same test, `periodBars` is excluded: the form length is a
specific musical property of a specific tune, and one that a reader could
act on. So is the thrown rejection message, which interpolates the
recording's actual meters ("4/5 beats per bar") — hence a code, not the
message. Anyone extending the golden should apply de-minimis-plus-derived,
field by field, and not reason from "the engine computed it" — everything
in the file was computed by the engine, including the parts that may not be
committed. Evidence class: reading of CLAUDE.md's corpus rule and the ODbL,
applied field by field; no external advice sought · Claude, at the owner's
review · would reverse: a later task wanting `periodBars`, bar counts, or
any other per-solo musical fact in the golden — re-open this rather than
extending it by analogy, and if the fields here ever grow past a few bits
per solo, re-open regardless.

## 2026-08-27 — The chorus wall becomes `wChorus`, and its equivalence gate is unsatisfiable as written

Question: the spec revision required that `wChorus = 0.45` reproduce the
hard wall's phrase-boundary positions exactly, while also requiring the new
boundary to record the boosted cue total (min(1, total + wChorus)) instead
of the constant 0.6. Decision: **the two cannot both hold, and the
confidence requirement wins.** `enforceMinimum` (GPR 1) dissolves the
*weaker* of the two edges around an undersized group, and "weaker" is read
straight off `Boundary.strength` — the number the revision changed. So a
confidence change propagates into positions, which the revision assumed it
could not. Evidence: with `strength` pinned at 0.6 and everything else as
shipped, the new code is **byte-identical to the wall on all 456 WJD
solos** (0 phrase and 0 idea position differences) — so the rewiring
itself, the fourth if-chain slot and the retained `!pickupInto` are exactly
faithful. With `strength` at the boosted total, 32 of 456 solos differ:
19 phrase starts lost, 21 gained, phrase F1 unchanged at 80.8. Pinning 0.6
would have resurrected the magic constant this task exists to delete and
made `wChorus` invisible in the output. Evidence class: exhaustive
corpus comparison, isolated control · Claude, advisor-reviewed, flagged to
the owner in the task report · would reverse: a decision that GPR-1
dissolution should not read the chorus prior's strength — the fix would be
a separate tie-break field, not a constant.

## 2026-08-27 — Chorus-start prior value: `wChorus` stays at 0.45, against the corpus

Question: the sweep over {0, 0.15, 0.20, 0.25, 0.30, 0.35, 0.45} on 456
WJD solos trends downward — phrase F1 82.49 at 0, 82.2 at 0.35, 80.8 at
0.45. It is not monotone: two extra runs off the sweep grid (0.05 and
0.10, measured the same way, not interpolated) score 82.485 and 82.477
against 82.491 at 0 and 82.479 at 0.15 — the noise floor, not a local
optimum. Selecting by corpus F1 alone would set `wChorus` to 0, switching
the chorus rule off. Decision: **keep 0.45.** The two targets disagree and
the owner's is the one that governs this app. On the owner's annotated
blues (the `44f60e0` reading, the one not contaminated by the reseed) the
owner kept 7 chorus-start phrase marks: at 0.45 the engine finds all 7, at
0 it finds 1 of 7. `npm run brackets` and the Blake pins in
`pipeline.test.ts` are silent at every value in the sweep, so the owner's
chorus marks are the only owner-ear evidence available, and they are not
close. The corpus finding is not softened: **the wall costs 1.7 phrase F1
across 456 solos, all of it precision, and the WJD prefers it off** — a
cost measured with the annotators' own chorus starts, so probably a lower
bound on what the app pays with `prepare/form.ts`'s derived ones. Note
also that everything from 0 to 0.35 behaves alike — 72% of the corpus's
1188 chorus-start gaps have a cue total of 0.00, so nothing fires until
`wChorus` reaches `threshold` — and that the 0.012 F1 gap between 0 and
0.15 is noise, not an optimum. Evidence class: 456-solo corpus sweep plus
the owner's own annotations on one solo, in conflict · Claude,
advisor-reviewed, returned to the controller as the task's one open
concern · would reverse: the owner saying the WJD's precision matters more
than their chorus marks, or a second blind-annotated solo agreeing with the
corpus. Flipping is one number, one ENGINE_SPEC row and a golden re-pin.

## 2026-08-27 — Correction: flipping `wChorus` is five things, not three

Question: the entry above ("Chorus-start prior value") closes with
"Flipping is one number, one ENGINE_SPEC row and a golden re-pin." Is that
the whole reversal cost? Decision: **no — the checklist under-counts by two
files, and this entry supersedes that closing sentence.** The entry itself
stands; only its last sentence was wrong, and DECISIONS is append-only, so
it is corrected here rather than rewritten there. The annotation export
carries a prose copy of the rule, and its test asserts on the copy
literally. Setting `wChorus = 0` therefore touches, in full:

1. `DEFAULTS.wChorus` in `src/analyse/segment.ts` — the one number.
2. The `wChorus` row in `docs/ENGINE_SPEC.md`, plus the phrase-F1 figure
   in force (82.5 unwired, not 80.8).
3. `goldens/corpus-wjd.json` — re-pin, `npm run corpus:wjd --write-golden`.
4. `app/export.ts` — the phrase-tick legend, in two places, neither of
   which degrades gracefully. Its `parameters` string transcribes the rule
   as `min(1, total + 0.45) ≥ 0.45` and cites `Scored 80.8 F1`; its
   `meaning` string ends "A faint tick with no caret under it is a chorus
   start", which at `wChorus = 0` describes a mark the engine can no longer
   emit. Left unedited, every exported annotation file would describe a
   prior that is switched off — and the export exists to be handed to a
   musician who cannot check it against the source.
5. `app/export.test.ts` — the assertions on those literals (the formula,
   `80.8 F1`, the faint-tick and pickup-exemption sentences). They fail on
   the flip by design; update them with the copy, never loosen them.

Evidence class: read of the code at HEAD, verified by grep across `app/`
(`app/score.ts` carries only the unrelated `threshold 0.45` candidate
detail and needs no change) · Claude, final whole-branch review · would
reverse: the export legend ceasing to quote parameter values, which is the
only reason items 4 and 5 exist — see the header comment in `app/export.ts`
that makes quoting them a standing obligation.

## 2026-08-28 — The annotation files are tests, not owner data

Question: OPEN_QUESTIONS asked whether
`annotations/blues-in-all-keys-bob-mintzer.json` is owner data or reseed
output — `56425ca` (a commit Claude made) re-added the three
chorus-downbeat phrase marks **13.1, 25.1 and 73.1** that the reading at
`44f60e0` records the owner deleting, and only the owner could say which
reading is theirs. Decision: **the owner ruled the annotation files are
"just tests" and not important — losing marks in them does not matter.**
No recovery, no re-annotation, no revert: the file stands as committed at
`56425ca`, and this question is closed rather than answered on the merits.
The class ruling is the useful part — an `annotations/*.json` file is
test input, so a reseed that overwrites one is a nuisance, not data loss,
and nothing downstream may treat these files as ground truth about the
owner's ear without saying so.

Two consequences, recorded here so nobody has to re-derive them:

1. **`wChorus = 0.45` does not change.** Its justification (DECISIONS
   2026-08-27 "Chorus-start prior value") rests on the *uncontaminated*
   `44f60e0` reading — 7 chorus-start marks kept, 5 deleted, all 7 found
   at 0.45 and 1 of 7 at 0 — and those were the owner's own marks at that
   commit. The contamination is entirely after it, so the shipped value's
   evidence is untouched and the reversal checklist stands as written.
2. **`npm run eval:owner` scores against the current file**, which is the
   contaminated reading. Its phrase numbers on Blues in All Keys therefore
   describe `56425ca`, not the owner's marks, and are not evidence about
   chorus starts in either direction. Quote `44f60e0` for that, as the two
   entries of 2026-08-27 already do.

Evidence class: owner ruling, given directly · owner · would reverse: the
owner saying a specific annotation file is precious after all, which would
also mean re-opening how `scripts/viteAnnotate.ts` reseeds them.

## 2026-08-28 — A faint phrase tick with no caret is a rest-free chorus start

Question: the design pass measured 37 faint phrase ticks across the ten
peer solos, 16 of which also draw a boundary-candidate caret on the same
gap, and left two open — a tick at confidence 0.5437 and one at 0.4813,
both inside the candidate band `[0.30, 0.60]` yet drawing no caret. The
standing hypothesis was that riff binding and `enforceMinimum` had moved
the boundary, so the phrase's opening gap was not the gap the candidate
loop indexed. Decision: **the hypothesis is unnecessary and the rule is
exact — every faint tick without a caret is a chorus boundary whose gap
has no rest, and no such gap can ever be a candidate.**
`boundaryCandidates` gates on `cue.rest > 0`; the chorus branch fires
only where the rest and idea branches did not, which on these solos means
`rest = 0.00` every time. The confidence is then `min(1, cue.total +
wChorus)`, so a value other than exactly 0.45 says only that the gap
carried some length or leap cue — 0.5437 = 0.0938 + 0.45 and
0.4813 = 0.0313 + 0.45 — not that any boundary moved.

Measured 2026-08-28 by re-running `run()` over `~/dev/woodshed-data/peers`
and printing, for every phrase below `threshold + CANDIDATE_BAND`, its
cue at the opening gap: 37 faint ticks, reproducing the design pass's
count. All 37 partition cleanly — 19 are chorus starts with `rest 0.00`
and 18 are ordinary rest boundaries with `rest 0.50`, and no gap is
mixed. The two "resistant" confidences are in that table with everything
else (0.5437 at Blues in All Keys 37 and 133 and St Thomas 49, 0.4813 at
Blues in All Keys 73 and mintzer 97 — the design pass's file/bar pairing
was off; the values are not).

Two things worth keeping. First, the marks measure different quantities:
the faint tick tests **phrase confidence** against `threshold +
CANDIDATE_BAND` while the caret tests **cue total** against a band around
`threshold`, and for a chorus boundary those differ by exactly `wChorus`
— so "in the band" is not one predicate and the design pass's 16-of-37
overlap was counting a coincidence, not a relationship. Second, the
overlap count is sensitive to how a caret is associated with a tick: by
bar the count is 18, because two chorus ticks (St Thomas 49,
Tenor Madness 73) share a bar with a caret sitting on a different gap.
This is the visual case the export legend already describes — "a faint
tick with no caret under it is a chorus start" — now measured rather than
asserted, and true of all ten peers.

Evidence class: full enumeration over the ten peer solos, throwaway probe,
not committed · Claude · would reverse: `boundaryCandidates` dropping its
`cue.rest > 0` gate, or a chorus gap that reaches the fourth branch with a
rest (possible in principle — `rest > 0` with `total < threshold` — and
absent from all ten peers).

## 2026-08-28 — Correction: the caretless rule is provable, and its reversal clause was wrong

Question: the entry above ("A faint phrase tick with no caret is a
rest-free chorus start") argues from measurement — "which on these solos
means `rest = 0.00` every time" — and closes by naming as a reversal "a
chorus gap that reaches the fourth branch with a rest (possible in
principle — `rest > 0` with `total < threshold`)". Is either right?
Decision: **the conclusion holds and is stronger than measured, but two
of its statements are wrong and are corrected here.** DECISIONS is
append-only, so the entry above stands; this supersedes those two parts.

First, the observation is a theorem. A chorus boundary's strength is
`min(1, total + wChorus)`, so faint (`< 0.60`) means `total < 0.15`; a
candidate needs `total >= 0.30`; the two are disjoint, which needs only
`wChorus >= 2 × CANDIDATE_BAND` (0.45 ≥ 0.30). And `total >= wRest × rest`
forces `rest < 0.25`, while a nonzero rest cue is at least
`minRest / fullRest` = 0.25 — so `rest = 0` necessarily, not incidentally.
The full derivation, with the parameter equality each step stands on, is
now in ENGINE_SPEC under the faint-tick bullet. The measured 19/18 split
is a consequence, not a coincidence: a faint rest boundary needs
`total ∈ [0.45, 0.60)` and `wRest × 1` = 0.60 exactly, so `rest = 1.00`
cannot be faint.

Second, the entry's blanket claim that a chorus boundary "can never be a
candidate, at any confidence" is **too broad**, and the reversal clause
built on it is not a reversal. A gap can reach the fourth branch with
`rest > 0` and `total < threshold` — say `rest = 0.5`, `total = 0.30` —
and that gap *is* a candidate. But its strength is 0.75, so it is never
faint and never touches the legend. The true statement is about **faint**
chorus ticks, not all chorus boundaries.

The reversal conditions, corrected:

1. `wChorus` dropping below `2 × CANDIDATE_BAND` = 0.30, which opens the
   overlap the disjointness argument closes.
2. Any change to the `wRest × (minRest/fullRest)` = `WEAK − wChorus`
   equality — that is, to `wRest`, `minRest`, `fullRest`, `threshold` or
   `CANDIDATE_BAND` — which costs the "rest-free" half.
3. `<` becoming `<=` at `app/score.ts:336`, which costs the same half (a
   `rest = 0.25` gap would be faint with a rest, though still caretless).

Note for the `wChorus = 0` checklist in "Correction: flipping `wChorus` is
five things, not three": item 4's legend sentence — "A faint tick with no
caret under it is a chorus start" — does not become *wrong* at
`wChorus = 0`, it becomes **vacuous**, because no chorus boundary fires at
all. It still needs editing, for the reason that entry gives.

Evidence class: derivation from `DEFAULTS` and `boundaryCue` at HEAD,
checked against the ten-peer enumeration that motivated it · Claude, fix
round 1, review-driven · would reverse: the three conditions above.

## 2026-08-29 · A finding's name is an identity; what a player reads is composed

**Question.** The idea head printed `recurring cell [5, -5, 0, 5, -5, 0]
with 3 variants recurring cell [5, -7, 2] · lands on the b13 · same shape
at bars 194, 195, … 209`. Is the fix to rename findings, or to compose the
sentence somewhere else?

**Decision.** `Finding.name` does not change. It is an identity —
`mergeByIdentity` compares it, `generate/validity.ts` matches on it,
`steps/write.ts` looks findings up by it, exercise titles embed it — so
writing it for a reader would silently change what merges with what. The
engine instead admits the truth it was hiding: a vector-named recurring
finding carries `unnamed: true`, and `practice/describe.ts` becomes the
one place that turns findings into prose (`displayName` / `headline` /
`detail` / `barSpans`). The head shows one clause and hides the asides
behind a disclosure; the table shows the terse clause only; the CLI header
composes from the same functions. `UnitSummary.cells` is removed rather
than reshaped — with three callers all going through `describe.ts`,
nothing read it, and a second list of names is how the registers drifted
apart in the first place.

The agent's `findingNames` — produced since 2026-08-25, filtered to real
ids, and until today printed only by the CLI — now reach the page,
substituted **per finding at render time** with the engine name as the
fallback. Units are built before `narrate` runs, so nothing is stored on
the unit and a keyless run reads exactly the engine's own names. This is
the "give the agent more space" instinct scoped to the one judgment
DECISIONS 2026-08-25 already permits: naming.

**What is *not* fixed.** The twelve consecutive bars were not a formatting
problem. The recurring detector had found a figure developed across
194–209 and `buildUnits` had sliced it into a dozen units each citing the
other eleven; collapsing the list makes it readable, not correct. See
OPEN_QUESTIONS "Repetition binds" and "Engine 'variations' are vocabulary,
not development".

Evidence class: owner's own reading of the page, one solo · owner decided
the direction, Claude scoped it · would reverse: a player reporting the
headline hides something they needed, or agent names proving worse than
the dictionary's on a real run.
