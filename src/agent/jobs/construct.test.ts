import { describe, expect, it } from 'vitest'
import type { PracticeUnit } from '../../practice/unit.ts'
import { replayClient } from '../client.ts'
import { construct, type ConstructContext } from './construct.ts'

const units = [
  { id: 'u1', header: 'h1', steps: [{ kind: 'loop' }, { kind: 'displace' }] },
  { id: 'u2', header: 'h2', steps: [{ kind: 'loop' }, { kind: 'through' }] },
] as unknown as PracticeUnit[]
const ctx = { units, analysis: {}, score: {} } as unknown as ConstructContext

describe('construct', () => {
  it('keeps only engine-generated steps for known units', async () => {
    const client = replayClient({
      construct: {
        units: [
          { unitId: 'u1', steps: ['loop', 'through'] },
          { unitId: 'u9', steps: ['loop'] },
        ],
        interleave: 'alternate short blocks',
      },
    })
    const plan = await construct(client, ctx, 'doc')
    expect(plan?.units).toEqual([{ unitId: 'u1', steps: ['loop'] }])
    expect(plan?.interleave).toBe('alternate short blocks')
  })

  it('degrades to null when nothing survives', async () => {
    const client = replayClient({
      construct: { units: [{ unitId: 'u1', steps: ['through'] }], interleave: 'x' },
    })
    expect(await construct(client, ctx, 'doc')).toBeNull()
    expect(await construct(replayClient({}), ctx, 'doc')).toBeNull()
  })
})
