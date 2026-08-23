import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { ingest, prepare } from '../index.ts'
import { analyse } from '../analyse/index.ts'
import { generateExercises } from './index.ts'
import { isValid } from './validity.ts'

const BLAKE = '/Users/michaelkourkov/Documents/MuseScore4/Scores/Hey Lock! - Seamus Blake Solo Transcription.mxl'

const setup = (path: string) => {
  const score = ingest(new Uint8Array(readFileSync(path)))
  const report = prepare(score)
  return { score, analysis: analyse(score, report) }
}

describe('generateExercises', () => {
  it('produces exercises from a real solo', () => {
    const { score, analysis } = setup(BLAKE)
    const exercises = generateExercises(analysis, score)
    expect(exercises.length).toBeGreaterThan(0)
  })

  it('only returns exercises that pass the validity gate', () => {
    const { score, analysis } = setup(BLAKE)
    for (const exercise of generateExercises(analysis, score)) {
      const finding = analysis.findings.find((f) => f.id === exercise.findingId)!
      expect(isValid(exercise, finding)).toBe(true)
    }
  })

  it('keeps every note within the horn range', () => {
    const { score, analysis } = setup(BLAKE)
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
    const { score, analysis } = setup(BLAKE)
    for (const exercise of generateExercises(analysis, score)) {
      expect(exercise.rationale.length).toBeGreaterThan(10)
      expect(exercise.sourceBar).toBeGreaterThan(0)
    }
  })

  it('respects maxFindings', () => {
    const { score, analysis } = setup(BLAKE)
    const exercises = generateExercises(analysis, score, { maxFindings: 1 })
    expect(new Set(exercises.map((e) => e.findingId)).size).toBeLessThanOrEqual(1)
  })
})
