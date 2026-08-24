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
