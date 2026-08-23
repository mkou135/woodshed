import { describe, it, expect } from 'vitest'
import { detectTargets } from './targets.ts'
import { contextualise } from '../context.ts'
import { TICKS_PER_QUARTER as Q } from '../../core/types.ts'
import type { Chord, Note } from '../../core/types.ts'

const chord = (rootPc: number, quality: Chord['quality']): Chord =>
  ({ onset: 0, bar: 1, rootPc, quality, tensions: [] })

/** Eighth notes from beat 0, so beats land on 0, 0.5, 1, 1.5 ... */
const line = (midis: number[]): Note[] =>
  midis.map((midi, i) => ({
    midi, onset: i * (Q / 2), duration: Q / 2,
    bar: Math.floor(i / 8) + 1, beat: (i % 8) / 2,
  }))

describe('detectTargets', () => {
  it('finds a three-note enclosure', () => {
    // Bb C B targeting B, over G7 where B is the third.
    const ctx = contextualise(line([70, 72, 71]), [chord(7, 'dominant')])
    const hits = detectTargets(ctx)
    expect(hits).toHaveLength(1)
    expect(hits[0]).toMatchObject({ targetIndex: 2, kind: 'enclosure', fromBelow: false, stepSize: 1 })
  })

  it("finds Parker's five-note enclosure that the published rules miss", () => {
    // G# G C A Bb B -> B. Five intervals, containing a perfect fourth, so it
    // is not an approach under the Weimar Bebop Alphabet at all.
    const ctx = contextualise(line([68, 67, 72, 69, 70, 71]), [chord(7, 'dominant')])
    const hits = detectTargets(ctx)
    const onB = hits.find((h) => h.targetIndex === 5)
    expect(onB).toBeDefined()
    expect(onB!.kind).toBe('enclosure')
    expect(onB!.fromBelow).toBe(true)
  })

  it('reports an approach from one side only, not as an enclosure', () => {
    // G F G Ab into Ab, the b3 of Fm: everything is below the target.
    const ctx = contextualise(line([67, 65, 67, 68]), [chord(5, 'minor-seventh')])
    const hit = detectTargets(ctx).find((h) => h.targetIndex === 3)
    expect(hit).toBeDefined()
    expect(hit!.kind).toBe('approach')
    expect(hit!.fromBelow).toBe(true)
  })

  it('does not fire when the target is not a chord tone', () => {
    // Target D# over C major seventh is not a chord tone.
    const ctx = contextualise(line([62, 65, 63]), [chord(0, 'major-seventh')])
    expect(detectTargets(ctx)).toEqual([])
  })

  it('does not fire when the last motion is a leap rather than a step', () => {
    const ctx = contextualise(line([65, 72, 64]), [chord(0, 'major-seventh')])
    expect(detectTargets(ctx)).toEqual([])
  })

  it('prefers the smallest window that works', () => {
    const ctx = contextualise(line([60, 62, 70, 72, 71]), [chord(7, 'dominant')])
    const hit = detectTargets(ctx).find((h) => h.targetIndex === 4)!
    expect(hit.windowStart).toBe(2)
  })

  it('scores a chromatic enclosure above a plain approach', () => {
    const enclosure = detectTargets(contextualise(line([70, 72, 71]), [chord(7, 'dominant')]))[0]
    const approach = detectTargets(contextualise(line([67, 65, 67, 68]), [chord(5, 'minor-seventh')]))
      .find((h) => h.targetIndex === 3)!
    expect(enclosure.score).toBeGreaterThan(approach.score)
  })

  it('returns nothing without chords', () => {
    expect(detectTargets(contextualise(line([70, 72, 71]), []))).toEqual([])
  })
})

describe('detectTargets: what is not a device', () => {
  it('ignores a diatonic scale walk into a chord tone', () => {
    // F G Ab into the b3 of Fm. This fired six times in one solo and is
    // just the scale.
    const ctx = contextualise(line([65, 67, 68]), [chord(5, 'minor-seventh')])
    expect(detectTargets(ctx)).toEqual([])
  })

  it('still reports a chromatic walk into a chord tone', () => {
    // F Gb G into the 3 of Eb: the Gb is a choice.
    const ctx = contextualise(line([65, 66, 67]), [chord(3, 'major-seventh')])
    expect(detectTargets(ctx)).toHaveLength(1)
  })

  it('does not credit a repeated chord across a bar line as a new harmony', () => {
    const chords: Chord[] = [chord(7, 'dominant'), { ...chord(7, 'dominant'), onset: 4 * Q, bar: 2 }]
    const one = contextualise(line([70, 72, 71]), [chord(7, 'dominant')])
    const notes = line([70, 72, 71]).map((n) => ({ ...n, onset: n.onset + 3 * Q, bar: n.onset + 3 * Q >= 4 * Q ? 2 : 1 }))
    const two = contextualise(notes, chords)
    expect(two[2].chord).not.toBe(two[1].chord)
    expect(detectTargets(two)[0].score).toBeCloseTo(detectTargets(one)[0].score, 5)
  })
})
