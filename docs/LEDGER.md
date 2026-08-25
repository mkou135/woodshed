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
2026-08-25 · session 4 · Fact-checked the practice methodology (5 angles, 23
sources, 102 claims, top 25 adversarially verified 3-votes-each: 16 confirmed,
9 killed). Puts `practice-methodology.md` §7.4 in contention (not reversed) —
blocked beat interleaved at 24h retention in Mathias & Goldman 2025 and
applied CI transfer is SMD 0.34 n.s., but that is a wash against the
clarinet studies already cited; the "feels worse, works better" line goes. Spacing is weakest for the pitch component, no optimal ISI 2d–1wk → fixed
ladder, not SRS. Progress = next-session retest, not end-of-session. Rhythm is
the documented gap in the pattern-book literature; interval-exact
inversion/retrograde deprioritised. Keller 2005 gives the lick-dictionary spec
(store once, index licks by chord sequence, tiered quality match). Killed:
Slonimsky→Coltrane, deliberate-practice variance figures, SMD 0.55 interleaving
· docs/research/practice-evidence.md · 3 new open questions.
2026-08-25 · session 9 · Workspace tidy. Codex's uncommitted renderer work
(rest splitting + triplet tuplet marks) verified and landed from the
/private/tmp worktree — 91 of 384 Blake rests were durations no single rest
symbol expresses. Literature-review open questions carried onto main from
worktree-lit-review before deleting it; the review itself stays local-only
(gitignored) at docs/research/jazz-pedagogy-literature.md. Branches deleted:
worktree-datasets-research, codex/through-vary-production, worktree-lit-review,
through-slot-refinements. Worktrees removed: /private/tmp/woodshed-through-vary,
.claude/worktrees/lit-review.
