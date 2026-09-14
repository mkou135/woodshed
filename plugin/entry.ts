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
