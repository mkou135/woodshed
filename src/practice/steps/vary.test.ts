import { describe, it, expect } from 'vitest'
import { varyStep } from './vary.ts'
import { excerpt } from './loop.ts'
import { instrumentFromTranspose } from '../../core/instrument.ts'
import { TICKS_PER_QUARTER as Q } from '../../core/types.ts'
import type { Chord, Note, Score } from '../../core/types.ts'
import type { PracticeUnit } from '../unit.ts'

const chord: Chord = { onset: 0, bar: 1, rootPc: 5, quality: 'minor-seventh', tensions: [] }
const score = {
  notes: [], chordTracks: [{ chords: [chord], provenance: 'file', confidence: 1 }],
  instrument: instrumentFromTranspose(-2, -1), timeSig: [4, 4], marks: [], barCount: 2,
} as unknown as Score

/** Ab C Eb G as eighths from the "and" of 2 — a pickup-ish placement. */
const notes: Note[] = [68, 72, 75, 79].map((midi, i) => ({
  midi, onset: Q * 1.5 + i * (Q / 2), duration: Q / 2, bar: 1, beat: 1.5 + i / 2,
}))

const unit: Omit<PracticeUnit, 'steps'> = {
  id: 'u1', phrase: 0, idea: 0, notes, startIndex: 0, endIndex: 3, harmony: [chord],
  degrees: ['3', '5', '7', '2'], findings: [], arrival: { degree: '2', chordTone: false },
  summary: { bars: 'Bar 1', chords: [], landing: null, alsoAt: [], stock: false },
  stock: 0, stockParts: { run: 0, corpus: 0, language: 0 },
    rank: 0, header: '',
}

describe('excerpt', () => {
  it('lays notes into bars with rests around them and the chord on the bar', () => {
    const bars = excerpt(notes, [chord], [4, 4], Q * 1.5)
    expect(bars).toHaveLength(1)
    const events = bars[0].events!
    expect(events[0]).toEqual({ midi: null, duration: Q * 1.5 })
    expect(events.slice(1, 5).map((e) => e.midi)).toEqual([68, 72, 75, 79])
    expect(events.reduce((s, e) => s + e.duration, 0)).toBe(4 * Q)
    expect(bars[0].chords![0]).toMatchObject({ rootPc: 5, quality: 'minor-seventh' })
  })
})

describe('varyStep', () => {
  const step = varyStep(unit, score)
  const onramps = step.exercises.filter((e) => e.transformation === 'vary-approach')
  const displaced = step.exercises.filter((e) => e.transformation === 'displace')

  it('is the vary step', () => {
    expect(step.kind).toBe('vary')
  })

  it('every on-ramp lands exactly as the player did', () => {
    expect(onramps.length).toBeGreaterThan(0)
    for (const ex of onramps) {
      const played = ex.bars.flatMap((b) => b.events!).filter((e) => e.midi !== null)
      expect(played[played.length - 1].midi).toBe(79)
      // The body is intact after the approach.
      expect(played.slice(-4).map((e) => e.midi)).toEqual([68, 72, 75, 79])
    }
  })

  it('the chord-tone-below ramp starts on a chord tone below the original start', () => {
    const below = onramps.find((e) => e.title.startsWith('From the chord tone below'))!
    const firstPlayed = below.bars.flatMap((b) => b.events!).find((e) => e.midi !== null)!
    expect(firstPlayed.midi).toBeLessThan(68)
    expect([5, 8, 0, 3].includes(((firstPlayed.midi! % 12) + 12) % 12)).toBe(true)
  })

  it('the enclosure ramp adds two approach notes', () => {
    const enc = onramps.find((e) => e.title.startsWith('Enclosed'))!
    const played = enc.bars.flatMap((b) => b.events!).filter((e) => e.midi !== null)
    expect(played).toHaveLength(6)
    expect(played[0].midi).toBe(69)
    expect(played[1].midi).toBe(67)
  })

  it('keeps pitches and relative rhythm in every displaced variant', () => {
    expect(displaced.length).toBeGreaterThan(0)
    for (const ex of displaced) {
      const played = ex.bars.flatMap((b) => b.events!).filter((e) => e.midi !== null)
      expect(played.map((e) => e.midi)).toEqual([68, 72, 75, 79])
      expect(played.map((e) => e.duration)).toEqual([Q / 2, Q / 2, Q / 2, Q / 2])
    }
  })

  it('offers the two displaced placements, titled as displacement', () => {
    expect(displaced.map((e) => e.title)).toEqual([
      'Displaced: start it on the "and" of 1', 'Displaced: start it as a pickup into beat 1',
    ])
  })

  it('puts the displaced first note where the title says', () => {
    const leadingRest = (ex: typeof step.exercises[0]): number =>
      ex.bars[0].events![0].midi === null ? ex.bars[0].events![0].duration : 0
    expect(leadingRest(displaced[0])).toBe(Q / 2)
    expect(leadingRest(displaced[1])).toBe(Q * 3.5)
  })

  it('moves the harmonic frame with the displaced line', () => {
    const changes = [
      { ...chord, rootPc: 0, quality: 'major' as const, onset: 0 },
      { ...chord, rootPc: 7, quality: 'dominant' as const, onset: 3 * Q },
    ]
    const line = [60, 64, 67, 65].map((midi, i) => ({
      midi, onset: Q * (1.5 + i / 2), duration: Q / 2, bar: 1, beat: 1.5 + i / 2,
    }))
    const resolving = {
      ...unit,
      notes: line,
      harmony: changes,
      arrival: { degree: 'b7', chordTone: true },
    }

    const varied = varyStep(resolving, { ...score, notes: line, chordTracks: [{ chords: changes, provenance: 'file', confidence: 1 }] })
    const pickup = varied.exercises.find((e) => e.title === 'Displaced: start it as a pickup into beat 1')!
    const chordPositions = pickup.bars.flatMap((bar, i) =>
      (bar.chords ?? []).map((change) => i * 4 * Q + change.onset))
    expect(chordPositions).toEqual([2 * Q, 5 * Q])
  })
})
