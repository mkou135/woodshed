import { describe, it, expect } from 'vitest'
import { matchShapes } from './shapes.ts'
import { contextualise } from '../context.ts'
import { TICKS_PER_QUARTER as Q } from '../../core/types.ts'
import type { Chord, Note } from '../../core/types.ts'

const chord = (bar: number, rootPc: number, quality: Chord['quality']): Chord =>
  ({ onset: (bar - 1) * 4 * Q, bar, rootPc, quality, tensions: [] })

const line = (midis: number[]): Note[] =>
  midis.map((midi, i) => ({
    midi, onset: i * Q, duration: Q,
    bar: Math.floor(i / 4) + 1, beat: i % 4,
  }))

describe('matchShapes', () => {
  it('finds 1235 over a major seventh chord', () => {
    const ctx = contextualise(line([60, 62, 64, 67]), [chord(1, 0, 'major-seventh')])
    const hits = matchShapes(ctx)
    expect(hits).toHaveLength(1)
    expect(hits[0]).toMatchObject({ startIndex: 0, length: 4, name: 'digital pattern 1235' })
    expect(hits[0].degrees).toEqual(['1', '2', '3', '5'])
  })

  it('names the same degree string differently over a minor chord', () => {
    // Ab C Eb G over Fm — exactly what Seamus Blake played in bar 73.
    const ctx = contextualise(line([68, 72, 75, 79]), [chord(1, 5, 'minor-seventh')])
    const hits = matchShapes(ctx)
    expect(hits[0].degrees).toEqual(['3', '5', '7', '2'])
    expect(hits[0].name).toBe('major-seventh arpeggio from the b3')
  })

  it('finds the minor cell 1345', () => {
    const ctx = contextualise(line([62, 65, 67, 69]), [chord(1, 2, 'minor-seventh')])
    expect(matchShapes(ctx)[0].name).toBe('minor cell 1345')
  })

  it('matches a cell spanning two bars that carry the same chord', () => {
    // The Blake figure spans bars 73-74, both Fm, written as two <harmony>
    // elements. Comparing chord objects by identity would miss it.
    const chords = [chord(1, 5, 'minor-seventh'), chord(2, 5, 'minor-seventh')]
    const notes = line([68, 72, 75, 79]).map((n, i) =>
      i < 2 ? n : { ...n, onset: n.onset + 4 * Q, bar: 2 })
    expect(matchShapes(contextualise(notes, chords))).toHaveLength(1)
  })

  it('does not match across a chord change', () => {
    const chords = [chord(1, 0, 'major-seventh'), { ...chord(1, 5, 'dominant'), onset: 2 * Q }]
    const ctx = contextualise(line([60, 62, 64, 67]), chords)
    expect(matchShapes(ctx)).toEqual([])
  })

  it('returns nothing for a line that matches no dictionary entry', () => {
    const ctx = contextualise(line([60, 61, 66, 71]), [chord(1, 0, 'major-seventh')])
    expect(matchShapes(ctx)).toEqual([])
  })

  it('returns nothing when no chord is sounding', () => {
    expect(matchShapes(contextualise(line([60, 62, 64, 67]), []))).toEqual([])
  })

  it('finds every occurrence in a longer line', () => {
    const ctx = contextualise(line([60, 62, 64, 67, 60, 62, 64, 67]), [chord(1, 0, 'major-seventh')])
    expect(matchShapes(ctx).map((h) => h.startIndex)).toEqual([0, 4])
  })
})
