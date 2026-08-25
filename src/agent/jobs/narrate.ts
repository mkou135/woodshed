import type { AgentClient } from '../client.ts'
import { JADED_INSTRUCTION, NARRATE_INSTRUCTION } from '../prompts.ts'
import { Narration } from '../verdicts.ts'

export interface EngineIds {
  findings: Set<string>
  units: Set<string>
}

export type Persona = 'teacher' | 'jaded'

/** Two-paragraph overview, teacher names, look-fors — ids the engine never issued are discarded, not patched. */
export async function narrate(client: AgentClient, document: string, ids: EngineIds, persona: Persona = 'teacher'): Promise<Narration | null> {
  const instruction = persona === 'jaded' ? JADED_INSTRUCTION : NARRATE_INSTRUCTION
  const verdict = await client.complete('narrate', { document, instruction }, Narration)
  if (!verdict) return null
  const overview =
    verdict.overview.length > 2
      ? [verdict.overview[0], verdict.overview.slice(1).join(' ')]
      : verdict.overview
  return {
    overview,
    findingNames: verdict.findingNames.filter((f) => ids.findings.has(f.id)),
    lookFors: verdict.lookFors.filter((l) => ids.units.has(l.unitId)),
  }
}
