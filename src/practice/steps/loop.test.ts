import { describe, it, expect, beforeAll } from 'vitest'
import { excerpt } from './loop.ts'
import { exerciseToMusicXml } from '../../render/musicxml.ts'
import { instrumentFromTranspose } from '../../core/instrument.ts'
import { TICKS_PER_QUARTER as Q } from '../../core/types.ts'
import type { Chord, Note } from '../../core/types.ts'
import type { Exercise, ExerciseBar } from '../../generate/index.ts'

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

const TENOR = instrumentFromTranspose(-2, -1)

/** The smallest exercise that will carry these bars to the renderer. */
const exerciseOf = (bars: ExerciseBar[]): Exercise => ({
  id: 'x-loop',
  title: 'as played',
  findingId: '',
  findingName: '',
  transformation: 'loop',
  bars,
  sourceBar: 1,
  rationale: '',
  timeSig: [4, 4],
})

describe('excerpt with a line that starts before tick zero', () => {
  // Called in `beforeAll`, not in the describe body: a throw out here is a
  // suite collection error that names no test, which is exactly the report
  // you don't want from the regression these tests exist to catch.
  // `throughStep` passes `notes[0].onset % ticks`, which is negative here.
  let bars: ReturnType<typeof excerpt>
  beforeAll(() => {
    bars = excerpt(pickupLine, [chord], [4, 4], pickupLine[0].onset % BAR)
  })

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

  it('prints no chord over the pickup rather than a chord it was never told', () => {
    // The harmony passed in starts at the downbeat *after* the pickup — in
    // `throughStep` it is the target slot's own chords — so nothing is known
    // to sound under bar 0. An empty list keeps the renderer off its
    // `bar.rootPc`/`bar.quality` fallback, which would print a bare "C".
    expect(bars[0].chords).toEqual([])
    expect(exerciseToMusicXml(exerciseOf(bars), TENOR)).not.toContain(
      '<harmony><root><root-step>C</root-step></root><kind>major</kind></harmony>',
    )
  })

  it('lays out identically wherever the line sits on the timeline', () => {
    // Only the position of the notes relative to each other and to the
    // chords is an excerpt; the absolute origin must not matter.
    const moved = pickupLine.map((n) => ({ ...n, onset: n.onset + 12 * BAR }))
    const movedChord = { ...chord, onset: chord.onset + 12 * BAR }
    expect(excerpt(moved, [movedChord], [4, 4], moved[0].onset % BAR)).toEqual(bars)
  })
})
