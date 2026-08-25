import type { Analysis } from '../../analyse/index.ts'
import type { Score } from '../../core/types.ts'
import type { PracticeUnit } from '../../practice/unit.ts'
import type { AgentClient, AgentTool } from '../client.ts'
import { CONSTRUCT_INSTRUCTION } from '../prompts.ts'
import { SessionPlan } from '../verdicts.ts'

export interface ConstructContext {
  units: PracticeUnit[]
  analysis: Analysis
  score: Score
}

/**
 * The one tool-runner job: the model probes engine-built steps and assembles
 * the session. Only steps the engine generated survive the filter — the model
 * chooses among gate-approved parts, it never mints one.
 */
export async function construct(client: AgentClient, ctx: ConstructContext, document: string): Promise<SessionPlan | null> {
  const byId = new Map(ctx.units.map((u) => [u.id, u]))

  const tools: AgentTool[] = [
    {
      definition: {
        name: 'list_steps',
        description: "A unit's engine-generated practice steps (every one already validity-gate approved).",
        input_schema: {
          type: 'object',
          properties: { unitId: { type: 'string' } },
          required: ['unitId'],
          additionalProperties: false,
        },
      },
      run: (input) => {
        const unit = byId.get((input as { unitId: string }).unitId)
        if (!unit) return 'no such unit'
        return unit.steps.map((s) => s.kind).join(', ') || 'no steps generated'
      },
    },
    {
      definition: {
        name: 'unit_detail',
        description: 'One unit: its bars, harmony, findings, arrival and stock share.',
        input_schema: {
          type: 'object',
          properties: { unitId: { type: 'string' } },
          required: ['unitId'],
          additionalProperties: false,
        },
      },
      run: (input) => {
        const unit = byId.get((input as { unitId: string }).unitId)
        if (!unit) return 'no such unit'
        return unit.header
      },
    },
  ]

  const verdict = await client.runTools('construct', { document, instruction: CONSTRUCT_INSTRUCTION }, tools, SessionPlan)
  if (!verdict) return null
  const units = verdict.units
    .filter((u) => byId.has(u.unitId))
    .map((u) => {
      const generated = new Set(byId.get(u.unitId)!.steps.map((s) => s.kind))
      return { ...u, steps: u.steps.filter((s) => generated.has(s)) }
    })
    .filter((u) => u.steps.length > 0)
  if (units.length === 0) return null
  return { units, interleave: verdict.interleave }
}
