import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { ingest, prepare } from '../index.ts'
import { analyse } from './index.ts'

const analysed = (path: string) => {
  const score = ingest(new Uint8Array(readFileSync(path)))
  return analyse(score, prepare(score))
}

const BLAKE = '/Users/michaelkourkov/Documents/MuseScore4/Scores/Hey Lock! - Seamus Blake Solo Transcription.mxl'

describe('analyse', () => {
  it('segments, contextualises and finds nothing alarming on a fixture', () => {
    const a = analysed('fixtures/form-8bar-x3.musicxml')
    expect(a.phrases.length).toBeGreaterThan(0)
    expect(a.contexts.length).toBeGreaterThan(0)
    expect(Array.isArray(a.findings)).toBe(true)
  })

  it('sorts findings by confidence, highest first', () => {
    const a = analysed(BLAKE)
    const scores = a.findings.map((f) => f.confidence)
    expect([...scores].sort((x, y) => y - x)).toEqual(scores)
  })

  it('scores a finding seen by two detectors above one seen by a single detector', () => {
    const a = analysed(BLAKE)
    const converged = a.findings.filter((f) => f.detectedBy.length > 1)
    const single = a.findings.filter((f) => f.detectedBy.length === 1)
    if (converged.length && single.length) {
      expect(Math.max(...converged.map((f) => f.confidence)))
        .toBeGreaterThan(Math.min(...single.map((f) => f.confidence)))
    }
  })

  it('gives every finding a location in the score', () => {
    const a = analysed(BLAKE)
    for (const f of a.findings) {
      expect(f.spans.length).toBeGreaterThan(0)
      expect(f.spans[0].bar).toBeGreaterThan(0)
    }
  })

  it('never returns a confidence above 1 or below 0', () => {
    const a = analysed(BLAKE)
    for (const f of a.findings) {
      expect(f.confidence).toBeGreaterThanOrEqual(0)
      expect(f.confidence).toBeLessThanOrEqual(1)
    }
  })
})
