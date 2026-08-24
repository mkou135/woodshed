import { describe, it, expect } from 'vitest'
import { corpusShare, patternKey } from './corpus.ts'
import { CORPUS_FREQUENCY } from '../data/corpusFrequency.ts'
import { TICKS_PER_QUARTER as Q } from '../core/types.ts'
import type { Note } from '../core/types.ts'

const midis = (ms: number[]): Note[] =>
  ms.map((midi, i) => ({ midi, onset: i * Q, duration: Q, bar: 1, beat: i }))

describe('patternKey', () => {
  it('keeps direction and clips leaps to an octave', () => {
    expect(patternKey(midis([60, 62, 61, 80]))).toBe('2,-1,12')
  })
})

describe('corpusShare', () => {
  it('calls a bebop scale fragment mostly language', () => {
    // C B Bb A: '-1,-1,-1' is in most WJD solos.
    expect(corpusShare(midis([72, 71, 70, 69]))).toBe(CORPUS_FREQUENCY['-1,-1,-1'])
    expect(corpusShare(midis([72, 71, 70, 69]))).toBeGreaterThan(0.6)
  })

  it('gives a figure the corpus never plays no share', () => {
    expect(corpusShare(midis([60, 71, 61, 70]))).toBe(0)
  })

  it('averages over notes, each taking its best-covering pattern', () => {
    // Three notes cannot form a pattern at all.
    expect(corpusShare(midis([60, 62, 64]))).toBe(0)
    // Notes 0-3 form '-1,-1,-1'; the last note is covered only by the rarer '-1,-1,-12'.
    const tail = CORPUS_FREQUENCY['-1,-1,-12'] ?? 0
    const five = corpusShare(midis([72, 71, 70, 69, 50]))
    expect(five).toBeCloseTo((4 * Math.max(CORPUS_FREQUENCY['-1,-1,-1'], tail) + tail) / 5, 6)
  })

  it('leaves exempt notes out of the share', () => {
    expect(corpusShare(midis([72, 71, 70, 69]), new Set([0, 1, 2, 3]))).toBe(0)
  })
})
