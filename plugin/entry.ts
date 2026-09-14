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
  /** The teacher's one line above the excerpt. */
  header: string
  /** The four practice steps' prompts, in step order. */
  prompts: string[]
  /** The unit as one MusicXML score, <transpose> kept — MuseScore opens it as a tab. */
  scoreXml: string
}

export interface PluginResult {
  title: string | null
  tune: string | null
  findings: PluginFinding[]
  units: PluginUnit[]
  /** Cleanup adjustments at warn or blocking, as their reasons. */
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
    // findingViews[i] corresponds to analysis.findings[i] (run.ts maps one from the other in order)
    findings: r.findingViews.map((view, i) => ({ ...view, colour: findingColour(r.analysis.findings[i]) })),
    units: r.units.map((u) => ({
      id: u.id,
      findingIds: u.findings.map((f) => f.id),
      header: u.header,
      prompts: u.steps.map((s) => s.prompt),
      scoreXml: unitToMusicXml(u, instrument, { keyFifths }),
    })),
    warnings: r.report.adjustments
      .filter((a) => (['warn', 'blocking'] as const).includes(a.severity as 'warn' | 'blocking'))
      .map((a) => a.reason),
    marks: markPlan(r),
    timing: r.timing ?? { ingest: 0, prepare: 0, analyse: 0, practice: 0, total: 0 },
  }
}
