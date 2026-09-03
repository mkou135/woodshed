import { describe, it, expect } from 'vitest'
import {
  stepShare, runShare, intervalVariety, chordToneDownbeatShare, mluBase,
} from './stockFeatures.ts'
import { contextualise } from '../analyse/context.ts'
import { TICKS_PER_QUARTER as Q } from '../core/types.ts'
import type { Note, Chord } from '../core/types.ts'

const midis = (ms: number[]): Note[] =>
  ms.map((midi, i) => ({ midi, onset: i * Q, duration: Q, bar: 1 + Math.floor(i / 4), beat: i % 4 }))

describe('stepShare', () => {
  it('is the share of intervals that are steps', () => {
    // C D E G: two steps, one third
    expect(stepShare(midis([60, 62, 64, 67]))).toBeCloseTo(2 / 3)
  })
  it('is 0 for fewer than two notes', () => {
    expect(stepShare(midis([60]))).toBe(0)
  })
})

describe('runShare', () => {
  it('counts notes inside a one-direction run of four, whatever the interval sizes', () => {
    // C E F G up (4 notes), then D down: run covers 4 of 5
    expect(runShare(midis([60, 64, 65, 67, 62]))).toBeCloseTo(4 / 5)
  })
  it('ignores a turn of three', () => {
    expect(runShare(midis([60, 62, 64, 62, 60]))).toBe(0)
  })
})

describe('intervalVariety', () => {
  it('is distinct interval sizes over interval count', () => {
    // 2, 2, 2: one size in three intervals
    expect(intervalVariety(midis([60, 62, 64, 66]))).toBeCloseTo(1 / 3)
    // 2, -2, 3: two sizes (direction ignored) in three
    expect(intervalVariety(midis([60, 62, 60, 63]))).toBeCloseTo(2 / 3)
  })
})

describe('chordToneDownbeatShare', () => {
  const c: Chord = { onset: 0, bar: 1, rootPc: 0, quality: 'major-seventh', tensions: [] }
  it('is the share of on-beat notes that are chord tones', () => {
    // C (beat 0, tone) D (beat 1, not) E (beat 2, tone) F (beat 3, not)
    const ctx = contextualise(midis([60, 62, 64, 65]), [c])
    expect(chordToneDownbeatShare(ctx)).toBeCloseTo(0.5)
  })
  it('is null when no note falls on a beat', () => {
    const off: Note[] = [{ midi: 60, onset: Q / 2, duration: Q, bar: 1, beat: 0.5 }]
    expect(chordToneDownbeatShare(contextualise(off, [c]))).toBeNull()
  })
  it('is null without a chord', () => {
    expect(chordToneDownbeatShare(contextualise(midis([60, 62]), []))).toBeNull()
  })
})

describe('mluBase', () => {
  it('strips modifiers, direction suffixes and void prefixes', () => {
    expect(mluBase('lick')).toBe('lick')
    expect(mluBase('#lick')).toBe('lick')
    expect(mluBase('~#-lick')).toBe('lick')
    expect(mluBase('line_w_alds')).toBe('line')
    expect(mluBase('lick_blues')).toBe('lick')
    expect(mluBase('void->line_w_h')).toBe('line')
    expect(mluBase('quote:?')).toBe('quote')
    expect(mluBase('rhythm_mi')).toBe('rhythm')
  })
})
