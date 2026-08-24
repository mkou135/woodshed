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

describe('findRecurring variants', () => {
  // A cell of four or more intervals that comes back with one interval bent
  // by up to two semitones (a sequence adapted to the changes) or turned
  // upside down is the same idea; the family is reported once, headed by
  // its most common exact form.
  it('groups A, A-prime and A-double-prime with no exact repeat', () => {
    // [1,4,3,4] · [1,4,3,5] · [1,4,2,4]
    const ctx = ctxOf([60, 61, 65, 68, 72, 50, 51, 55, 58, 63, 40, 41, 45, 47, 51])
    const hits = findRecurring(ctx)
    expect(hits).toHaveLength(1)
    expect(hits[0].intervals).toEqual([1, 4, 3, 4])
    expect(hits[0].occurrences).toEqual([0, 5, 10])
    expect(hits[0].variants.map((v) => v.relation)).toEqual(['near', 'near'])
  })

  it('takes an inversion as a variant', () => {
    // [1,4,3,4] then [-1,-4,-3,-4]
    const ctx = ctxOf([60, 61, 65, 68, 72, 84, 83, 79, 76, 72])
    const hits = findRecurring(ctx)
    expect(hits).toHaveLength(1)
    expect(hits[0].occurrences).toEqual([0, 5])
    expect(hits[0].variants[0].relation).toBe('inversion')
  })

  it('does not relate cells that differ in two intervals', () => {
    // [1,4,3,4] · [1,4,2,5]
    const ctx = ctxOf([60, 61, 65, 68, 72, 50, 51, 55, 57, 62])
    expect(findRecurring(ctx)).toEqual([])
  })

  it('does not relate cells that differ in contour', () => {
    // [1,4,3,4] · [1,4,-1,4]: a bent interval keeps its direction
    const ctx = ctxOf([60, 61, 65, 68, 72, 50, 51, 55, 54, 58])
    expect(findRecurring(ctx)).toEqual([])
  })

  it('never bends a three-interval cell', () => {
    // [1,4,3] · [1,4,5]
    const ctx = ctxOf([60, 61, 65, 68, 50, 51, 55, 60])
    expect(findRecurring(ctx)).toEqual([])
  })

  it('heads the family with the exact form that occurs most', () => {
    // [1,4,3,5] once, then [1,4,3,4] twice
    const ctx = ctxOf([60, 61, 65, 68, 73, 45, 46, 50, 53, 57, 40, 41, 45, 48, 52])
    const hits = findRecurring(ctx)
    expect(hits).toHaveLength(1)
    expect(hits[0].intervals).toEqual([1, 4, 3, 4])
    expect(hits[0].occurrences).toEqual([0, 5, 10])
  })
})
