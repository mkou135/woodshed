import { describe, expect, it } from 'vitest'
import { replayClient } from '../client.ts'
import { rank } from './rank.ts'

const unitIds = new Set(['u1', 'u2'])

describe('rank', () => {
  it('passes a valid ordering through, dropping unknown units', async () => {
    const client = replayClient({
      rank: {
        order: [
          { unitId: 'u2', keep: true, reason: 'recurs three times' },
          { unitId: 'u9', keep: true, reason: 'invented' },
          { unitId: 'u1', keep: false, reason: 'stock run' },
        ],
      },
    })
    const v = await rank(client, 'doc', unitIds)
    expect(v?.order.map((o) => o.unitId)).toEqual(['u2', 'u1'])
  })

  it('degrades to null when nothing survives or nothing is kept', async () => {
    const none = replayClient({ rank: { order: [{ unitId: 'u1', keep: false, reason: 'x' }] } })
    expect(await rank(none, 'doc', unitIds)).toBeNull()
    expect(await rank(replayClient({}), 'doc', unitIds)).toBeNull()
  })
})
