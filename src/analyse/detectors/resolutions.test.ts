import { describe, it, expect } from 'vitest'
import { detectResolutions } from './resolutions.ts'
import { contextualise } from '../context.ts'
import { TICKS_PER_QUARTER as Q } from '../../core/types.ts'
import type { Chord, Note } from '../../core/types.ts'

const chord = (bar: number, rootPc: number, quality: Chord['quality'], beat = 0): Chord =>
  ({ onset: (bar - 1) * 4 * Q + beat * Q, bar, rootPc, quality, tensions: [] })

const line = (midis: number[]): Note[] =>
  midis.map((midi, i) => ({
    midi, onset: i * Q, duration: Q,
    bar: Math.floor(i / 4) + 1, beat: i % 4,
  }))

/** The two chords a resolution needs: the second arriving on the last note. */
const changeAt = (rootA: number, qualityA: Chord['quality'], rootB: number, qualityB: Chord['quality']): Chord[] =>
  [chord(1, rootA, qualityA), chord(1, rootB, qualityB, 3)]

describe('detectResolutions', () => {
  it('finds the b7 of a ii-7 falling to the 3 of the V7', () => {
    // D-7 | G7 : C5 falls to B4. The minor family labels that C the '7'.
    const ctx = contextualise(line([62, 65, 72, 71]), changeAt(2, 'minor-seventh', 7, 'dominant'))
    const hits = detectResolutions(ctx)
    expect(hits).toHaveLength(1)
    expect(hits[0]).toMatchObject({ index: 2, name: 'ii–V 7-3 resolution', fall: 1 })
    expect(hits[0].degrees).toEqual(['7', '3'])
  })

  it('finds a V7 resolving to I', () => {
    // G7 | Cmaj7 : F5 falls to E5.
    const ctx = contextualise(line([67, 71, 77, 76]), changeAt(7, 'dominant', 0, 'major-seventh'))
    expect(detectResolutions(ctx)[0]).toMatchObject({ name: 'V–I 7-3 resolution', fall: 1 })
  })

  it('finds a V7 resolving to a minor i, where the fall is a whole step', () => {
    // G7 | C-7 : F5 falls to Eb5. Both degrees read 'b7' then '3'; only the
    // MIDI numbers say this one is two semitones.
    const ctx = contextualise(line([67, 71, 77, 75]), changeAt(7, 'dominant', 0, 'minor-seventh'))
    expect(detectResolutions(ctx)[0]).toMatchObject({ name: 'V–i 7-3 resolution', fall: 2 })
  })

  it('names a dominant resolving to a dominant as the V of V', () => {
    // D7 | G7 : C5 falls to B4.
    const ctx = contextualise(line([62, 66, 72, 71]), changeAt(2, 'dominant', 7, 'dominant'))
    expect(detectResolutions(ctx)[0].name).toBe('V-of-V 7-3 resolution')
  })

  it('ignores a chord change that is not up a fourth', () => {
    // D-7 | F7 : the same two notes, a root move of 3.
    const ctx = contextualise(line([62, 65, 72, 71]), changeAt(2, 'minor-seventh', 5, 'dominant'))
    expect(detectResolutions(ctx)).toEqual([])
  })

  it('ignores a b7 that falls to something other than the 3', () => {
    // G7 | Cmaj7 : F5 falls to D5, the 9.
    const ctx = contextualise(line([67, 71, 77, 74]), changeAt(7, 'dominant', 0, 'major-seventh'))
    expect(detectResolutions(ctx)).toEqual([])
  })

  it('ignores a leap from the b7 to the 3', () => {
    // G7 | Cmaj7 : F5 down to E4, three octaves of nothing to do with each other.
    const ctx = contextualise(line([67, 71, 77, 64]), changeAt(7, 'dominant', 0, 'major-seventh'))
    expect(detectResolutions(ctx)).toEqual([])
  })

  it('does not cross an idea boundary when the player breathed', () => {
    const notes = line([62, 65, 72, 71])
    notes[3] = { ...notes[3], onset: notes[3].onset + Q }
    const ctx = contextualise(notes, changeAt(2, 'minor-seventh', 7, 'dominant'))
    ctx[3].idea = 1
    expect(detectResolutions(ctx)).toEqual([])
  })

  it('crosses an idea boundary when the two notes are contiguous', () => {
    // The Tenor Madness case: the 7 ends and the 3 begins in the same instant,
    // and the boundary between them came from the chorus line, not a rest.
    const ctx = contextualise(line([62, 65, 72, 71]), changeAt(2, 'minor-seventh', 7, 'dominant'))
    ctx[3].idea = 1
    expect(detectResolutions(ctx)).toHaveLength(1)
  })
})
