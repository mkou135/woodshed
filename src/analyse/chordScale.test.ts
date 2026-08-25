import { describe, expect, it } from 'vitest'
import type { Chord } from '../core/types.ts'
import { TICKS_PER_QUARTER } from '../core/types.ts'
import { chordScales } from './chordScale.ts'

function chord(bar: number, rootPc: number, quality: Chord['quality'], tensions: string[] = []): Chord {
  return { onset: (bar - 1) * 4 * TICKS_PER_QUARTER, bar, rootPc, quality, tensions }
}

describe('chordScales', () => {
  it('gives a dominant that resolves down a fifth the Mixolydian scale', () => {
    // G7 -> C: G is a fifth above C, so the resolution is down a perfect fifth.
    const spans = chordScales([chord(1, 7, 'dominant'), chord(2, 0, 'major-seventh')], 0)
    expect(spans[0].name).toBe('G Mixolydian')
    expect(spans[0].because).toBe('resolves down a fifth')
    expect(spans[0].declared).toBe(false)
  })

  it('gives a dominant that resolves elsewhere the Lydian b7 scale', () => {
    // Bb7 -> A7 is not down a fifth. Nettles p.92.
    const spans = chordScales([chord(1, 10, 'dominant'), chord(2, 9, 'dominant')], 0)
    expect(spans[0].name).toBe('Bb Lydian b7')
    expect(spans[0].because).toBe('does not resolve down a fifth')
  })

  it('treats the last chord as unresolved', () => {
    const spans = chordScales([chord(1, 0, 'dominant')], 0)
    expect(spans[0].name).toBe('C Lydian b7')
  })

  it('lets the chart override the function rule', () => {
    // C7alt arrives as a dominant carrying altered tensions: the transcriber heard it.
    const spans = chordScales([chord(1, 0, 'dominant', ['b9', '#9', 'b13']), chord(2, 5, 'major-seventh')], 0)
    expect(spans[0].name).toBe('C altered')
    expect(spans[0].declared).toBe(true)
    expect(spans[0].because).toBe('the chart says so')
  })

  it('reads #11 on a dominant as Lydian b7, declared', () => {
    const spans = chordScales([chord(1, 5, 'dominant', ['#11']), chord(2, 10, 'major-seventh')], 0)
    expect(spans[0].name).toBe('F Lydian b7')
    expect(spans[0].declared).toBe(true)
  })

  it('reads #11 on a major seventh as Lydian', () => {
    const spans = chordScales([chord(1, 0, 'major-seventh', ['#11'])], 0)
    expect(spans[0].name).toBe('C Lydian')
    expect(spans[0].declared).toBe(true)
  })

  it('defaults the plain chord qualities', () => {
    const spans = chordScales([
      chord(1, 2, 'minor-seventh'),
      chord(2, 0, 'major-seventh'),
      chord(3, 11, 'half-diminished'),
      chord(4, 0, 'minor-major'),
    ], 0)
    expect(spans.map((s) => s.name)).toEqual([
      'D Dorian', 'C Ionian', 'B Locrian', 'C melodic minor',
    ])
    expect(spans.every((s) => !s.declared)).toBe(true)
  })

  it('spells black keys as sharps in a sharp key and flats in a flat key', () => {
    const sharp = chordScales([chord(1, 6, 'minor-seventh')], 3)
    const flat = chordScales([chord(1, 6, 'minor-seventh')], -3)
    expect(sharp[0].name).toBe('F# Dorian')
    expect(flat[0].name).toBe('Gb Dorian')
  })

  it('carries the pitch classes of the parent collection', () => {
    const [span] = chordScales([chord(1, 7, 'dominant'), chord(2, 0, 'major-seventh')], 0)
    // G Mixolydian is the C major collection.
    expect([...span.pcs].sort((a, b) => a - b)).toEqual([0, 2, 4, 5, 7, 9, 11])
  })

  it('skips a chord whose quality it cannot name', () => {
    expect(chordScales([chord(1, 0, 'unknown')], 0)).toEqual([])
  })

  it('looks past a repeat of the same chord to find the resolution', () => {
    // C7 written again in the next bar still resolves to F.
    const spans = chordScales([
      chord(1, 0, 'dominant'), chord(2, 0, 'dominant'), chord(3, 5, 'major-seventh'),
    ], 0)
    expect(spans[0].name).toBe('C Mixolydian')
    expect(spans[1].name).toBe('C Mixolydian')
  })
})
