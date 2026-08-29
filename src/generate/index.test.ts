import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { ingest, prepare } from '../index.ts'
import { analyse } from '../analyse/index.ts'
import { generateExercises } from './index.ts'
import { isValid } from './validity.ts'

// Every test here is a property of the generator, not of any one solo, so they
// run on a fixture: a fresh clone has no transcription to read. The fixture
// yields 2 findings and 4 exercises, enough for all five assertions to bite.
const SOLO = 'fixtures/words-chords-alto.musicxml'

const setup = (path: string) => {
  const score = ingest(new Uint8Array(readFileSync(path)))
  const report = prepare(score)
  return { score, analysis: analyse(score, report) }
}

describe('generateExercises', () => {
  it('produces exercises from an analysed solo', () => {
    const { score, analysis } = setup(SOLO)
    const exercises = generateExercises(analysis, score)
    expect(exercises.length).toBeGreaterThan(0)
  })

  it('only returns exercises that pass the validity gate', () => {
    const { score, analysis } = setup(SOLO)
    for (const exercise of generateExercises(analysis, score)) {
      const finding = analysis.findings.find((f) => f.id === exercise.findingId)!
      expect(isValid(exercise, finding)).toBe(true)
    }
  })

  it('keeps every note within the horn range', () => {
    const { score, analysis } = setup(SOLO)
    const { lo, hi } = score.instrument.writtenRange
    for (const exercise of generateExercises(analysis, score)) {
      for (const bar of exercise.bars) {
        for (const midi of bar.midis) {
          expect(midi).toBeGreaterThanOrEqual(lo)
          expect(midi).toBeLessThanOrEqual(hi)
        }
      }
    }
  })

  it('gives every exercise a rationale and a source bar', () => {
    const { score, analysis } = setup(SOLO)
    for (const exercise of generateExercises(analysis, score)) {
      expect(exercise.rationale.length).toBeGreaterThan(10)
      expect(exercise.sourceBar).toBeGreaterThan(0)
    }
  })

  it('respects maxFindings', () => {
    const { score, analysis } = setup(SOLO)
    const exercises = generateExercises(analysis, score, { maxFindings: 1 })
    expect(new Set(exercises.map((e) => e.findingId)).size).toBeLessThanOrEqual(1)
  })
})
