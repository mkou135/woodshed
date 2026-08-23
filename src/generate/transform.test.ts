import { describe, it, expect } from 'vitest'
import { semitonesOfDegree, degreeOf } from '../core/pitch.ts'
import { throughCycleOfFourths, overChanges } from './transform.ts'
import { instrumentFromTranspose } from '../core/instrument.ts'
import { TICKS_PER_QUARTER as Q } from '../core/types.ts'
import type { Chord } from '../core/types.ts'
import type { Finding } from '../analyse/index.ts'

const tenor = instrumentFromTranspose(-2, -1)

const cellFinding = (): Finding => ({
  id: 'f1',
  kind: 'cell',
  name: 'digital pattern 1235',
  spans: [{ startIndex: 0, endIndex: 3, bar: 5, beat: 0 }],
  degrees: ['1', '2', '3', '5'],
  intervals: [2, 2, 3],
  quality: 'major-seventh',
  detectedBy: ['shape'],
  weights: { shape: 1 },
  confidence: 0.7,
})

describe('semitonesOfDegree', () => {
  it('inverts degreeOf for the major family', () => {
    expect(semitonesOfDegree('3', 'major-seventh')).toBe(4)
    expect(semitonesOfDegree('b7', 'dominant')).toBe(10)
    expect(semitonesOfDegree('#11', 'dominant')).toBe(6)
  })

  it('inverts degreeOf for the minor family, where 3 is the minor third', () => {
    expect(semitonesOfDegree('3', 'minor-seventh')).toBe(3)
    expect(semitonesOfDegree('7', 'minor-seventh')).toBe(10)
  })

  it('round-trips against degreeOf', () => {
    const chord: Chord = { onset: 0, bar: 1, rootPc: 5, quality: 'minor-seventh', tensions: [] }
    for (const degree of ['1', '2', '3', '4', '5', '6', '7']) {
      const semis = semitonesOfDegree(degree, chord.quality)!
      expect(degreeOf(60 + chord.rootPc + semis, chord)).toBe(degree)
    }
  })

  it('returns null for a degree that is not in the table', () => {
    expect(semitonesOfDegree('b17', 'dominant')).toBeNull()
  })
})

describe('throughCycleOfFourths', () => {
  it('produces twelve bars', () => {
    const ex = throughCycleOfFourths(cellFinding(), tenor)!
    expect(ex.bars).toHaveLength(12)
    expect(ex.transformation).toBe('cycle-of-fourths')
  })

  it('moves the root up a fourth each bar', () => {
    const ex = throughCycleOfFourths(cellFinding(), tenor)!
    const roots = ex.bars.map((b) => b.rootPc)
    for (let i = 1; i < roots.length; i++) {
      expect((roots[i] - roots[i - 1] + 12) % 12).toBe(5)
    }
  })

  it('preserves the degree string in every bar', () => {
    const ex = throughCycleOfFourths(cellFinding(), tenor)!
    for (const bar of ex.bars) {
      const chord: Chord = { onset: 0, bar: 1, rootPc: bar.rootPc, quality: bar.quality, tensions: [] }
      expect(bar.midis.map((m) => degreeOf(m, chord))).toEqual(['1', '2', '3', '5'])
    }
  })

  it('keeps every note inside the written range', () => {
    const ex = throughCycleOfFourths(cellFinding(), tenor)!
    for (const bar of ex.bars) {
      for (const midi of bar.midis) {
        expect(midi).toBeGreaterThanOrEqual(tenor.writtenRange.lo)
        expect(midi).toBeLessThanOrEqual(tenor.writtenRange.hi)
      }
    }
  })

  it('cites the bar it came from', () => {
    expect(throughCycleOfFourths(cellFinding(), tenor)!.sourceBar).toBe(5)
  })

  it('returns null for a finding with no degrees', () => {
    const finding = { ...cellFinding(), degrees: undefined }
    expect(throughCycleOfFourths(finding, tenor)).toBeNull()
  })
})

describe('overChanges', () => {
  const chords: Chord[] = [
    { onset: 0, bar: 1, rootPc: 0, quality: 'major-seventh', tensions: [] },
    { onset: 4 * Q, bar: 2, rootPc: 5, quality: 'major-seventh', tensions: [] },
    { onset: 8 * Q, bar: 3, rootPc: 2, quality: 'minor-seventh', tensions: [] },
    { onset: 12 * Q, bar: 4, rootPc: 0, quality: 'major-seventh', tensions: [] },
  ]

  it('uses only chords in the same family as the finding', () => {
    const ex = overChanges(cellFinding(), chords, tenor)!
    expect(ex.bars.map((b) => b.rootPc)).toEqual([0, 5])
    expect(ex.transformation).toBe('over-changes')
  })

  it('preserves the degree string over each chord', () => {
    const ex = overChanges(cellFinding(), chords, tenor)!
    for (const bar of ex.bars) {
      const chord: Chord = { onset: 0, bar: 1, rootPc: bar.rootPc, quality: bar.quality, tensions: [] }
      expect(bar.midis.map((m) => degreeOf(m, chord))).toEqual(['1', '2', '3', '5'])
    }
  })

  it('returns null when no chord matches the family', () => {
    const minorOnly: Chord[] = [{ onset: 0, bar: 1, rootPc: 2, quality: 'minor-seventh', tensions: [] }]
    expect(overChanges(cellFinding(), minorOnly, tenor)).toBeNull()
  })
})

describe('contour', () => {
  it('keeps the played contour rather than rebuilding it from degrees mod 12', () => {
    // Blake's Ab C Eb G ascends. Degrees 3 5 7 2 rebuilt mod 12 drop the 9 an
    // octave, so the drill ended on a leap down a seventh he never played.
    const f: Finding = {
      ...cellFinding(),
      name: 'major-seventh arpeggio from the b3',
      degrees: ['3', '5', '7', '2'],
      intervals: [4, 3, 4],
      quality: 'minor-seventh',
    }
    const ex = throughCycleOfFourths(f, tenor)!
    for (const bar of ex.bars) {
      expect(bar.midis[3]).toBeGreaterThan(bar.midis[2])
    }
  })

  it('only puts a cell over the changes it is vocabulary for', () => {
    const f: Finding = {
      ...cellFinding(),
      name: 'major-seventh arpeggio',
      degrees: ['1', '3', '5', '7'],
      intervals: [4, 3, 4],
    }
    const chords: Chord[] = [
      { onset: 0, bar: 1, rootPc: 0, quality: 'major-seventh', tensions: [] },
      { onset: 4 * Q, bar: 2, rootPc: 10, quality: 'suspended-fourth', tensions: [] },
      { onset: 8 * Q, bar: 3, rootPc: 5, quality: 'dominant', tensions: [] },
    ]
    const ex = overChanges(f, chords, tenor)!
    expect(ex.bars.map((b) => b.quality)).toEqual(['major-seventh'])
  })
})
