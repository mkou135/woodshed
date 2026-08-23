import { describe, it, expect } from 'vitest'
import { findRecurring } from './recurring.ts'
import { contextualise } from '../context.ts'
import { TICKS_PER_QUARTER as Q } from '../../core/types.ts'
import type { Chord, Note } from '../../core/types.ts'

const chord = (rootPc: number): Chord =>
  ({ onset: 0, bar: 1, rootPc, quality: 'minor-seventh', tensions: [] })

const line = (midis: number[]): Note[] =>
  midis.map((midi, i) => ({
    midi, onset: i * (Q / 2), duration: Q / 2,
    bar: Math.floor(i / 8) + 1, beat: (i % 8) / 2,
  }))

const ctxOf = (midis: number[]) => contextualise(line(midis), [chord(5)])

describe('findRecurring', () => {
  it('finds a cell that occurs twice, transposed', () => {
    // [+1,+4,+3,+4] twice — the figure Seamus Blake played in bars 73 and 77.
    const ctx = ctxOf([67, 68, 72, 75, 79, 60, 62, 63, 67, 70, 74])
    const hits = findRecurring(ctx)
    const cell = hits.find((h) => h.intervals.join(',') === '1,4,3,4')
    expect(cell).toBeDefined()
    expect(cell!.occurrences).toHaveLength(2)
  })

  it('discards a chromatic run as trivia', () => {
    const ctx = ctxOf([60, 59, 58, 57, 56, 70, 69, 68, 67, 66])
    expect(findRecurring(ctx)).toEqual([])
  })

  it('discards a diatonic scale run as trivia', () => {
    const ctx = ctxOf([60, 62, 64, 65, 67, 72, 74, 76, 77, 79])
    expect(findRecurring(ctx)).toEqual([])
  })

  it('ignores a cell that occurs only once', () => {
    const ctx = ctxOf([60, 64, 67, 72, 61, 66, 60, 55])
    expect(findRecurring(ctx)).toEqual([])
  })

  it('prefers the longer cell when a shorter one only occurs inside it', () => {
    const ctx = ctxOf([60, 61, 65, 68, 72, 50, 51, 55, 58, 62])
    const lengths = findRecurring(ctx).map((h) => h.intervals.length)
    expect(Math.max(...lengths)).toBe(4)
    expect(findRecurring(ctx)).toHaveLength(1)
  })

  it('respects a raised minimum count', () => {
    const ctx = ctxOf([60, 61, 65, 68, 50, 51, 55, 58])
    expect(findRecurring(ctx, { minCount: 3 })).toEqual([])
  })

  it('returns nothing for a line shorter than the minimum cell', () => {
    expect(findRecurring(ctxOf([60, 62]))).toEqual([])
  })
})
