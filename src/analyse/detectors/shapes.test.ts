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

  it('finds a bare major triad in any order as a 3-note cell', () => {
    const ctx = contextualise(line([67, 64, 60]), [chord(1, 0, 'major')])
    const hits = matchShapes(ctx)
    expect(hits).toHaveLength(1)
    expect(hits[0]).toMatchObject({ startIndex: 0, length: 3, name: 'major triad 5-3-1' })
    expect(hits[0].degrees).toEqual(['5', '3', '1'])
    expect(hits[0].intervals).toEqual([-3, -4])
  })

  it('names a minor triad over a minor chord', () => {
    const ctx = contextualise(line([62, 65, 69]), [chord(1, 2, 'minor-seventh')])
    expect(matchShapes(ctx)[0].name).toBe('minor triad 1-3-5')
  })

  it('does not report the triad inside a four-note arpeggio hit', () => {
    const ctx = contextualise(line([60, 64, 67, 71]), [chord(1, 0, 'major-seventh')])
    const hits = matchShapes(ctx)
    expect(hits.map((h) => h.name)).toEqual(['major-seventh arpeggio'])
  })

  it('reports a triad that follows a longer hit without sharing a note', () => {
    // 1 3 5 7 then 5 3 1: the arpeggio covers notes 0-3, the descending triad 4-6.
    const ctx = contextualise(line([60, 64, 67, 71, 67, 64, 60]), [chord(1, 0, 'major-seventh')])
    expect(matchShapes(ctx).map((h) => h.name)).toEqual(['major-seventh arpeggio', 'major triad 5-3-1'])
  })

  it('returns nothing when no chord is sounding', () => {
    expect(matchShapes(contextualise(line([60, 62, 64, 67]), []))).toEqual([])
  })

  it('finds every occurrence in a longer line', () => {
    const ctx = contextualise(line([60, 62, 64, 67, 60, 62, 64, 67]), [chord(1, 0, 'major-seventh')])
    expect(matchShapes(ctx).map((h) => h.startIndex)).toEqual([0, 4])
  })
})

describe('matchShapes: quality, not just family', () => {
  it('carries the intervals as played, so a generated drill keeps the contour', () => {
    // Ab C Eb G ascending. Rebuilding from degrees mod 12 would drop the G an
    // octave; the exercise then ends with a leap the player never made.
    const ctx = contextualise(line([68, 72, 75, 79]), [chord(1, 5, 'minor-seventh')])
    expect(matchShapes(ctx)[0].intervals).toEqual([4, 3, 4])
  })

  it('does not call a major-seventh arpeggio vocabulary over a dominant', () => {
    // D F# A C# over D7: the C# clashes with the chord's C. Keying the
    // dictionary by family alone matched this and drilled it through every
    // dominant in the tune.
    const ctx = contextualise(line([62, 66, 69, 73]), [chord(1, 2, 'dominant')])
    expect(matchShapes(ctx).map((h) => h.name)).toEqual(['major triad 1-3-5'])
  })

  it('names the dominant b9 cells', () => {
    // Over G7: B Ab G (3 b9 1), G Ab F (1 b9 b7), F Bb Ab G (b7 #9 b9 1).
    const g7 = [chord(1, 7, 'dominant')]
    expect(matchShapes(contextualise(line([71, 68, 67]), g7))[0].name).toBe('dominant b9 cell 3-b9-1')
    expect(matchShapes(contextualise(line([67, 68, 65]), g7))[0].name).toBe('dominant b9 cell 1-b9-b7')
    const four = matchShapes(contextualise(line([65, 70, 68, 67]), g7))
    expect(four.map((h) => h.name)).toEqual(['dominant b9 cell b7-#9-b9-1'])
  })

  it('does not name b9 cells over a major chord', () => {
    expect(matchShapes(contextualise(line([71, 68, 67]), [chord(1, 7, 'major-seventh')]))).toEqual([])
  })

  it('names the dominant seventh arpeggio over a dominant', () => {
    const ctx = contextualise(line([62, 66, 69, 72]), [chord(1, 2, 'dominant')])
    expect(matchShapes(ctx)[0].name).toBe('dominant seventh arpeggio')
  })

  it('does not put the maj7-from-the-b3 over a half-diminished chord', () => {
    // Its 5 is not a chord tone there.
    const ctx = contextualise(line([63, 67, 70, 74]), [chord(1, 0, 'half-diminished')])
    expect(matchShapes(ctx).map((h) => h.name)).not.toContain('major-seventh arpeggio from the b3')
  })
})
