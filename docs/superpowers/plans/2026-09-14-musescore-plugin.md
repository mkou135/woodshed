# MuseScore Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A MuseScore 4.7 extension that analyses the score open in MuseScore with the existing engine and lists the findings in a panel.

**Architecture:** The engine (`src/`) is compiled by Vite into one ES2016 IIFE, `plugin/woodshed.js`, exposing `analyseXml(xml)`. A QML form (`plugin/Woodshed.qml`) asks MuseScore to export the current score as MusicXML into the plugin's own folder, reads it back through a hidden `TextEdit`, calls the bundle and renders the result. Two small refactors in `src/` (`ingestXml`, `src/run.ts`) keep fflate, zod and the Anthropic SDK out of the bundle.

**Tech Stack:** TypeScript, Vite 5 library mode, vitest, `node:vm` for the bundle test; MuseScore 4.7.4 extensions framework (manifest.json + QML on Qt 6.10), `MuseApi.Controls`, `MuseApi.Theme`.

**Spec:** `docs/superpowers/specs/2026-09-14-musescore-plugin-design.md` — read it before Task 1; it carries what was measured in MuseScore's source and why the read-back goes through a `TextEdit`.

## Global Constraints

- Style: no semicolons, single quotes, 2-space indent, ESM with explicit `.ts` extensions in imports.
- `src/` is DOM-free. `plugin/entry.ts` is DOM-free too (it runs in QJSEngine). Only `app/` may touch the DOM.
- Chord quality comes from MusicXML `<kind>`, never the `text` attribute. Nothing here reads chords from MuseScore's object model.
- `Score` is immutable. Never modify `fixtures/`.
- The bundle must not reach `src/agent/`: no SDK, no zod. Task 2 is what guarantees it; Task 4's test proves it.
- The bundle targets ES2016. It may use `??` and `?.` (Qt 6.10 supports both) but no `TextDecoder`, `process`, `fetch`, `window`, `document`, `performance` assumed present.
- Run `npm run test:run`, never bare `npm test` (watch mode hangs).
- `docs/ENGINE_SPEC.md` is updated in the **same commit** as the change it describes (Task 6, but Task 2's note about `run.ts` goes in Task 2's commit).
- The panel is not governed by `docs/DESIGN_SYSTEM.md`; it takes MuseScore's theme. No woodshed colours in QML.
- Commit attribution (every commit):
  ```
  Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01AUQgGtGa3QBAhL1827a6ZB
  ```

---

### Task 1: `ingestXml` — ingest from a string

**Files:**
- Modify: `src/ingest/index.ts`
- Modify: `src/index.ts` (export `ingestXml`)
- Test: `src/ingest/index.test.ts` (create if absent; check with `ls src/ingest/*.test.ts` first and add to the existing file if one covers `ingest`)

**Interfaces:**
- Produces: `ingestXml(xml: string): Score` — everything `ingest(bytes)` does after the zip/UTF-8 front. `ingest(bytes)` becomes `ingestXml(readScoreXml(bytes))`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { ingest, ingestXml } from './index.ts'

describe('ingestXml', () => {
  it('gives the same Score as ingest on the bytes', () => {
    const bytes = new Uint8Array(readFileSync('fixtures/minimal-tenor.musicxml'))
    const xml = readFileSync('fixtures/minimal-tenor.musicxml', 'utf8')
    expect(ingestXml(xml)).toEqual(ingest(bytes))
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test:run -- src/ingest/index.test.ts`
Expected: FAIL, `ingestXml` is not exported.

- [ ] **Step 3: Implement**

In `src/ingest/index.ts` replace the `ingest` function with:

```ts
/**
 * Read a .mxl or .musicxml file into a Score with its chord track attached.
 * <harmony> elements are preferred; staff text is the documented fallback for
 * the roughly one file in eight that carries chords only as words.
 */
export function ingest(bytes: Uint8Array): Score {
  return ingestXml(readScoreXml(bytes))
}

/** The same, from MusicXML already decoded to a string (the MuseScore plugin's path). */
export function ingestXml(xml: string): Score {
  const score = parseScore(xml)

  const harmony = parseHarmonyTrack(xml)
  const track = harmony ?? chordTrackFromMarks(score.marks)

  return { ...score, chordTracks: track ? [track] : [] }
}
```

In `src/index.ts` change the first line to:

```ts
export { ingest, ingestXml, UnsupportedScoreError } from './ingest/index.ts'
```

- [ ] **Step 4: Run tests**

Run: `npm run test:run -- src/ingest && npm run typecheck`
Expected: PASS, typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/ingest/index.ts src/ingest/index.test.ts src/index.ts
git commit -m "feat(ingest): ingestXml reads a MusicXML string; ingest wraps it"
```

---

### Task 2: `src/run.ts` — the deterministic pipeline without the agent import

**Files:**
- Create: `src/run.ts`
- Modify: `src/pipeline.ts` (remove `run`, `describeFinding`, `FindingView`, `StageTiming`, `PipelineResult`; re-export them from `./run.ts`)
- Modify: `docs/ENGINE_SPEC.md` "Agent layer" or "Verification targets" — one sentence noting where `run` lives (see Step 5)
- Test: `src/run.test.ts`

**Interfaces:**
- Produces: `run(bytes: Uint8Array): PipelineResult`, `runXml(xml: string): PipelineResult`, `describeFinding`, and the types `FindingView`, `StageTiming`, `PipelineResult` — identical signatures to today's `pipeline.ts`.
- `pipeline.ts` keeps `runWithAgent` and `practiseOver` and re-exports everything above, so `app/`, `scripts/` and the tests import nothing new.

- [ ] **Step 1: Write the failing test**

`src/run.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { run, runXml } from './run.ts'
import { BLAKE, HAS_BLAKE } from './test/solos.ts'

const strip = (r: ReturnType<typeof run>) => ({ ...r, timing: undefined })

describe('runXml', () => {
  it('matches run on a fixture', () => {
    const path = 'fixtures/minimal-tenor.musicxml'
    const fromBytes = run(new Uint8Array(readFileSync(path)))
    const fromXml = runXml(readFileSync(path, 'utf8'))
    expect(strip(fromXml)).toEqual(strip(fromBytes))
  })

  it.skipIf(!HAS_BLAKE)('matches run on Blake', () => {
    const bytes = new Uint8Array(readFileSync(BLAKE))
    // .mxl is a zip; runXml wants the XML inside, which readScoreXml unpacks.
    const { readScoreXml } = require('./ingest/readScoreFile.ts') as typeof import('./ingest/readScoreFile.ts')
    expect(strip(runXml(readScoreXml(bytes)))).toEqual(strip(run(bytes)))
  })
})

describe('run.ts imports', () => {
  it('reaches no agent module', () => {
    const src = readFileSync('src/run.ts', 'utf8')
    expect(src).not.toMatch(/agent\//)
  })
})
```

Replace the `require(...)` line with a normal top-level import `import { readScoreXml } from './ingest/readScoreFile.ts'` — it is written inline above only so the test reads top to bottom; use the import.

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test:run -- src/run.test.ts`
Expected: FAIL, cannot find `./run.ts`.

- [ ] **Step 3: Create `src/run.ts`**

Move, verbatim, from `src/pipeline.ts` into `src/run.ts`: the imports it needs (`barLabel`, `Score`, `ingest`, `prepare`, `CleanupReport`, `analyse`, `Analysis`, `Finding`, `generateExercises`, `Exercise`, `buildUnits`, `PracticeUnit`, `tuneFromScore`, `Tune`), the interfaces `FindingView`, `StageTiming`, `PipelineResult`, the constants `STRONG`/`MODERATE`, `describeFinding`, and `run`. Then add `ingestXml` to the ingest import and add:

```ts
/** `run` for MusicXML already decoded to a string — the MuseScore plugin's path. */
export function runXml(xml: string): PipelineResult {
  return runScore(() => ingestXml(xml))
}

export function run(bytes: Uint8Array): PipelineResult {
  return runScore(() => ingest(bytes))
}

function runScore(read: () => Score): PipelineResult {
  const clock = typeof performance !== 'undefined' ? () => performance.now() : () => Date.now()
  const t0 = clock()
  const score = read()
  const t1 = clock()
  const report = prepare(score)
  const t2 = clock()
  const analysis = analyse(score, report)
  const t3 = clock()
  const exercises = generateExercises(analysis, score)
  const tune = tuneFromScore(score, report.form?.chorusStarts ?? [])
  const units = buildUnits(analysis, score, { tune })
  const t4 = clock()

  return {
    score,
    report,
    analysis,
    exercises,
    findingViews: analysis.findings.map((f) => describeFinding(f, score)),
    tune,
    units,
    timing: { ingest: t1 - t0, prepare: t2 - t1, analyse: t3 - t2, practice: t4 - t3, total: t4 - t0 },
  }
}
```

(The old `run` body becomes `runScore`; `run` and `runXml` are two-line wrappers.)

- [ ] **Step 4: Trim `src/pipeline.ts`**

Delete the moved code from `pipeline.ts`. Keep `runWithAgent` and `practiseOver`. At the top add:

```ts
export { run, runXml, describeFinding } from './run.ts'
export type { FindingView, StageTiming, PipelineResult } from './run.ts'
import { describeFinding } from './run.ts'
import type { PipelineResult } from './run.ts'
```

and remove the now-unused imports (`barLabel`, `Finding`, `analyse`, `Score` if unused — let `npm run typecheck` with `noUnusedLocals` tell you). `runWithAgent` still uses `ingest`, `prepare`, `tuneFromScore`, `runAgent`, `generateExercises`, `describeFinding`, `buildUnits` (via `practiseOver`).

In `src/index.ts` change `export { run, describeFinding, practiseOver } from './pipeline.ts'` to also export `runXml`:

```ts
export { run, runXml, describeFinding, practiseOver } from './pipeline.ts'
```

- [ ] **Step 5: Spec note**

In `docs/ENGINE_SPEC.md` under "## Agent layer", after the first paragraph, add one line:

```
The deterministic pipeline (`run`, `runXml`, `describeFinding`) lives in
`src/run.ts`, which imports nothing from `src/agent/`; `pipeline.ts`
re-exports it and adds `runWithAgent`. The MuseScore bundle enters through
`run.ts` and so carries neither the SDK nor zod (spec 2026-09-14).
```

- [ ] **Step 6: Run everything**

Run: `npm run typecheck && npm run test:run`
Expected: typecheck clean; all suites pass including `pipeline.test.ts` and `peers.test.ts` (they import from `pipeline.ts`, which still exports `run`).

- [ ] **Step 7: Commit**

```bash
git add src/run.ts src/run.test.ts src/pipeline.ts src/index.ts docs/ENGINE_SPEC.md
git commit -m "refactor: run/runXml live in src/run.ts, free of the agent layer"
```

---

### Task 3: `plugin/entry.ts` — `analyseXml` and `PluginResult`

**Files:**
- Create: `plugin/entry.ts`
- Create: `plugin/entry.test.ts`
- Modify: `tsconfig.app.json` (add `"plugin"` to `include`)
- Modify: `vitest.config.ts` (add `'plugin/**/*.test.ts'` to `include`)

**Interfaces:**
- Produces:
  ```ts
  export interface PluginUnit { id: string; findingIds: string[]; header: string; prompts: string[] }
  export interface PluginResult {
    title: string | null
    tune: string | null
    findings: FindingView[]
    units: PluginUnit[]
    warnings: string[]
    timing: StageTiming
  }
  export function analyseXml(xml: string): PluginResult
  ```
  `findings` is `result.findingViews` untouched (engine rank order). `units` is one entry per `PracticeUnit`, in the engine's order, with `header` (the teacher line) and the four steps' `prompt` strings. `warnings` is `report.adjustments` with severity `warn` or `blocking`, as `reason` strings. `title` is `score.title ?? null`; `tune` is `result.tune.title` or null when empty.

- [ ] **Step 1: Write the failing test**

`plugin/entry.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { analyseXml } from './entry.ts'

describe('analyseXml', () => {
  const xml = readFileSync('fixtures/minimal-tenor.musicxml', 'utf8')

  it('returns plain data a QML ListView can bind to', () => {
    const r = analyseXml(xml)
    expect(Array.isArray(r.findings)).toBe(true)
    expect(Array.isArray(r.units)).toBe(true)
    expect(Array.isArray(r.warnings)).toBe(true)
    expect(typeof r.timing.total).toBe('number')
    // JSON round trip loses nothing: no class instances, Maps, Sets or functions.
    expect(JSON.parse(JSON.stringify(r))).toEqual(r)
  })

  it('carries each unit\'s header and step prompts', () => {
    const r = analyseXml(xml)
    for (const u of r.units) {
      expect(typeof u.header).toBe('string')
      expect(u.prompts.length).toBeGreaterThan(0)
      for (const p of u.prompts) expect(typeof p).toBe('string')
    }
  })
})
```

- [ ] **Step 2: Config so the test is collected and typechecked**

`vitest.config.ts` include → `['src/**/*.test.ts', 'app/**/*.test.ts', 'plugin/**/*.test.ts']`.
`tsconfig.app.json` include → `["app", "scripts", "src", "plugin"]`.

- [ ] **Step 3: Run it to verify it fails**

Run: `npm run test:run -- plugin/entry.test.ts`
Expected: FAIL, cannot find `./entry.ts`.

- [ ] **Step 4: Implement `plugin/entry.ts`**

```ts
/**
 * The MuseScore plugin's whole view of the engine: one function, plain data
 * out. Built by `vite.plugin.config.ts` into `plugin/woodshed.js`, which
 * `Woodshed.qml` imports. Runs in Qt's QJSEngine — no DOM, no Node — so
 * nothing here (or below it) may touch either.
 *
 * Imports `src/run.ts`, never `src/pipeline.ts`: the latter reaches the
 * agent layer, whose SDK cannot run in QJSEngine (spec 2026-09-14 D4).
 */
import { runXml } from '../src/run.ts'
import type { FindingView, StageTiming } from '../src/run.ts'

export interface PluginUnit {
  id: string
  findingIds: string[]
  /** The teacher's one line above the excerpt. */
  header: string
  /** The four practice steps' prompts, in step order. */
  prompts: string[]
}

export interface PluginResult {
  title: string | null
  tune: string | null
  /** Engine rank order, unchanged. */
  findings: FindingView[]
  units: PluginUnit[]
  /** Cleanup adjustments at warn or blocking, as their reasons. */
  warnings: string[]
  timing: StageTiming
}

export function analyseXml(xml: string): PluginResult {
  const r = runXml(xml)
  return {
    title: r.score.title ?? null,
    tune: r.tune.title || null,
    findings: r.findingViews,
    units: r.units.map((u) => ({
      id: u.id,
      findingIds: u.findings.map((f) => f.id),
      header: u.header,
      prompts: u.steps.map((s) => s.prompt),
    })),
    warnings: r.report.adjustments
      .filter((a) => a.severity !== 'info')
      .map((a) => a.reason),
    timing: r.timing ?? { ingest: 0, prepare: 0, analyse: 0, practice: 0, total: 0 },
  }
}
```

- [ ] **Step 5: Run tests and typecheck**

Run: `npm run test:run -- plugin && npm run typecheck`
Expected: PASS; typecheck clean.

- [ ] **Step 6: Commit**

```bash
git add plugin/entry.ts plugin/entry.test.ts tsconfig.app.json vitest.config.ts
git commit -m "feat(plugin): analyseXml, the engine's one function for MuseScore"
```

---

### Task 4: The bundle — Vite library build and a bare-VM test

**Files:**
- Create: `vite.plugin.config.ts`
- Create: `plugin/bundle.test.ts`
- Modify: `package.json` (scripts `plugin:build`)
- Modify: `.gitignore` (add `plugin/woodshed.js`)

**Interfaces:**
- Produces: `plugin/woodshed.js`, an IIFE that defines a global `woodshed` with `woodshed.analyseXml`. Target ES2016, unminified (readable stack traces in MuseScore's console).

- [ ] **Step 1: Write the failing test**

`plugin/bundle.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'
import { BLAKE, HAS_BLAKE } from '../src/test/solos.ts'
import { readScoreXml } from '../src/ingest/readScoreFile.ts'

const BUNDLE = 'plugin/woodshed.js'
const HAS_BUNDLE = existsSync(BUNDLE)

/**
 * A context with nothing in it MuseScore's QJSEngine would not have: no
 * TextDecoder, process, fetch, window, document, performance, require.
 * Only what ES2016 itself defines, which `vm` supplies.
 */
function bareLoad(): { analyseXml: (xml: string) => { findings: { name: string }[]; units: unknown[] } } {
  const ctx = createContext({})
  runInContext(readFileSync(BUNDLE, 'utf8'), ctx, { filename: BUNDLE })
  return runInContext('woodshed', ctx)
}

describe.skipIf(!HAS_BUNDLE)('plugin/woodshed.js (run `npm run plugin:build` first)', () => {
  it('is ES2016-safe and self-contained', () => {
    const src = readFileSync(BUNDLE, 'utf8')
    expect(src).not.toMatch(/\brequire\(/)
    expect(src).not.toMatch(/anthropic|zod/i)
    expect(src).not.toMatch(/\bTextDecoder\b/)
    // A bare `new (function () {})` is fine; ES2022 class fields are not.
    expect(src).not.toMatch(/^\s*#\w+/m)
  })

  it('runs a fixture in a bare context', () => {
    const w = bareLoad()
    const r = w.analyseXml(readFileSync('fixtures/minimal-tenor.musicxml', 'utf8'))
    expect(Array.isArray(r.findings)).toBe(true)
  })

  it.skipIf(!HAS_BLAKE)('reproduces the pinned Blake result', () => {
    const w = bareLoad()
    const r = w.analyseXml(readScoreXml(new Uint8Array(readFileSync(BLAKE))))
    expect(r.findings[0].name).toBe('major-seventh arpeggio from the b3')
    expect(r.findings.length).toBeLessThanOrEqual(17)
  })
})
```

- [ ] **Step 2: Run it to see it skip**

Run: `npm run test:run -- plugin/bundle.test.ts`
Expected: suite skipped (no bundle yet).

- [ ] **Step 3: Vite config and script**

`vite.plugin.config.ts`:

```ts
import { defineConfig } from 'vite'

/**
 * The MuseScore plugin's engine bundle. One IIFE, one global (`woodshed`),
 * ES2016 for Qt 6.10's QJSEngine, unminified so a stack trace in
 * MuseScore's console names a function. `plugin/Woodshed.qml` imports it.
 */
export default defineConfig({
  build: {
    lib: {
      entry: 'plugin/entry.ts',
      name: 'woodshed',
      formats: ['iife'],
      fileName: () => 'woodshed.js',
    },
    outDir: 'plugin',
    emptyOutDir: false,
    target: 'es2016',
    minify: false,
    sourcemap: false,
  },
})
```

`package.json` scripts, after `"build"`:

```json
"plugin:build": "vite build -c vite.plugin.config.ts",
```

`.gitignore`, append:

```
plugin/woodshed.js
```

- [ ] **Step 4: Build and test**

Run: `npm run plugin:build && ls -la plugin/woodshed.js && npm run test:run -- plugin/bundle.test.ts`
Expected: a bundle of a few hundred KB; all three tests PASS.

If the build warns that `fast-xml-parser` is CommonJS, that is expected: Vite's commonjs plugin inlines it. If the bare-context test throws `ReferenceError` naming a global, that global is a real QJSEngine risk — fix it in `src/` behind a `typeof` guard the way `run.ts` guards `performance`, and note the guard in ENGINE_SPEC under the plugin section (Task 6).

- [ ] **Step 5: Run the whole suite and typecheck**

Run: `npm run typecheck && npm run test:run`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add vite.plugin.config.ts plugin/bundle.test.ts package.json .gitignore
git commit -m "build(plugin): ES2016 IIFE bundle of the engine, proven in a bare VM"
```

---

### Task 5: The extension — manifest, panel, install script

**Files:**
- Create: `plugin/manifest.json`
- Create: `plugin/Woodshed.qml`
- Create: `plugin/tmp/.gitkeep`
- Create: `scripts/plugin-install.ts`
- Modify: `package.json` (script `plugin:install`)

**Interfaces:**
- Consumes: global `woodshed.analyseXml(xml)` from `woodshed.js` (Task 4), returning `PluginResult` (Task 3).
- MuseScore reads `manifest.json` from `~/Library/Application Support/MuseScore/MuseScore4/extensions/woodshed/` (any folder under `extensions` is scanned for a `manifest.json`).

- [ ] **Step 1: manifest**

`plugin/manifest.json`:

```json
{
  "uri": "musescore://extensions/woodshed",
  "type": "form",
  "title": "Woodshed",
  "description": "Analyses the open solo and lists the vocabulary it contains.",
  "version": "0.1.0",
  "ui_context": "ProjectOpened",
  "actions": [
    {
      "code": "analyse",
      "type": "form",
      "title": "Woodshed: analyse solo",
      "path": "Woodshed.qml",
      "show_on_appmenu": true,
      "show_on_toolbar": false
    }
  ]
}
```

- [ ] **Step 2: The panel**

`plugin/Woodshed.qml`. Rules this file obeys: no `import Muse.*` (the builder rejects it); only `QtQuick`, `MuseApi.*` and the local `.js`. `api` is a global the extension engine injects. Every failure sets `root.error`; nothing opens a dialog.

```qml
import QtQuick
import MuseApi.Controls
import MuseApi.Theme
import "woodshed.js" as Engine

ExtensionBlank {
    id: root

    implicitWidth: 560
    implicitHeight: 640

    // State the list binds to. `result` is the PluginResult from analyseXml.
    property var result: null
    property string error: ""
    property int selected: -1
    property real exportMs: 0

    // MuseScore has no file-reading API for a 4.7 extension. Qt Quick's
    // TextDocument.source loads a local file into a text editor with no
    // gate, so the export is read back through this hidden TextEdit
    // (spec 2026-09-14 "What MuseScore 4.7.4 offers").
    TextEdit {
        id: reader
        visible: false
        readOnly: true
        textFormat: TextEdit.PlainText
    }

    function localPath(relative) {
        // Qt.resolvedUrl gives file:///…; writeScore wants a plain path.
        return Qt.resolvedUrl(relative).toString().replace(/^file:\/\//, "")
    }

    function analyse() {
        root.error = ""
        root.result = null
        root.selected = -1

        const score = api.engraving.curScore
        if (!score) {
            root.error = "Open a score first."
            return
        }

        const path = localPath("tmp/solo.musicxml")
        const t0 = Date.now()
        const ok = api.engraving.writeScore(score, path, "musicxml")
        root.exportMs = Date.now() - t0
        if (!ok) {
            root.error = "MuseScore refused to export the score."
            return
        }

        reader.textDocument.source = ""
        reader.textDocument.source = Qt.resolvedUrl("tmp/solo.musicxml")
        if (reader.textDocument.status !== TextDocument.Loaded) {
            root.error = "Could not read the export back: " + reader.textDocument.errorString
            return
        }
        const xml = reader.text
        if (!xml || xml.indexOf("<score-partwise") < 0) {
            root.error = "The export is not MusicXML."
            return
        }

        try {
            root.result = Engine.woodshed.analyseXml(xml)
        } catch (e) {
            console.log("woodshed:", e, e.stack)
            root.error = "" + (e && e.message ? e.message : e)
        }
    }

    function promptsFor(findingId) {
        if (!root.result) return []
        for (const u of root.result.units) {
            if (u.findingIds.indexOf(findingId) >= 0) return [u.header].concat(u.prompts)
        }
        return []
    }

    Component.onCompleted: analyse()

    Column {
        anchors.fill: parent
        anchors.margins: 16
        spacing: 12

        Row {
            width: parent.width
            spacing: 12

            StyledTextLabel {
                text: root.result && root.result.title ? root.result.title : "Woodshed"
                font: Theme.largeBodyBoldFont
                anchors.verticalCenter: parent.verticalCenter
            }

            FlatButton {
                text: "Analyse again"
                onClicked: root.analyse()
            }
        }

        StyledTextLabel {
            visible: root.error !== ""
            width: parent.width
            wrapMode: Text.WordWrap
            text: root.error
        }

        StyledTextLabel {
            visible: root.result !== null && root.result.warnings.length > 0
            width: parent.width
            wrapMode: Text.WordWrap
            color: Theme.fontSecondaryColor
            text: root.result ? root.result.warnings.join("\n") : ""
        }

        StyledListView {
            id: list
            width: parent.width
            height: parent.height - y - timing.height - 24
            clip: true
            spacing: 4
            model: root.result ? root.result.findings : []

            delegate: ListItemBlank {
                width: list.width
                height: body.implicitHeight + 16
                isSelected: index === root.selected
                onClicked: root.selected = (root.selected === index ? -1 : index)

                Column {
                    id: body
                    x: 12
                    y: 8
                    width: parent.width - 24
                    spacing: 2

                    StyledTextLabel {
                        width: parent.width
                        horizontalAlignment: Text.AlignLeft
                        font: Theme.bodyBoldFont
                        text: (index + 1) + ". " + modelData.name
                              + (modelData.language ? "  · common language" : "")
                    }

                    StyledTextLabel {
                        width: parent.width
                        horizontalAlignment: Text.AlignLeft
                        color: Theme.fontSecondaryColor
                        text: modelData.location + "  · " + modelData.confidenceLabel
                              + "  · " + modelData.detectedBy.join(", ")
                              + (modelData.occurrences > 1 ? "  · ×" + modelData.occurrences : "")
                    }

                    Repeater {
                        model: index === root.selected ? root.promptsFor(modelData.id) : []

                        StyledTextLabel {
                            width: body.width
                            horizontalAlignment: Text.AlignLeft
                            wrapMode: Text.WordWrap
                            text: modelData
                        }
                    }
                }
            }
        }

        StyledTextLabel {
            id: timing
            width: parent.width
            horizontalAlignment: Text.AlignLeft
            color: Theme.fontSecondaryColor
            text: root.result
                  ? "export " + Math.round(root.exportMs) + " ms · engine "
                    + Math.round(root.result.timing.total) + " ms"
                    + (root.result.tune ? " · " + root.result.tune : "")
                  : ""
        }
    }
}
```

`plugin/tmp/.gitkeep`: empty file. The export loop opens the file for writing and asks for a retry in a dialog if it cannot, so the folder must exist before the first run.

- [ ] **Step 3: Install script**

`scripts/plugin-install.ts`:

```ts
/**
 * Copy the extension into MuseScore 4's user extensions folder.
 *
 *   npm run plugin:install            # builds first
 *   MUSESCORE_EXTENSIONS=<dir> …      # elsewhere (another machine, a test profile)
 *
 * MuseScore scans every folder under `extensions` for a manifest.json at
 * startup, so restart MuseScore after installing.
 */
import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const DEFAULT = join(homedir(), 'Library', 'Application Support', 'MuseScore', 'MuseScore4', 'extensions')
const target = join(process.env.MUSESCORE_EXTENSIONS ?? DEFAULT, 'woodshed')

if (!existsSync('plugin/woodshed.js')) {
  console.error('plugin/woodshed.js missing — run npm run plugin:build')
  process.exit(1)
}

mkdirSync(join(target, 'tmp'), { recursive: true })
for (const f of ['manifest.json', 'Woodshed.qml', 'woodshed.js']) {
  cpSync(join('plugin', f), join(target, f))
}
console.log(`installed to ${target} — restart MuseScore`)
```

`package.json` scripts:

```json
"plugin:install": "npm run plugin:build && node --experimental-strip-types --no-warnings scripts/plugin-install.ts",
```

- [ ] **Step 4: Install and run the acceptance test**

Run: `npm run plugin:install`
Then, by hand: quit and reopen MuseScore 4, open `~/dev/woodshed-data/peers/hey-lock.mxl` (or the MuseScore original), and open Woodshed from the Plugins menu.

Expected: the panel lists "major-seventh arpeggio from the b3" first at bars 73, 77, with `recurring, shape, target`; about 15 findings; clicking one shows the header and four prompts; the timing line shows two numbers.

If the panel shows MuseScore's error page instead, read the message — it is the QML component error string. Common causes: a `Muse.` import (prohibited), a control name not in `MuseApi.Controls` (see the CMakeLists list in the spec's source: `StyledTextLabel`, `FlatButton`, `StyledListView`, `ListItemBlank`, `StyledFlickable` are there), or a JS syntax MuseScore's QML parser rejects in the `.js` import. MuseScore's own console (`~/Library/Application Support/MuseScore/MuseScore4/logs/`) carries `console.log` output and the stack from the `catch`.

If `api.engraving.writeScore` returns false, MuseScore's log says which: "No notation found", "format is not supported", or the export scenario refused. If `TextDocument.status` is not `Loaded`, the path `Qt.resolvedUrl` produced is wrong — log it.

Record what happened, including the two timings, in LEDGER (Task 6).

- [ ] **Step 5: Commit**

```bash
git add plugin/manifest.json plugin/Woodshed.qml plugin/tmp/.gitkeep scripts/plugin-install.ts package.json
git commit -m "feat(plugin): the MuseScore extension — manifest, panel, installer"
```

---

### Task 6: The maintained files

**Files:**
- Modify: `docs/ENGINE_SPEC.md` (new section), `docs/DECISIONS.md` (append), `docs/OPEN_QUESTIONS.md` (append), `docs/LEDGER.md` (append), `docs/DESIGN_SYSTEM.md` (one line), `CLAUDE.md` (commands + one non-negotiable)

- [ ] **Step 1: ENGINE_SPEC**

Add a section before "## Verification targets":

```
## MuseScore plugin (`plugin/`, spec docs/superpowers/specs/2026-09-14-musescore-plugin-design.md)

- Vehicle: a MuseScore 4.7 extension (`plugin/manifest.json`, type `form`);
  installed to `~/Library/Application Support/MuseScore/MuseScore4/extensions/woodshed`
  by `npm run plugin:install`.
- Engine bundle: `plugin/woodshed.js`, built by `vite.plugin.config.ts`
  from `plugin/entry.ts` — IIFE, global `woodshed`, target ES2016, unminified.
  Entry imports `src/run.ts` only; the agent layer is never reached.
- Boundary: `analyseXml(xml) → PluginResult` — `findings` (the `FindingView`s
  in rank order), `units` (id, findingIds, header, the four step prompts),
  `warnings` (adjustments at warn/blocking), `title`, `tune`, `timing`.
- Ingest: MuseScore exports the open score to `plugin/tmp/solo.musicxml`
  (`api.engraving.writeScore`), the panel reads it back through a hidden
  `TextEdit` (`TextDocument.source`), and `ingestXml` parses it. Same
  MusicXML rules as the page; chord quality from `<kind>`.
- Not governed by DESIGN_SYSTEM.md: the panel uses `MuseApi.Theme`.
- Proof: `plugin/bundle.test.ts` runs the bundle in a bare `node:vm`
  context (no TextDecoder/process/fetch/DOM) against Blake and asserts the
  pinned top finding. Skips without the bundle.
```

- [ ] **Step 2: DECISIONS** — append:

```
## 2026-09-14 · A MuseScore extension, fed by a MusicXML round trip (session 25)

Question: how does the engine run inside MuseScore, and how does it read the
open score?

Decision: a 4.7 extension (manifest + QML form), not a legacy plugin; the
score reaches the engine as MusicXML exported by MuseScore itself and read
back through a hidden Qt Quick `TextEdit`, not by walking the object model.
Findings only — no marks on the score, no exercises, no agent.

Evidence: read from the v4.7.4 source. `writeScore` is implemented through
the real export scenario; no file-reading API exists for an extension
(`api.filesystem` commented out, `FileIO` unregistered, `newQProcess`
NOT_IMPLEMENTED, XHR gated by an env var MuseScore does not set);
`TextDocument.source` reads a local file with no gate. The Harmony API has no
`kind`, so an object-model ingest would derive quality from text.

Evidence class: source reading + one manual run · owner + Claude ·
would reverse: a `kind` on the Harmony API, or export time that a player
notices (the panel prints it).
```

- [ ] **Step 3: OPEN_QUESTIONS** — append:

```
## MuseScore plugin follow-ups (2026-09-14)

- **Exercises as new tabs.** `exerciseToMusicXml` plus
  `api.engraving.readScore(path)` would open each exercise as a score.
  Resolve: decide whether one tab per exercise is tolerable, or whether a
  single "exercises" score with a section break per exercise is the shape.
- **Agent layer in the plugin.** The SDK cannot run in QJSEngine; a raw
  `XMLHttpRequest` client to the Messages API is a separate design, and
  QML's XHR does reach the network. Resolve: whether the plugin is worth
  the agent at all before designing it.
- **Object-model ingest.** Would drop the export round trip. Blocked on
  chord quality: the Harmony API exposes text and MuseScore's parsed name,
  not `kind`. Resolve: measure export time first; if it is under a second
  on the longest peer, leave this alone.
- **Extension API stability.** `api.filesystem` exists in source but is
  switched off in 4.7.4; if a later 4.x switches it on, the `TextEdit`
  read-back can go. Resolve: re-read `extapi.h` on each MuseScore upgrade.
```

- [ ] **Step 4: LEDGER** — append a dated entry in the file's voice: what shipped, the acceptance run (what the panel showed, both timings), test counts, and what was not verified.

- [ ] **Step 5: DESIGN_SYSTEM** — under "## The printed sheet is not the app" (or a new two-line note at the end of "## Working on this"):

```
The MuseScore panel (`plugin/Woodshed.qml`) is not the app either: it takes
MuseScore's own theme through `MuseApi.Theme` and quotes none of these tokens.
```

- [ ] **Step 6: CLAUDE.md** — in "## Commands" add:

```bash
npm run plugin:build   # engine → plugin/woodshed.js (ES2016 IIFE for MuseScore's QJSEngine)
npm run plugin:install # build, then copy plugin/ into MuseScore 4's extensions folder; restart MuseScore
```

and in "## Non-negotiables" add:

```
- `plugin/entry.ts` imports `src/run.ts`, never `src/pipeline.ts` or
  anything under `src/agent/`: the bundle runs in Qt's JavaScript engine,
  where the SDK cannot. `plugin/bundle.test.ts` is the proof.
```

- [ ] **Step 7: Run everything and commit**

Run: `npm run typecheck && npm run test:run && npm run plugin:build`
Expected: clean.

```bash
git add docs/ENGINE_SPEC.md docs/DECISIONS.md docs/OPEN_QUESTIONS.md docs/LEDGER.md docs/DESIGN_SYSTEM.md CLAUDE.md
git commit -m "docs: MuseScore plugin in the maintained files"
```

---

## Self-review

- **Spec coverage.** D1 → Task 5 manifest. D2 → Task 5 `analyse()` + Task 1. D3 → Task 3. D4 → Tasks 1, 2. D5 → Task 5 QML (Theme, Controls) + Task 6 DESIGN_SYSTEM line. D6 → Task 5 `root.error` paths. Layout → Tasks 4, 5. Flow steps 1–5 → Task 5 `analyse()`. Testing → Tasks 2, 3, 4 and Task 5 Step 4. Cuts → Task 6 OPEN_QUESTIONS.
- **Types.** `PluginResult`/`PluginUnit` defined once in Task 3 and used by name in Tasks 4, 5, 6. `runXml` defined in Task 2, used in Task 3. `ingestXml` defined in Task 1, used in Task 2. `FindingView.language`, `.occurrences`, `.detectedBy`, `.location`, `.confidenceLabel` all exist on today's `FindingView`.
- **Placeholders.** None; every code step is complete. The LEDGER entry (Task 6 Step 4) is deliberately written by the executor from what actually happened in Task 5 Step 4.
