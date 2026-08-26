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
