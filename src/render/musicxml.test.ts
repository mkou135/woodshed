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

  it('beams even eighths in pairs within each beat', () => {
    const xml = exerciseToMusicXml(exercise, tenor)
    const beams = [...xml.matchAll(/<beam number="1">(\w+)<\/beam>/g)].map((m) => m[1])
    expect(beams.slice(0, 4)).toEqual(['begin', 'end', 'begin', 'end'])
  })

  it('breaks a beam at a rest, a beat line and a quarter; 16ths share a second beam', () => {
    const Q = 960
    const rhythmic: Exercise = {
      ...exercise,
      bars: [{
        rootPc: 0, quality: 'major-seventh', midis: [],
        // beat 1: two eighths; beat 2: eighth rest, eighth; beat 3: four 16ths; beat 4: quarter
        events: [
          { midi: 60, duration: Q / 2 }, { midi: 62, duration: Q / 2 },
          { midi: null, duration: Q / 2 }, { midi: 64, duration: Q / 2 },
          { midi: 65, duration: Q / 4 }, { midi: 67, duration: Q / 4 }, { midi: 69, duration: Q / 4 }, { midi: 71, duration: Q / 4 },
          { midi: 72, duration: Q },
        ],
      }],
    }
    const xml = exerciseToMusicXml(rhythmic, tenor)
    const notes = [...xml.matchAll(/<note>.*?<\/note>/g)].map((m) => m[0])
    const beams = (n: string): string[] => [...n.matchAll(/<beam number="(\d)">(\w+)<\/beam>/g)].map((m) => `${m[1]}:${m[2]}`)
    expect(notes.map(beams)).toEqual([
      ['1:begin'], ['1:end'],
      [], [],
      ['1:begin', '2:begin'], ['1:continue', '2:continue'], ['1:continue', '2:continue'], ['1:end', '2:end'],
      [],
    ])
  })

  it('writes the solo\'s key signature and drops <transpose> for display only', () => {
    const shown = exerciseToMusicXml(exercise, tenor, { keyFifths: 2, forDisplay: true })
    expect(shown).toContain('<fifths>2</fifths>')
    expect(exerciseToMusicXml({ ...exercise, bars: [{ rootPc: 2, quality: 'major-seventh', midis: [66] }] }, tenor, { keyFifths: 2 })).toContain('<step>F</step><alter>1</alter>')
    expect(shown).not.toContain('<transpose>')
    expect(exerciseToMusicXml(exercise, tenor, { keyFifths: 2 })).toContain('<transpose>')
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
