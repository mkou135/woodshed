import { describe, it, expect } from 'vitest'
import { matchStarts, prf } from './eval.ts'

const p = (bar: number, beat: number) => ({ bar, beat })

describe('matchStarts', () => {
  it('greedy one-to-one within tolerance', () => {
    const r = matchStarts([p(4, 1), p(8, 3)], [p(4, 1.5), p(12, 1)], 4, 0.5)
    expect(r.matched).toEqual([[p(4, 1), p(4, 1.5)]])
    expect(r.missed).toEqual([p(8, 3)])
    expect(r.falseStarts).toEqual([p(12, 1)])
  })
  it('an engine mark matches at most one owner mark', () => {
    const r = matchStarts([p(4, 1), p(4, 1.5)], [p(4, 1)], 4, 0.5)
    expect(r.matched.length).toBe(1)
    expect(r.missed.length).toBe(1)
  })
})

describe('prf', () => {
  it('computes precision, recall, f1', () => {
    const { precision, recall, f1 } = prf(3, 1, 2)
    expect(precision).toBeCloseTo(0.6)
    expect(recall).toBeCloseTo(0.75)
    expect(f1).toBeCloseTo(2 * 0.6 * 0.75 / 1.35)
  })
  it('zero everywhere yields zeros, not NaN', () => {
    expect(prf(0, 0, 0)).toEqual({ precision: 0, recall: 0, f1: 0 })
  })
})
