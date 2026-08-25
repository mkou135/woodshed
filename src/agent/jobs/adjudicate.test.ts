import { describe, expect, it } from 'vitest'
import type { BoundaryCandidate } from '../../analyse/segment.ts'
import { replayClient } from '../client.ts'
import { adjudicate } from './adjudicate.ts'

const cue = { rest: 0.3, length: 0, leap: 0.1, rhythm: 0, gap: 240, total: 0.4, idea: 0.2 }
const candidates: BoundaryCandidate[] = [
  { id: 'b4', index: 4, bar: 66, beat: 2, cue },
  { id: 'b11', index: 11, bar: 68, beat: 0.5, cue },
]

describe('adjudicate', () => {
  it('maps verdicts back to note indices, dropping invented candidates', async () => {
    const client = replayClient({
      segment: {
        verdicts: [
          { candidateId: 'b4', boundary: true, cue: 'rest' },
          { candidateId: 'b99', boundary: true, cue: 'leap' },
          { candidateId: 'b11', boundary: false, cue: 'rhythm' },
        ],
      },
    })
    const overrides = await adjudicate(client, candidates, [4, 4])
    expect(overrides).toEqual(new Map([[4, true], [11, false]]))
  })

  it('returns null with no candidates, no fixture, or nothing surviving', async () => {
    expect(await adjudicate(replayClient({}), [], [4, 4])).toBeNull()
    expect(await adjudicate(replayClient({}), candidates, [4, 4])).toBeNull()
    const invented = replayClient({ segment: { verdicts: [{ candidateId: 'b99', boundary: true, cue: 'rest' }] } })
    expect(await adjudicate(invented, candidates, [4, 4])).toBeNull()
  })
})
