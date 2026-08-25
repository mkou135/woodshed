import type { AgentClient } from '../client.ts'
import { RANK_INSTRUCTION } from '../prompts.ts'
import { RankVerdict } from '../verdicts.ts'

/** The teaching menu. A verdict that keeps nothing is no verdict. */
export async function rank(client: AgentClient, document: string, unitIds: Set<string>): Promise<RankVerdict | null> {
  const verdict = await client.complete('rank', { document, instruction: RANK_INSTRUCTION }, RankVerdict)
  if (!verdict) return null
  const order = verdict.order.filter((o) => unitIds.has(o.unitId))
  if (!order.some((o) => o.keep)) return null
  return { order }
}
