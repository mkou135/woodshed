import { describe, it, expect } from 'vitest'
import { excerpt } from './loop.ts'
import { TICKS_PER_QUARTER as Q } from '../../core/types.ts'
import type { Chord, Note } from '../../core/types.ts'

const BAR = 4 * Q

/**
 * A hand-written four-note line with an eighth-note pickup: the first note
 * sounds before the chord it belongs to. `throughStep` moves such a line so
 * its first *chord* lands on the match's chord, which puts the pickup at a
 * negative absolute onset whenever the match sits at the top of the form.
 */
const pickupLine: Note[] = [60, 62, 64, 65].map((midi, i) => ({
  midi,
  onset: -Q / 2 + i * (Q / 2),
  duration: Q / 2,
  // Bar/beat are nonsense off the front of the timeline; excerpt reads neither.
  bar: 0,
  beat: 0,
}))

const chord: Chord = { onset: 0, bar: 1, rootPc: 5, quality: 'minor-seventh', tensions: [] }

describe('excerpt with a line that starts before tick zero', () => {
  // `throughStep` passes `notes[0].onset % ticks`, which is negative here.
  const bars = excerpt(pickupLine, [chord], [4, 4], pickupLine[0].onset % BAR)

  it('gives the pickup its own bar instead of asking for bar -1', () => {
    expect(bars).toHaveLength(2)
    expect(bars[0].events).toEqual([
      { midi: null, duration: BAR - Q / 2 },
      { midi: 60, duration: Q / 2 },
    ])
  })

  it('lands the chord on the downbeat of the bar after the pickup', () => {
    expect(bars[1].events!.slice(0, 3).map((e) => e.midi)).toEqual([62, 64, 65])
    expect(bars[1].chords![0]).toMatchObject({ onset: 0, rootPc: 5, quality: 'minor-seventh' })
    expect(bars[1].events!.reduce((s, e) => s + e.duration, 0)).toBe(BAR)
  })

  it('lays out identically wherever the line sits on the timeline', () => {
    // Only the position of the notes relative to each other and to the
    // chords is an excerpt; the absolute origin must not matter.
    const moved = pickupLine.map((n) => ({ ...n, onset: n.onset + 12 * BAR }))
    const movedChord = { ...chord, onset: chord.onset + 12 * BAR }
    expect(excerpt(moved, [movedChord], [4, 4], moved[0].onset % BAR)).toEqual(bars)
  })
})
