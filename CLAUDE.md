# woodshed

Analyses a transcribed jazz solo and generates exercises that drill the
vocabulary it contains.

## Session protocol — do this before anything else

Five continuously maintained files carry state between sessions:

- `docs/ENGINE_SPEC.md` — every rule, parameter and formula in force.
  **Never quote a parameter from memory; re-read it.** Update it in the
  same commit as any accepted change.
- `docs/DESIGN_SYSTEM.md` — every colour, token and type rule the browser
  layer is built on. Same rule: **never quote a colour from memory**, and
  update it in the same commit as any `app/` change that alters
  presentation. Dated design specs under `docs/superpowers/specs/` are
  point-in-time records and drift; this one does not.
- `docs/DECISIONS.md` — append-only: date, question, decision, evidence
  class, who decided, what would reverse it.
- `docs/OPEN_QUESTIONS.md` — everything unresolved, with what would
  resolve it.
- `docs/LEDGER.md` — running task log. Update it *before* starting the
  next task, not in a batch at the end.

At session start: read `ENGINE_SPEC.md` and the last ~20 lines of
`LEDGER.md` before doing anything else; add `DESIGN_SYSTEM.md` if the task
touches `app/`. If you catch yourself reasoning
about something that should be in the spec but is not, stop and write it
down. `docs/HANDOFF.md` is narrative history — useful background, no
longer authoritative.

## Commands

```bash
npm run dev        # Vite dev server; drop a .mxl on the page
npm run solo -- <file.mxl>   # findings + exercises; agent runs if ANTHROPIC_API_KEY is set
                             # --no-agent forces the engine; AGENT_FIXTURES=<dir> replays verdicts
npm run eval:wjd   # score phrase/idea boundaries against the Weimar Jazz Database
npm run corpus:freq # regenerate src/data/corpusFrequency.ts (aggregate WJD pattern shares)
npm run corpus:wjd # sweep all 456 WJD solos; diffs goldens/corpus-wjd.json and
                   # exits non-zero on any change. --write-golden re-pins it.
npm run brackets   # score phrase starts against the owner's brackets (scripts/brackets.json)
npm run eval:agent # score agent-adjudicated boundaries from recordings (never live)
npm run eval:owner # score phrase/idea boundaries against the owner's own annotations (annotations/)
npm run eval:stock # score the stock signals against the WJD lick/line labels (report, not a gate)
npm run bench      # one dated snapshot of every score above + Blake + timings → goldens/benchmarks.json (bench.html draws it)
npm run test:run   # NEVER bare `npm test` — watch mode, hangs tool calls
npm run test:run -- -u   # re-pin goldens/peers.txt after an intended engine change
npm run typecheck
npm run build
npm run plugin:build   # engine → plugin/woodshed.js (ES2016 IIFE for MuseScore's QJSEngine)
npm run plugin:install # build, then copy plugin/ into MuseScore 4's extensions folder; restart MuseScore
```

## Non-negotiables

- `src/` is DOM-free. Only `app/` may touch the DOM. The browser layer's
  colours live in one token block in `app/style.css`; `engine.css` and
  `bench.css` restate none of them. A mark drawn on the score takes the
  paper token, its toggle on the console takes the `-lit` twin —
  DESIGN_SYSTEM.md "Two ramps".
- Chord quality comes from MusicXML `<kind>`, never the `text` attribute.
- `Score` is immutable; `prepare/` emits `Adjustment[]` and never edits.
- The agent layer judges, never generates: it may weigh engine-computed
  evidence and cast judgments (rank, adjudicate, name, narrate), but every
  note, count and interval comes from deterministic code. Verdicts reference
  engine objects by id. See DECISIONS 2026-08-25 "Agent layer scope".
- Never modify `fixtures/`; tests assert their exact values.
- `src/practice/` consumes `Analysis`; it never changes detection. Chord
  quality in iReal charts comes from the explicit core table, never guessed.
- Style: no semicolons, single quotes, 2-space indent, ESM with explicit `.ts`
  extensions in imports.
- **External corpora never enter the repo or the app bundle.** The Weimar
  Jazz Database (ODbL) and the Bopland licks (CC BY-SA 4.0, but scraped from
  Bopland without permission — the uploader could not license it) live in
  `~/dev/woodshed-data/` only. Run them, learn from them, commit derived
  statistics with an attribution note; never commit or ship the notes
  themselves, and write test fixtures by hand rather than quoting a lick.
  See DECISIONS 2026-08-24 "Corpus licensing".
- `plugin/entry.ts` imports `src/run.ts`, never `src/pipeline.ts` or
  anything under `src/agent/`: the bundle runs in Qt's JavaScript engine,
  where the SDK cannot. `plugin/bundle.test.ts` is the proof.

## Verifying

Green tests are not evidence the output is good — the engine once passed 156
tests while ranking its best finding 9th out of 81. Run the pipeline on a real
solo and read what comes out:

`~/dev/woodshed-data/peers/hey-lock.mxl` (the transcriptions live in that
folder, `PEERS_DIR` overrides; Blake there is byte-identical to the MuseScore
original, which stays the file you edit — re-export means re-copy)
should yield "major-seventh arpeggio from the b3" at bars 73 and 77 as the top
finding, with all three detectors agreeing, 15 findings in all (the
bar-92 "dominant arpeggio 3 to the b9" marked common language, and two 7-3
resolutions at bars 85 and 116 near the bottom of the list), and a
cycle exercise whose bars all ascend. `npm run solo` prints it;
`pipeline.test.ts` pins it.
`src/peers.test.ts` runs every file in the folder through the structural
invariants and pins per-solo counts in `goldens/peers.txt`; without the folder
those suites skip, never fail.
