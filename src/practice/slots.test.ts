import { describe, it, expect } from 'vitest'
import { progressionSlot, findProgressionSlots, tuneChords, chordRunStart, transposeLine } from './slots.ts'
import { instrumentFromTranspose } from '../core/instrument.ts'
import { TICKS_PER_QUARTER as Q } from '../core/types.ts'
import type { Chord, Note } from '../core/types.ts'
import type { Tune } from './tune.ts'

const chord = (bar: number, rootPc: number, quality: Chord['quality'], onset = 0): Chord =>
  ({ onset, bar, rootPc, quality, tensions: [] })

const tuneOf = (bars: Chord[][]): Tune =>
  ({ title: 'test', timeSig: [4, 4], bars: bars.map((chords) => ({ chords })) })

/** Fm C7 twice over, then the same pair a fifth up: Cm G7. */
const tune = tuneOf([
  [chord(1, 5, 'minor')], [chord(2, 0, 'dominant')],
  [chord(3, 5, 'minor')], [chord(4, 0, 'dominant')],
  [chord(5, 0, 'minor')], [chord(6, 7, 'dominant')],
])

const slot = progressionSlot([chord(1, 5, 'minor'), chord(2, 0, 'dominant')])!

describe('progressionSlot', () => {
  it('reduces chords to classes and root motion, repeats merged', () => {
    const merged = progressionSlot([chord(1, 5, 'minor'), chord(1, 5, 'minor', Q * 2), chord(2, 0, 'dominant')])
    expect(merged).toEqual({ classes: ['minor', 'dominant'], intervals: [7], rootPc: 5 })
  })

  it('is null when any chord has no class', () => {
    expect(progressionSlot([chord(1, 5, 'minor'), chord(2, 0, 'unknown')])).toBeNull()
  })
})

describe('chordRunStart', () => {
  it('names the bar the sounding chord began on, across a rewritten carry', () => {
    const carried = tuneOf([[chord(1, 5, 'minor')], [chord(2, 5, 'minor')], [chord(3, 0, 'dominant')]])
    expect(chordRunStart(carried, 2)).toBe(1)
    expect(chordRunStart(carried, 3)).toBe(3)
  })
})

describe('findProgressionSlots', () => {
  it('groups occurrences in one key into a single match, not one each', () => {
    const matches = findProgressionSlots(slot, tune)
    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({ shift: 0, bars: [1, 3] })
    expect(matches[1]).toMatchObject({ shift: 7, bars: [5] })
  })

  it('keeps the first occurrence’s chords for the line to be written onto', () => {
    expect(findProgressionSlots(slot, tune)[1].chords.map((c) => c.rootPc)).toEqual([0, 7])
  })

  it('drops the bar the line already sits on, keeping its other occurrences', () => {
    expect(findProgressionSlots(slot, tune, { homeBar: 1 })[0]).toMatchObject({ shift: 0, bars: [3] })
  })

  it('knows home by the chord’s run, not its first bar', () => {
    // Fm written again in bar 2 is one chord: an idea starting there is
    // still at home on the match that begins in bar 1.
    const carried = tuneOf([
      [chord(1, 5, 'minor')], [chord(2, 5, 'minor')], [chord(3, 0, 'dominant')],
      [chord(4, 0, 'minor')], [chord(5, 7, 'dominant')],
    ])
    const pair = progressionSlot([chord(1, 5, 'minor'), chord(3, 0, 'dominant')])!
    expect(findProgressionSlots(pair, carried).map((m) => m.bars)).toEqual([[1], [4]])
    expect(findProgressionSlots(pair, carried, { homeBar: 2 }).map((m) => m.bars)).toEqual([[4]])
  })

  it('drops a transposition whose only bar was home', () => {
    const upper = progressionSlot([chord(1, 0, 'minor'), chord(2, 7, 'dominant')])!
    expect(findProgressionSlots(upper, tune, { homeBar: 5 }).map((m) => m.shift)).toEqual([5])
  })

  it('never treats a bar in another key as home', () => {
    expect(findProgressionSlots(slot, tune, { homeBar: 5 })).toHaveLength(2)
  })

  it('counts keys, not bars, against the limit', () => {
    expect(findProgressionSlots(slot, tune, { limit: 1 })).toHaveLength(1)
  })
})

describe('tuneChords', () => {
  it('numbers bars from 1, makes onsets absolute and merges the carry', () => {
    const carried = tuneOf([[chord(1, 5, 'minor')], [chord(2, 5, 'minor')], [chord(3, 0, 'dominant')]])
    expect(tuneChords(carried).map((c) => c.bar)).toEqual([1, 3])
    expect(tuneChords(tune)[3]).toMatchObject({ bar: 4, onset: 3 * 4 * Q })
  })
})

describe('transposeLine', () => {
  const instrument = instrumentFromTranspose(-2, -1)
  const notes: Note[] = [68, 72, 75, 79].map((midi, i) => ({
    midi, onset: i * (Q / 2), duration: Q / 2, bar: 1, beat: i / 2,
  }))

  it('takes the nearest octave that keeps the line on the horn', () => {
    expect(transposeLine(notes, 7, instrument)!.map((n) => n.midi)).toEqual([63, 67, 70, 74])
  })

  it('is null when the line will not fit at any octave', () => {
    const wide = [58, 91].map((midi, i) => ({ ...notes[i], midi }))
    expect(transposeLine(wide, 7, instrument)).toBeNull()
  })
})
