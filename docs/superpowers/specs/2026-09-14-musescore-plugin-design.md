# MuseScore plugin — design

2026-09-14. Session 25. Owner-approved in chat before writing.

The ask: analyse the score open in MuseScore, inside MuseScore, and show the
findings there. The browser app stays as it is; the plugin is a second
consumer of the same `src/` engine. Exercises and the agent layer are out of
scope for this version (see "Cuts").

## What MuseScore 4.7.4 offers, measured

Read from the `v4.7.4` tag of `musescore/MuseScore` and from the copy in
`/Applications/MuseScore 4.app` (Qt 6.10.2), not from memory:

- Two vehicles. Legacy QML plugins (`import MuseScore 3.0`, loaded from
  `~/Documents/MuseScore4/Plugins`) and the **extensions framework**
  (`src/framework/extensions`): a `manifest.json` with actions of type
  `form` (QML with UI), `macros` (a JS file) or `composite`, loaded from
  `<userAppDataPath>/extensions`, which on this Mac is
  `~/Library/Application Support/MuseScore/MuseScore4/extensions`.
- JavaScript is Qt 6.10's QJSEngine: ES2016 plus `??` (Qt 5.15+) and `?.`
  (Qt 6.2+). No DOM, no Node, no `TextDecoder` guaranteed. The Anthropic SDK
  cannot run there.
- A QML file may `import "file.js" as X`; X exposes the file's top-level
  declarations. The extension `require()` (`jsmoduleloader.cpp`) wraps a
  local `.js` in a function and returns its `exports`; either shape works
  for a bundle.
- `api.engraving` (`engravingapiv1.h`) carries `curScore`,
  `writeScore(score, name, ext)`, `readScore(path)`, `newScore`,
  `newElement`, `cmd`. In 4.7.4 `writeScore` is implemented
  (`engravingpluginapihelper.cpp`) through the real export scenario and only
  for the current score; `musicxml`, `xml` and `mxl` are registered writer
  extensions (`musicxmlmodule.cpp`).
- There is no file-reading API for a 4.7.4 extension. `filesystemapi.h`
  exists but its `api.filesystem` property is commented out in `extapi.h`,
  `require()` is only in the macros engine and only resolves `MuseApi.*`
  names, the old `FileIO` QML type is not registered, `newQProcess` is
  `NOT_IMPLEMENTED`, and QML `XMLHttpRequest` refuses local files unless
  `QML_XHR_ALLOW_FILE_READ=1`, which MuseScore does not set (`main.cpp`).
- What does read a local file: Qt Quick's `TextDocument.source` (Qt 6.7+,
  `qquicktextdocument.cpp` `load()`): a hidden `TextEdit` whose
  `textDocument.source` is a `file:` URL loads it synchronously as plain
  text with no gate; `textEdit.text` is the content.
- `exportScores` with one notation writes exactly the path given and
  replaces silently (`isCreatingOnlyOneFile` → `ReplaceAll`); the MusicXML
  writer is `PER_PART`, and every peer file has one part.
- The Harmony API exposes `plainText`, `displayText` and `harmonyName`
  (MuseScore's parsed canonical name). It does **not** expose the MusicXML
  `kind`. Reading chords from the object model would therefore have to
  derive quality from text, which CLAUDE.md forbids for good reason.

## Decisions

### D1 — extension, not legacy plugin

The extension framework is what MuseScore is building on; `manifest.json`
plus a form is the shape new plugins take, and the form's QML engine has
the same `api.engraving` the legacy one does. The read-back route
(`TextDocument.source`) is plain Qt Quick and works in either.
Would reverse: the extension API breaking across a 4.x release while legacy
plugins keep working.

### D2 — MusicXML round trip, not object-model ingest

The plugin exports the open score to `<plugin dir>/tmp/solo.musicxml`, reads
it back through a hidden `TextEdit` and hands the string to the existing
ingest. The file is overwritten on every run and never deleted, since no
API can delete it; it is one score's worth of XML in the plugin's own
folder. Every rule in
`ENGINE_SPEC.md` "Note order", "Repeats" and the harmony parse applies
unchanged, chord quality still comes from `<kind>`, and the input is the
same MuseScore export the peers corpus and `goldens/peers.txt` already pin.
Cost: one temp file and one export per run.
Would reverse: export taking long enough to notice on a real solo (measure
it in the panel's timing line), or the Harmony API growing a `kind`.

### D3 — one pure function across the boundary

The bundle exports `analyseXml(xml: string): PluginResult`. Nothing from
MuseScore's object model crosses into the engine and nothing in the engine
knows about QML. `PluginResult` is plain data — strings, numbers, arrays —
so QML can bind to it directly:

```
PluginResult = {
  title: string | null
  tune: string | null            // tuneFromScore's name, if identified
  findings: FindingView[]        // engine rank order, unchanged
  units: { id, findingIds: string[], prompts: string[] }[]
  warnings: string[]             // CleanupReport adjustments at warn+
  timing: StageTiming
}
```

`FindingView` is the existing `pipeline.ts` type. The prompts are the four
practice steps' `prompt` strings from `PracticeUnit.steps`, nothing else.

### D4 — two small changes in `src/`, nothing in `app/`

- `ingest(bytes)` splits into `ingestXml(xml)` plus the byte-reading front;
  `ingest` calls `ingestXml`. The bundle never needs fflate.
- `run`, `runXml` and `describeFinding` move to `src/run.ts`, which imports
  nothing from `src/agent/`. `pipeline.ts` re-exports them and keeps
  `runWithAgent` and `practiseOver`. This is what keeps the SDK and zod out
  of the bundle: Rollup cannot drop a module whose top level builds zod
  schemas, so the bundle's entry must not reach `agent/` at all.

### D5 — the panel is a MuseScore surface, not a woodshed one

`DESIGN_SYSTEM.md` governs `app/`. The panel uses `MuseApi.Controls` and
`api.theme` so it looks like the rest of MuseScore. It shows, in engine
rank order: name, location, confidence label, detectors, the `bebop` tag
when set, and the selected finding's practice prompts. No marks are written
to the score.

### D6 — errors are lines in the panel

No dialogs. No score open, export refused, file unreadable,
`UnsupportedScoreError`, and any other thrown error each become one line at
the top of the panel with the message. The QML console gets the stack.

## Layout

```
plugin/
  manifest.json      type form, action "analyse" → Woodshed.qml, ui_context ProjectOpened
  Woodshed.qml       the panel; export → read → analyseXml → list
  woodshed.js        built engine (git-ignored)
plugin/entry.ts      bundle entry: export { analyseXml }
vite.plugin.config.ts   lib mode, format iife, name woodshed, target es2016
scripts/plugin-install.ts   copy plugin/ to the extensions folder
```

npm: `plugin:build`, `plugin:install` (build then copy).

## Flow

1. Panel opens (or "Analyse again" is pressed). `api.engraving.curScore`
   null → line "Open a score first."
2. `api.engraving.writeScore(curScore, <plugin dir>/tmp/solo.musicxml,
   "musicxml")` false → line "MuseScore refused to export the score."
3. Set the hidden `TextEdit`'s `textDocument.source` to the file URL (reset
   to empty first so a second run reloads); `status` not `Loaded` → line
   with `errorString`. `text` is the XML.
4. `Engine.woodshed.analyseXml(xml)` inside try/catch → `PluginResult` or
   an error line.
5. List renders. Timing line at the bottom: export ms + engine ms.

## Testing

- `src/run.test.ts` (or additions to `pipeline.test.ts`): `runXml` on the
  hey-lock XML gives the same result as `run` on its bytes.
- `plugin/bundle.test.ts`: builds are not run by vitest; the test loads
  `plugin/woodshed.js` (skips when absent) into a bare `node:vm` context
  with no `TextDecoder`, `TextEncoder`, `process`, `fetch`, `window` or
  `document`, runs the hey-lock export through `analyseXml`, and asserts the
  top finding name and the finding count that `pipeline.test.ts` pins.
  Proves the bundle is self-contained before MuseScore sees it.
- Acceptance, manual: install, open Blake in MuseScore 4.7.4, open the panel,
  read "major-seventh arpeggio from the b3" at bars 73 and 77 at the top.

## Cuts

- Exercises: the renderer plus `readScore` make "open as a new tab" a small
  follow-up. → OPEN_QUESTIONS.
- Agent layer: the SDK does not run in QJSEngine; a raw-XHR client is a
  separate design. → OPEN_QUESTIONS.
- Object-model ingest as an optimisation. → OPEN_QUESTIONS.
- Marks on the score. Owner chose the list.
