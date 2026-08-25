import type { BoundaryCandidate } from '../../analyse/segment.ts'
import type { AgentClient } from '../client.ts'
import { segmentDocument } from '../evidence.ts'
import { SEGMENT_INSTRUCTION } from '../prompts.ts'
import { BoundaryVerdicts } from '../verdicts.ts'

/**
 * One batched call over every ambiguous gap. Verdicts naming candidates the
 * engine never issued are discarded. Null (no verdicts at all) means the
 * thresholds decide alone.
 */
export async function adjudicate(
  client: AgentClient,
  candidates: BoundaryCandidate[],
  timeSig: [number, number],
): Promise<Map<number, boolean> | null> {
  if (candidates.length === 0) return null
  const byId = new Map(candidates.map((c) => [c.id, c.index]))
  const verdict = await client.complete(
    'segment',
    { document: segmentDocument(candidates, timeSig), instruction: SEGMENT_INSTRUCTION },
    BoundaryVerdicts,
  )
  if (!verdict) return null
  const overrides = new Map<number, boolean>()
  for (const v of verdict.verdicts) {
    const index = byId.get(v.candidateId)
    if (index !== undefined) overrides.set(index, v.boundary)
  }
  return overrides.size > 0 ? overrides : null
}
