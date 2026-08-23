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

  it('splits on a rest of a quarter or longer', () => {
    const q = [60, 0.5, 0] as [number, number, number]
    const notes = notesFrom([q, q, q, [62, 0.5, 1], q, q, q, [65, 0.5, 0]])
    const phrases = segment(notes)
    expect(phrases.map((p) => p.notes.length)).toEqual([4, 4])
    expect(phrases[0].confidence).toBe(1)
    expect(phrases[1].confidence).toBeGreaterThanOrEqual(0.6)
  })

  it('treats an eighth rest among eighths as a breath, not a phrase end', () => {
    // Blake, bar 66: G Ab E [eighth rest] G G F G Ab A. One line.
    const e = (m: number, gap = 0): [number, number, number] => [m, 0.5, gap]
    const notes = notesFrom([e(67), e(68), e(64, 0.5), e(67), e(67), e(65), e(67), e(68), e(69)])
    expect(segment(notes)).toHaveLength(1)
  })

  it('does not split on a gap shorter than a sixteenth', () => {
    const notes = notesFrom([[60, 1, 0], [62, 1, 0.2], [64, 1, 0], [65, 1, 0]])
    expect(segment(notes)).toHaveLength(1)
  })

  it('does not split on a note twice the local norm, which the corpus probe showed is wrong', () => {
    // A quarter among eighths is not an arrival.
    const e = (m: number): [number, number, number] => [m, 0.5, 0]
    const notes = notesFrom([e(60), e(62), [64, 1, 0], e(65), e(67), e(69)])
    expect(segment(notes)).toHaveLength(1)
  })

  it('splits after a note held four times the local norm', () => {
    // A half note among eighths, then a new line with no rest: an arrival.
    const e = (m: number): [number, number, number] => [m, 0.5, 0]
    const notes = notesFrom([e(60), e(62), e(64), [67, 2, 0], e(65), e(67), e(69), e(70)])
    expect(segment(notes).map((p) => p.notes.length)).toEqual([4, 4])
  })

  it('never leaves a phrase of fewer than three notes', () => {
    // Two notes between quarter rests get absorbed into a neighbour.
    const e = (m: number, gap = 0): [number, number, number] => [m, 0.5, gap]
    const notes = notesFrom([e(60), e(62), e(64), e(65, 1), e(67), e(69, 1), e(60), e(62), e(64), e(65)])
    for (const p of segment(notes)) expect(p.notes.length).toBeGreaterThanOrEqual(3)
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
