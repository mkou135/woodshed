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
})
