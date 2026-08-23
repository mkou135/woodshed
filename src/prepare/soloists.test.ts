import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { ingest } from '../ingest/index.ts'
import { detectSoloists, soloistAdjustments } from './soloists.ts'
import { instrumentFromTranspose } from '../core/instrument.ts'
import type { Score } from '../core/types.ts'

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

describe('detectSoloists — capitalised performance directions', () => {
  const scoreWith = (texts: [number, string][]): Score => ({
    notes: [],
    chordTracks: [],
    instrument: instrumentFromTranspose(-9, 0),
    timeSig: [4, 4],
    marks: texts.map(([bar, text]) => ({ bar, kind: 'words' as const, text })),
    barCount: 64,
  })

  it('does not treat a capitalised multi-word direction as a soloist', () => {
    // Verbatim from a real Autumn Leaves transcription, which previously
    // reported four soloists and blocked a single-soloist file.
    const score = scoreWith([
      [1, 'Miles'],
      [2, 'Cannonball Solo'],
      [14, 'Lay Back'],
      [34, 'On Downbeat'],
      [35, 'Up Down'],
    ])
    expect(detectSoloists(score).map((r) => r.name)).toEqual(['Miles', 'Cannonball Solo'])
  })

  it('accepts a multi-word phrase that names itself as a solo', () => {
    const score = scoreWith([[63, 'Solo Seamus Blake']])
    const named = detectSoloists(score).filter((r) => r.name !== 'unknown')
    expect(named.map((r) => r.name)).toEqual(['Solo Seamus Blake'])
  })

  it('still accepts single-word attributions', () => {
    const score = scoreWith([[1, 'Trane'], [85, 'Sonny']])
    expect(detectSoloists(score).map((r) => r.name)).toEqual(['Trane', 'Sonny'])
  })
})
