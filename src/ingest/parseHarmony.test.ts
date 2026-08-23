import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseHarmonyTrack } from './parseHarmony.ts'

const load = (name: string): string => readFileSync(`fixtures/${name}`, 'utf8')

describe('parseHarmonyTrack', () => {
  it('reads roots and qualities', () => {
    const track = parseHarmonyTrack(load('minimal-tenor.musicxml'))!
    expect(track.provenance).toBe('file')
    expect(track.chords).toHaveLength(2)
    expect(track.chords[0]).toMatchObject({ bar: 1, rootPc: 0, quality: 'major-seventh' })
    expect(track.chords[1]).toMatchObject({ bar: 2, rootPc: 5, quality: 'dominant' })
  })

  it('takes quality from <kind> and ignores a misleading text attribute', () => {
    // Every chord in this fixture carries text="7"; only one is a dominant.
    const track = parseHarmonyTrack(load('kind-text-trap.musicxml'))!
    expect(track.chords.map((c) => c.quality)).toEqual([
      'minor-seventh',
      'major-seventh',
      'half-diminished',
      'dominant',
    ])
  })

  it('resolves flat roots to the right pitch class', () => {
    const track = parseHarmonyTrack(load('two-soloists.musicxml'))!
    // Bar 5 is Bb7.
    const bar5 = track.chords.find((c) => c.bar === 5)!
    expect(bar5.rootPc).toBe(10)
    expect(bar5.quality).toBe('dominant')
  })

  it('returns null when the score has no harmony elements', () => {
    expect(parseHarmonyTrack(load('words-chords-alto.musicxml'))).toBeNull()
  })

  it('gives file-sourced harmony full confidence', () => {
    expect(parseHarmonyTrack(load('minimal-tenor.musicxml'))!.confidence).toBe(1)
  })
})
