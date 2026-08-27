import { barLabel } from './core/bars.ts'
import type { Score } from './core/types.ts'
import { ingest } from './ingest/index.ts'
import { prepare } from './prepare/index.ts'
import type { CleanupReport } from './prepare/index.ts'
import { analyse } from './analyse/index.ts'
import type { Analysis, Finding } from './analyse/index.ts'
import { generateExercises } from './generate/index.ts'
import type { Exercise } from './generate/index.ts'
import { buildUnits } from './practice/unit.ts'
import type { PracticeUnit } from './practice/unit.ts'
import { tuneFromScore } from './practice/tune.ts'
import { runAgent } from './agent/run.ts'
import type { AgentClient } from './agent/client.ts'
import type { AgentOutput } from './agent/run.ts'
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

export interface PipelineResult {
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

/** Ingest, clean up, analyse and generate, in one call. */
export function run(bytes: Uint8Array): PipelineResult {
  const score = ingest(bytes)
  const report = prepare(score)
  const analysis = analyse(score, report)
  const exercises = generateExercises(analysis, score)
  const tune = tuneFromScore(score, report.form?.chorusStarts ?? [])
  const units = buildUnits(analysis, score, { tune })

  return {
    score,
    report,
    analysis,
    exercises,
    findingViews: analysis.findings.map((f) => describeFinding(f, score)),
    tune,
    units,
  }
}

/**
 * The pipeline with the agent stage: boundary adjudication feeds the analysis
 * everything downstream sees; ranking, narration and the session plan ride
 * alongside. Degraded jobs fall back to the deterministic result above.
 */
export async function runWithAgent(
  bytes: Uint8Array,
  client: AgentClient,
  onStage?: (stage: string) => void,
  persona: 'teacher' | 'jaded' = 'teacher',
): Promise<PipelineResult & { agent: AgentOutput }> {
  onStage?.('reading the score')
  const score = ingest(bytes)
  const report = prepare(score)
  const tune = tuneFromScore(score, report.form?.chorusStarts ?? [])
  const { analysis, units, agent } = await runAgent(client, score, report, { tune }, onStage, persona)
  const exercises = generateExercises(analysis, score)

  return {
    score,
    report,
    analysis,
    exercises,
    findingViews: analysis.findings.map((f) => describeFinding(f, score)),
    tune,
    units,
    agent,
  }
}

/** Rebuild the units against a different tune, e.g. a pasted iReal chart. */
export function practiseOver(result: PipelineResult, tune: Tune, tuneName: string): PracticeUnit[] {
  return buildUnits(result.analysis, result.score, { tune, tuneName })
}
