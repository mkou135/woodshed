export { run, runXml, describeFinding } from './run.ts'
export type { FindingView, StageTiming, PipelineResult } from './run.ts'
import { describeFinding } from './run.ts'
import type { PipelineResult } from './run.ts'
import { ingest } from './ingest/index.ts'
import { prepare } from './prepare/index.ts'
import { generateExercises } from './generate/index.ts'
import { buildUnits } from './practice/unit.ts'
import type { PracticeUnit } from './practice/unit.ts'
import { tuneFromScore } from './practice/tune.ts'
import { runAgent } from './agent/run.ts'
import type { AgentClient } from './agent/client.ts'
import type { AgentOutput } from './agent/run.ts'
import type { Tune } from './practice/tune.ts'

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
