import { analyse, soloistNotes } from '../analyse/index.ts'
import type { Analysis } from '../analyse/index.ts'
import { boundaryCandidates } from '../analyse/segment.ts'
import type { Score } from '../core/types.ts'
import type { CleanupReport } from '../prepare/index.ts'
import { buildUnits } from '../practice/unit.ts'
import type { BuildOptions, PracticeUnit } from '../practice/unit.ts'
import type { AgentClient, AgentUsage } from './client.ts'
import { analysisDocument } from './evidence.ts'
import { adjudicate } from './jobs/adjudicate.ts'
import { construct } from './jobs/construct.ts'
import { narrate } from './jobs/narrate.ts'
import type { Persona } from './jobs/narrate.ts'
import { rank } from './jobs/rank.ts'
import type { Narration, RankVerdict, SessionPlan } from './verdicts.ts'

export interface AgentOutput {
  narration: Narration | null
  ranking: RankVerdict | null
  sessionPlan: SessionPlan | null
  /** Boundary overrides that were applied, note index → open/closed. */
  boundaries: Map<number, boolean> | null
  usage: AgentUsage[]
  /** Jobs where the deterministic path stands. */
  degraded: string[]
}

export interface AgentResult {
  analysis: Analysis
  units: PracticeUnit[]
  agent: AgentOutput
}

/**
 * The four jobs in runtime order: adjudicate boundaries, re-analyse with the
 * verdicts, then rank, narrate and construct over the final analysis. Every
 * null verdict leaves the deterministic result standing and is listed in
 * `degraded` — the engine's output is never conditional on the model working.
 */
export async function runAgent(
  client: AgentClient,
  score: Score,
  report: CleanupReport,
  buildOptions: BuildOptions,
  onStage?: (stage: string) => void,
  persona: Persona = 'teacher',
): Promise<AgentResult> {
  const degraded: string[] = []

  onStage?.('judging the ambiguous phrase boundaries')
  const candidates = boundaryCandidates(soloistNotes(score, report))
  const boundaries = await adjudicate(client, candidates, score.timeSig)
  if (!boundaries) degraded.push('segment')

  onStage?.('re-reading the solo with the adjudicated phrases')
  const analysis = analyse(score, report, { overrides: boundaries ?? undefined })
  const units = buildUnits(analysis, score, buildOptions)

  const document = analysisDocument(analysis, units, score)
  const unitIds = new Set(units.map((u) => u.id))
  const findingIds = new Set(analysis.findings.map((f) => f.id))

  onStage?.('ordering the practice menu')
  const ranking = await rank(client, document, unitIds)
  if (!ranking) degraded.push('rank')

  onStage?.('writing the narration')
  const narration = await narrate(client, document, { findings: findingIds, units: unitIds }, persona)
  if (!narration) degraded.push('narrate')

  onStage?.('assembling the practice session — the long one')
  const sessionPlan = await construct(client, { units, analysis, score }, document)
  if (!sessionPlan) degraded.push('construct')

  return {
    analysis,
    units,
    agent: { narration, ranking, sessionPlan, boundaries, usage: client.usage, degraded },
  }
}
