import { describe, it, expect } from 'vitest'
import { writtenBar, barLabel, barRange } from './bars.ts'

describe('writtenBar', () => {
  // St Thomas: written 17-32 repeats, so played 33-48 is the second pass and played 49 is written 33.
  const score = { repeats: [{ from: 17, to: 32 }] }

  it('is identity before the repeat and without repeats', () => {
    expect(writtenBar(score, 16)).toEqual({ bar: 16, pass: 1 })
    expect(writtenBar(score, 32)).toEqual({ bar: 32, pass: 1 })
    expect(writtenBar({}, 49)).toEqual({ bar: 49, pass: 1 })
  })

  it('maps the second pass back onto the printed bars', () => {
    expect(writtenBar(score, 33)).toEqual({ bar: 17, pass: 2 })
    expect(writtenBar(score, 48)).toEqual({ bar: 32, pass: 2 })
  })

  it('shifts everything after the repeat down by its length', () => {
    expect(writtenBar(score, 49)).toEqual({ bar: 33, pass: 1 })
    expect(writtenBar(score, 273)).toEqual({ bar: 257, pass: 1 })
  })

  it('handles two repeats', () => {
    const two = { repeats: [{ from: 1, to: 4 }, { from: 9, to: 10 }] }
    // played: 1-4, 5-8 (2nd), 9-12 = written 5-8, 13-14 = written 9-10, 15-16 (2nd), 17 = written 11
    expect(writtenBar(two, 6)).toEqual({ bar: 2, pass: 2 })
    expect(writtenBar(two, 13)).toEqual({ bar: 9, pass: 1 })
    expect(writtenBar(two, 16)).toEqual({ bar: 10, pass: 2 })
    expect(writtenBar(two, 17)).toEqual({ bar: 11, pass: 1 })
  })

  it('labels', () => {
    expect(barLabel(score, 40)).toBe('24 (2nd time)')
    expect(barRange(score, 65, 72)).toBe('bars 49–56')
    expect(barRange(score, 65, 65, true)).toBe('Bar 49')
  })
})
