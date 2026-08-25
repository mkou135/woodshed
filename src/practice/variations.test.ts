import { describe, expect, it } from 'vitest'
import { TICKS_PER_QUARTER as Q } from '../core/types.ts'
import type { Note } from '../core/types.ts'
import { augment, edit, fragment } from './variations.ts'

function notesFrom(spec: [number, number, number][]): Note[] {
  const out: Note[] = []
  let onset = 0
  for (const [midi, dur, gap] of spec) {
    const duration = dur * Q
    out.push({ midi, onset, duration, bar: Math.floor(onset / (4 * Q)) + 1, beat: (onset % (4 * Q)) / Q })
    onset += duration + gap * Q
  }
  return out
}

const line = notesFrom([[60, 1, 0], [62, 1, 0], [64, 1, 0], [65, 1, 0], [67, 1, 0], [69, 1, 0]])

describe('fragment', () => {
  it('takes a strict prefix of at least three notes', () => {
    const f = fragment(line, 'prefix')!
    expect(f.length).toBeGreaterThanOrEqual(3)
    expect(f.length).toBeLessThan(line.length)
    expect(f[0].midi).toBe(60)
  })

  it('takes a suffix ending on the arrival', () => {
    const f = fragment(line, 'suffix')!
    expect(f[f.length - 1].midi).toBe(69)
  })

  it('refuses a line too short to fragment', () => {
    expect(fragment(line.slice(0, 3), 'prefix')).toBeNull()
  })
})

describe('augment', () => {
  it('doubles every duration and gap, re-spaced from the first onset', () => {
    const gapped = notesFrom([[60, 1, 1], [62, 1, 0], [64, 1, 0]])
    const a = augment(gapped, 2)
    expect(a[0].onset).toBe(gapped[0].onset)
    expect(a.map((n) => n.duration)).toEqual([2 * Q, 2 * Q, 2 * Q])
    expect(a[1].onset - a[0].onset).toBe(4 * Q)
  })
})

describe('edit', () => {
  it('drops one or two middle notes, keeping first and last, positions preserved', () => {
    const e = edit(line, true)!
    expect(e.notes.length).toBe(line.length)
    expect(e.notes[0]?.midi).toBe(60)
    expect(e.notes[e.notes.length - 1]?.midi).toBe(69)
    const dropped = e.notes.filter((n) => n === null).length
    expect(dropped).toBeGreaterThanOrEqual(1)
    expect(dropped).toBeLessThanOrEqual(2)
    for (const [i, n] of e.notes.entries()) if (n) expect(n.onset).toBe(line[i].onset)
  })

  it('refuses a line with no middle to edit', () => {
    expect(edit(line.slice(0, 2), true)).toBeNull()
  })
})
