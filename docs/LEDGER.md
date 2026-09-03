# LEDGER — running task log

Append an entry when a task is issued, update its outcome when it ends.
Newest at the bottom. Update *before* starting the next task.

---

2026-08-23 · session 1 (Opus) · Build pipeline end-to-end; corpus survey;
research (patterns, exercise generation); HANDOFF.md + CLAUDE.md ·
delivered 35 commits, 161 tests.

2026-08-23 · session 2 · Second-eyes engine review · found: drills lost
contour, maj7-over-dominant, target score discarded, scale-walk noise,
chord identity bug · fixed in 1863606; golden test + `npm run solo`.
2026-08-23 · session 2 · Conceptual review vs research (fork) · thesis
reframed: menu not verdict; annotated solo is the product · in HANDOFF.
2026-08-23 · session 2 · Annotated solo page (OSMD highlight, drills under
finding) · 0737bc8.
2026-08-23 · session 2 · SoloProfile (density/silence/register/chromaticism,
phrase-edge asymmetry) · 568e3e0 · found form-phase bug, logged.
2026-08-23 · session 2 · Phrase research + LBDM segmenter; owner corrected
three boundaries by ear; two-level phrases/ideas; ticks on the page ·
d870673, 5bba9be, af2a9f0.
2026-08-23 · session 2 · Deep research: phrases vs ideas (agent downloaded
WJD, computed cue stats); practice methodology · docs/research/
phrases-and-ideas.md, practice-methodology.md.
2026-08-23 · session 2 · `npm run eval:wjd` harness; tuned segmenter on
456 solos (phrases F1 83.8 at human ceiling, ideas 76.3) · cc88715.
2026-08-23 · session 2 · GitHub Pages hosting as mkou135/woodshed (replaced
broken manual upload, force-pushed history, Actions deploy) · live at
https://mkou135.github.io/woodshed/.
2026-08-23 · session 2 · Practice units (spec → build): idea as unit,
loop/through/displace/write steps, iReal parser (1458/1460 forum charts),
renderer rhythm support, page rebuilt as Ideas menu · 17c0f97 · 211 tests.
2026-08-24 · session 2 · Adopted four-file context system; backfilled
ENGINE_SPEC, DECISIONS, OPEN_QUESTIONS, LEDGER; CLAUDE.md rewired · closes
session 2.
2026-08-24 · session 3 · Dropped "peer feedback" open question (ongoing, not
a gate). Researched double-bar/rehearsal conventions ·
docs/research/notation-conventions.md.
2026-08-24 · session 3 · Form phase from marks (rehearsal → double bars →
bar 1); `double-bar` Mark kind at ingest; new fixture
form-intro-doublebars; Blake choruses 9/65, profile 63–64 + 65–122 ·
spec/decisions/questions updated · 214 tests.
2026-08-24 · session 3 · Corpus run over 8 downloaded transcriptions
(~/Downloads/MusicXML Transcriptions; sandbox blocks that folder — copy
out first). Found: letters inside/only-on-solo broke phase → residue-class
rule with walk-back; final double bar → no mark; first-named soloist was a
1-bar tag → most-notes rule. Autumn Leaves 0 → 28 findings. Fixtures
form-letters-in-chorus, soloist-tag-first · 217 tests.
2026-08-24 · session 3 · Tune search over the bundled 1,460-tune book,
title guess from `<work-title>`/file name, transposition by bar-root vote
(overrides file instrument when confident); page: search box + pills,
verified in Chrome on Autumn Leaves · 229 tests.
2026-08-24 · session 3 · Omnibook (50 Parker files) run: all parse; pickup
bar 1 broke phase → 'pickup' phase rule; 24/32 title matches vote
confident. Fixture form-pickup-bar · 230 tests.
2026-08-24 · session 3 · WJD ingester (`ingest/wjd.ts`) + `npm run
corpus:wjd`: 453/456 solos through the full pipeline; slash chords parsed;
mixed meter rejected; eval:wjd reuses the converter · 236 tests.
2026-08-24 · session 3 · Close. Pushed through 944e12d. Next candidates:
`eval:omnibook` script + golden counts for corpus:wjd; vamp-as-form (34 WJD
solos); vote over period×phase for weak tune matches; peers' files via a
Dropbox file request into ~/dev/woodshed-data/peers.
2026-08-24 · session 4 · Compared segmentation against a ChatGPT hierarchical
model (ideas → phrases, separate weight vectors, harmonic/metric cues,
variant clustering). Already in place: weighted profile, two levels, graded
rest, held-note, leap, minGroup, identity clustering, WJD eval. Seven new
cues logged in OPEN_QUESTIONS under "Segmentation cues to trial". No code.
2026-08-24 · session 4 · Cue trials on WJD. Baseline reproduced (phrases
83.8 / ideas 76.3; eval script default data path fixed to
~/dev/woodshed-data). Diagnostic over 187k unmarked gaps: intra-phrase idea
recall is 25%; no surface/harmonic/metric cue > 18% precision → idea-profile
rest, rhythm-change, harmonic arrival, metric cues rejected (params kept at
0). Local peak picking (0.35 / 2.5 / 4) accepted for ideas: 77.6, phrases
unchanged, Blake unchanged, 238 tests. Diagnostic script: scripts/diag-wjd.ts (`npm run diag:wjd`), was
$CLAUDE_JOB_DIR/tmp/diag.ts (job 947da956; not in repo).
2026-08-24 · session 4 · Variant clustering: `variantOf` + families in
`detectors/recurring.ts` (variantMinLength 4, bend 2, inversion),
`Finding.variants`, `FindingView.variants`, name "with n variants". Blake
12 → 13 findings (bar 68 target crossed 0.4 on recurring evidence), top
unchanged; corpus:wjd median 13 → 13 · 244 tests.
2026-08-24 · session 4 · Families reviewed on Donna Lee / Blues for Alice
(Parker sequences through changes, bars 1–2, 8–9, 31–32): keep. diag:wjd
gains fam* rules: family start 3% precision → similarity cue rejected, idea
recall ceiling recorded in DECISIONS. Next: stock-vocabulary discount in
unit rank (OPEN_QUESTIONS).
2026-08-24 · session 4 · `stockShare` + STOCK_PENALTY 2 in `practice/unit.ts`
(`PracticeUnit.stock`, shown by `npm run solo`). Blake u1 holds, run-heavy
units sink. 250 tests. Corpus-frequency version and named-finding exemption
left in OPEN_QUESTIONS.
2026-08-24 · session 4 · Owner's two boxes on Blake 70/71 → `pickupHeld` 3
in segment.ts (held note, and-of-4 pickup, downbeat). Blake 23 ideas, WJD
ideas 77.3 (−0.3), phrases 83.8. 253 tests.
2026-08-24 · session 4 · Repeats unrolled (`playedMeasures`, fixture
repeat-endings, `Score.repeats`, `repeat-unrolled` info adjustment). St
Thomas (Rollins) from ~/Downloads now runs: 273 bars, 16-bar form ×17, 31
findings; copied to ~/dev/woodshed-data/peers. 256 tests.
2026-08-24 · session 4 · St Thomas review: 72% was an empty "this solo"
tune from the chordless intro → `tuneFromScore` picks the first chorus
with chords (88% vs book); chordName gets '6'; riff-across-rest measured on
WJD (78% still a phrase) → no change; long even-eighth lines stay one idea
(known ceiling). diag:wjd gains riffRepeat. 257 tests.
2026-08-24 · session 4 · Printed bar numbers everywhere (`core/bars.ts`);
page ticks were 16 bars late on St Thomas after the unroll — the owner's
"weird placements". Verified in Chrome. MuseScore CLI renders any score to
PNG for reading: `"/Applications/MuseScore 4.app/Contents/MacOS/mscore" -o
out.png file.mxl` (unsandboxed). 262 tests.
2026-08-24 · session 4 · Owner's 8 phrase brackets on St Thomas printed
57–76 (old-build ticks were the 16-bar offset). Fixed rest-bounded tiny
group exemption and pickup-into-chorus forced cut; 8/8 match, WJD ideas
77.8. 266 tests.
2026-08-24 · session 4 · Riff binding (`sameFigure`, riffMaxGap 3 beats):
St Thomas 33–41 one phrase / 7 ideas; WJD phrases 82.4 (−1.4, owner's
call), ideas 77.8. 270 tests.
2026-08-24 · session 4 · Bopland corpus adopted (local only; licensing rule
in CLAUDE.md/DECISIONS/memory). `bench:bopland`: 37% of licks get a named
finding, 39% unnamed only, 24% nothing; top names 5-3-2-1 (201), maj7 arp
from the b3 (166), dom7 arp (90), 3-5-7-9 (87). Gaps logged in
OPEN_QUESTIONS (triads, b9 cells).
2026-08-24 · session 4 · Close. Pushed through 2a32d58, 270 tests. Next
candidates: triad + dominant-b9 degree cells under the before/after
protocol (bench:bopland, Blake, corpus:wjd counts); soloist detection when
other players' choruses are empty bars (St Thomas "unknown"); more owner
brackets on St Thomas later choruses; corpus-frequency version of the
stock discount.
2026-08-24 · session 5 · Baseline recorded (Bopland 37.1/39.0/23.9, Blake
12 findings, WJD median 13). Bare triads added as 3-note cells
(shapes.ts CELL_LENGTHS [4,3], overlap suppression, SHORT_CELL_FACTOR
0.65): Bopland 66.7/18.5/14.8, Blake 13 with top unchanged, WJD median 13.
274 tests.
2026-08-24 · session 5 · Dominant b9 cells (b7#9b91, 3b91, 1b9b7):
Bopland 69.3/16.4/14.3, Blake 13/top unchanged, WJD median 13. 276 tests.
2026-08-24 · session 5 · St Thomas "unknown (1-257)": unnamed region
bounded to played bars; `empty-stretch` info adjustment (≥ 1 chorus of
empty bars between played bars, 8 without a form); run.ts prints
adjustments. 280 tests.
2026-08-24 · session 5 · Corpus-frequency stock discount: `corpus:freq`
writes src/data/corpusFrequency.ts (1,260 patterns ≥ 5%); `corpusShare`
in unit stock, named 4-note cells exempt. Blake u1 holds, St Thomas top 3
unchanged, WJD medians unchanged. 285 tests.
2026-08-24 · session 5 · Owner's page read: rendered exercises had no
beams (every eighth flagged) → `beamMarks` in render/musicxml.ts (beam
within the beat, rest/quarter/beat line break it, adjacent 16ths share
beam 2). Steps moved out of the 24rem rail into a stepper under the score
(app/main.ts `stepPanels`, `.practice`); notation now full width. Owner
read idea boundary St Thomas 10.2 as probably right — no change. 287 tests.
2026-08-24 · session 5 · Owner: exercises had no key signature and sat a
tone below the chords (OSMD applied <transpose>) → `Score.keyFifths`,
`RenderOptions { keyFifths, forDisplay }`, sharps in sharp keys. Rail
removed: single column, "Idea n of N ‹ ›" chooser, "All ideas" toggles the
list + tune control. Verified on St Thomas in Chrome. 288 tests. Session
closed; handoff in HANDOFF.md "Session 5".
2026-08-24 · session 5 · Mintzer rhythm changes (from ~/Downloads, copied to
woodshed-data/peers): bar 13's quarter-note triplet was beamed (duration
< quarter) and OSMD refused the exercise → beam by notated type. Sweep of
every exercise on Blake/St Thomas/Mintzer: 0 illegal beams. Owner unsure of
"quite a few" phrase markers on Mintzer — logged, needs brackets. 289 tests.
2026-08-24 · session 5 · Articulation rest (`articulationSpan`): owner's
Mintzer brackets bars 3–34 go 12/13 + 4 false → 12/13 + 0 false; WJD
phrases 82.5 (+0.1), ideas 77.6 (−0.2). Mintzer brackets hand-coded in
the session's scratch diag only; worth adding to diag:wjd-style tooling
next time (OPEN_QUESTIONS). 291 tests.
2026-08-24 · session 6 · UI/UX pass opened. Brainstormed, mockup shown,
owner approved: practice-desk design (spec in docs/superpowers/specs/),
no framework, self-hosted fonts, step done-state in localStorage.
DECISIONS updated. Next: implementation plan, then build.
2026-08-24 · session 6 · Practice-desk page built (branch practice-desk →
main): `PracticeUnit.summary`; app/ split into 7 modules; self-hosted
fonts; highlighter on the idea's bars; tune chip amber unless the vote is
confident; Details drawer; step path with localStorage done state.
Verified in Chrome on Blake (lands on bars 76–77, 34 ideas), St Thomas
(chip amber → picker: "Strode Rode 19 % — probably not", "St. Thomas
88 % ✓"), Mintzer (85 ideas). 292 tests, build clean. ENGINE_SPEC "Page".
2026-08-24 · session 6 · `npm run brackets`: scripts/brackets.ts +
brackets.json score phrase starts against the owner's brackets (Mintzer
12/13 + 0 false, 22.1 known; St Thomas 57–76 frozen at 7 — the owner's 8th
is an open question). ENGINE_SPEC "Owner brackets"; CLAUDE.md commands.
Session closed at 292 tests.
2026-08-24 · session 6 · Owner's page read: desk moved above the
transcription; selecting an idea highlights without scrolling. Owner
questions through/vary pedagogy → docs/research/through-and-vary.md,
OPEN_QUESTIONS. Pushed to main (prototype: push on every change).
2026-08-24 · session 8 · Through/Vary pedagogy shipped from the completed
research: whole line + exact rhythm + resolution over matching progression
slots; Bergonzi cell drill kept separate; Vary moves the harmonic frame with
the line. Blake/St Thomas goldens and focused regression coverage added.
Browser-checked both steps on Blake; review fixes preserve shifted chord
offsets, print resolution bars and reject changes under held final notes.
Full build, brackets and 299 tests green.
2026-08-25 · session 9 · Through step: slot matches grouped by
transposition (one exercise per key, every bar listed) and the idea's own
bar excluded, matched by the chord's run rather than its first bar
(`chordRunStart`). `Tune.startBar` carries which chorus the changes came
from, so a chart from elsewhere keeps every occurrence. New slots.test.ts;
Blake golden updated (u1 9 bars → 3, bar 12 named not offered) · 313 tests,
build clean · Omnibook 50 files 0 crashes. One-chord slots confirmed by the
owner. Reached here twice: worktree-datasets-research had rebuilt the same
feature in parallel against a stale main; that branch keeps the datasets
survey, its implementation is superseded.
2026-08-25 · session 9 · Survey of online MusicXML solo datasets (carried
over from worktree-datasets-research). One drop-in: LORIA Charlie Parker
Omnibook (50 files, real `<kind>` harmony, concert pitch, CC BY-NC-SA,
free) — 50/50 parse, 9–29 findings each, form on 42/50; in
`~/dev/woodshed-data/omnibook/`, not vendored. Filosax/FiloBass/QMUL gated;
WJD has no MusicXML export; Effendi is lead sheets · docs/research/
datasets.md · two new open questions (form on 8 files, head+solo).
2026-08-25 · session 4/9 · A fact-checking pass over `practice-methodology.md`
(23 sources, 102 claims, 25 adversarially verified) was run and then discarded
by the owner. Spot-checking its citations found them accurate — Mathias &
Goldman 2025, Norgaard 2025, Cognition 2023 all verified verbatim — but its
"refuted" list contained false negatives: it killed Macnamara et al. 2014's
21%-of-variance-in-music figure and the Bair/Slonimsky→Coltrane thesis, both
of which are real, and instructed that they never be cited. Its §1.1 also
cited Czyż on CI transfer while omitting the same authors' Scientific Reports
retention meta-analysis. Nothing from it is in force; the one finding kept is
the motor-encoding question in OPEN_QUESTIONS, sourced to the paper itself.
2026-08-25 · session 9 · Workspace tidy. Codex's uncommitted renderer work
(rest splitting + triplet tuplet marks) verified and landed from the
/private/tmp worktree — 91 of 384 Blake rests were durations no single rest
symbol expresses. Literature-review open questions carried onto main from
worktree-lit-review before deleting it; the review itself stays local-only
(gitignored) at docs/research/jazz-pedagogy-literature.md. Branches deleted:
worktree-datasets-research, codex/through-vary-production, worktree-lit-review,
through-slot-refinements. Worktrees removed: /private/tmp/woodshed-through-vary,
.claude/worktrees/lit-review.
2026-08-25 · session 10 · Starting: research pass for a scale/mode
annotation feature. Owner's call — annotate the *departure* (a scale that
implies a chord other than the one written), silent on the plain chord
scale, with a toggle for full coverage. No scaffolding exists; substrate is
`NoteContext` + `core/pitch.ts` degree tables. Research first, five parts:
device taxonomy from the books, naming conventions, what counts as a
departure, WJD frequency measurement, and how analysts mark up a page.
Design follows, then a spec.
2026-08-25 · session 10 · Scale-annotation research. Owner's framing: annotate
the departure, silent on the plain chord scale, toggle for full coverage.
Result: **the departure half does not survive measurement** — four formulations
(witness sets; +contiguity; degree-based character notes; metric/durational
weight) all fire at or below chance against null models on the WJD, ratios
0.66/0.87/0.90/0.84x. Baker's rule confirmed and it is the reason: the idiom
hides chromatic notes on weak positions. What is real: lines fit the default
chord scale 2.3x above chance, and the default is chosen by *function* (Nettles
p.92), so a full-coverage layer carries genuine content. Annotation convention
surveyed across Coker/Owens/Ligon/Larson: solid span line with down-ticks
*above* the staff, dashed reserved for inferred, density ~0.2 implied-harmony
marks per bar (one per 4-5 bars) by two independent counts. docs/research/
scale-analysis.md + two DECISIONS entries. Books in ~/Downloads renamed from
verified title pages (Bergonzi "Vol 3 Pentatonics" was Vol 2; Ron Miller is Vol
1 only; a 6pp Nettles promo replaced by the real 184pp book). No code written —
design deferred pending the owner's call on the scope change.
2026-08-25 · session 10 · Implemented the engine half: `analyse/chordScale.ts`,
`Analysis.scaleSpans`, printed by `npm run solo`. Chart-declared scales from
`Chord.tensions` (unused until now), else function-aware defaults. 11 new tests,
325 total, typecheck and build clean. Blake 113 spans / 15 declared. **The page
layer is not built** — the visual annotation the owner asked for still needs a
band above the staff in `app/score.ts` (convention in scale-analysis.md §5:
solid line, down-ticks at first and last notehead, label at the left edge,
dashed reserved for inferred). Research cut short for budget; the modal/
pentatonic read and the voice-leading experiment were stopped mid-run.
2026-08-25 · session 10 · Scale band on the page. `ScoreView.showScales` draws
one span per chord above the staff (solid line, down-ticks at first and last
notehead, label at the left edge — Coker/Owens convention, §5), with a legend
toggle: chart-declared only (default, 10 on Blake), every chord (57), or off.
Two bugs found by looking at it rather than by tests: a fixed offset landed the
band on top of the chord symbols, so `bandY` now measures what OSMD drew above
each staff and clears it; and picking a note's system from its y drew bands
across the staff, so the system now comes from the note's printed bar. 325
tests, typecheck, build clean; browser-checked in both modes, no console errors.
2026-08-25 · session 10 · Death #5. Voice leading tested properly and killed:
the mid-run 1.659 was a composition artefact — pooling chord tones (which
resolve by step only 9.7% of the time, because they leap) into the comparator.
Split by class, outsiders resolve *less* than tensions or avoid notes, and the
double ratio never exceeds 1.2 across a 144-cell grid. Outsiders are also
depleted at phrase ends and on long notes, the opposite of a colour note. The
open question is closed and DECISIONS amended: what would reverse the negative
result is now a change of *target* (human-labelled departures, or an outside-
playing corpus), not another detector. Also validated the shipped function rule
along the way — 27,527 of 63,231 dominant notes (44%) take Lydian b7 rather
than Mixolydian, so the function-aware default is materially different from a
quality lookup, not a distinction without a difference.
2026-08-25 · session 11 · Agent layer designed, not yet built. Brainstormed
scope with the owner and wrote
`docs/superpowers/specs/2026-08-25-agent-layer-design.md`: judge-yes-
generate-never (CLAUDE.md non-negotiable reworded), required-where-keyed,
four jobs (narrate+name, rank, segmentation adjudication, exercise
construction), hybrid staged-calls + one tool-runner loop, replay fixtures
from day one (owner has no API key yet), public Pages build is
bring-your-own-key so the owner's key is never chargeable. DECISIONS
"Agent layer scope"; OPEN_QUESTIONS swaps the blocked-summariser entry for
a BYOK/CORS probe. Next: owner reviews the spec, then a writing-plans pass
for job 1 (narrate + name).
2026-08-25 · session 11 · Agent layer built, all four jobs, offline. `src/agent/`:
strict zod verdicts (ids only, note data structurally impossible), one
SDK-aware client (live claude-opus-5 with structured outputs + cached analysis
document; replay from fixtures), evidence documents, jobs narrate/rank/
adjudicate/construct (construct is the one tool loop, ceiling 15), orchestrator
`runAgent` and `runWithAgent(bytes, client)`. `segment()` gained
`boundaryCandidates` (band 0.15 around the threshold) and `overrides` — no
overrides is byte-identical, old tests unchanged. CLI: agent sections +
--no-agent/AGENT_FIXTURES/AGENT_RECORD; page: BYOK key field (localStorage,
browser-direct), agent overview + menu reorder marked agent-sourced.
`eval:agent` scores recorded adjudications vs WJD, graceful without
recordings. Blake replay fixtures committed (hand-written, real ids);
pipeline.test.ts pins the agent-enhanced run next to the deterministic one.
354 tests, typecheck, build green. Not verified: the page live path (no key
yet — everything model-touching ran through replay), and the browser check of
the key row (extension not connected; build green, keyless path unchanged).
2026-08-25 · session 11 · Practice steps 2–4 rebuilt per the owner's read of
the output (spec 2026-08-25-practice-variations-design.md): `vary` replaces
displace (on-ramps into a fixed arrival + demoted displacement), Through
cell drills carry provenance, Write opens with gated device examples
(`practice/variations.ts`), agent look-fors are now amber tooltip markers on
the score. New `lineContains` in generate/validity.ts because `isValid`
reads `bar.midis` and cannot certify excerpt bars. Agent enum and Blake
construct fixture renamed displace→vary. 369 tests, typecheck, build green;
Blake read: u1 vary has 6 exercises, write example counts honest (u1's own
examples gated out — augmentation drifts across the changes, correctly).
Known gap: augment/diminish keep chords fixed, so cross-change lines rarely
survive the gate; moving the chords with the line is future work. Browser
check of markers/tooltips still pending (extension not connected).
2026-08-25 · session 11 · Jaded joke persona (owner request, for friends): a
washed-up-rival narrator for the narration job only — mood dropdown on the
page, --jaded on the CLI, teacher default, rank/session/boundaries straight.
Comedy rails in JADED_INSTRUCTION: every jab anchored to document evidence,
roast targets the narrator's jealousy and the notes, never invented
biography. Live-verified on Blake ("a chord played as itself"; "bookkeeping
with a mouthpiece") — jabs cited real bars and percentages. 370 tests.
2026-08-26 · session 12 · Annotation app built end-to-end (spec
docs/superpowers/specs/2026-08-26-annotation-app-design.md): shared
`bar.beat` codec (`core/position.ts`, quantised to 3 decimals) factored out
of `brackets.ts`; `AnnotationStore`/`eval.ts` in `src/annotation/` (tested,
DOM-free); `mountScore` exported from `app/score.ts` for reuse;
`scripts/viteAnnotate.ts` dev-only middleware (`/__annotate/files|file|
annotation|save`, traversal/bad-body guarded, 400/404 not crashes);
`annotate.html` + `app/annotate.ts` — blind marking (imports nothing from
`analyse/`), modes 1/2/3 for phrase/idea boundaries and outside/star spans,
flush-not-drop debounced autosave; `scripts/eval-owner.ts` +
`npm run eval:owner` (report against owner JSON, `brackets` stays the
gate; `--misses` prints `boundaryCue` evidence). Hey Lock copied into
`~/dev/woodshed-data/peers/hey-lock.mxl`. End-to-end verified in Chrome via
agent-browser: annotated the first line for real (phrase/idea starts, one
star span), `annotations/hey-lock.json` read correctly, `eval:owner` and
`--misses` both ran clean — then the e2e marks were deleted (not ground
truth; the owner annotates for real later). ENGINE_SPEC "Annotation app"
section, DECISIONS, OPEN_QUESTIONS (departure/ranking labels unblocked;
new "what scores outside/stars" question), CLAUDE.md commands. 385 tests
unchanged (no engine code touched), typecheck/build green, Blake
unchanged (major-seventh arpeggio from the b3, bars 73/77, top finding,
13 findings in the 6–15 pinned range).
2026-08-26 · session 12 · Annotate refinements from the owner's first hands-on
run: rests are clickable boundary anchors (pickup rests belong to the phrase),
ticks carry main-page numbering (phrases 1..N, ideas n.m, relabelled per
change), and the Downloads transcription folder is consolidated into peers —
7 copied, 2 checksum-skipped as duplicates of mintzer/st-thomas; dropdown now
lists 10 solos. Browser-checked live (labels 1, 1.2, 2 on Autumn Leaves).
2026-08-27 · session 13 · Annotate round 2 from owner feedback: (1) found and
fixed why "outside mode just sets idea anchors" — the file dropdown kept
focus and the keydown guard swallowed 1–5, so mode never switched; picking a
file now blurs the select. (2) Outside spans colour the noteheads (magenta,
!important over OSMD inline fills) — departures read on the notes, not just
an underline. (3) New ends mode (key 4): cycle idea end → phrase end, right-
side tick labelled n⌉ / n.m⌉; stored in phraseEnds/ideaEnds (optional fields,
old files load fine). (4) New variations mode (key 5): grouped click-pair
ranges, entering the mode or Esc starts a new group, green underlines A1 A2 …
B1, emptied groups vanish. eval:owner reports end-mark agreement (engine
last-note positions, same matcher, never pooled) and lists variation groups.
389 tests green; browser-verified on Autumn Leaves (end ticks 0.1⌉/0⌉, groups
A1 A2 B1, 7 coloured notes); test annotation deleted after.
2026-08-27 · session 13 (cont.) · Sticky annotate toolbar. First real read of
the hey-lock owner annotation (16 phrases F1 0.81, ideas 0.72): three findings
logged in OPEN_QUESTIONS — repetition should suppress boundary cues (bars
116–120 sequence split by the engine), long-range variation return at 110–112
uncaught, and the rest-vs-first-note phrase-start convention (mark the sounded
note unless the silence is the point). Zero-cue downbeat idea starts (75.1,
79.1, 109.1, totals ≤0.09) add evidence for the queued metric/form-position
term. Outside span 82.3–82.4½ overlaps no engine finding.
2026-08-27 · session 13 (cont. 2) · Annotate round 3 for the long Mintzer
blues: start marking split into direct phrase (1) / idea (2) toggle modes
(cycling retired), ends mode removed from the UI (fields stay in the format),
explicit save button, and a "seed from engine" button — dev middleware runs
the pipeline lazily, page replaces start marks after a confirm, JSON carries
seeded: true and eval:owner prints the (seeded) tag (DECISIONS "Seeded
annotation"). 391 tests, typecheck, build green; browser-verified on 26-2
(44 phrases + 5 ideas seeded, toggle works, test file deleted).
2026-08-27 · session 13 (cont. 3) · Read of the seeded Mintzer blues
annotation (F1 0.96, inflated as expected — the corrections are the signal).
Root-caused the owner's "phrases split at the double bar" complaint: form
chorusStarts are forced segment boundaries (analyse/index.ts:88); owner
deleted 3 of ~14 forced cuts (13.1/25.1/73.1, cue 0.00) — logged in
OPEN_QUESTIONS as "prior, not a wall". Harmonic audit of the 13 outside
spans against the changes: ~4 genuinely outside (33.1 + 129.1 thirds-stack
extension past the chord — both engine-tagged "maj7 arpeggio from the b3";
52.3 + 112.1 half-step side-steps), ~5 altered-dominant vocabulary, ~4
blues/Lydian colour. 11 of 13 overlap engine recurring findings — the
owner's "outside" is mostly systematic vocabulary, not random departure.
2026-08-27 · session 13 (cont. 4) · Seed round 2, owner-approved design: the
engine endpoint now proposes outside spans (off-declared-scale window density,
trimmed to off-notes, confidence = off-density; spike on the owner's spans:
AUC 0.74 Mintzer / at-chance hey-lock, so it finds chromatic-intense outside
only — 2026-08-25 no-pitch-inference decision stands, the human filter is
what changed), variation groups from multi-span findings, and the chordScales
list anchored at each chord's first solo note (middleware caches by mtime).
Page: seed replaces starts+outside+variations after one confirm (stars and
scale strike-outs survive), seeded outside spans render at confidence
opacity with a tooltip, and a scales toggle (off by default — blind stays
blind) prints scale names under the staff; clicking strikes one out as "not
implied by the solo", stored as scalesRejected and listed by eval:owner.
393 tests, typecheck, build green; browser-verified on Autumn Leaves (12
outside, 6 groups, 62 scales, strike-out persisted; test file deleted).
2026-08-27 · session 13 (cont. 5) · Audit of the untouched mintzer.mxl seed
at the owner's request: starts trustworthy (12/13 vs the owner's old hand
brackets, 0 false), variation groups all real recurring cells, but outside
proposals flooded (40% of notes, bridge conflation, absolute threshold vs
0.29 baseline) and variation groups conflate vocabulary recurrence with
motivic development. Two new OPEN_QUESTIONS entries carry the candidate
rules (relative threshold + dominant tolerance + phrase-split; proximity
grouping + far-flung cells seeding stars instead).
2026-08-27 · session 13 (cont. 6) · Implemented the three audit rules in the
seeder: relative hot threshold (baseline + 0.15) with windows confined to one
seeded phrase, graded dominant weighting (altered tension 0.5, natural 7 = 1
— a binary dominant exemption gutted the blues where the owner's marks ARE
altered vocabulary), variation clustering within 16 bars, and ≥3-occurrence
findings seeding stars (top 5, first occurrence). Results: mintzer 40% of
notes → 12 one-bar spans; blues recovers 6 of the owner's 13 marks; hey-lock
5 tight spans. mintzer.json reseeded (was untouched pure seed). Browser-
verified incl. star seeding; spec updated.
2026-08-27 · session 13 (cont. 7) · Re-audit of recalibrated seeds on
mintzer + sandu + 26-2 (harmonic read of every proposed span). Mintzer: ~10
of 12 outside spans defensible; weak ones are a repeated-note pedal and the
blues b3/b7 over the I. Sandu: proposals are mostly bebop enclosure
chromaticism (F#-A-G over Gm7), not departure. 26-2: correctly sparse (4
low-conf spans — Coltrane plays the changes), but variation groups include
overlapping spans (opening motif matched against its own offset copy) and
3-note triad permutations. Four refinement candidates identified: exclude
enclosure/approach-finding notes from outside weight, damp repeated pitches,
half-weight blue notes over major, and a minimum-substance rule (≥4 notes)
plus overlap-dedup for variation/star seeding.
2026-08-27 · session 13 (cont. 8) · Implemented the four re-audit rules:
enclosure/approach-finding notes weigh 0 (resolving chromaticism is grammar),
repeated-pc runs weigh once, blue notes over major weigh 0.5, and variation/
star seeding is substance-gated (≥ 4 notes per occurrence, overlapping
occurrences dropped). Re-audit: mintzer 12 tight spans with pedal and
blues-note false positives gone, variations now all multi-note worked cells
(incl. the 82.4½/83.4½/85.1½ sequence); sandu 5 → 2 proposals (cost: its one
good altered span at 22.3½ now falls under threshold — enclosure zeroing +
half-weight alterations combined); 26-2 overlap group and triad groups gone,
1 substantial star. mintzer.json reseeded — NOTE: the working copy differed
from HEAD before the reseed (possible owner corrections overwritten; owner
asked to check their open tab and press save if their marks are still there).
2026-08-27 · session 13 · CLOSED. Working tree clean at 2cf3a24; 393 tests,
typecheck, build green. Next session candidates, in rough value order:
(1) chorus-start forcing → prior (OPEN_QUESTIONS; owner deletions at
13.1/25.1/73.1 on the blues are the test set); (2) repetition-binds
boundary term (hey-lock 116–120); (3) owner corrects the seeded mintzer /
sandu / 26-2 annotations — check whether mintzer corrections were
overwritten by the cont.-8 reseed (owner's open tab + save button was the
recovery path); (4) metric/form-position idea term (zero-cue downbeat
starts). Annotate app is feature-complete for now: five modes, seeding
with grammar exemptions, scales strike-out, sticky toolbar.
2026-08-27 · session 14 · Common-language identification designed and
approved (spike → design with owner: reframe commonness positively +
named-cliché dictionary, cross-chord now, corpus-derived lick table from
Bopland + WJD, descriptive + practice framing, agent document wiring).
Spec written: docs/superpowers/specs/2026-08-27-common-language-design.md.
Owner away; instruction is to run spec → plan → implementation → verified
production autonomously for review on return.
2026-08-27 · session 14 (cont.) · Common-language identification built to
production: language.ts keys + languageShare; cross-chord LickEntry
matcher + 4 single-chord clichés + 3 licks in shapes.ts (CELL_LENGTHS
8→3); Finding/FindingView language + lickShare; corpus:licks mined table
(441 WJD solos + 1,785 Bopland licks → 1,291 patterns, 115 cross-chord);
stockParts + stockKind summary split ("mostly common jazz language");
loop/write cliché framing; agent document + rank/narrate prompt wiring.
414 tests, typecheck, build green. Blake: top finding unchanged, +b9
arpeggio at 92 (common language, checked by ear); St Thomas top unit now
the bar-114 b9-arpeggio unit (pin updated, checked by ear). Bopland
named coverage 72.7% → 74.7% (first 300). Found pre-existing: spec
verification counts stale since session 10 (16 phrases / 34 units at
baseline); corpus:wjd `events` crash on 3 solos (OPEN_QUESTIONS); noted
overlap-merge span absorption (OPEN_QUESTIONS). Owner to review:
spec + plan docs, the lick degree strings (veto pass), and the
St Thomas / Blake pin changes.
2026-08-27 · session 14 (cont.) · Agent model selection: the hardcoded
claude-opus-5 becomes LiveOptions.model — page dropdown next to the BYOK
key (Opus 5 / Sonnet 5 / Haiku 4.5, woodshed.agentModel, default Opus 5),
CLI env ANTHROPIC_MODEL. 414 tests, typecheck, build green; pushed.
2026-08-27 · session 14 (cont.) · Engine-evidence overlays on the main
page score: opt-in checkbox strip (phrases/cells/devices/recurring/
common language/boundary candidates/stock), per-vector underline lanes
with confidence opacity, candidate carets with cue tooltips, stock wash,
languageRuns helper (tested) merging mined-table windows for display.
Verified live in Chrome on Blake: all lanes draw, tooltip shows "f3
dominant arpeggio 3 to the b9 · 0.95 · shape+target · common language ·
2%", no console errors. 417 tests, typecheck, build green; pushed.
2026-08-27 · session 15 · Task 1 of the chorus-prior sprint: fixed the
`corpus:wjd` `events` crash (melids 78/135/189). `throughStep` aligns a
line's first chord to the match's, so a pickup note lands at a negative
onset when the match is at the top of the form; `excerpt` used truncating
`%` for its bar origin and asked `ensure` for bar −1. Now floors, and
reduces `firstOffset` with the same floor-modulo — origin-independent
layout, pickup in its own bar. New `practice/steps/loop.test.ts` (hand
authored, failed before with the production error). ENGINE_SPEC gains an
excerpt-layout bullet and refreshed WJD corpus numbers; the
OPEN_QUESTIONS entry moved to DECISIONS. 420 tests, typecheck green;
corpus:wjd 452 solos, 0 crashes (4 mixed-meter rejections).
2026-08-27 · session 15 (cont.) · Task 2 of the chorus-prior sprint: the
456-solo sweep now has a blast-radius pin. `goldens/corpus-wjd.json`
holds melid → {findings, units, phrases, ideas, form} — derived counts
only, ODbL attribution at its head, one solo per line so a diff reads as
a list of solos that moved. Solos the engine refuses record a stable
reason code (`mixed-meter`, `too-few-notes`), never the thrown message,
which interpolates the recording's actual meters. `npm run corpus:wjd`
compares and exits 1 on any difference; `-- --write-golden` re-pins;
a missing `~/dev/woodshed-data/` prints a skip and exits 0. Comparison
verified by perturbing `segment` threshold 0.45→0.50 (155 solos moved,
exit 1) and by hand-editing the golden for the added/removed/status
paths. 420 tests, typecheck green.
2026-08-27 · session 15 · PAUSED mid-sprint at owner's request. Branch
`sprint/chorus-prior-and-design`, clean at a505aab. Deck-clearing: owner
annotations committed alone (56425ca), the annotation export landed after
browser verification on Blake (719a6db), and tsconfig.app.json now
typechecks app/ and scripts/ (f98a8fe) — previously nothing outside src/
was checked. Then, subagent-driven: T1 fixed the corpus:wjd `events`
crash (b03f637 — `ensure(-1)` from a pickup's negative onset, not the
overrun hypothesised; flooring + floor-modulo, bit-identical for
onset >= 0), T2 pinned the 456-solo sweep with goldens/corpus-wjd.json
(f546cef; a threshold nudge moves 155 solos, so the blast-radius tool
works), T3 covered the annotation export (a505aab, 429 tests). T5's spec
was revised before dispatch after a probe found all 13 chorus-start gaps
across both annotated solos have rest == 0 — the original design would
have deleted every chorus boundary. Rulings and parked items: see
"Chorus-prior sprint (2026-08-27, session 15) — rulings and parked items"
below.
2026-08-27 · session 15 (cont.) · Task 5a: `eval:wjd` now passes chorus
starts into `segment()` instead of an empty list, so the 456-solo corpus
scores the chorus rule for the first time. Starts come from
`beats.chorus_id`, not the `form` column: `form` records a label only
where the label changes, so on a one-section form (every blues) it names
"A1" once and never again — the form derivation finds a single chorus on
121 of the 456 solos and agrees with `chorus_id` on the other 335.
Numbers: no chorus rule at all, phrase F1 82.5; hard wall wired in, 80.8
(precision 81.4 → 78.1, predicted phrases 10923 → 11385 — the hard
wall's count, i.e. strength pinned at 0.6; the `wChorus` rule that
replaced it in 5b predicts 11387, the number ENGINE_SPEC carries). 1188
chorus-start gaps; **28% carry a real rest** (rest = 1.00 at 240 of
them), so unlike the two annotated solos the corpus does give the prior
something to weigh. 37 gaps (3.1%) clear the idea branch and never reach
the fourth slot today, which is what makes the if-chain position
load-bearing.
2026-08-27 · session 15 (cont.) · Task 5b: the chorus wall is now the
`wChorus` prior. `STRUCTURAL_CONFIDENCE` and `kind: 'structural'` are
gone; the branch keeps its fourth slot in the if-chain and its
`!pickupInto` exemption, and fires when min(1, total + wChorus) >=
threshold. `kind` is now `'chorus'` rather than folded into `'rest'`,
because riff binding demotes rest boundaries to arrivals and its
`gap > riffMaxGap` guard cannot catch a rest-free chorus gap. Sweep on
456 solos: phrase F1 82.49 at wChorus 0, 82.2 at 0.35, 80.8 at 0.45 —
the corpus wants the rule off, and the wall costs 1.7 F1 in precision.
Kept at 0.45 anyway: on the owner's annotated blues (44f60e0 reading) the
owner kept 7 chorus-start marks and 0.45 finds all 7 where 0 finds 1.
Both findings in DECISIONS, along with the ruling that the revision's
equivalence gate is unsatisfiable — `enforceMinimum` reads
`Boundary.strength`, so the specified confidence change moves positions
(32/456 solos; byte-identical on all 456 with strength pinned at 0.6,
which proves the rewiring itself faithful). 432 tests, typecheck green,
brackets unchanged at every swept value, corpus golden re-pinned
(29 solos moved). `app/score.ts:286` and `app/export.ts:25` still
describe the deleted 0.6 distinction — deferred to the controller.
2026-08-27 · session 15 (cont.) · Task 5 fix round 1, review-driven, no
behaviour change. The two conditions the revision called easy to get
wrong now have tests with their own controls, each verified to fail under
the exact refactor it guards: moving the chorus test above the idea
branch, and folding `kind: 'chorus'` back into `'rest'`. ENGINE_SPEC now
names the rule change the measurement had only implied — a rest-free
chorus boundary carries exactly `threshold` and every rest boundary
carries at least that, so chorus boundaries went from GPR 1's protected
edge to its default sacrifice, which is why the churn is 19 out / 21 in
with F1 unmoved. The 1.7 F1 cost is qualified in both ENGINE_SPEC and
DECISIONS as measured under oracle chorus starts, so a lower bound.
OPEN_QUESTIONS: the answered entry removed, replaced by the live question
(the signal at a chorus start is not rest, length or leap — cue 0.00 sits
on both sides of the owner's split) with the corrected count, 7 kept and
5 deleted, not "~11 kept"; plus the GPR-1 degeneracy and a parked
eval-owner diagnostic inconsistency. 433 tests, typecheck green.
2026-08-27 · session 15 (cont.) · Sprint complete, all five tasks reviewed
and their fix rounds closed. T1 excerpt flooring (b03f637), T2
goldens/corpus-wjd.json pinning all 456 WJD solos (f546cef, e269c3f), T3
export tests + esc() hardened for attribute safety (a505aab, ea892ae), T4
the design pass — one control bar whose toggles wear their own marks, the
landing page using its width, the weak phrase tick keyed to
threshold+CANDIDATE_BAND instead of a meaningless 0.6 (dc0de52..a197363),
T5 the chorus wall becomes wChorus (9b1e694, 92ae4d9, 9f8c540, 815a3dc).
434 tests, typecheck both configs, build green; Blake reproduces the
CLAUDE.md target exactly. Headline finding: the hard wall costs 1.7 phrase
F1 across 456 solos, measured for the first time because eval:wjd had
never scored the chorus rule at all. Shipped at wChorus 0.45 (= the wall)
because the owner's 7 kept chorus marks all sit at rest-free gaps and can
only be produced at wChorus >= threshold — the owner's call to flip, and
it is one number. Rulings and parked items: see "Chorus-prior sprint
(2026-08-27, session 15) — rulings and parked items" below.

2026-08-28 · session 16 (cont.) · Two script minors. `corpus-wjd.ts` maps
`COUNT_FIELDS` directly instead of spreading a readonly tuple first.
`eval-owner.ts`'s `printCueAt` loses its dead `chorusStarts = new Set()`
default (all four call sites pass it) and stops claiming a prior the
engine did not apply: the chorus branch's `!pickupInto` exemption is
reproduced next to the existing `median` copy, with the approximation
named — it looks for the nearest firing rest gap in the three-note window
rather than the engine's running boundary list, so it can only
under-claim the prior. Latent today: no missed or false start in
`annotations/` currently lands on a chorus start, so the annotation never
prints on live data. The OPEN_QUESTIONS entry parking it is removed.

2026-08-28 · session 16 · Clearing the chorus-prior sprint's parked minors,
on the owner's request. Documentation first: the owner ruled the annotation
files are "just tests", so the OPEN_QUESTIONS entry about
`annotations/blues-in-all-keys-bob-mintzer.json` is closed into DECISIONS
rather than answered — with the two consequences written down, that
`wChorus = 0.45` rests on the uncontaminated `44f60e0` reading and is
unaffected, and that `eval:owner` scores the contaminated file. The
11387/11385 disagreement between ENGINE_SPEC and this file is **not a
mistake in either**: re-measured today, `eval:wjd` at the in-force
configuration predicts **11387** phrases (P 78.1 R 83.7 F1 80.8), and with
the chorus branch's strength pinned back at 0.6 — the hard wall 5b
replaced — it predicts **11385**. Two configurations, two correct numbers;
the 5a line is qualified in place, nothing is rewritten. The over-long
line was inside the annotation entry and left with it.

2026-08-28 · session 16 (cont.) · The last two parked minors, and the
design pass's open investigation. `excerpt` gave a chordless first bar an
empty chord list: it kept `rootPc: 0, quality: 'unknown'`, and the
renderer's fallback to those fields printed a bare **C major** — 54
exercises on Blake, 186 on St Thomas, all `vary-approach`. Carrying was
not an option (the harmony passed in starts at or after the pickup), and
printing the chord the pickup leads into would be a guess, so the bar
prints nothing, as a lead sheet does. Read in the rendered MusicXML
before and after, not inferred. The loop tests move their `excerpt` call
into `beforeAll`; the new assertion was checked to fail without the fix
and to name itself when it does. 435 tests, typecheck both configs,
corpus golden **unchanged on all 456 solos** — it pins counts, and no
count moved. Blake still reproduces the CLAUDE.md target exactly.

The design pass's two "resistant" faint ticks are explained, and not by
the standing hypothesis: `boundaryCandidates` gates on `cue.rest > 0`, so
a rest-free chorus boundary can never be a candidate whatever its
confidence, and confidences other than exactly 0.45 only mean the gap
carried some length or leap cue (0.5437 = 0.0938 + 0.45,
0.4813 = 0.0313 + 0.45). Nothing moved; riff binding and `enforceMinimum`
are not involved. Enumerated over all ten peers: 37 faint ticks, 19
rest-free chorus starts without a caret and 18 rest boundaries with one,
no mixed case. In DECISIONS with the second-order point — the tick tests
phrase confidence and the caret tests cue total, quantities that differ
by `wChorus` — and the faint-tick rule is now in ENGINE_SPEC, where it
had never been written down.

2026-08-28 · session 16 (cont.) · Parked-minors fix round 1, review-driven,
no behaviour change. The caretless-tick finding was recorded as an
observation where a proof exists, and the proof is now in ENGINE_SPEC with
the parameter equality each step stands on: faint means `total < WEAK −
wChorus` = 0.15, a candidate needs `total >= 0.30`, so the predicates are
disjoint whenever `wChorus >= 2 × CANDIDATE_BAND`; and `total >= wRest ×
rest` with a nonzero rest cue floored at `minRest/fullRest` = 0.25 forces
`rest = 0` **necessarily**. It rests on `wRest × 0.25` = 0.15 = `WEAK −
wChorus` exactly, saved by the strict `<` at `score.ts:336` — which also
excludes `rest = 1.00` from a faint rest boundary, so the measured 19/18
split is a consequence, not a coincidence. Two claims in the DECISIONS
entry were wrong and are corrected in an append: "a chorus boundary can
never be a candidate at any confidence" is too broad (a `rest > 0`,
`total < threshold` chorus gap *is* a candidate — but carries 0.75 and is
never faint), and the reversal clause built on it reversed nothing. The
real conditions: `wChorus < 2 × CANDIDATE_BAND`, any change to the
`wRest`/`minRest`/`fullRest`/`CANDIDATE_BAND` equality, or `<` becoming
`<=`. Also noted: at `wChorus = 0` the export legend's faint-tick sentence
goes vacuous, not wrong.

`eval-owner.ts`'s duplicated exemption no longer states a contingent
guarantee as a structural one — it tests branch 2, so a branch-1 rest
boundary (an `overrides` entry of `true` below threshold) would make it
over-claim; unreachable only because this script passes no overrides, and
the comment now says so. The `excerpt` follow-up in OPEN_QUESTIONS is
reworded as the lookup-and-design question it is (`vary.ts:57` holds the
wrong chord in exactly the pickup case; the right one needs a
`score.chordTracks` lookup like `resolutionChord`). Two entries added
there: that **nothing pins exercise output at all** — the golden pins
counts, so the ~240 changed first bars were guarded only by one unit test
and a hand read of the XML — and the `through-tune` concatenation case,
checked across the ten peers (2 exercises, both blanking only at index 0,
a real leading pickup; the join case is unobserved, not ruled out). The
`rootPc: 0` placeholder stays and the comment says why: `ExerciseBar`
requires those fields for the cell-per-bar path (`validity.ts`), the
renderer is their only reader, and the empty list is the guard.
435 tests, typecheck both configs.

2026-08-28 · session 16 (cont.) · Fix round 2: the knife edge is guarded.
Yesterday's derivation was documented and unasserted, which is the shape of
bug this whole wave has been finding, so `app/score.test.ts` now pins the
two relationships the rule turns on — `wRest × (minRest/fullRest)` =
`WEAK_CONFIDENCE − wChorus`, and `wChorus >= 2 × CANDIDATE_BAND` — plus the
half that keeps a full rest out of the faint band (`wRest × 1` = `WEAK`).
Written as relationships between parameters, never their values, so a
tuning pass fails the test only when it breaks the rule, and each message
names the product claim that goes false (the export legend's "a faint tick
with no caret under it is a chorus start"), not that two numbers stopped
matching. `toBeCloseTo`, not `toBe`: the equalities are exact in arithmetic
but off by one ulp in binary, and the comment says so, so nobody tightens
it into a spurious failure.

It lives in `app/` because one of the four terms does — `WEAK_CONFIDENCE`
is the app's rendering threshold, now exported. A `src/` test would have to
reconstruct it, asserting the invariant against a copy of `score.ts`'s
derivation, which is the drift the test exists to catch. `src/` stays
DOM-free; the test touches no DOM. Seen to fail before being kept:
perturbing `wRest` 0.6 → 0.55, `wChorus` 0.45 → 0.25 and `CANDIDATE_BAND`
0.15 → 0.25 each fails the assertions they should, and no parameter was
changed to make any relationship tidier. ENGINE_SPEC's faint-tick bullet
cross-references the file. 438 tests, typecheck both configs.

## Chorus-prior sprint (2026-08-27, session 15) — rulings and parked items

Made on the owner's behalf while they were away, and previously recorded
only in the sprint's own workspace, which is gitignored — so they vanished
on a fresh clone. Lifted here rather than into a new document: the ledger
is the running task log and this is that sprint's state, and the protocol
has four files, not five. Only the judgement calls are kept; the dispatch
mechanics that produced them are not repo material.

**Rulings — scope**

- **The outside-seeding task was dropped from the sprint.**
  `scripts/viteAnnotate.ts:100-160` already implements every rule the
  OPEN_QUESTIONS entry proposed (`SPICE_MARGIN` relative to the solo's own
  baseline, phrase-range confinement, enclosure/approach exemption,
  repeated-pitch damping). The entry is stale, not open. If wrong: a stale
  entry was treated as done; recoverable by re-reading that function.
- **Wiring chorus starts into `eval:wjd` was a prerequisite of the prior,
  not optional scope.** `scripts/eval-wjd.ts` passed an empty forced list,
  so the 456-solo corpus had never scored the chorus rule in either
  direction; without it the prior would have been tuned on the owner's
  three deletions alone. This ruling is what produced the sprint's headline
  measurement.
- **No dark mode was required of the design pass.** The score SVG is
  black-on-white from OSMD and does not invert for free, so a half-done
  dark mode is worse than none. If wrong: the owner wanted it and did not
  get it.

**Rulings — findings**

- **The revised chorus rule's equivalence gate is unsatisfiable as
  written**, and the confidence requirement wins over positional
  equivalence. Full reasoning and the isolated control in DECISIONS
  2026-08-27 "The chorus wall becomes `wChorus`".
- **`wChorus` ships at 0.45 against the corpus's preference**, trading 1.7
  phrase F1 across 456 solos to preserve the owner's 7 kept chorus marks.
  DECISIONS 2026-08-27 "Chorus-start prior value", and the corrected
  reversal checklist in the entry after it. **This is the trade made on the
  owner's behalf and the first thing for them to review.**
- **Owner acceptance was downgraded from a gate to a diagnostic.** Cue
  total 0.00 appears on both sides of the owner's keep/delete split, so no
  `wChorus` can reproduce their marks — gating on it would have driven an
  implementer to contort the rule. If wrong: the owner wanted their marks
  matched and got a table instead.
- **The owner's damaged annotation file was left untouched.** ~~Now an
  OPEN_QUESTIONS entry~~ — **ruled 2026-08-28**: the owner considers the
  annotation files "just tests", so nothing is recovered and the file
  stands as committed at `56425ca`. DECISIONS 2026-08-28 "The annotation
  files are tests, not owner data", which also records why `wChorus`'s
  justification is unaffected (it rests on the `44f60e0` reading) and that
  `eval:owner`'s numbers on that solo are the contaminated reading.
- **On one task the brief was wrong, not the implementer.** It asserted
  `esc()` escaped `"`; it did not. The implementer investigated instead of
  fudging an assertion to look compliant, and `esc()` was hardened anyway —
  an escaper safe only because of a property of its current call sites is a
  trap for whoever adds the next attribute interpolation.

**Parked — minor, none load-bearing, none scheduled**

- ~~`bars[0]` keeps `rootPc: 0, quality: 'unknown'` on a chordless pickup
  bar in `excerpt`~~ — **fixed 2026-08-28, and it was not cosmetic**: the
  renderer's fallback to those fields printed a bare **C major** over that
  bar (54 exercises on Blake, 186 on St Thomas, every one a
  `vary-approach` whose ramp fills the bar before the chord). `excerpt`
  now gives such a bar an empty chord list — the same "no chord symbol"
  representation `write.ts` already emits — because there is nothing to
  carry: the harmony it is handed begins at or after the pickup.
- ~~`practice/steps/loop.test.ts` calls `excerpt` in a `describe` body~~ —
  moved into `beforeAll` 2026-08-28, so a regression names a test instead
  of failing suite collection.
- ~~An unnecessary spread on a readonly tuple in `scripts/corpus-wjd.ts`.~~
  Done 2026-08-28.
- ~~The `too-few-notes` and `'error'` rejection codes in the corpus golden
  are dead today~~ — **reviewed 2026-08-28 and deliberately kept.** They
  are correct handling for a corpus that changes: a WJD solo that loses
  notes, or a file that fails to parse, must have somewhere to land in the
  golden. A guard is not dead because it has not fired.
- The corpus golden's comparison was rewritten field by field over a closed
  union, so a hand-reordered golden no longer reads as spurious changes;
  the key-order-sensitive `JSON.stringify` form is gone.

2026-08-28 · session (sprint/chorus-prior-and-design) · Multi-page build:
`rollupOptions.input` now names index/annotate/engine, so `dist/` carries
all three instead of the analyser alone. Shared `.sitenav` strip in every
page's markup (not injected), current page marked by `aria-current` plus
the highlighter underline. New `engine.html` + `app/engine.css` — the
approved explainer draft ported onto the app's own tokens, dark mode and
duplicated token definitions dropped, the detector colours aliased to
`--ov-cell`/`--ov-device`/`--ov-recurring` so the diagrams quote the marks
the score draws. Diagram detector colours moved from `stroke="var(--…)"`
presentation attributes to CSS classes: `var()` does not resolve in a
presentation attribute, so those boxes had no colour at all. `annotate.html`
degrades honestly off the dev server — `import.meta.env.DEV` is exactly the
`apply: 'serve'` condition, so the picker, seed, save and mode bar are
hidden and a notice says the tool needs `npm run dev`; dropping a file to
read the score still works, and a null store already meant "marking off".
2026-08-28 · session 15 (cont.) · PAUSED mid-ship at owner's request.
Branch clean at 912ad39, 40 commits ahead of main, **nothing pushed** —
prod is GitHub Pages off a push to main, so main is still the live site.
Landed this round: all three pages now build (vite gained
rollupOptions.input; annotate.html had never been in dist at all), a top
nav across Analyse / Annotate / How it works, engine.html as a real
in-app explainer of the pipeline, annotate degrading honestly in prod
where its apply:'serve' bridge does not exist, and a README.

Still open, in the order the owner asked for them:
(1) a solo dropdown on the main analysis page, manifest-driven from
    public/solos/ so it survives a production build — the annotate
    picker's source (~/dev/woodshed-data/peers) is outside the repo and
    its plugin is dev-only;
(2) a checkbox making it explicit the app works without an API key;
(3) merge to main and push, which deploys.
Owner decision blocking (1)'s content, not its mechanism: the peers
transcriptions are third-party work — the Blake carries "Transcripción
Rémi Meurice · cancionesdejazz.com" inside the score — so committing
them publishes someone else's transcriptions of copyrighted tunes.
Also found and not yet fixed: a fresh clone's test suite is red rather
than skipped — six test files readFileSync the absolute Blake path in a
describe body with no guard, so collection throws. Matters now the repo
is public and the README invites cloning.

2026-08-29 · session 16 · a fresh clone's tests skip instead of failing.
Six test files read transcriptions kept outside the repo; three of the
reads were in a `describe` body, and vitest runs a suite's factory even
when `skipIf` will skip it — so `unit.test.ts`'s St Thomas suite threw at
collection despite already being guarded. Fixed by pairing the two idioms
the repo already had: `describe.skipIf(!existsSync(PATH))` plus the read
moved into `beforeAll`, as `practice/steps/loop.test.ts` had written down.
Property-shaped assertions were re-pointed at `fixtures/` rather than
skipped — all five of `generate/index.test.ts` and the three invariants in
`analyse`'s first suite — so a corpus-less contributor keeps that
coverage. The Blake golden pins, merge regressions, chorus profile,
detector convergence and `checkWriting` stay guarded: they assert
magnitudes only a long real solo exhibits. With the corpus present the
suite is unchanged at 53 files / 438 passed / 0 skipped; in a clone with
the paths pointed at nothing, 53 files / 409 passed / 29 skipped and zero
collection errors. Also: pages.yml's first line said the deploy runs on a
push to master; the trigger below it always said main.
2026-08-29 · session 15 (cont.) · The last three items before shipping.
A solo dropdown on the main page, fed by public/solos/manifest.json,
**shipping empty on purpose** — the owner ruled out committing the peers
transcriptions, which are third-party work (the Blake carries its
transcriber's name inside the score). The mechanism, a manifest, a
solos:manifest script and a README for whoever adds the next one are all
in place; the control stays hidden until the manifest lists something.
Both fetches resolve against document.baseURI — the bundle lives in
assets/, so import.meta.url would ask for assets/solos/… — and both check
res.ok, since a Pages 404 answers with HTML that would otherwise reach the
MusicXML parser. handleFile split into handleBytes(bytes, name).
The agent is now a switch, off by default, with the off state saying the
analysis is complete without it; unchecking never clears a stored key.
A fresh clone's test suite now skips rather than fails: 409 of 438 run
with the corpus absent, zero collection errors. The mechanism is worth
recording — `describe.skipIf` does **not** stop vitest executing a suite
factory, so a guard alone was insufficient and one already-guarded suite
was throwing anyway; the read has to leave the describe body too.
generate/index.test.ts and part of analyse/index.test.ts were re-pointed
at fixtures rather than skipped, so a corpus-less contributor keeps them.

**Process note, learned the hard way:** two agents worked this checkout
concurrently and one ran `git commit --amend` then `git reset --hard` over
the other's uncommitted work, discarding it mid-task. Nothing was lost
permanently — the commit was intact and the work was redone — but
concurrent agents in one working tree are only safe if every one of them
stages by explicit path and none rewrites history. Prefer serialising, or
give each a worktree.

2026-08-29 · session 17 · what the page says an idea is.
Owner's complaint: the idea head is engine output, not English —
`recurring cell [5, -5, 0, 5, -5, 0]` followed by a second vector, a
variant count, a degree and twelve bar numbers. Three faults stacked:
the engine printed its identity string as a display name, the *least*
informative finding got the most words, and everything sat at one
altitude joined by `·`.
`Finding.name` stays exactly as it is (four call sites treat it as an
identity); the engine instead marks the vector-named recurring findings
`unnamed: true`, and `absorb` clears the flag when a merge takes a real
name. New `src/practice/describe.ts` is the only place that writes prose
about findings — `displayName`, `headline` (with a terse variant for
table rows), `detail`, `barSpans`. `UnitSummary.cells` removed: with the
desk, the drawer and the CLI all composing through `describe.ts`, nothing
read it.
The agent's `findingNames` now reach the page, per finding, engine name
as the fallback — it had been produced and validated since the agent
layer shipped and printed only by `npm run solo`.
Blake, keyless: u1 "major-seventh arpeggio from the b3 · lands on the #11
· also at bars 73, 102"; the sixteen findings-free units read "No named
vocabulary — still the player's idea" instead of nothing. 54 files / 451
passed, typecheck clean on `src/` and `app/`, page checked in Chrome.
Then two review catches, both real. The agent path had never run: replayed
`fixtures/agent/blake` and 4 of the 5 recorded `findingNames` substituted,
the fifth id having drifted since the recording and falling back to the
engine name — which is the designed behaviour, observed rather than
assumed. Those names read "what it is — why it matters", which is a
sentence where a table row wants a name, so `terse` now keeps the half
before the dash. And `detail` had been *dropping* unnamed findings, not
demoting them: a unit with two nameless shapes said nothing about the
second. They are counted now.
**Not fixed, and said out loud in DECISIONS:** the twelve bars were a
segmentation error wearing a formatting costume (OPEN_QUESTIONS
"Repetition binds"). Note the claim is inferred from the owner's pasted
head, not measured — Blake does not exhibit it, and that other solo was
never re-run. Next sprint's candidate.

2026-09-01 · session 18 · shipping session 17 and telling the truth about
what is open.
No engineering. `sprint/finding-presentation` had been sitting two commits
ahead of main since session 17, complete and unshipped: 453 tests green,
typecheck clean over both configs, `corpus:wjd` golden unchanged 456/456
at that HEAD. Merged fast-forward and pushed, which deploys Pages. The
agent switch is off by default (98d0672), so neither open BYOK-on-Pages
question is touched by the deploy.
Two OPEN_QUESTIONS entries were resolved and never closed — the
`typecheck` one (tsconfig.app.json has existed and been wired into the
script) and "corpus numbers are printed, not pinned" (goldens/corpus-wjd.json
plus the non-zero exit). Closed through DECISIONS rather than deleted, per
the protocol. `eval:omnibook` stays open: that script genuinely does not
exist. `bench:bopland` stays open too — the script exists, the coverage
question it reports is the open part.
The Aug-25 branch `worktree-audio-listening-ideas` (docs only, 5e0a723)
had never landed, so its open question was missing from main. Not merged —
its diffs anchor at LEDGER line ~226 against a file now over 900 lines —
so the question was hand-placed at the end of the pedagogy section and the
253-line idea store `docs/research/audio-and-intent.md` was written to
disk and **gitignored**, beside `jazz-pedagogy-literature.md` and for the
same class of reason: it describes the private `cadenceplayground` repo's
architecture and file paths. Stating the exposure plainly rather than
filing it as a near-miss: woodshed is a public repo and that branch was
pushed, so those details were readable on GitHub from 2026-08-25 until the
branch was deleted today. Deleting the branch does **not** unpublish them:
checked after the delete, both
`github.com/mkou135/woodshed/commit/5e0a723` and the raw file at that SHA
still answer 200, because GitHub keeps unreachable objects. So the 253
lines remain readable by anyone holding the SHA, right now, not merely
historically. Owner's call whether to accept that or ask GitHub Support to
purge unreachable objects.
Also deleted the merged local branch `sprint/chorus-prior-and-design`.
Deploy verified by hash rather than by eye: the Chrome extension was not
connected this session, so instead of reading the live page, `npm run
build` at 23f811f was compared against the served
`assets/index-BIaRF8Ox.js` — byte-identical (sha256
75b80646…502855). That proves the deployed bundle is this commit; it does
not re-check the rendering, which session 17 read in Chrome.

2026-09-01 · session 18b · a session report to hand a peer.
Owner's ask: run the AI once, then export the whole thing — agent output
and annotations — as something shareable, to stop paying for a re-run just
to show someone. `app/export.ts` already emitted a standalone annotated
score with tables and a legend; it carried nothing the agent said. Widening
that export rather than building a second one. PDF via the browser's own
print (the score is inline SVG, so print keeps it vector-sharp; a PDF
library would rasterise the notation and add bundle weight to a page that
ships to Pages). Measured before designing: Blake is 34 units / 108 steps /
225 exercises, and only `through` (47) and `vary` (178) engrave anything —
so "every drill" is ~100 pages. Top 8 ideas by default, all 34 on request.
Built. `app/export.ts` split into shell + legend + tables; `app/report.ts`
composes the report (pure, 29 tests); `app/engrave.ts` renders exercises
through OSMD in an offscreen but laid-out host — `display:none` is not an
option there, OSMD measures its container. 480 tests, typecheck clean over
`src/` and `app/`. Verified by exporting Blake through agent-browser (the
Chrome extension was not connected), capturing the blob, printing it and
reading all 26 pages: 34 ideas listed, 85 drills engraved, no agent
section on the keyless run. Two near-empty leading pages in the first PDF
were a print-CSS bug the green suite could not see; see DECISIONS.
Then the gap that verification had left: the browser run was keyless, so
the agent half of the report had never actually run. Replayed
`fixtures/agent/blake` — 6/6 ranking unitIds and 3/3 lookFor unitIds match
the ids `buildUnits` mints, all six reasons present — and pinned it, since
that is exactly the drift session 17 caught silently falling back. Also
noted: Blake's MusicXML `<title>` is the literal string "Title", which
`soloTitle` rejects, so the report is headed with the filename. Correct
behaviour, but it means the handout carries whatever the file is called.

2026-09-01 · session 19 · spike: does repetition suppress a boundary?
OPEN_QUESTIONS "Repetition binds — boundaryCue has no similarity term":
Hey Lock 116–120, owner hears one phrase built from a 4× varied sequence,
engine splits it at 117.4½ / 118.4½ / 119.4½. Step 1 is a probe, not a
term: find whether any single scalar separates the owner's *bind* case
(group C) from their *split* case (group D, 85.3–86.3½ / 87.2½–88.3½,
where the owner marks a phrase at 87.2½ and the engine already misses it).
Both are repetition; the owner reads them opposite ways. If nothing
separates them the spike is answered negatively and cheaply.
Step 1 answered, and it reframes the item. Three facts, all from
`hey-lock.mxl` (the only uncontaminated owner annotation — mintzer,
blues-in-all-keys and bartley are seeded at P/R 1.00, and all-the-things
scores 0.00/0.00 on the known bar-0 pickup bug):
(a) The mechanism already exists and gets one of four calls right. Riff
binding demotes 87.2½ — the one boundary the owner *marked* — and declines
117.4½ and 118.4½, the two they did not. It demotes 119.4½ correctly at
phrase level, but the owner marks no idea there either, so it survives as
a false idea. Suppression, not demotion, is what group C wants.
(b) Why it declines: `sameFigure` requires the same first pitch class and
group C is a *transposed* sequence (-3 at 118.4½). At 117.4½ it does not
even compare statements — the window runs between phrase-level edges, so
it weighs 29 notes (113.1½–117.2½) against a 4-note statement. The rule's
answer depends on where the previous boundary landed, not on the music at
the gap.
(c) gap/statement ratio is falsified as the discriminator: C is 0.50/0.60/
0.60 and D is 0.50. What does separate them on this evidence is absolute
gap (1440t vs 2400t), statement length (2.5–3.5 beats / 4 notes vs
5.0–5.5 / 6) and repetition count (4x vs 2x) — but n=1 on the split side,
and the gap separator collides with St Thomas, where riffMaxGap is 3 beats
precisely to cover Rollins' 2.5-beat rests (`brackets` is the gate).
Probes are throwaway, in the job dir, not committed.
Then St Thomas, the only other solo the owner has ruled on for riff
binding (DECISIONS 2026-08-24: 33–41 is one phrase, 49–56 stays three),
which kills two of the three separators. 33–41 binds a gap of **2400t**
at 34.2½ — exactly group D's gap — so narrowing `riffMaxGap` to 2 beats
would unbind the span the owner asked to bind. Its bound statements run
2–12 notes / 1.5–8.5 beats, straddling D's 6 notes / 5.0–5.5 beats, so
statement length does not separate either. Only **repetition count**
survives: bind at 4x (Hey Lock C) and 6x (St Thomas 33–41), split at 2x
(group D) — still n=1 on the split side.
Also checked the fear that transposition-tolerance would over-bind: on
St Thomas 49–56, dropping `sameFigure`'s first-pitch-class gate leaves
both owner splits split (51.1½ and 53.3½), so the tolerance is not
obviously unsafe. Caveat: the probes rebuild the edge list from rest
boundaries only, without the idea/chorus branches or `enforceMinimum`, so
comparison windows are approximate — one 57–76 gap (64.3½) reads as
newly bound under the probe and needs `segment()` itself to confirm.
Nothing shipped: no engine change, spec unchanged. Owner's call whether
step 2 (the WJD diagnostic) is worth it — see the report.
Then the owner asked for the window flaw fixed. Riff binding now compares
the n notes either side of the rest, n the shorter of the two segments,
instead of the whole inter-boundary segments — see DECISIONS. Two tests
first, both red: one for the decline at Hey Lock 117.4½, one for its
mirror, a segment that opens with the riff and walks away from it, which
the old code *bound*. WJD phrases 80.8 → 81.0, ideas flat; hey-lock
phrases 0.81 → 0.84 with 117.4½ demoted to an idea exactly as predicted;
118.4½ still a false phrase (it needs the transposition half, not built)
and 87.2½ still wrongly bound. 485 tests, typecheck clean, golden re-pinned.
`npm run brackets` went **red** at 6/7 on St Thomas 57–76, and the reflex
was to call it a stale pin. It was not. Tracing the two moved gaps with a
replication of `segment()`'s own boundary pass (fidelity-checked against
its output, unlike the earlier approximate probes) showed one of each: at
64.3½ the *old* code bound on a 57-note slice that shares a pitch class
and three intervals with the 9 notes after it — a spurious bind, so
unbinding it is the fix working — while at 69.3 the *new* code bound on a
degenerate 2-against-2 window, a single semitone against a single
semitone. Widening the check to the whole 33–41 chain the owner ruled on
found a second regression the brackets gate does not cover: 37.3½, 8 notes
against 5, where trimming loses the figure's first note.
So trimming unconditionally is wrong, and the shipped commit was +2/−2 on
the rulings rather than the clean win it claimed. Guarded it with
`RIFF_WINDOW_RATIO` = 3: trim only when the segment before is grossly
longer. Every 33–41 bind and 69.3 come back, 117.4½ stays fixed, hey-lock
holds at 0.84, brackets is 7/7 matched with one false start at 64.3½ — the
start the 57-note slice used to suppress. The two synthetic tests had to be
rewritten as gross cases (10 and 9 notes of run) since the guard is exactly
what they now exercise.
And the corpus reversed its verdict: WJD went back to 80.8 from the
unguarded 81.0. That gain came from splitting at gaps the owner says bind —
the corpus rewarded the regression, which is what 78% annotator splitting
predicts. `eval:wjd` cannot adjudicate this rule.
Left red on purpose: brackets, one false start at 64.3½, because the pinned
list is the engine's own frozen output from before this fix. Owner reads
57–76 and decides.

2026-09-01 · session 19b · the riff rules, on the owner's call.
Owner: re-pin what needs re-pinning, delete the annotations ("none of it
is particularly detailed"), and do the riffMaxGap. Two of the three went
straight through; the third could not.
`riffMaxGap` cannot split Hey Lock 87.2½: its gap is 2400 ticks, and so are
St Thomas 34.2½ and 36.1½ inside the chain the owner rules is one phrase.
No value separates them. Offered the repetition-count lever instead — the
one separator that survived step 1 — and the owner took it.
Annotations: kept `hey-lock.json`, deleted the other four. Three were
engine-seeded and could only ever confirm the engine; `all-the-things`
scored 0.00/0.00 on the bar-0 pickup bug. All recoverable from git.
Brackets re-pinned: St Thomas 57–76 gains 64.3½, the start the old 57-note
slice suppressed, taking the list to **8** — the count session 4 reported
before the bar.beat list was lost. Still engine output, not an owner
ruling, and the note says so.
Then the rule change. Probed four variants against all 20 ruled gaps
before writing any of it: window alone 18/20, transposition alone 19/20,
chain alone 17/20, both **20/20**. The chain rule alone *undoes* 117.4½,
which is why the two halves ship together — see DECISIONS. hey-lock
phrases F1 0.84 → **0.90**, both bracket gates green, 487 tests, golden
re-pinned (239 solos moved phrases, −376 net).
Cost: WJD phrases 80.8 → 79.7, all recall, the annotators-split-riffs
trade taken a second time. And one weakened assertion in `profile.test.ts`,
written up rather than quietly changed.


2026-09-01 · session 20 · a 7-3 resolution detector.
Task: build the device Coker gives a chapter to — the b7 of a II-7 falling to
the 3 of the V7 (also V7 → I). Brainstorming first: it is the first detector
whose subject is a chord *change*, and two design questions come with it —
whether it may cross an idea boundary (`samePhrase` forbids it everywhere
today) and whether a resolution is a finding of its own or a property of the
cell it ends (Ligon's outlines 2 and 3). Baseline Blake and the peers before
any code; no eval score moves this, so the corpus is a regression guard, not
evidence — last session's caution about tuning against it stands.

2026-09-01 · session 20 · the 7-3 resolution ships, with the numbers.
Five tasks: the detector (`analyse/detectors/resolutions.ts`), its wiring
into `analyse/index.ts` as a fourth source, `FindingSpan.resolves` +
`markResolvingSpans`, the `describe.ts` detail line, and this reading pass.
**Read rather than assumed.** Blake before/after came from a worktree at
474b563 running the same throwaway script as the current tree, not from the
design's baseline paragraph — the design's own census table sums to 58 while
claiming 57, and re-measured through the shipped rules the count is 55.
Every printed resolution I quote I checked: Blake bars 85 and 116 and Bartley
124→125 were read out of the raw MusicXML (harmony `<kind>` and note steps),
not out of the engine's own summary. Bar 116 is the pretty one — F6, the b7
of G7, tied over the bar line into Eb6, the 3 of Cm7.
**What moved.** Blake 13 → 15 findings, top finding untouched, both new ones
at 0.455; the 13 that were there are all still there, unchanged, in the same
order. Units stay 34, exercises 275 → 271 counting a write step by its
examples (268 → 266 the way `scripts/run.ts` prints it — the delta is the
same two units either way), but two resolution-bearing units
climb into the top six (bars 115–117, 85–86) — the +2 rank for a finding with
degrees, working as ENGINE_SPEC says it does. Peers gain at most +2 each.
Tests 487 → 506. `brackets` and `eval:wjd` unmoved (79.7 / 76.5), which is
the whole point of running them: they are guards here, not evidence.
Corpus golden re-pinned — 161 of 452 solos moved, findings only, +1/+2/+3
with nothing larger; `units`, `phrases` and `ideas` moved on none, so nothing
leaked into `segment()`.
**Cost.** One deferred tidy (a shared `isResolutionFinding` helper) and one
pre-existing bug written down instead of fixed: `absorb` in merge pass 2
adopts `degrees`/`name`/`kind`, which its own comment says it does not. Both
are in OPEN_QUESTIONS. Also corrected a stale spec line — the verification
target still said 16 phrases for Blake, which had read 15 since session 19b.

2026-09-02 · session 21 · assessment only: lemmatization, unsupervised ML,
feature construction (three ideas from the owner's brother). No code, no
spec change, nothing decided beyond "not now" — the owner asked for the
reading, then chose to record it rather than build from it.
**Feature construction** is what the engine already does under another
name: every segmentation parameter, the target strength, the outside-span
weight are hand-built features with hand-tuned weights, and the
OPEN_QUESTIONS backlog reads as a list of unbuilt ones (metric position of
phrase ends, form position at bars 7–8, chord-tone-on-downbeat share,
next-chord fit, pentatonic membership). Two extensions named: fit the
segmentation weights by logistic regression against the WJD marks with
`wChorus` held fixed (DECISIONS 2026-08-27 — the corpus and the owner's
ear disagree there and a corpus fit alone would undo that ruling), and use
the WJD midlevel-unit labels as a supervised target for the stock penalty
(new OPEN_QUESTIONS entry; the labels sit unread in `sections.value`).
**Lemmatization** names the canonicalisation levels the engine has without
saying so (pitch → interval → degree string → quality bucket → bend/
inversion family) and the missing ones already open: retrograde, same idea
at another length, Bergonzi set + permutation. Contour stays the display
form (DECISIONS 2026-08-23 "Exercise contour"); a lemma would be a second
field, never a replacement.
**Unsupervised learning**, heavy form, rejected on evidence already in the
log: five pitch-content inference detectors at or below chance (DECISIONS
2026-08-25), similarity as an idea cue at 3% precision (2026-08-24), and
"recurs often" being vacuous on one solo (research/what-is-a-pattern.md).
456 solos, and the output has to be a name a player recognises. Two
offline, human-reviewed uses survive: cluster the mined lick table to
propose dictionary entries a person then writes by hand, and generalise
`variantOf` to a distance threshold (label source: owner variation groups,
of which only hey-lock.json remains). Neither moves idea recall off 68%;
the lead there is still the form-position feature.

2026-09-02 · session 21 (cont.) · `npm run eval:stock` ships. New:
`scripts/eval-stock.ts`, `src/practice/stockFeatures.ts` (+ 9 tests:
`stepShare`, `runShare`, `intervalVariety`, `chordToneDownbeatShare`,
`mluBase`), the npm script, a CLAUDE.md line. Docs: ENGINE_SPEC section
with the full table, DECISIONS 2026-09-02, the OPEN_QUESTIONS entry
updated with numbers and three narrower questions. Engine untouched;
tests 506 → 515; typecheck clean; corpus golden not re-run because
nothing under `src/analyse` or the rank moved.
**What it says.** Length is the annotators' biggest cue (AUC 0.84), so
the pooled table lies — I added length bins before reading anything.
Within bins `stockShare` is a steady ≈ 0.71; the direction-only run
predicate is better in every bin and much better on short units (0.84 on
3–5 notes). Chord-tone-on-downbeat is chance: Baker's rule is how a line
is *built*, not what makes it a line rather than a lick. `languageShare`
cannot cross the 0.5 display threshold by construction. Nothing changed
in the rank; the swap is the next measurable item and needs Blake read
either side.

2026-09-02 · session 21 (cont.) · the runShare swap ships. `stockShare`
(`practice/unit.ts`) runs by direction alone; one test rewritten, one
added; spec parameter line + eval section, DECISIONS "stockShare runs by
direction", OPEN_QUESTIONS (a) closed. **Read, not assumed**: full unit
order dumped for Blake (34) and St Thomas (95) before and after with a
throwaway script (deleted). Blake u1 and the top-six set unchanged;
u2/u3 swap; the two units that fall are bare triads — and one of them
looked like a bug until I noticed the CLI header prints pitch classes
without octaves: "C E C G" is C4 E4 C5 G5, a real ascent. St Thomas u1
unchanged; 237–238 falls u2 → u9, the one demotion I would show the
owner. Corpus golden 456/456 unchanged (rank is not in it — the guard
that nothing leaked). Tests 516, typecheck clean, eval:stock rows for
stockShare and runShare now identical.


2026-09-02 · session 21 (cont.) · `engine.html` ("How it works") caught up:
four detectors (a Resolutions card), the stock paragraph states the
direction-only run rule and the WJD lick/line evidence behind it,
`eval:stock` listed under the corpora, the Blake target reads fifteen
findings. `app/engine.css` widens the detector card minimum so four cards
lay out 2 × 2 instead of 3 + 1 (checked in the browser at 952px).

2026-09-02 · session 21 (cont.) · spike: fitted segmentation weights.
Throwaway `scripts/_fit-seg.ts` (deleted) fit a logistic regression over
every WJD gap; `segment.ts` DEFAULTS edited for the brackets/owner reads
and reverted with `git checkout` — tree clean, nothing but docs changed.
**Answer: no.** Fit wants 0.55 / 0.15 / 0.15 (length and leap at a third
of hand-tuned); gap-level +0.7 F1, end to end +0.2 phrases / −0.5 ideas,
and the owner's Mintzer brackets fall 12/13 → 9/13. The two candidate
features (strong-beat, section-start) add nothing for phrases; strong-beat
carries a negative sign, which is Galper's "& 1" — recorded as a
side-finding. Not measured: the same features as *idea* cues, which is
where the recall ceiling is. DECISIONS "Fitted segmentation weights
rejected"; OPEN_QUESTIONS metric/formal-position entry narrowed.

2026-09-02 · session 21 (cont.) · lemma layer, descriptive pass.
`shapes.ts`: `CELLS` → compiled `DICTIONARY`; the twelve triad entries are
two cells with six orders; hits carry `lemma` + `ordering`. `analyse/
index.ts`: `Finding.lemma?` / `ordering?`, copied from hits and through
`absorb`. Five tests. **Byte-identical, read three ways**: Blake CLI
diffed against this morning's post-swap run, St Thomas against a worktree
at HEAD, corpus golden 456/456. Tests 521, typecheck clean. Spec dictionary
section rewritten; DECISIONS "The dictionary is stated as cells";
OPEN_QUESTIONS set-plus-permutation entry narrowed to the widening, the
permutation step and the describe line.

2026-09-02 · session 21 (cont.) · Bergonzi widening ships. `bergonzi()`
gives 1235 / 1345 all 24 orders; descent listed first; duplicate check
at load; canonical-before-permuted pass in `matchShapes`. Seven tests.
**Read, not assumed**: the first build changed one St Thomas finding —
a permuted 3-5-1-2 at bar 104 swallowed the canonical 1-2-3-5 two notes
later — which is what the tie-break exists for; after it Blake and St
Thomas are byte-identical to the pre-widening runs. Corpus 37 solos
+37 findings, nothing else moved; golden re-pinned. A throwaway sampler
(deleted) printed all 17 permuted-cell findings across Blake + peers with
their notes; they read as vocabulary. Tests 527, typecheck clean.

2026-09-02 · session 21 (cont.) · permutation drill ships inside Through.
`shapes.ts` `orderingsOf`; `validity.ts` `barHasLemma`; `transform.ts`
`permutationDrill` + `'permutation'` kind; `through.ts` inserts it after
the cell drill. Eight tests. A throwaway (deleted) summed step exercises
and printed the bars across Blake + peers: 27 drills, Blake 0, every
other count unchanged. Caught and fixed: five bars for a non-rotation
played order — now one order per starting degree. Tests 535, typecheck
clean. Spec Through bullet, DECISIONS, OPEN_QUESTIONS (b) closed and the
"four steps" entry reads three.

2026-09-02 · session 21 (cont.) · the describe line for permuted orders.
`displayName` shows the lemma for a permuted cell; `detail` adds "played
in the order …" once per distinct order. First cut inferred "permuted"
from lemma ≠ name and so caught every triad — Blake's headers changed to
"major triad" + "played in the order 1-3-5", which is wrong twice over.
Now the dictionary sets `permuted` on the hit (non-canonical entry only),
it rides through `Finding` and `absorb`, and describe reads the flag.
Blake and St Thomas top-six headers byte-identical; the peers' permuted
units read "digital pattern 1235 … played in the order 3-2-1-5". Five
tests. Tests 540, typecheck clean. Spec "Naming" section, OPEN_QUESTIONS
(c) closed. No DECISIONS entry — prose, not a rule.

2026-09-02 · session 21 (cont.) · visualise step ships. `steps/visualise.ts`
(+2 tests), `Step` union, unit assembly third in the path, desk title /
intent / cue list + a `.cues` style rule, report collector, CLI count,
agent verdict enum. Blake CLI diff is the added lines only; tests 542,
typecheck and build clean. Spec steps line + Visualise bullet, DECISIONS
"Visualise sits after Through", OPEN_QUESTIONS steps entry reads two.

2026-09-02 · session 21 (cont.) · benchmark page. `--json` on eval:wjd,
brackets, eval:owner, eval:stock; `PipelineResult.timing` from `run()`'s
clock and the page storing `woodshed.timing`; `scripts/bench.ts` writing
`goldens/benchmarks.json` (two spec-sourced seeds + today's measurement);
`bench.html` / `app/bench.ts` / `app/bench.css`, nav link on all pages,
fourth Vite input. Colours `--phrase` / `--idea` validated as a categorical
pair (dataviz validator: all checks pass). Typecheck and build clean. Spec
section, DECISIONS "A benchmark page", CLAUDE.md command line.


2026-09-02 · session 21 · **close.** Eleven commits on `resolution-7-3`
from 2cd4b6c to 69b5183 (see the day's entries above). Branch has not
been merged; check `main..HEAD` both ways before building on it. Where
to pick up: (1) merge the branch; (2) `npm run bench` after any engine
change and commit the JSON, so the page keeps its history; (3) the two
practice steps still missing — edit and connect-by-step (OPEN_QUESTIONS);
(4) the resolution-bearing exemption for St Thomas 237–238 if the owner
wants it back at the top (DECISIONS "stockShare runs by direction");
(5) strong-beat and section-start as *idea* cues, unmeasured (the
phrase fit said nothing about them). Blake verification target
unchanged all day: 15 findings, 34 units, u1 = bars 76–77.

2026-09-03 · session 22 · portfolio prep: a fresh clone must read well.
Owner's handoff (`PORTFOLIO_HANDOFF.md`): the repo is to be the first
thing a hiring manager opens, so first impressions for someone without
the owner's machine or ear. Presentation only — nothing in `fixtures/` or
the engine moved.
1. Fresh clone green: it already was (the six Blake suites were guarded
   with `describe.skipIf(existsSync)`; the README's claim that they fail
   was stale). Centralised the path in `src/test/blake.ts`, which reads
   `WOODSHED_BLAKE` before falling back to the owner's MuseScore folder and
   prints one line per file when it skips. Verified with
   `WOODSHED_BLAKE=/nonexistent`: 453 passed, 30 skipped, 0 failed,
   typecheck clean (pre-merge counts; re-run after the rebase below). Not
   verified with the file present — this session has no copy — so the
   golden checks are unchanged by construction, not by a run.
2. `.github/workflows/ci.yml`: `npm ci`, typecheck, `test:run` on push and
   PR to main, Node 22. Badge at the top of the README. First run on the
   PR: green in 26 s.
3. README screenshot and GIF under `docs/img/`. The Blake bars 73/77 frame
   was not possible here (no transcription), so the still is an original
   eight-bar ii–V–I étude written for the purpose, kept in the session's
   scratch space, never committed: the engine puts "major-seventh arpeggio
   from the b3" top with all three detectors agreeing, the same headline
   as Blake. Owner can swap the Blake frame in by re-shooting.
4–7. README: plain-English first sentence; "Evaluation" under How it
   works; "If you read three files"; "How this was built".
Sequence note: the session began against main at 2bc777a, where neither
the 2026-09-02 "Fitted segmentation weights rejected" entry nor
`detectors/resolutions.ts` existed, so the first draft used the wChorus
decision as its worked example and `detectors/targets.ts` as the
detector. The owner then merged `resolution-7-3` (PR #4); the branch was
rebased onto it and the README re-pointed at the fitted-weights entry and
the 7-3 detector, every number read from the entry. origin/main holds far
fewer commits than the "252 in 11 days" the handoff describes (the
history was re-rooted on 2026-08-25), so the how-built section states no
count. `dist/` is ignored and uncommitted; no LICENSE file exists (owner
to choose); topics and description are GitHub-UI settings for the owner.

2026-09-03 · session 22 (cont.) · MIT LICENSE added at the owner's word,
plus a Licence line in the README pointing at the goldens' attribution
note. PR #3 merged as b05ee9e; this is a follow-up on a branch restarted
from main.

2026-09-03 · session 22 (cont.) · `PORTFOLIO_HANDOFF.md` removed from the
tree at the owner's word: every item on it is done (PRs #3 and #5), and
the list is a brief, not documentation. It stays in history at 483675f
and earlier; the session-22 entries above cite it by name.

2026-09-03 · session 22 (cont.) · the bundled iReal book, found while
reading the repo as an employer would: DECISIONS 2026-08-23 "Tunes" said
"no bundled collections", `app/data/jazz1460.irealb.txt` has shipped
since 2026-08-25, and nothing recorded the change. Owner chose to keep it
and write it down: DECISIONS 2026-09-03 supersedes the clause, and the
README's corpora section names the book and the distinction.

2026-09-03 · session 23 · **open.** Local checkout was at d3d971a with a
stale tracking ref; fast-forwarded to origin/main 0c0a655 after removing
a 0-byte `.git/index.lock` left by a crashed process. Baseline on
d3d971a: typecheck clean, 542 tests (0 skipped here), Blake read matches
the spec targets, `corpus:wjd` unchanged 456/456, all 10 peers run.
Task: the transcriptions' home is `~/dev/woodshed-data/peers` (Downloads
copies are byte-identical duplicates, left alone at the owner's word);
tests read Blake as `peers/hey-lock.mxl` through `src/test/solos.ts`
(grown from session 22's `blake.ts`), every peer runs through the
structural invariants in `src/peers.test.ts`, and `goldens/peers.txt`
pins per-solo counts. Branch `peers-tests`.

2026-09-03 · session 23 · peers suite ships. `src/test/solos.ts` (from
`blake.ts`: `PEERS_DIR`, `BLAKE` = `peers/hey-lock.mxl`, `ST_THOMAS`,
`peerFiles()`), seven imports repointed, `scripts/bench.ts` times the
peers copy once instead of Blake twice. `src/peers.test.ts`: eight
invariants per file plus the pin; `goldens/peers.txt` first pin matches
the hand-run counts. First run corrected two invariants (a unit need not
carry a finding; identity is degrees+family, not name) and found the
St Thomas `5-3-2-1 descent` name collision → OPEN_QUESTIONS. Tests 623
pass, 0 skipped here; `PEERS_DIR=/nonexistent` gives 509 pass / 34
skipped / 0 fail; typecheck clean; `corpus:wjd` unchanged 456; Blake read
from the peers copy matches the spec targets. Spec "Peers golden",
DECISIONS 2026-09-03, CLAUDE.md commands + verifying. Redundant now: the
Blake invariant tests in `analyse/index.test.ts` (later tidy).
