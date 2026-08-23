import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { ingest } from '../ingest/index.ts'
import { detectSoloists, soloistAdjustments } from './soloists.ts'

const load = (name: string) => ingest(new Uint8Array(readFileSync(`fixtures/${name}`)))

describe('detectSoloists', () => {
  it('splits a score with two named soloists at the second name', () => {
    const regions = detectSoloists(load('two-soloists.musicxml'))
    expect(regions).toEqual([
      { name: 'Trane', startBar: 1, endBar: 4 },
      { name: 'Sonny', startBar: 5, endBar: 8 },
    ])
  })

  it('returns a single unnamed region when no attribution is present', () => {
    const regions = detectSoloists(load('minimal-tenor.musicxml'))
    expect(regions).toHaveLength(1)
    expect(regions[0]).toMatchObject({ startBar: 1, endBar: 2 })
  })

  it('does not mistake performance directions for soloist names', () => {
    const regions = detectSoloists(load('transcriber-notes.musicxml'))
    expect(regions).toHaveLength(1)
  })
})

describe('soloistAdjustments', () => {
  it('raises a blocking adjustment when more than one soloist is present', () => {
    const regions = detectSoloists(load('two-soloists.musicxml'))
    const adjustments = soloistAdjustments(regions)
    expect(adjustments).toHaveLength(1)
    expect(adjustments[0].kind).toBe('soloist-boundary')
    expect(adjustments[0].severity).toBe('blocking')
  })

  it('raises nothing for a single soloist', () => {
    expect(soloistAdjustments([{ name: 'unknown', startBar: 1, endBar: 8 }])).toEqual([])
  })
})
