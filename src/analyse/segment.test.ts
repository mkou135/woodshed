import { describe, it, expect } from 'vitest'
import { segment } from './segment.ts'
import { TICKS_PER_QUARTER as Q } from '../core/types.ts'
import type { Note } from '../core/types.ts'

/** Build notes back to back from a list of [midi, durationInQuarters, gapAfter]. */
function notesFrom(spec: [number, number, number][]): Note[] {
  const out: Note[] = []
  let onset = 0
  for (const [midi, dur, gap] of spec) {
    const duration = dur * Q
    out.push({
      midi,
      onset,
      duration,
      bar: Math.floor(onset / (4 * Q)) + 1,
      beat: (onset % (4 * Q)) / Q,
    })
    onset += duration + gap * Q
  }
  return out
}

describe('segment', () => {
  it('returns no phrases for no notes', () => {
    expect(segment([])).toEqual([])
  })

  it('keeps notes with no gaps in one phrase', () => {
    const notes = notesFrom([[60, 1, 0], [62, 1, 0], [64, 1, 0], [65, 1, 0]])
    const phrases = segment(notes)
    expect(phrases).toHaveLength(1)
    expect(phrases[0].notes).toHaveLength(4)
    expect(phrases[0].startBar).toBe(1)
  })

  it('splits on a rest of an eighth or longer', () => {
    const notes = notesFrom([[60, 1, 0], [62, 1, 0.5], [64, 1, 0], [65, 1, 0]])
    const phrases = segment(notes)
    expect(phrases.map((p) => p.notes.length)).toEqual([2, 2])
    expect(phrases[0].confidence).toBe(1)
  })

  it('does not split on a gap shorter than an eighth', () => {
    const notes = notesFrom([[60, 1, 0], [62, 1, 0.25], [64, 1, 0]])
    expect(segment(notes)).toHaveLength(1)
  })

  it('does not split on a long note, which the corpus probe showed is wrong', () => {
    // A whole note among quarters must NOT create a boundary.
    const notes = notesFrom([[60, 1, 0], [62, 4, 0], [64, 1, 0], [65, 1, 0]])
    expect(segment(notes)).toHaveLength(1)
  })

  it('forces a boundary before a listed bar and marks it lower confidence', () => {
    // Eight quarter notes, no rests: bars 1 and 2.
    const notes = notesFrom(Array.from({ length: 8 }, () => [60, 1, 0] as [number, number, number]))
    const phrases = segment(notes, [2])
    expect(phrases).toHaveLength(2)
    expect(phrases[0].notes).toHaveLength(4)
    expect(phrases[1].startBar).toBe(2)
    expect(phrases[1].confidence).toBe(0.6)
  })

  it('records the bar range each phrase covers', () => {
    const notes = notesFrom([[60, 1, 0], [62, 1, 0], [64, 1, 0], [65, 1, 0], [67, 1, 0]])
    const [phrase] = segment(notes)
    expect(phrase.startBar).toBe(1)
    expect(phrase.endBar).toBe(2)
  })
})
