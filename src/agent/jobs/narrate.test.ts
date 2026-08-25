import { describe, expect, it } from 'vitest'
import { replayClient } from '../client.ts'
import { narrate } from './narrate.ts'

const ids = { findings: new Set(['f1']), units: new Set(['u1']) }
const doc = 'document'

describe('narrate', () => {
  it('passes a valid verdict through', async () => {
    const client = replayClient({
      narrate: {
        overview: ['One.', 'Two — now play it with the record.'],
        findingNames: [{ id: 'f1', name: 'relative-major maj7 arpeggio off the b3' }],
        lookFors: [{ unitId: 'u1', text: 'Bars 76-77.' }],
      },
    })
    const v = await narrate(client, doc, ids)
    expect(v?.findingNames).toHaveLength(1)
  })

  it('drops entries whose ids the engine never issued, keeping the rest', async () => {
    const client = replayClient({
      narrate: {
        overview: ['One.', 'Two.'],
        findingNames: [
          { id: 'f1', name: 'kept' },
          { id: 'f99', name: 'invented' },
        ],
        lookFors: [{ unitId: 'u42', text: 'invented unit' }],
      },
    })
    const v = await narrate(client, doc, ids)
    expect(v?.findingNames.map((f) => f.id)).toEqual(['f1'])
    expect(v?.lookFors).toEqual([])
  })

  it('collapses a long overview to two paragraphs', async () => {
    const client = replayClient({
      narrate: { overview: ['One.', 'Two.', 'Three.'], findingNames: [], lookFors: [] },
    })
    const v = await narrate(client, doc, ids)
    expect(v?.overview).toEqual(['One.', 'Two. Three.'])
  })

  it('degrades to null with no fixture', async () => {
    expect(await narrate(replayClient({}), doc, ids)).toBeNull()
  })
})
