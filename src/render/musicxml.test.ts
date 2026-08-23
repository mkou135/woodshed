import { describe, it, expect } from 'vitest'
import { exerciseToMusicXml } from './musicxml.ts'
import { instrumentFromTranspose } from '../core/instrument.ts'
import { parseScore } from '../ingest/parseScore.ts'
import type { Exercise } from '../generate/index.ts'

const tenor = instrumentFromTranspose(-2, -1)

const exercise: Exercise = {
  id: 'f1-cycle',
  title: 'digital pattern 1235 through the cycle of fourths',
  findingId: 'f1',
  findingName: 'digital pattern 1235',
  transformation: 'cycle-of-fourths',
  bars: [
    { rootPc: 0, quality: 'major-seventh', midis: [60, 62, 64, 67] },
    { rootPc: 5, quality: 'major-seventh', midis: [65, 67, 69, 72] },
  ],
  sourceBar: 73,
  rationale: 'test rationale',
}

describe('exerciseToMusicXml', () => {
  it('produces XML our own parser can read back', () => {
    const xml = exerciseToMusicXml(exercise, tenor)
    const score = parseScore(xml)
    expect(score.barCount).toBe(2)
    expect(score.notes.map((n) => n.midi)).toEqual([60, 62, 64, 67, 65, 67, 69, 72])
  })

  it('carries the instrument transposition through', () => {
    const score = parseScore(exerciseToMusicXml(exercise, tenor))
    expect(score.instrument.name).toBe('Bb tenor saxophone')
  })

  it('writes a harmony element per bar', () => {
    const xml = exerciseToMusicXml(exercise, tenor)
    expect((xml.match(/<harmony/g) ?? [])).toHaveLength(2)
  })

  it('writes the cell as eighth notes', () => {
    const xml = exerciseToMusicXml(exercise, tenor)
    expect(xml).toContain('<type>eighth</type>')
  })

  it('includes the title so the file is identifiable in MuseScore', () => {
    expect(exerciseToMusicXml(exercise, tenor)).toContain('digital pattern 1235')
  })

  it('spells black keys as flats', () => {
    const flat: Exercise = {
      ...exercise,
      bars: [{ rootPc: 10, quality: 'dominant', midis: [70, 72, 74, 77] }],
    }
    const xml = exerciseToMusicXml(flat, tenor)
    expect(xml).toMatch(/<step>B<\/step>\s*<alter>-1<\/alter>/)
  })
})
