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
