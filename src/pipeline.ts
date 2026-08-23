import type { Score } from './core/types.ts'
import { ingest } from './ingest/index.ts'
import { prepare } from './prepare/index.ts'
import type { CleanupReport } from './prepare/index.ts'
import { analyse } from './analyse/index.ts'
import type { Analysis, Finding } from './analyse/index.ts'
import { generateExercises } from './generate/index.ts'
import type { Exercise } from './generate/index.ts'

export interface FindingView {
  id: string
  name: string
  location: string
  occurrences: number
  confidence: number
  confidenceLabel: 'strong' | 'moderate' | 'weak'
  detectedBy: string[]
}

export interface PipelineResult {
  score: Score
  report: CleanupReport
  analysis: Analysis
  exercises: Exercise[]
  findingViews: FindingView[]
}

const STRONG = 0.7
const MODERATE = 0.45

/** Pure, so the page's list can be tested without a DOM. */
export function describeFinding(finding: Finding): FindingView {
  const bars = [...new Set(finding.spans.map((s) => s.bar))].sort((a, b) => a - b)
  const location =
    bars.length === 1
      // Beats are 0-based internally and 1-based for a reader.
      ? `bar ${bars[0]}, beat ${finding.spans[0].beat + 1}`
      : `bars ${bars.join(', ')}`

  const confidenceLabel =
    finding.confidence >= STRONG ? 'strong'
      : finding.confidence >= MODERATE ? 'moderate'
        : 'weak'

  return {
    id: finding.id,
    name: finding.name,
    location,
    occurrences: finding.spans.length,
    confidence: finding.confidence,
    confidenceLabel,
    detectedBy: finding.detectedBy,
  }
}

/** Ingest, clean up, analyse and generate, in one call. */
export function run(bytes: Uint8Array): PipelineResult {
  const score = ingest(bytes)
  const report = prepare(score)
  const analysis = analyse(score, report)
  const exercises = generateExercises(analysis, score)

  return {
    score,
    report,
    analysis,
    exercises,
    findingViews: analysis.findings.map(describeFinding),
  }
}
