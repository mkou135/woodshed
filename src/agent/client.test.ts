import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { replayClient } from './client.ts'
import { loadFixtures } from './fixtures.ts'

const Shape = z.object({ answer: z.string() }).strict()
const prompt = { document: 'doc', instruction: 'do' }

describe('replayClient', () => {
  it('returns the fixture parsed through the schema', async () => {
    const client = replayClient({ narrate: { answer: 'yes' } })
    expect(await client.complete('narrate', prompt, Shape)).toEqual({ answer: 'yes' })
  })

  it('returns null, not a throw, when the fixture fails the schema', async () => {
    const client = replayClient({ narrate: { answer: 42 } })
    expect(await client.complete('narrate', prompt, Shape)).toBeNull()
  })

  it('returns null for a job with no fixture', async () => {
    const client = replayClient({})
    expect(await client.complete('rank', prompt, Shape)).toBeNull()
  })

  it('answers runTools from the same fixture map', async () => {
    const client = replayClient({ construct: { answer: 'plan' } })
    expect(await client.runTools('construct', prompt, [], Shape)).toEqual({ answer: 'plan' })
  })
})

describe('loadFixtures', () => {
  it('reads each json file under its basename', () => {
    const dir = mkdtempSync(join(tmpdir(), 'agent-fixtures-'))
    writeFileSync(join(dir, 'narrate.json'), JSON.stringify({ answer: 'hi' }))
    writeFileSync(join(dir, 'rank.json'), JSON.stringify({ order: [] }))
    expect(loadFixtures(dir)).toEqual({ narrate: { answer: 'hi' }, rank: { order: [] } })
  })
})
