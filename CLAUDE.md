# woodshed

Analyses a transcribed jazz solo and generates exercises that drill the
vocabulary it contains.

**Read `docs/HANDOFF.md` first.** It carries the project state, the decisions
and their evidence, the traps that already cost time, and what to do next.

## Commands

```bash
npm run dev        # Vite dev server; drop a .mxl on the page
npm run solo -- <file.mxl>   # print findings and exercises for a real solo
npm run eval:wjd   # score phrase/idea boundaries against the Weimar Jazz Database
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

## Verifying

Green tests are not evidence the output is good — the engine once passed 156
tests while ranking its best finding 9th out of 81. Run the pipeline on a real
solo and read what comes out:

`~/Documents/MuseScore4/Scores/Hey Lock! - Seamus Blake Solo Transcription.mxl`
should yield "major-seventh arpeggio from the b3" at bars 73 and 77 as the top
finding, with all three detectors agreeing, about 12 findings in all, and a
cycle exercise whose bars all ascend. `npm run solo` prints it;
`pipeline.test.ts` pins it.
