import { describe, it, expect } from 'vitest'
import { tuneFromScore } from './tune.ts'
import type { Score } from '../core/types.ts'

describe('tuneFromScore with a chordless intro', () => {
  it('takes the first chorus that actually has chords', () => {
    const chord = (bar: number, rootPc: number) => ({ onset: (bar - 1) * 3840, bar, rootPc, quality: 'major' as const, tensions: [] })
    const score: Score = {
      notes: [], marks: [], timeSig: [4, 4], barCount: 8,
      instrument: { name: 'x', transpose: { chromatic: 0, octave: 0 } } as unknown as Score['instrument'],
      chordTracks: [{ chords: [chord(5, 0), chord(6, 5), chord(7, 7), chord(8, 0)], confidence: 1, provenance: 'file' as const }],
    }
    const tune = tuneFromScore(score, [1, 5])
    expect(tune.bars).toHaveLength(4)
    expect(tune.bars[0].chords[0].rootPc).toBe(0)
    expect(tune.bars[1].chords[0].rootPc).toBe(5)
  })
})
