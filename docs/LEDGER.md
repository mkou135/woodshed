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
