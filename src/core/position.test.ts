import { describe, it, expect } from 'vitest'
import { parsePosition, formatPosition, positionsClose } from './position.ts'

describe('position codec', () => {
  it('round-trips whole, half and dotted beats', () => {
    for (const s of ['4.1', '4.4½', '12.2.25']) {
      expect(formatPosition(parsePosition(s))).toBe(s)
    }
  })
  it('parses ½ and .5 alike', () => {
    expect(parsePosition('4.4½')).toEqual({ bar: 4, beat: 4.5 })
    expect(parsePosition('4.4.5')).toEqual({ bar: 4, beat: 4.5 })
  })
  it('bare bar means beat 1', () => {
    expect(parsePosition('7')).toEqual({ bar: 7, beat: 1 })
  })
  it('positionsClose works across a bar line', () => {
    expect(positionsClose({ bar: 4, beat: 4.5 }, { bar: 5, beat: 1 }, 4, 0.5)).toBe(true)
    expect(positionsClose({ bar: 4, beat: 4 }, { bar: 5, beat: 1 }, 4, 0.5)).toBe(false)
  })
  it('round-trips fractions without float noise', () => {
    expect(formatPosition({ bar: 4, beat: 2.1 })).toBe('4.2.1')
  })
  it('triplet beats quantise to 3 decimal places', () => {
    expect(parsePosition(formatPosition({ bar: 4, beat: 1 + 1 / 3 }))).toEqual({ bar: 4, beat: 1.333 })
  })
  it('does not smear digits when the whole beat is multi-digit', () => {
    expect(formatPosition({ bar: 4, beat: 10.25 })).toBe('4.10.25')
    expect(parsePosition(formatPosition({ bar: 4, beat: 10.25 }))).toEqual({ bar: 4, beat: 10.25 })
  })
})
