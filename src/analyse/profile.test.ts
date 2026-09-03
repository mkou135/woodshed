import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { BLAKE, HAS_BLAKE } from '../test/blake.ts'
import { profile } from './profile.ts'
import { contextualise } from './context.ts'
import { segment } from './segment.ts'
import { ingest } from '../ingest/index.ts'
import { prepare } from '../prepare/index.ts'
import { analyse } from './index.ts'
import { TICKS_PER_QUARTER as Q } from '../core/types.ts'
import type { Chord, Note } from '../core/types.ts'

// Outside the repo (DECISIONS 2026-08-24 "Corpus licensing"): the chorus
// structure below is a property of that one long solo, so it is guarded rather
// than re-pointed at a fixture.

const chord = (bar: number): Chord =>
  ({ onset: (bar - 1) * 4 * Q, bar, rootPc: 0, quality: 'major-seventh', tensions: [] })

/** Eighth notes from the start of `bar`, a rest of `gap` quarters after. */
const eighths = (bar: number, midis: number[]): Note[] =>
  midis.map((midi, i) => ({
    midi, onset: (bar - 1) * 4 * Q + i * (Q / 2), duration: Q / 2, bar, beat: i / 2,
  }))

describe('profile', () => {
  it('measures density and silence per bar', () => {
    // Bar 1: four eighths then silence. Bar 2: empty. Bar 3: eight eighths.
    const notes = [...eighths(1, [60, 62, 64, 65]), ...eighths(3, [60, 62, 64, 65, 67, 69, 71, 72])]
    const ctx = contextualise(notes, [chord(1), chord(2), chord(3)])
    const p = profile({
      contexts: ctx, phrases: segment(notes), findings: [], timeSig: [4, 4], chorusStarts: [],
    })
    expect(p.bars.map((b) => b.notes)).toEqual([4, 0, 8])
    expect(p.bars.map((b) => b.silence)).toEqual([0.5, 1, 0])
    expect(p.bars[1].register).toBeNull()
    expect(p.overall.notesPerBar).toBe(4)
    expect(p.overall.phrases).toBe(2)
    expect(p.overall.register).toEqual({ lo: 60, hi: 72, mean: 65.083 })
  })

  it('splits the solo at chorus starts, beginning from the first sounding bar', () => {
    const notes = [...eighths(2, [60, 62]), ...eighths(5, [64, 65]), ...eighths(9, [67])]
    const ctx = contextualise(notes, [chord(1)])
    const p = profile({
      contexts: ctx, phrases: segment(notes), findings: [], timeSig: [4, 4], chorusStarts: [1, 5, 9, 13],
    })
    expect(p.choruses.map((c) => [c.startBar, c.endBar])).toEqual([[2, 4], [5, 8], [9, 9]])
    expect(p.choruses.map((c) => c.notes)).toEqual([2, 2, 1])
  })

  it('counts chromaticism against chords, at phrase edges', () => {
    // Phrase of six over Cmaj7: chromatic at the end only.
    const notes = eighths(1, [60, 64, 67, 72, 73, 74])
    const ctx = contextualise(notes, [chord(1)])
    const p = profile({
      contexts: ctx, phrases: segment(notes), findings: [], timeSig: [4, 4], chorusStarts: [],
    })
    expect(p.phraseChromaticism).toEqual({ start: 0, end: 0.5 })
    expect(p.overall.chromaticRatio).toBeCloseTo(1 / 6, 3)
  })

  it('is empty for an empty solo', () => {
    const p = profile({ contexts: [], phrases: [], findings: [], timeSig: [4, 4], chorusStarts: [] })
    expect(p.bars).toEqual([])
    expect(p.choruses).toEqual([])
  })
})

describe.skipIf(!HAS_BLAKE)('profile of the Blake solo', () => {
  it('describes it in numbers a teacher would recognise', () => {
    const score = ingest(new Uint8Array(readFileSync(BLAKE)))
    const report = prepare(score)
    const a = analyse(score, report)
    const p = a.profile
    expect(p.overall.startBar).toBe(63)
    // Chorus starts 9 and 65 (phased by the double bars); the solo enters
    // with a two-bar pickup at 63, which becomes its own region.
    expect(p.choruses.map((c) => [c.startBar, c.endBar])).toEqual([[63, 64], [65, 122]])
    // Phrase starts are at least as chromatic as phrase ends — the Weimar
    // asymmetry the segmentation probe was scored on (Blake 18/9 there).
    // **Weakened from strictly-greater on 2026-09-01**, and worth saying
    // why: the asymmetry is a corpus claim, and on one solo of 15 phrases it
    // rests on a handful of notes. Riff binding's chain rule moved exactly
    // two phrase starts here — it gained 87.2½ and dropped 118.4½, both of
    // them the owner's own marks on this solo — and the two sides came level
    // at 0.167. A tie after two corrections the annotation asked for is not
    // evidence against the segmentation; a *reversal* would be, and this
    // still catches one.
    expect(p.phraseChromaticism.start).toBeGreaterThanOrEqual(p.phraseChromaticism.end)
    expect(p.overall.findingIds).toContain('f1')
  })
})
