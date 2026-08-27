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
