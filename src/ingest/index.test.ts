import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { ingest } from './index.ts'

const load = (name: string): Uint8Array =>
  new Uint8Array(readFileSync(`fixtures/${name}`))

describe('ingest', () => {
  it('produces a score with a harmony-sourced chord track', () => {
    const score = ingest(load('minimal-tenor.musicxml'))
    expect(score.notes).toHaveLength(8)
    expect(score.chordTracks).toHaveLength(1)
    expect(score.chordTracks[0].confidence).toBe(1)
  })

  it('falls back to staff-text chords when there is no harmony element', () => {
    const score = ingest(load('words-chords-alto.musicxml'))
    expect(score.chordTracks).toHaveLength(1)
    expect(score.chordTracks[0].confidence).toBeLessThan(1)
    expect(score.chordTracks[0].chords[0]).toMatchObject({ rootPc: 2, quality: 'minor' })
  })

  it('reads a single harmony chord track from a minimal score', () => {
    const score = ingest(load('altissimo-tenor.musicxml'))
    expect(score.chordTracks).toHaveLength(1)
    expect(score.chordTracks[0].chords[0]).toMatchObject({ quality: 'minor-seventh' })
  })

  it('preserves marks that are not chords', () => {
    const score = ingest(load('transcriber-notes.musicxml'))
    expect(score.marks.map((m) => m.text)).toContain('sloppy')
  })
})
