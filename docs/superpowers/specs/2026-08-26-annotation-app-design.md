# Annotation app — owner ground truth on the score

2026-08-26. Approved in conversation with the owner.

## Why

Refining segmentation (idea recall 68%), ranking and departure detection is
blocked on labels only the owner's ear can produce. Today that means
screenshots and dictation — cumbersome enough that it rarely happens
(St Thomas brackets were never written down). This adds a dev-only page for
marking transcriptions directly, saving to git-tracked JSON the eval
scripts and Claude can read.

## Decisions taken

- **Blind marking**: the page runs no analysis and shows no engine output.
  The engine's opinion must not bias the owner's ear.
- **What can be marked**: phrase starts, idea starts (both levels), outside/
  colour spans (the data that could reopen departure detection, DECISIONS
  2026-08-25 Death #5), and drill stars ("I'd practice this" — ranking
  ground truth). Variant links deferred.
- **Dev-only**: served by the Vite dev server, absent from the Pages build.
  Saving writes to the repo through a dev middleware.
- **Storage**: one JSON per solo in `annotations/`, printed `bar.beat`
  dialect shared with `scripts/brackets.json`. Owner's own labels, so
  committing is licence-clean. `brackets.json` stays untouched until
  `eval:owner` supersedes it.

## The page (`annotate.html` + `app/annotate.ts`)

- Second entry, served by Vite in dev automatically; not added to build
  inputs, so `npm run build` and Pages are byte-identical.
- File dropdown fed by the middleware (`GET /__annotate/files`): lists
  `~/dev/woodshed-data/peers/*.mxl` live, marking which already have an
  annotation file; picking one fetches its bytes via
  `GET /__annotate/file/<name>`. Drag-and-drop also works. One-time task: copy the Hey
  Lock .mxl from `~/Documents/MuseScore4/Scores/` into `peers/`, making
  that folder the single home for transcriptions. Omnibook can join the
  listing later.
- Parses with `readScoreXml`/`parseScore` only — nothing from `analyse/`.
- Loads the existing annotation file on open, so sessions resume.
- Reminder strip under the header, always visible:
  **1** boundaries: click a note to cycle idea → phrase → off ·
  **2** outside: click first + last note · **3** star: click first + last
  note · click a span to delete · Esc cancels.
- Header counts ("14 phrases · 23 ideas · 2 outside · 3 stars") and a
  saved/unsaved dot.

## Marking

Three-mode toolbar (keys 1/2/3):

- **Boundaries**: click a notehead to cycle none → idea start → phrase
  start → none. Idea marks are short ticks, phrase marks full-staff ticks,
  colours mirroring the main page. A phrase start counts as an idea start
  too (WJD and engine convention) — stored only in `phrases`, never
  duplicated in `ideas`.
- **Outside / Star**: click first note, click last note; span drawn as an
  underline bracket (amber for outside, star glyph + highlight for drill).
  Click a span to delete. Esc cancels a half-made span.

## Renderer reuse

Extract from `app/score.ts` a shared `mountScore(container, xml)` — the
OSMD mount plus the `SoloMap` build (noteheads/rests/staves/anchors keyed
`bar:beat`). `renderScore` calls it and draws its ticks as today;
behaviour byte-identical, existing tests unchanged. The annotate page
calls `mountScore` directly.

## Storage

`annotations/<mxl-basename>.json`:

```json
{
  "file": "hey-lock.mxl",
  "phrases": ["4.1", "8.3½"],
  "ideas": ["6.2½"],
  "outside": [{ "from": "12.2", "to": "12.4" }],
  "stars": [{ "from": "73.1", "to": "74.4½" }],
  "annotated": "2026-08-26"
}
```

Positions are printed bar, 1-based beat, fractions as in brackets.json
("4.4½"). Autosave debounced on every change via `POST /__annotate/<name>`
(a small Vite dev plugin in `vite.config.ts`; it writes only inside
`annotations/` and reads only `peers/`).

## Eval (`scripts/eval-owner.ts`, `npm run eval:owner`)

For each `annotations/*.json`, resolve the .mxl from `peers/`, run the
pipeline, score engine phrases and ideas against the owner's marks with
the same 0.5-beat tolerance as `brackets`. Report per-solo and pooled
precision/recall/F1 per level. `--misses` prints every disagreement with
its evidence: the gap's rest length, held-note ratio, leap size, metric
position — so a miss reads as "the rest term never fires here", not just
a number. Outside spans and stars are printed against engine findings
(overlap only); what to formally score there is a later question.

## Testing

- `mountScore` refactor: existing app has no unit tests for score.ts (DOM),
  so the guard is the main page rendering unchanged in the browser.
- Position round-trip (`bar.beat` string ↔ {bar, beat}) and the
  annotation-file schema: unit tests in `src/` if the codec lands there
  (DOM-free), else covered by eval-owner on a hand-written fixture
  annotation against a fixtures score.
- `eval:owner` on a tiny hand-written annotation for a `fixtures/` score
  pins the scoring maths.
- End-to-end: annotate a few bars of Hey Lock, check the JSON, run
  `npm run eval:owner --misses`, read the output together.

## Out of scope

Variant links, chord-tone/anticipation judgments, form marks, scoring
formulae for outside/stars, Pages deployment, mobile.
