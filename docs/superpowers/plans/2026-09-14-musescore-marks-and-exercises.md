# MuseScore Marks and Exercises Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** From the MuseScore panel, open an annotated copy of the solo (coloured lick noteheads, occurrence labels, phrase/idea numbers, warnings) and open one practice unit's exercises as a new score tab.

**Architecture:** The engine gains two pure renderers — `markPlan` (analysis → positioned, coloured marks) and `unitToMusicXml` (one practice unit → one MusicXML part with a section per step). `plugin/entry.ts` adds both to `PluginResult`. The QML panel gains a writer `TextEdit`, opens files with `readScore`, and applies marks through MuseScore's cursor API inside one undo step.

**Tech Stack:** TypeScript, vitest; MuseScore 4.7.4 extension QML (Qt 6.10), `api.engraving` cursor/element API, Qt Quick `TextDocument.saveAs`.

**Spec:** `docs/superpowers/specs/2026-09-14-musescore-marks-and-exercises-design.md` — read it first; D1–D5 are the contract. Also read the plugin section of `docs/ENGINE_SPEC.md` and `plugin/Woodshed.qml` as they are now.

## Global Constraints

- Style: no semicolons, single quotes, 2-space indent, ESM with explicit `.ts` extensions.
- `src/` is DOM-free; `plugin/entry.ts` runs in QJSEngine (ES2016 plus `??`/`?.`; `flat`/`flatMap`/`trimStart`/`trimEnd` are polyfilled by the bundle banner, nothing else post-ES2016).
- `Score` is immutable; never modify `fixtures/`; chord quality from `<kind>` only.
- Bar numbers shown to a player are printed ones (`core/bars.ts` `writtenBar`); marks on a second repeat pass are dropped.
- Colours are the design system's paper ramp, copied once into `src/render/marks.ts` with a comment naming `docs/DESIGN_SYSTEM.md` "Marks — the pairs": cells `#0d7c8a`, devices `#9a6206`, recurring `#2e7d4f`, common language `#7a3bb8`, phrase `#b3187a`, idea `#0d7c8a`, warning `#9a6206`.
- QML imports allowed: `QtQuick`, `MuseApi.Controls` (only `ExtensionBlank`, `StyledTextLabel`), `MuseApi.Theme`, `"woodshed.js"`. No `Muse.*`. No dialogs; errors are panel lines.
- MuseScore ticks per quarter come from `api.engraving.division` at runtime; the engine's is 960.
- Run `npm run test:run` (never bare `npm test`); `npm run typecheck` runs three projects.
- `docs/ENGINE_SPEC.md` is updated in the same commit as the change it describes.
- Commit trailer, every commit:
  ```
  Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01AUQgGtGa3QBAhL1827a6ZB
  ```

---

### Task 1: `markPlan` — the engine's mark list

**Files:**
- Create: `src/render/marks.ts`
- Create: `src/render/marks.test.ts`
- Modify: `src/index.ts` (export `markPlan`, `Mark`, `findingColour`)
- Modify: `docs/ENGINE_SPEC.md` (new subsection under "## MuseScore plugin": "Marks on the copy")

**Interfaces:**
- Consumes: `PipelineResult` from `src/run.ts` (`score`, `analysis.contexts[i].note`, `analysis.findings[].spans[].startIndex/endIndex`, `analysis.phrases[].onset/notes/ideas[].notes`, `report.adjustments[].severity/target/reason`); `writtenBar` from `src/core/bars.ts`; `TICKS_PER_QUARTER` from `src/core/types.ts`.
- Produces:
  ```ts
  export type Mark =
    | { kind: 'colour'; bar: number; beat: number; colour: string; findingId: string }
    | { kind: 'text'; bar: number; beat: number; text: string; placement: 'staff' | 'system'; colour: string }
  export function findingColour(f: Pick<Finding, 'language' | 'kind' | 'degrees'>): string
  export function markPlan(result: Pick<PipelineResult, 'score' | 'analysis' | 'report'>): Mark[]
  ```
  `bar` is the written 1-based bar; `beat` quarters from the bar start (fractional allowed).

- [ ] **Step 1: Write the failing tests**

`src/render/marks.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { runXml } from '../run.ts'
import { findingColour, markPlan, PAPER } from './marks.ts'
import { writtenBar } from '../core/bars.ts'

const load = (name: string) => runXml(readFileSync(`fixtures/${name}.musicxml`, 'utf8'))

describe('findingColour', () => {
  it('follows the page\'s lane precedence: language, device, cell, recurring', () => {
    expect(findingColour({ language: 'bebop', kind: 'cell', degrees: ['1'] })).toBe(PAPER.language)
    expect(findingColour({ kind: 'device' })).toBe(PAPER.device)
    expect(findingColour({ kind: 'cell', degrees: ['1', '3'] })).toBe(PAPER.cell)
    expect(findingColour({ kind: 'cell' })).toBe(PAPER.recurring)
  })
})

describe('markPlan', () => {
  it('colours every note of every finding span, at its written bar and beat', () => {
    const r = load('minimal-tenor')
    const marks = markPlan(r)
    for (const f of r.analysis.findings) {
      for (const s of f.spans) {
        for (let i = s.startIndex; i <= s.endIndex; i++) {
          const n = r.analysis.contexts[i].note
          const w = writtenBar(r.score, n.bar)
          if (w.pass === 2) continue
          expect(marks).toContainEqual({ kind: 'colour', bar: w.bar, beat: n.beat, colour: findingColour(f), findingId: f.id })
        }
      }
    }
  })

  it('labels each occurrence with the finding\'s panel number and name', () => {
    const r = load('minimal-tenor')
    const marks = markPlan(r)
    r.analysis.findings.forEach((f, i) => {
      const first = r.analysis.contexts[f.spans[0].startIndex].note
      const w = writtenBar(r.score, first.bar)
      expect(marks).toContainEqual({
        kind: 'text', bar: w.bar, beat: first.beat, text: `${i + 1} · ${f.name}`, placement: 'staff', colour: findingColour(f),
      })
    })
  })

  it('numbers phrases and their inner ideas the way the page does', () => {
    const r = load('minimal-tenor')
    const marks = markPlan(r).filter((m) => m.kind === 'text' && m.placement === 'system')
    const labels = marks.map((m) => (m as { text: string }).text)
    expect(labels[0]).toBe('1')
    r.analysis.phrases.forEach((p, i) => {
      expect(labels).toContain(String(i + 1))
      p.ideas.slice(1).forEach((_, j) => expect(labels).toContain(`${i + 1}.${j + 2}`))
    })
  })

  it('anchors a phrase that begins before its first note at the phrase onset', () => {
    const r = load('ties-tuplets-div24')
    const marks = markPlan(r)
    r.analysis.phrases.forEach((p, i) => {
      const first = p.notes[0]
      const barStart = first.onset - first.beat * 960
      const beat = (p.onset - barStart) / 960
      const w = writtenBar(r.score, first.bar)
      expect(marks).toContainEqual({ kind: 'text', bar: w.bar, beat, text: String(i + 1), placement: 'system', colour: PAPER.phrase })
    })
  })

  it('drops marks on a repeat\'s second pass', () => {
    const r = load('has-repeats')
    const marks = markPlan(r)
    const lastWritten = r.score.repeats?.length ? Math.max(...marks.map((m) => m.bar)) : 0
    // Every mark's bar is a written bar: none exceeds the written bar count.
    for (const m of marks) expect(m.bar).toBeLessThanOrEqual(r.score.barCount)
    expect(lastWritten).toBeLessThanOrEqual(r.score.barCount)
  })

  it('places each warn or blocking adjustment at its bar', () => {
    const r = load('two-soloists')
    const marks = markPlan(r)
    for (const a of r.report.adjustments) {
      if (a.severity === 'info') continue
      const bar = 'bar' in a.target ? a.target.bar : a.target.range[0]
      expect(marks).toContainEqual({ kind: 'text', bar: writtenBar(r.score, bar).bar, beat: 0, text: `⚠ ${a.reason}`, placement: 'staff', colour: PAPER.warning })
    }
  })

  it('is JSON-safe', () => {
    const marks = markPlan(load('minimal-tenor'))
    expect(JSON.parse(JSON.stringify(marks))).toEqual(marks)
  })
})
```

Note: `score.barCount` — check `src/core/types.ts`; if the field counts played bars after unrolling, replace the last assertion with `r.score.barCount - <total repeated length>` computed from `r.score.repeats` (`to - from + 1` summed). Say which in the report.

- [ ] **Step 2: Run to verify failure**

`npm run test:run -- src/render/marks.test.ts` → FAIL, module not found.

- [ ] **Step 3: Implement `src/render/marks.ts`**

```ts
import type { Finding } from '../analyse/index.ts'
import type { PipelineResult } from '../run.ts'
import { writtenBar } from '../core/bars.ts'
import { TICKS_PER_QUARTER } from '../core/types.ts'

/**
 * What the MuseScore plugin draws on a copy of the score. The engine plans
 * (positions, colours, words); the panel executes through MuseScore's
 * cursor API. Pure, so every rule here is testable without MuseScore.
 * Spec: docs/superpowers/specs/2026-09-14-musescore-marks-and-exercises-design.md D1.
 */
export type Mark =
  | { kind: 'colour'; bar: number; beat: number; colour: string; findingId: string }
  | { kind: 'text'; bar: number; beat: number; text: string; placement: 'staff' | 'system'; colour: string }

/**
 * The paper ramp from docs/DESIGN_SYSTEM.md "Marks — the pairs". A copy of
 * the score is a sheet, so its marks take the paper tokens, one host over.
 * Keep in step with `app/style.css`; DESIGN_SYSTEM.md names this file.
 */
export const PAPER = {
  cell: '#0d7c8a',
  device: '#9a6206',
  recurring: '#2e7d4f',
  language: '#7a3bb8',
  phrase: '#b3187a',
  idea: '#0d7c8a',
  warning: '#9a6206',
} as const

/** Same precedence as `app/score.ts` `findingLane`. */
export function findingColour(f: Pick<Finding, 'language' | 'kind' | 'degrees'>): string {
  if (f.language) return PAPER.language
  if (f.kind === 'device') return PAPER.device
  if (f.degrees) return PAPER.cell
  return PAPER.recurring
}

export function markPlan(result: Pick<PipelineResult, 'score' | 'analysis' | 'report'>): Mark[] {
  const { score, analysis, report } = result
  const marks: Mark[] = []
  /** Written bar, or null on a repeat's second pass (the page draws none there either). */
  const printed = (playedBar: number): number | null => {
    const w = writtenBar(score, playedBar)
    return w.pass === 2 ? null : w.bar
  }

  analysis.findings.forEach((f, rank) => {
    const colour = findingColour(f)
    for (const span of f.spans) {
      for (let i = span.startIndex; i <= span.endIndex; i++) {
        const note = analysis.contexts[i].note
        const bar = printed(note.bar)
        if (bar !== null) marks.push({ kind: 'colour', bar, beat: note.beat, colour, findingId: f.id })
      }
      const first = analysis.contexts[span.startIndex].note
      const bar = printed(first.bar)
      if (bar !== null) marks.push({ kind: 'text', bar, beat: first.beat, text: `${rank + 1} · ${f.name}`, placement: 'staff', colour })
    }
  })

  analysis.phrases.forEach((phrase, i) => {
    const first = phrase.notes[0]
    const bar = printed(first.bar)
    if (bar !== null) {
      // A phrase that begins on a rest inside a tuplet is marked at the rest (app/score.ts markPhrases).
      const barStart = first.onset - first.beat * TICKS_PER_QUARTER
      const beat = (phrase.onset - barStart) / TICKS_PER_QUARTER
      marks.push({ kind: 'text', bar, beat, text: String(i + 1), placement: 'system', colour: PAPER.phrase })
    }
    phrase.ideas.forEach((idea, j) => {
      if (j === 0) return
      const note = idea.notes[0]
      const ideaBar = printed(note.bar)
      if (ideaBar !== null) marks.push({ kind: 'text', bar: ideaBar, beat: note.beat, text: `${i + 1}.${j + 1}`, placement: 'system', colour: PAPER.idea })
    })
  })

  for (const a of report.adjustments) {
    if (a.severity === 'info') continue
    const playedBar = 'bar' in a.target ? a.target.bar : a.target.range[0]
    const bar = printed(playedBar)
    if (bar !== null) marks.push({ kind: 'text', bar, beat: 0, text: `⚠ ${a.reason}`, placement: 'staff', colour: PAPER.warning })
  }

  return marks
}
```

Add to `src/index.ts`: `export { markPlan, findingColour, PAPER } from './render/marks.ts'` and `export type { Mark } from './render/marks.ts'`.

- [ ] **Step 4: ENGINE_SPEC** — under "## MuseScore plugin" add:

```
- Marks on the copy (`render/marks.ts` `markPlan`): one `colour` mark per
  note in every finding span (colour by `findingColour`: language →
  device → cell → recurring, the page's lane precedence); one staff `text`
  per occurrence, `"<rank> · <name>"`; one system `text` per phrase start
  (`"1"`, at the phrase onset when that precedes its first note) and per
  idea after the first (`"1.2"`); one staff `text` per warn/blocking
  adjustment at its bar, `"⚠ <reason>"`. Written bars only; a repeat's
  second pass gets nothing. Colours are the paper ramp (DESIGN_SYSTEM
  "Marks — the pairs"), copied into `PAPER`. Later marks win on a shared
  note, so a device inside a cell shows the device.
```

- [ ] **Step 5: Run and commit**

`npm run typecheck && npm run test:run -- src/render` → PASS.
```bash
git add src/render/marks.ts src/render/marks.test.ts src/index.ts docs/ENGINE_SPEC.md
git commit -m "feat(render): markPlan — the engine's positioned, coloured marks for a score copy"
```

---

### Task 2: `unitToMusicXml` — one practice unit as one score

**Files:**
- Modify: `src/render/musicxml.ts`
- Modify: `src/render/musicxml.test.ts`
- Modify: `src/index.ts` (export `unitToMusicXml`)
- Modify: `docs/ENGINE_SPEC.md` "## Exercise rendering" (add a paragraph)

**Interfaces:**
- Consumes: `PracticeUnit` (`header`, `steps`) from `src/practice/unit.ts`; `Exercise` from `src/generate/index.ts`.
- Produces: `unitToMusicXml(unit: PracticeUnit, instrument: Instrument, options: RenderOptions = {}): string`. `exerciseToMusicXml` output byte-identical to before.

- [ ] **Step 1: Write the failing tests** (append to `src/render/musicxml.test.ts`)

```ts
import { unitToMusicXml } from './musicxml.ts'
import { ingestXml } from '../ingest/index.ts'
import type { PracticeUnit } from '../practice/unit.ts'

const rhythmic: Exercise = {
  ...exercise,
  id: 'f1-loop',
  title: 'the line as played',
  transformation: 'loop',
  bars: [{ rootPc: 0, quality: 'major-seventh', midis: [], events: [
    { midi: 60, duration: 480 }, { midi: 62, duration: 480 }, { midi: 64, duration: 960 }, { midi: null, duration: 1920 },
  ] }],
}

const unit = {
  id: 'u1', header: 'Bars 73–74 · maj7 arpeggio from the b3',
  steps: [
    { kind: 'loop', exercise: rhythmic, prompt: 'p' },
    { kind: 'through', tune: 'Hey Lock', exercises: [exercise], prompt: 'p' },
    { kind: 'visualise', cues: ['c'], prompt: 'p' },
    { kind: 'vary', exercises: [exercise, exercise], prompt: 'p' },
    { kind: 'write', template: '<xml/>', examples: [exercise], prompt: 'p' },
  ],
} as unknown as PracticeUnit

describe('unitToMusicXml', () => {
  const xml = unitToMusicXml(unit, tenor)

  it('is one part our parser reads back, with continuous measure numbers', () => {
    const score = ingestXml(xml)
    // loop 1 bar + through 2 + vary 2×2 + write 2 = 9
    expect(score.barCount).toBe(9)
    const numbers = [...xml.matchAll(/<measure number="(\d+)"/g)].map((m) => Number(m[1]))
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('opens every exercise on a new system with its title, and attributes for its divisions', () => {
    expect((xml.match(/<print new-system="yes"\/>/g) ?? []).length).toBe(5)
    expect((xml.match(/<words>/g) ?? []).length).toBe(5)
    expect((xml.match(/<attributes>/g) ?? []).length).toBe(5)
    expect(xml).toContain('<words>Loop · the line as played</words>')
    expect(xml).toContain('<words>Through Hey Lock · digital pattern 1235 through the cycle of fourths</words>')
    expect(xml).toContain('<words>Vary · digital pattern 1235 through the cycle of fourths</words>')
    expect(xml).toContain('<words>Write your own — examples · digital pattern 1235 through the cycle of fourths</words>')
  })

  it('titles the score with the unit header and keeps the transposition', () => {
    expect(xml).toContain('<work-title>Bars 73–74 · maj7 arpeggio from the b3</work-title>')
    expect(ingestXml(xml).instrument.name).toBe('Bb tenor saxophone')
  })

  it('leaves exerciseToMusicXml unchanged', () => {
    const one = exerciseToMusicXml(exercise, tenor)
    expect(one).not.toContain('<print')
    expect(one).not.toContain('<words>')
    expect((one.match(/<attributes>/g) ?? []).length).toBe(1)
  })
})
```

Only the first exercise of a step gets the step prefix; the second `vary` exercise's words are just its title — the count of 5 `<words>` covers 5 exercises (loop 1, through 1, vary 2, write 1).

- [ ] **Step 2: Run to verify failure** — `npm run test:run -- src/render/musicxml.test.ts` → FAIL, `unitToMusicXml` not exported.

- [ ] **Step 3: Implement**

In `src/render/musicxml.ts`:

1. Change `rhythmicMeasureXml` and `measureXml` to take a `head: string` argument instead of deciding on `number === 1`; the callers pass `attributesXml(...)` for an exercise's first measure and `''` otherwise. Both signatures become `(bar, number, instrument, timeSig|—, options, head)`; keep the existing parameter order and append `head` last.

2. Extract the measure run:

```ts
/** An exercise's measures, numbered from `from`; `lead` is prepended to the first measure's content (print, words). */
function exerciseMeasures(exercise: Exercise, instrument: Instrument, options: RenderOptions, from: number, lead = ''): string[] {
  const rhythmic = exercise.bars.some((b) => b.events)
  const timeSig = exercise.timeSig ?? [4, 4]
  return exercise.bars.map((bar, index) => {
    const head = index === 0
      ? lead + attributesXml(instrument, rhythmic ? FINE_DIVISIONS : DIVISIONS, rhythmic ? timeSig : [4, 4], options)
      : ''
    return rhythmic
      ? rhythmicMeasureXml(bar, from + index, instrument, timeSig, options, head)
      : measureXml(bar, from + index, instrument, options, head)
  })
}
```

Check `attributesXml`'s existing signature and keep its behaviour for the single-exercise case exactly (even-eighth exercises always used `[4, 4]`).

3. `exerciseToMusicXml` becomes: `const measures = exerciseMeasures(exercise, instrument, options, 1).join('\n      ')` with the same wrapper as today (`work-title` = `exercise.title`, part name `Exercise`).

4. Add:

```ts
const STEP_TITLE: Record<string, (step: Step) => string> = {
  loop: () => 'Loop',
  through: (s) => `Through ${(s as Extract<Step, { kind: 'through' }>).tune}`,
  vary: () => 'Vary',
  write: () => 'Write your own — examples',
}

function stepExercises(step: Step): Exercise[] {
  switch (step.kind) {
    case 'loop': return [step.exercise]
    case 'through': return step.exercises
    case 'vary': return step.exercises
    case 'write': return step.examples
    case 'visualise': return []
  }
}

function sectionLead(title: string): string {
  return `<print new-system="yes"/><direction placement="above"><direction-type><words>${escapeXml(title)}</words></direction-type></direction>`
}

/**
 * One practice unit as one score: a section per step, every exercise on its
 * own system under its title, measures numbered straight through. The
 * MuseScore plugin opens this as a tab; the visualise step has no notes and
 * stays in the panel. Spec 2026-09-14 marks-and-exercises D3.
 */
export function unitToMusicXml(unit: PracticeUnit, instrument: Instrument, options: RenderOptions = {}): string {
  const measures: string[] = []
  for (const step of unit.steps) {
    stepExercises(step).forEach((exercise, i) => {
      const title = i === 0 ? `${STEP_TITLE[step.kind](step)} · ${exercise.title}` : exercise.title
      measures.push(...exerciseMeasures(exercise, instrument, options, measures.length + 1, sectionLead(title)))
    })
  }
  return scoreXml(unit.header, measures)
}
```

and factor the `<?xml …>` wrapper out of `exerciseToMusicXml` into `function scoreXml(title: string, measures: string[]): string` used by both. Import `Step`, `PracticeUnit` types from `../practice/unit.ts` (type-only import; `practice/` imports `render/` already for the write step — confirm no cycle at runtime: type imports are erased).

Add to `src/index.ts`: `export { exerciseToMusicXml, unitToMusicXml } from './render/musicxml.ts'` (replace the existing line).

- [ ] **Step 4: ENGINE_SPEC** — append to "## Exercise rendering":

```
`unitToMusicXml(unit, instrument, options)` renders a practice unit as one
part: for each step (loop → through → vary → write; visualise contributes
nothing) every exercise becomes a run of measures opened by
`<print new-system="yes"/>`, a words direction with its title (the step's
first exercise prefixed `Loop ·`, `Through <tune> ·`, `Vary ·`, `Write your
own — examples ·`) and its own `<attributes>` (divisions differ between
even-eighth and rhythmic exercises). Measure numbers run continuously;
`<work-title>` is the unit header. `exerciseToMusicXml` is the one-exercise
case of the same builder and its output is unchanged.
```

- [ ] **Step 5: Run and commit**

`npm run typecheck && npm run test:run` → all green (the pipeline and peers suites cover the unchanged single-exercise output through `write.ts`).
```bash
git add src/render/musicxml.ts src/render/musicxml.test.ts src/index.ts docs/ENGINE_SPEC.md
git commit -m "feat(render): unitToMusicXml — a practice unit as one score, a section per step"
```

---

### Task 3: The boundary — marks, colours and unit scores in `PluginResult`

**Files:**
- Modify: `plugin/entry.ts`
- Modify: `plugin/entry.test.ts`
- Modify: `plugin/bundle.test.ts` (one assertion)

**Interfaces:**
- Consumes: `markPlan`, `findingColour`, `Mark` (`src/render/marks.ts`); `unitToMusicXml` (`src/render/musicxml.ts`).
- Produces:
  ```ts
  export interface PluginFinding extends FindingView { colour: string }
  export interface PluginUnit { id; findingIds; header; prompts; scoreXml: string }
  export interface PluginResult { …; findings: PluginFinding[]; marks: Mark[] }
  ```

- [ ] **Step 1: Failing tests** (append to `plugin/entry.test.ts`)

```ts
  it('carries a mark plan, a colour per finding and a score per unit', () => {
    const r = analyseXml(xml)
    expect(Array.isArray(r.marks)).toBe(true)
    for (const f of r.findings) expect(f.colour).toMatch(/^#[0-9a-f]{6}$/)
    for (const u of r.units) {
      expect(u.scoreXml.startsWith('<?xml')).toBe(true)
      expect(u.scoreXml).toContain('<transpose>')
    }
    expect(JSON.parse(JSON.stringify(r))).toEqual(r)
  })
```

`minimal-tenor` is a tenor part, so `<transpose>` is present; if a unit has only a visualise step and no measures, `unitToMusicXml` still emits the wrapper — assert only the prefix for units whose `scoreXml` lacks `<measure`.

In `plugin/bundle.test.ts`'s Blake test add `expect(r.marks.length).toBeGreaterThan(0)` (extend the `bareLoad` return type with `marks: unknown[]`).

- [ ] **Step 2: Run to verify failure** — `npm run test:run -- plugin/entry.test.ts` → FAIL on `r.marks`.

- [ ] **Step 3: Implement** in `plugin/entry.ts`

```ts
import { runXml } from '../src/run.ts'
import type { FindingView, StageTiming } from '../src/run.ts'
import { findingColour, markPlan } from '../src/render/marks.ts'
import type { Mark } from '../src/render/marks.ts'
import { unitToMusicXml } from '../src/render/musicxml.ts'

export interface PluginFinding extends FindingView {
  /** Paper-ramp colour the copy's marks use; the panel row shows the same swatch. */
  colour: string
}

export interface PluginUnit {
  id: string
  findingIds: string[]
  header: string
  prompts: string[]
  /** The unit as one MusicXML score, <transpose> kept — MuseScore opens it as a tab. */
  scoreXml: string
}

export interface PluginResult {
  title: string | null
  tune: string | null
  findings: PluginFinding[]
  units: PluginUnit[]
  warnings: string[]
  /** What to draw on a copy of the score; see src/render/marks.ts. */
  marks: Mark[]
  timing: StageTiming
}

export function analyseXml(xml: string): PluginResult {
  const r = runXml(xml)
  const { instrument, keyFifths } = r.score
  return {
    title: r.score.title ?? null,
    tune: r.tune.title || null,
    findings: r.findingViews.map((view, i) => ({ ...view, colour: findingColour(r.analysis.findings[i]) })),
    units: r.units.map((u) => ({
      id: u.id,
      findingIds: u.findings.map((f) => f.id),
      header: u.header,
      prompts: u.steps.map((s) => s.prompt),
      scoreXml: unitToMusicXml(u, instrument, { keyFifths }),
    })),
    warnings: …unchanged…,
    marks: markPlan(r),
    timing: …unchanged…,
  }
}
```

`findingViews[i]` corresponds to `analysis.findings[i]` (`run.ts` maps one from the other in order) — state that in a comment. `{ ...view }` spread compiles to the `__spreadValues` helper already in the bundle; fine.

- [ ] **Step 4: Run, build, commit**

`npm run typecheck && npm run test:run && npm run plugin:build && npm run test:run -- plugin` → green (the import-graph test must still pass: `render/marks.ts` and `render/musicxml.ts` reach no agent module).
```bash
git add plugin/entry.ts plugin/entry.test.ts plugin/bundle.test.ts
git commit -m "feat(plugin): marks, finding colours and per-unit scores cross the boundary"
```

---

### Task 4: The panel — annotated copy and exercise tabs

**Files:**
- Modify: `plugin/Woodshed.qml`

**Interfaces:**
- Consumes: `PluginResult.marks`, `findings[].colour`, `units[].scoreXml` (Task 3); MuseScore: `api.engraving.readScore(path)`, `api.engraving.division`, `api.engraving.newElement`, `api.engraving.Element.STAFF_TEXT` / `SYSTEM_TEXT`, `Score.newCursor()`, `Score.startCmd/endCmd`, `Cursor.rewind(0)`, `next()`, `rewindToTick`, `tick`, `measure`, `element`, `add`; `Measure.firstSegment.tick`, `Measure.nextMeasure`; `Chord.notes`, `Note.color`; Qt Quick `TextDocument.saveAs`.

- [ ] **Step 1: State and the writer**

Add properties `property string status: ""` (a second line under `error`, for "placed N of M marks" and "opened …") and a second hidden editor:

```qml
    // The export is read through `reader`; anything the engine renders is
    // written through this one: TextDocument.saveAs is the one file-writing
    // route a 4.7 extension has (spec 2026-09-14 marks-and-exercises D5).
    TextEdit {
        id: writer
        visible: false
        textFormat: TextEdit.PlainText
    }

    function writeTemp(name, text) {
        writer.text = text
        const url = Qt.resolvedUrl("tmp/" + name)
        writer.textDocument.saveAs(url)
        if (writer.textDocument.status === TextDocument.WriteError
            || writer.textDocument.status === TextDocument.NonLocalFileError) {
            root.error = "Could not write " + name + ": " + writer.textDocument.errorString
            return null
        }
        return localPath("tmp/" + name)
    }

    function openTab(path) {
        const score = api.engraving.readScore(path, false)
        if (!score) {
            root.error = "MuseScore could not open " + path
            return null
        }
        return score
    }
```

- [ ] **Step 2: Applying marks**

```qml
    // One cursor pass over track 0 indexes every chord segment by
    // "<measure index>:<tick within the measure>" in MuseScore ticks; each
    // mark's (bar, beat) becomes that key. Marks with no chord there are
    // counted, not thrown: a rest, a pickup, a tuplet rounding.
    function applyMarks(score, marks) {
        const division = api.engraving.division
        const index = {}
        const cursor = score.newCursor()
        cursor.track = 0
        cursor.rewind(0)
        let measureNo = 0
        let measure = null
        while (cursor.segment) {
            if (cursor.measure !== measure) {
                measure = cursor.measure
                measureNo++
            }
            const el = cursor.element
            if (el && el.type === api.engraving.Element.CHORD) {
                index[measureNo + ":" + (cursor.tick - measure.firstSegment.tick)] = { tick: cursor.tick, chord: el }
            }
            if (!cursor.next()) break
        }

        let placed = 0
        score.startCmd("Woodshed marks")
        for (const m of marks) {
            const hit = index[m.bar + ":" + Math.round(m.beat * division)]
            if (!hit) continue
            if (m.kind === "colour") {
                for (const n of hit.chord.notes) n.color = m.colour
            } else {
                const type = m.placement === "system" ? api.engraving.Element.SYSTEM_TEXT : api.engraving.Element.STAFF_TEXT
                const text = api.engraving.newElement(type)
                text.text = m.text
                text.color = m.colour
                cursor.rewindToTick(hit.tick)
                cursor.add(text)
            }
            placed++
        }
        score.endCmd()
        return placed
    }

    function openAnnotatedCopy() {
        root.error = ""
        root.status = ""
        if (!root.result) return
        const name = "annotated-" + Date.now() + ".musicxml"
        const path = writeTemp(name, reader.text)
        if (!path) return
        const score = openTab(path)
        if (!score) return
        let placed = 0
        try {
            placed = applyMarks(score, root.result.marks)
        } catch (e) {
            console.log("woodshed marks:", e, e.stack)
            root.error = "Marks failed: " + (e && e.message ? e.message : e)
            return
        }
        root.status = "Annotated copy opened · placed " + placed + " of " + root.result.marks.length + " marks"
    }

    function openExercises() {
        root.error = ""
        root.status = ""
        if (!root.result || root.selected < 0) return
        const findingId = root.result.findings[root.selected].id
        let unit = null
        for (const u of root.result.units) if (u.findingIds.indexOf(findingId) >= 0) { unit = u; break }
        if (!unit) { root.error = "No practice unit carries this finding."; return }
        const path = writeTemp("exercises-" + unit.id + "-" + Date.now() + ".musicxml", unit.scoreXml)
        if (!path) return
        if (openTab(path)) root.status = "Opened exercises: " + unit.header
    }
```

If `Element.CHORD` is not the enum's name for a chord, `cursor.element.type` compared against `api.engraving.Element.CHORD` is still the documented form (`dev_test_api.qml` compares `measure.type === api.engraving.Element.MEASURE`); keep it and log `el.type` once in the catch if nothing places. `measure.firstSegment.tick` may differ from the first chord's tick when the measure opens with clef/key segments — that is why the index uses the measure's first segment and not the first chord.

- [ ] **Step 3: Buttons, swatch, status line**

In the header `Row`, after "Analyse again", add two more `Rectangle` buttons built exactly like `again` (same colours/opacities): text "Open annotated copy" (`enabled: root.result !== null`, `opacity` multiplied by 0.4 when disabled, `onClicked: root.openAnnotatedCopy()`) and "Open exercises for this idea" (`enabled: root.selected >= 0`, `onClicked: root.openExercises()`). Factor the button into an inline `component WoodshedButton: Rectangle { property string text; property bool enabled: true; signal clicked() … }` at the top of the file (QML inline components need Qt 5.15+, fine on 6.10) so the three share one definition. Under the error label add a `StyledTextLabel { visible: root.status !== ""; text: root.status; color: Theme.fontSecondaryColor }`.

In the row delegate, prepend a `Rectangle { width: 10; height: 10; radius: 5; color: modelData.colour; anchors.verticalCenter: parent.verticalCenter }` inside a `Row` with the name label (wrap the first `StyledTextLabel` in a `Row { spacing: 8 }`).

- [ ] **Step 4: Install and run**

`npm run plugin:install`, then the owner quits MuseScore fully, reopens Blake, opens the panel: "Open annotated copy" should open a second tab with coloured noteheads at bars 73 and 77 and labels; the status line reports placed/total. Select row 1, "Open exercises for this idea": a third tab titled with the unit header. Report what the log says (`grep -i "woodshed\|ExtensionBuilder\|unavailable"` in the newest log) if either fails. Do not launch or quit MuseScore from the implementer; the owner does.

- [ ] **Step 5: Commit**

```bash
git add plugin/Woodshed.qml
git commit -m "feat(plugin): open an annotated copy and a unit's exercises as tabs"
```

---

### Task 5: The maintained files

**Files:** `docs/ENGINE_SPEC.md` (plugin section bullets for the two buttons, the writer `TextEdit`, the cursor index, fresh filenames), `docs/DESIGN_SYSTEM.md` (one line: the MuseScore copy quotes the paper ramp from `src/render/marks.ts` `PAPER`, which must move with `style.css`), `docs/DECISIONS.md` (append: marks planned by the engine and executed by the panel, not an XML rewrite; colours from the paper ramp), `docs/OPEN_QUESTIONS.md` (append: `tmp/` accumulates files with no API to delete; marks that miss a chord are counted not reported by position; `Element.CHORD` type check unverified until the owner's run), `docs/LEDGER.md` (entry in the file's voice: what shipped, what the owner saw, test counts), `CLAUDE.md` (Verifying: one sentence — the plugin's acceptance is the annotated-copy tab on Blake).

- [ ] Write them, run `npm run typecheck && npm run test:run && npm run plugin:build`, commit:
```bash
git commit -m "docs: marks on a copy and exercise tabs in the maintained files"
```

---

## Self-review

- Spec D1 → Task 1; D2 → Task 1 `PAPER` + Task 5 DESIGN_SYSTEM; D3 → Task 2; D4 → Task 3; D5 → Task 4. Testing section → Tasks 1–3 tests, Task 4 Step 4 acceptance. Cuts → none needed in code.
- Types: `Mark` defined in Task 1, used in Tasks 3 and 4 (`m.kind`, `m.bar`, `m.beat`, `m.colour`, `m.text`, `m.placement`). `PluginFinding.colour`, `PluginUnit.scoreXml`, `PluginResult.marks` defined in Task 3, used in Task 4. `unitToMusicXml` defined in Task 2, used in Task 3.
- Placeholders: Task 3 shows `…unchanged…` for two fields whose code already exists in the file; the implementer keeps them as they are.
