# woodshed

Analyses a transcribed jazz solo and generates exercises that drill the
vocabulary it contains.

## Session protocol — do this before anything else

Four continuously maintained files carry state between sessions:

- `docs/ENGINE_SPEC.md` — every rule, parameter and formula in force.
  **Never quote a parameter from memory; re-read it.** Update it in the
  same commit as any accepted change.
- `docs/DECISIONS.md` — append-only: date, question, decision, evidence
  class, who decided, what would reverse it.
- `docs/OPEN_QUESTIONS.md` — everything unresolved, with what would
  resolve it.
- `docs/LEDGER.md` — running task log. Update it *before* starting the
  next task, not in a batch at the end.

At session start: read `ENGINE_SPEC.md` and the last ~20 lines of
`LEDGER.md` before doing anything else. If you catch yourself reasoning
about something that should be in the spec but is not, stop and write it
down. `docs/HANDOFF.md` is narrative history — useful background, no
longer authoritative.

## Commands

```bash
npm run dev        # Vite dev server; drop a .mxl on the page
npm run solo -- <file.mxl>   # print findings and exercises for a real solo
npm run eval:wjd   # score phrase/idea boundaries against the Weimar Jazz Database
npm run corpus:freq # regenerate src/data/corpusFrequency.ts (aggregate WJD pattern shares)
npm run test:run   # NEVER bare `npm test` — watch mode, hangs tool calls
npm run typecheck
npm run build
```

## Non-negotiables

- `src/` is DOM-free. Only `app/` may touch the DOM.
- Chord quality comes from MusicXML `<kind>`, never the `text` attribute.
- `Score` is immutable; `prepare/` emits `Adjustment[]` and never edits.
- Any future model layer never produces or reasons about note data — every
  count, interval and generated note comes from deterministic code.
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

## Verifying

Green tests are not evidence the output is good — the engine once passed 156
tests while ranking its best finding 9th out of 81. Run the pipeline on a real
solo and read what comes out:

`~/Documents/MuseScore4/Scores/Hey Lock! - Seamus Blake Solo Transcription.mxl`
should yield "major-seventh arpeggio from the b3" at bars 73 and 77 as the top
finding, with all three detectors agreeing, about 12 findings in all, and a
cycle exercise whose bars all ascend. `npm run solo` prints it;
`pipeline.test.ts` pins it.
