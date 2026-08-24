import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { run } from '../pipeline.ts'
import { partition, stockShare } from './unit.ts'
import { TICKS_PER_QUARTER as Q } from '../core/types.ts'
import type { Note } from '../core/types.ts'

const BLAKE = '/Users/michaelkourkov/Documents/MuseScore4/Scores/Hey Lock! - Seamus Blake Solo Transcription.mxl'

const eighths = (bar: number, count: number): Note[] =>
  Array.from({ length: count }, (_, i) => ({
    midi: 60 + (i % 7), onset: (bar - 1) * 4 * Q + i * (Q / 2), duration: Q / 2,
    bar: bar + Math.floor(i / 8), beat: (i % 8) / 2,
  }))

describe('partition', () => {
  it('leaves a short idea whole', () => {
    expect(partition(eighths(1, 12))).toHaveLength(1)
  })

  it('splits a long idea into parts of at most two bars', () => {
    const parts = partition(eighths(1, 40))   // five bars
    expect(parts.map((p) => p.length)).toEqual([16, 16, 8])
    for (const part of parts) {
      expect(part[part.length - 1].bar - part[0].bar).toBeLessThanOrEqual(1)
    }
  })

  it('keeps a one- or two-note tail with the part before it', () => {
    const parts = partition(eighths(1, 34))   // four bars and two notes
    expect(parts).toHaveLength(2)
    expect(parts[1]).toHaveLength(18)
  })
})

describe('buildUnits on the Blake solo', () => {
  const result = run(new Uint8Array(readFileSync(BLAKE)))

  it('makes the maj7-from-the-b3 line the first unit, with all four steps', () => {
    const top = result.units[0]
    expect(top.findings.map((f) => f.name)).toContain('major-seventh arpeggio from the b3')
    expect(top.steps.map((s) => s.kind)).toEqual(['loop', 'through', 'displace', 'write'])
  })

  it('keeps every unit within two bars', () => {
    for (const u of result.units) {
      expect(u.notes[u.notes.length - 1].bar - u.notes[0].bar).toBeLessThanOrEqual(2)
    }
  })

  it('covers every solo note exactly once', () => {
    const total = result.units.reduce((n, u) => n + u.notes.length, 0)
    expect(total).toBe(result.analysis.contexts.length)
  })

  it('writes a header a teacher could have written', () => {
    expect(result.units[0].header).toMatch(/^Bars \d+–\d+ over .+: .+ — .+, landing on the .+\.$/)
  })

  it('gives every unit with a degree-cell a through step over this solo', () => {
    for (const u of result.units) {
      if (!u.findings.some((f) => f.degrees)) continue
      const through = u.steps.find((s) => s.kind === 'through')
      expect(through, u.header).toBeDefined()
      if (through?.kind === 'through') expect(through.exercises[0].bars.length).toBeGreaterThan(0)
    }
  })
})

describe('stockShare', () => {
  // A scale run or a plain arpeggio is everyone's vocabulary; the share of
  // a unit's notes sitting inside one discounts its rank.
  const midis = (ms: number[]): Note[] => ms.map((midi, i) => ({
    midi, onset: i * (Q / 2), duration: Q / 2, bar: 1, beat: (i % 8) / 2,
  }))

  it('is 1 for a scale run', () => {
    expect(stockShare(midis([60, 62, 64, 65, 67, 69, 71, 72]))).toBe(1)
  })

  it('is 1 for a descending chromatic run', () => {
    expect(stockShare(midis([72, 71, 70, 69, 68]))).toBe(1)
  })

  it('is 1 for a plain arpeggio', () => {
    expect(stockShare(midis([60, 64, 67, 71, 74]))).toBe(1)
  })

  it('is 0 for a figure that changes direction every few notes', () => {
    // Blake's b3 figure: Ab C Eb G, then down
    expect(stockShare(midis([68, 72, 75, 74, 73, 75, 72]))).toBe(0)
  })

  it('counts only the notes inside a run of at least four', () => {
    // a three-note step fragment does not count; the five-note run does
    expect(stockShare(midis([60, 62, 64, 60, 62, 64, 65, 67]))).toBe(0.625)
  })

  it('does not mix steps and thirds in one run', () => {
    // 1-2-3-5-7: steps then thirds; neither run reaches four notes
    expect(stockShare(midis([60, 62, 64, 67, 71]))).toBe(0)
  })
})
