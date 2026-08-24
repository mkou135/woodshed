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
