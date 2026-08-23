import { describe, it, expect } from 'vitest'
import { intervalsOf, pitchClass, degreeOf, isChordTone } from './pitch.ts'
import type { Chord } from './types.ts'

const chord = (rootPc: number, quality: Chord['quality']): Chord =>
  ({ onset: 0, bar: 1, rootPc, quality, tensions: [] })

describe('intervalsOf', () => {
  it('returns successive semitone differences', () => {
    expect(intervalsOf([60, 62, 64, 67])).toEqual([2, 2, 3])
  })

  it('returns an empty array for fewer than two notes', () => {
    expect(intervalsOf([60])).toEqual([])
  })

  it('is transposition invariant', () => {
    expect(intervalsOf([60, 62, 64, 67])).toEqual(intervalsOf([63, 65, 67, 70]))
  })
})

describe('pitchClass', () => {
  it('wraps to 0-11', () => {
    expect(pitchClass(60)).toBe(0)
    expect(pitchClass(73)).toBe(1)
  })
})

describe('degreeOf', () => {
  it('labels the 1235 cell over a major seventh chord', () => {
    const c = chord(0, 'major-seventh')
    expect([60, 62, 64, 67].map((m) => degreeOf(m, c))).toEqual(['1', '2', '3', '5'])
  })

  it('uses minor numbering over a minor chord, so the minor third is "3"', () => {
    const c = chord(0, 'minor-seventh')
    expect(degreeOf(63, c)).toBe('3')
    expect(degreeOf(70, c)).toBe('7')
  })

  it('labels the same pitch differently by chord quality', () => {
    // Eb over C: the #9 of a dominant, but the b3 of a minor chord.
    expect(degreeOf(63, chord(0, 'dominant'))).toBe('#9')
    expect(degreeOf(63, chord(0, 'minor-seventh'))).toBe('3')
  })

  it('names chromatic degrees explicitly over a dominant', () => {
    const c = chord(0, 'dominant')
    expect(degreeOf(61, c)).toBe('b9')
    expect(degreeOf(66, c)).toBe('#11')
    expect(degreeOf(68, c)).toBe('b13')
  })
})

describe('isChordTone', () => {
  it('recognises the third and seventh of a dominant', () => {
    const c = chord(0, 'dominant')
    expect(isChordTone(64, c)).toBe(true)
    expect(isChordTone(70, c)).toBe(true)
    expect(isChordTone(62, c)).toBe(false)
  })

  it('recognises the flat five of a half-diminished chord', () => {
    expect(isChordTone(66, chord(0, 'half-diminished'))).toBe(true)
  })
})
