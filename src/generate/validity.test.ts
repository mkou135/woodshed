import { describe, it, expect } from 'vitest'
import { isValid } from './validity.ts'
import { throughCycleOfFourths } from './transform.ts'
import { instrumentFromTranspose } from '../core/instrument.ts'
import type { Finding } from '../analyse/index.ts'

const tenor = instrumentFromTranspose(-2, -1)

const finding = (over: Partial<Finding> = {}): Finding => ({
  id: 'f1',
  kind: 'cell',
  name: 'digital pattern 1235',
  spans: [{ startIndex: 0, endIndex: 3, bar: 5, beat: 0 }],
  degrees: ['1', '2', '3', '5'],
  intervals: [2, 2, 3],
  quality: 'major-seventh',
  detectedBy: ['shape'],
  confidence: 0.7,
  ...over,
})

describe('isValid', () => {
  it('passes a degree-preserving transposition', () => {
    const f = finding()
    expect(isValid(throughCycleOfFourths(f, tenor)!, f)).toBe(true)
  })

  it('fails an exercise whose notes no longer spell the finding', () => {
    const f = finding()
    const exercise = throughCycleOfFourths(f, tenor)!
    // Break one note: the cell is no longer 1235 in that bar.
    exercise.bars[0].midis[2] += 1
    expect(isValid(exercise, f)).toBe(false)
  })

  it('fails closed for a finding with no degrees to re-detect', () => {
    const f = finding({ degrees: undefined })
    const exercise = throughCycleOfFourths(finding(), tenor)!
    expect(isValid(exercise, f)).toBe(false)
  })

  it('accepts an exercise in a different octave, since pitches need not match', () => {
    const f = finding()
    const exercise = throughCycleOfFourths(f, tenor)!
    exercise.bars = exercise.bars.map((b) => ({ ...b, midis: b.midis.map((m) => m - 12) }))
    expect(isValid(exercise, f)).toBe(true)
  })
})
