import { describe, it, expect } from 'vitest'
import { chordAt, contextualise } from './context.ts'
import { TICKS_PER_QUARTER as Q } from '../core/types.ts'
import type { Chord, Note } from '../core/types.ts'

const chord = (bar: number, rootPc: number, quality: Chord['quality']): Chord =>
  ({ onset: (bar - 1) * 4 * Q, bar, rootPc, quality, tensions: [] })

const note = (midi: number, quarters: number): Note => ({
  midi,
  onset: quarters * Q,
  duration: Q,
  bar: Math.floor(quarters / 4) + 1,
  beat: quarters % 4,
})

describe('chordAt', () => {
  const chords = [chord(1, 0, 'major-seventh'), chord(2, 5, 'dominant')]

  it('returns the chord sounding at an onset', () => {
    expect(chordAt(chords, 0)?.rootPc).toBe(0)
    expect(chordAt(chords, 3 * Q)?.rootPc).toBe(0)
    expect(chordAt(chords, 4 * Q)?.rootPc).toBe(5)
    expect(chordAt(chords, 100 * Q)?.rootPc).toBe(5)
  })

  it('returns null before the first chord', () => {
    expect(chordAt([chord(2, 0, 'major')], 0)).toBeNull()
  })

  it('returns null when there are no chords', () => {
    expect(chordAt([], 0)).toBeNull()
  })
})

describe('contextualise', () => {
  it('labels degrees against the sounding chord', () => {
    const chords = [chord(1, 0, 'major-seventh')]
    const ctx = contextualise([note(60, 0), note(62, 1), note(64, 2), note(67, 3)], chords)
    expect(ctx.map((c) => c.degree)).toEqual(['1', '2', '3', '5'])
  })

  it('relabels the same pitch when the chord changes', () => {
    const chords = [chord(1, 0, 'dominant'), chord(2, 0, 'minor-seventh')]
    const ctx = contextualise([note(63, 0), note(63, 4)], chords)
    expect(ctx[0].degree).toBe('#9')
    expect(ctx[1].degree).toBe('3')
  })

  it('does not call the flat seventh of a dominant chromatic', () => {
    // This is the measurement trap the segmentation probe uncovered.
    const ctx = contextualise([note(70, 0)], [chord(1, 0, 'dominant')])
    expect(ctx[0].chordTone).toBe(true)
    expect(ctx[0].chromatic).toBe(false)
  })

  it('does call an altered non-chord-tone chromatic', () => {
    const ctx = contextualise([note(61, 0)], [chord(1, 0, 'dominant')])
    expect(ctx[0].chromatic).toBe(true)
  })

  it('does not call a plain ninth chromatic', () => {
    const ctx = contextualise([note(62, 0)], [chord(1, 0, 'dominant')])
    expect(ctx[0].chromatic).toBe(false)
  })

  it('handles notes with no chord sounding', () => {
    const ctx = contextualise([note(60, 0)], [])
    expect(ctx[0]).toMatchObject({ chord: null, degree: null, chordTone: false, chromatic: false })
  })
})
