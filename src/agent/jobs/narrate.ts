import type { AgentClient } from '../client.ts'
import { NARRATE_INSTRUCTION } from '../prompts.ts'
import { Narration } from '../verdicts.ts'

export interface EngineIds {
  findings: Set<string>
  units: Set<string>
}

/** Two-paragraph overview, teacher names, look-fors — ids the engine never issued are discarded, not patched. */
export async function narrate(client: AgentClient, document: string, ids: EngineIds): Promise<Narration | null> {
  const verdict = await client.complete('narrate', { document, instruction: NARRATE_INSTRUCTION }, Narration)
  if (!verdict) return null
  return {
    overview: verdict.overview,
    findingNames: verdict.findingNames.filter((f) => ids.findings.has(f.id)),
    lookFors: verdict.lookFors.filter((l) => ids.units.has(l.unitId)),
  }
}
