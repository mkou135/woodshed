import { describe, expect, it } from 'vitest'
import { contextualise } from './context.ts'
import type { Chord, Note } from '../core/types.ts'
import { bucket, crossKey, languageRuns, languageShare, languageWindows, singleKey } from './language.ts'

const note = (midi: number, k: number): Note => ({
  midi,
  onset: k * 480,
  duration: 480,
  bar: 1 + Math.floor(k / 8),
  beat: (k % 8) / 2,
})

const chord = (rootPc: number, quality: Chord['quality'], onset: number): Chord => ({
  onset,
  bar: 1,
  rootPc,
  quality,
  tensions: [],
})

/** D E F A over Dm7, then B D F A over G7: the classic ii–V digital pattern. */
function iiVContexts() {
  const notes = [62, 64, 65, 69, 71, 74, 77, 81].map(note)
  const chords = [chord(2, 'minor-seventh', 0), chord(7, 'dominant', 4 * 480)]
  return contextualise(notes, chords)
}

describe('bucket', () => {
  it('collapses qualities to three families', () => {
    expect(bucket('major-seventh')).toBe('maj')
    expect(bucket('augmented-seventh')).toBe('dom')
    expect(bucket('diminished')).toBe('min')
    expect(bucket('unknown')).toBeNull()
  })
})

describe('keys', () => {
  it('builds a single-chord key', () => {
    expect(singleKey(['1', '2', '3', '5'], 'minor-seventh')).toBe('1 2 3 5@min')
  })

  it('refuses a null degree or an unbucketed quality', () => {
    expect(singleKey(['1', null, '3', '5'], 'minor-seventh')).toBeNull()
    expect(singleKey(['1', '2', '3', '5'], 'unknown')).toBeNull()
  })

  it('builds a cross-chord key with the root move', () => {
    expect(crossKey(['1', '2', '3', '5'], 'minor-seventh', ['3', '5', 'b7', '2'], 'dominant', 5))
      .toBe('1 2 3 5@min|3 5 b7 2@dom+5')
  })
})

describe('languageWindows', () => {
  it('finds single-chord and cross-chord windows over a ii–V', () => {
    const windows = languageWindows(iiVContexts())
    const keys = windows.map((w) => w.key)
    expect(keys).toContain('1 2 3 5@min')
    expect(keys).toContain('3 5 b7 2@dom')
    const full = windows.find((w) => w.key === '1 2 3 5@min|3 5 b7 2@dom+5')
    expect(full).toEqual({ start: 0, end: 7, key: '1 2 3 5@min|3 5 b7 2@dom+5' })
    // 4-note singles: one per side. Cross: 2-4 notes a side around the change.
    expect(windows.filter((w) => !w.key.includes('|'))).toHaveLength(2)
    expect(windows.filter((w) => w.key.includes('|'))).toHaveLength(9)
  })

  it('never crosses an idea boundary', () => {
    const ctx = iiVContexts()
    for (let i = 4; i < 8; i++) ctx[i].idea = 1
    expect(languageWindows(ctx).filter((w) => w.key.includes('|'))).toHaveLength(0)
  })
})

describe('languageShare', () => {
  it('covers every note under a matching window', () => {
    const table = { '1 2 3 5@min|3 5 b7 2@dom+5': { wjd: 50, bop: 0 } }
    expect(languageShare(iiVContexts(), table, 100)).toBeCloseTo(0.5)
  })

  it('is 0 on an empty table', () => {
    expect(languageShare(iiVContexts(), {}, 100)).toBe(0)
  })

  it('takes the best cover per note', () => {
    const table = {
      '1 2 3 5@min': { wjd: 80, bop: 0 },
      '1 2 3 5@min|3 5 b7 2@dom+5': { wjd: 20, bop: 0 },
    }
    // First four notes covered at 0.8, last four at 0.2.
    expect(languageShare(iiVContexts(), table, 100)).toBeCloseTo(0.5)
  })
})

describe('languageRuns', () => {
  it('merges overlapping windows into runs carrying the best share', () => {
    const table = {
      '1 2 3 5@min': { wjd: 80, bop: 0 },
      '2 3 5@min': { wjd: 90, bop: 0 },          // too short: never a window key
      '1 2 3 5@min|3 5 b7 2@dom+5': { wjd: 30, bop: 0 },
    }
    const runs = languageRuns(iiVContexts(), 0.25, table, 100)
    expect(runs).toEqual([{ start: 0, end: 7, share: 0.8 }])
  })

  it('drops windows below the floor and keeps disjoint runs apart', () => {
    const table = { '1 2 3 5@min': { wjd: 80, bop: 0 }, '3 5 b7 2@dom': { wjd: 10, bop: 0 } }
    const runs = languageRuns(iiVContexts(), 0.25, table, 100)
    expect(runs).toEqual([{ start: 0, end: 3, share: 0.8 }])
  })

  it('is empty with no solos counted', () => {
    expect(languageRuns(iiVContexts(), 0.25, {}, 0)).toEqual([])
  })
})
