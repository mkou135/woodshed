import { barLabel } from './core/bars.ts'
import type { Score } from './core/types.ts'
import { ingest, ingestXml } from './ingest/index.ts'
import { prepare } from './prepare/index.ts'
import type { CleanupReport } from './prepare/index.ts'
import { analyse } from './analyse/index.ts'
import type { Analysis, Finding } from './analyse/index.ts'
import { generateExercises } from './generate/index.ts'
import type { Exercise } from './generate/index.ts'
import { buildUnits } from './practice/unit.ts'
import type { PracticeUnit } from './practice/unit.ts'
import { tuneFromScore } from './practice/tune.ts'
import type { Tune } from './practice/tune.ts'

export interface FindingView {
  id: string
  name: string
  location: string
  occurrences: number
  /** How many of the occurrences are bent or inverted forms. */
  variants: number
  confidence: number
  confidenceLabel: 'strong' | 'moderate' | 'weak'
  detectedBy: string[]
  /** Set when the finding is a named cliché — identification, not discovery. */
  language?: 'bebop'
  /** Share of WJD solos containing the pattern, when the mined table has it. */
  lickShare?: number
}

/** Milliseconds per stage of one `run()`, wall clock; `npm run bench` and the page both read it. */
export interface StageTiming {
  ingest: number
  prepare: number
  analyse: number
  practice: number
  total: number
}

export interface PipelineResult {
  /** Present on every run; the agent path carries the deterministic run's numbers. */
  timing?: StageTiming
  score: Score
  report: CleanupReport
  analysis: Analysis
  exercises: Exercise[]
  findingViews: FindingView[]
  /** The solo's own changes, one chorus. */
  tune: Tune
  /** Ideas ranked by the vocabulary inside them, each with its four steps. */
  units: PracticeUnit[]
}

const STRONG = 0.7
const MODERATE = 0.45

/** Pure, so the page's list can be tested without a DOM. */
export function describeFinding(finding: Finding, score: Pick<Score, 'repeats'> = {}): FindingView {
  const bars = [...new Set(finding.spans.map((s) => s.bar))].sort((a, b) => a - b)
  const location =
    bars.length === 1
      // Beats are 0-based internally and 1-based for a reader.
      ? `bar ${barLabel(score, bars[0])}, beat ${finding.spans[0].beat + 1}`
      : `bars ${bars.map((b) => barLabel(score, b)).join(', ')}`

  const confidenceLabel =
    finding.confidence >= STRONG ? 'strong'
      : finding.confidence >= MODERATE ? 'moderate'
        : 'weak'

  return {
    id: finding.id,
    name: finding.name,
    location,
    occurrences: finding.spans.length,
    variants: finding.variants?.reduce((n, v) => n + v.occurrences.length, 0) ?? 0,
    confidence: finding.confidence,
    confidenceLabel,
    detectedBy: finding.detectedBy,
    language: finding.language,
    lickShare: finding.lickShare,
  }
}

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
