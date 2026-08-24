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
