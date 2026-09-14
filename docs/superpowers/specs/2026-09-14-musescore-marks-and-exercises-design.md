# MuseScore plugin: marks on a copy, exercises as tabs — design

2026-09-14. Session 25. Owner-approved in chat before writing. Builds on
`2026-09-14-musescore-plugin-design.md` (the panel, the export round trip).

The ask, in the owner's words: see where the licks are, open the exercises
in a new tab, and see the engine's annotations on a copy of the score.
Owner's choices: marks only on a copy (the original is never touched); the
copy shows coloured lick noteheads, a label per occurrence, phrase and idea
boundaries, and cleanup warnings at their bars; exercises open one tab per
practice unit, on demand from the selected row.

## What the API offers, measured (v4.7.4 source)

- `api.engraving.readScore(path)` opens a file in a new tab and returns its
  `Score`; `api.engraving.curScore` then points at it. Opening the export
  we already write **is** a copy.
- `Score.newCursor()`, `Cursor.rewind(0)` / `next()` / `rewindToTick(t)`,
  `Cursor.element` (a `Chord` with `.notes` on a note segment),
  `Cursor.tick`, `Cursor.measure`, `Measure.firstSegment.tick`.
- `EngravingItem.color` is a writable `QColor`; a QML string `'#0d7c8a'`
  assigns it. `api.engraving.newElement(api.engraving.Element.STAFF_TEXT)`
  / `SYSTEM_TEXT`, `.text = '…'`, `Cursor.add(el)` at the cursor's segment.
  `Score.startCmd(name)` / `endCmd()` make the whole thing one undo step.
- `api.engraving.division` is MuseScore's ticks per quarter (480); the
  engine's is 960 (`TICKS_PER_QUARTER`).
- Qt Quick `TextDocument.saveAs(url)` (Qt 6.7+, `writeTo`) writes the
  editor's text as plain text to a local file, no gate. The panel already
  reads through a hidden `TextEdit`; a second one writes.
- `ExtensionBlank` and `StyledTextLabel` are the only `MuseApi.Controls`
  types that load; buttons stay plain Qt Quick.

## Decisions

### D1 — the engine plans, the panel executes

A new pure function `markPlan(result: PipelineResult): Mark[]` in
`src/render/marks.ts` turns an analysis into positions and colours; the
QML applies them. `Mark` is plain data:

```
Mark =
  | { kind: 'colour'; bar: number; beat: number; colour: string; findingId: string }
  | { kind: 'text'; bar: number; beat: number; text: string; placement: 'staff' | 'system'; colour: string }
```

`bar` is the **written** bar index in file order (1-based, `writtenBar`);
notes on a repeat's second pass produce no mark (same rule as `app/score.ts`
`markPhrases`). `beat` is quarters from the bar start, fractional for
tuplets. One `colour` mark per note in every span of every finding; one
`text` mark per occurrence (`"1 · major-seventh arpeggio from the b3"`,
numbered as the panel numbers findings, staff placement, finding colour);
one `text` per phrase start (`"1"`, system, phrase colour) and per idea
start after the first (`"1.2"`, system, idea colour), anchored the way
`markPhrases` anchors them (phrase `onset` when it differs from the first
note); one `text` per warn/blocking adjustment at its bar's first beat
(`"⚠ " + reason`, staff, warning colour). Marks are emitted in that order;
a later colour on the same note wins, so a device inside a cell shows the
device.

### D2 — colours are the design system's paper ramp

The copy is a sheet, so marks take the paper tokens from
`docs/DESIGN_SYSTEM.md` "Marks — the pairs", copied into `src/render/marks.ts`
as one constant table with a comment naming the source: cells `#0d7c8a`,
devices `#9a6206`, recurring `#2e7d4f`, common language `#7a3bb8`, phrase
`#b3187a`, idea `#0d7c8a`, warning `#9a6206`. A finding's colour follows the
same precedence `app/score.ts` `findingLane` uses (language → recurring →
device → cell). The panel row shows the same swatch. DESIGN_SYSTEM.md gains
one line saying the MuseScore copy quotes the paper ramp.

### D3 — one tab per practice unit, rendered by the engine

`unitToMusicXml(unit: PracticeUnit, instrument, options)` in
`src/render/musicxml.ts` renders one part: for each step in order —
`loop` (its exercise), `through` (its exercises), `vary` (its exercises),
`write` (its `examples`); `visualise` contributes nothing — every exercise
becomes a run of measures. The first measure of each exercise carries
`<print new-system="yes"/>`, a `<direction placement="above">` words
element with the exercise title (the first exercise of a step is prefixed by
the step's title: `Loop`, `Through <tune>`, `Vary`, `Write your own —
examples`), and its own `<attributes>` (divisions change between even-eighth
and rhythmic exercises; MusicXML allows attributes on any measure).
Measure numbers run continuously. `<work-title>` is the unit's `header`.
`exerciseToMusicXml` becomes a one-exercise call of the same measure
builder; its output is unchanged (`src/render/musicxml.test.ts` pins it).

### D4 — the boundary grows two fields, both precomputed

`PluginResult` gains `marks: Mark[]` and each `PluginUnit` gains
`scoreXml: string` (the unit rendered by D3, with `<transpose>` kept —
MuseScore needs it) and `colour` per finding view (`findings[i].colour`).
Rendering every unit up front costs milliseconds of string templating and
keeps the bundle stateless; nothing is rendered lazily.

### D5 — the panel: two more buttons, fresh files, one undo step

- **Open annotated copy**: writes nothing new — `readScore` on a fresh
  timestamped copy of the export. The copy is made by the writer
  `TextEdit`: `writer.text = reader.text`, `saveAs(tmp/annotated-<ms>.musicxml)`.
  Then, on the returned score: `startCmd('Woodshed marks')`; one cursor
  pass over track 0 building a map `"<measureIndex>:<tickInMeasure>" →
  segment tick` for every chord segment; for each mark, compute the key
  from `bar - 1` and `beat × division`, skip silently when absent; colour
  every note of the chord, or `rewindToTick` + `newElement` + `.text` +
  `.color` + `cursor.add`; `endCmd()`. Marks the walk cannot place are
  counted and reported in the panel line ("placed 212 of 214 marks").
- **Open exercises for this idea** (enabled when a row is selected): the
  unit whose `findingIds` contain the selected finding; `writer.text =
  unit.scoreXml`; `saveAs(tmp/exercises-<unitId>-<ms>.musicxml)`;
  `readScore`.
- Fresh names because `readScore` of an already-open path would refocus the
  existing tab. `tmp/` accumulates; no API deletes files → OPEN_QUESTIONS.
- Every failure is still a line in the panel; `readScore` returning null is
  "MuseScore could not open <file>".

## Testing

- `src/render/marks.test.ts`: on a hand-built `PipelineResult` (fixture
  `minimal-tenor.musicxml` through `runXml`), every finding span yields
  one colour mark per note with the expected colour and written bar/beat;
  a repeat-unrolled fixture (`fixtures/form-8bar-x3.musicxml` if it has
  repeats, else a hand-built `Score.repeats`) yields no marks on pass 2;
  phrase and idea texts number as `markPhrases` does; warnings appear at
  their bars.
- `src/render/musicxml.test.ts`: `exerciseToMusicXml` output unchanged for
  an existing case; `unitToMusicXml` on a fixture unit has continuous
  measure numbers, one `<print new-system="yes"/>` and one `<words>` per
  exercise, `<attributes>` on each exercise's first measure, and parses
  back through `ingestXml` without throwing.
- `plugin/entry.test.ts`: `marks` present and JSON-safe; every unit's
  `scoreXml` starts with `<?xml`; each finding has a colour from the table.
- `plugin/bundle.test.ts`: unchanged pins still hold; `marks.length > 0`
  on Blake.
- Acceptance, manual: open Blake, Analyse, "Open annotated copy" → a new tab
  with coloured noteheads at bars 73 and 77 and a "1 · major-seventh
  arpeggio from the b3" label above each; phrase numbers along the top.
  Select row 1, "Open exercises for this idea" → a new tab whose first
  system is titled with the unit's header and plays back.

## Cuts

- Marks on the original score.
- The visualise step's cues on paper (they stay in the panel).
- Deleting old files from `tmp/`.
