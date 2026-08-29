import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { ingest, prepare } from '../index.ts'
import { analyse } from './index.ts'

const analysed = (path: string) => {
  const score = ingest(new Uint8Array(readFileSync(path)))
  return analyse(score, prepare(score))
}

// The Blake transcription lives outside the repo (DECISIONS 2026-08-24
// "Corpus licensing"). Invariants that any solo exhibits are asserted on a
// fixture so a fresh clone still runs them; only what needs a long real solo
// — merge regressions, detector convergence — is guarded on the path.
const FIXTURE = 'fixtures/words-chords-alto.musicxml'
const BLAKE = '/Users/michaelkourkov/Documents/MuseScore4/Scores/Hey Lock! - Seamus Blake Solo Transcription.mxl'

describe('analyse', () => {
  it('segments, contextualises and finds nothing alarming on a fixture', () => {
    const a = analysed('fixtures/form-8bar-x3.musicxml')
    expect(a.phrases.length).toBeGreaterThan(0)
    expect(a.contexts.length).toBeGreaterThan(0)
    expect(Array.isArray(a.findings)).toBe(true)
  })

  it('sorts findings by confidence, highest first', () => {
    // Two findings at 0.85 and 0.826: an order this fixture can actually get
    // wrong, unlike a one-finding score.
    const a = analysed(FIXTURE)
    const scores = a.findings.map((f) => f.confidence)
    expect([...scores].sort((x, y) => y - x)).toEqual(scores)
  })

  it('gives every finding a location in the score', () => {
    const a = analysed(FIXTURE)
    for (const f of a.findings) {
      expect(f.spans.length).toBeGreaterThan(0)
      expect(f.spans[0].bar).toBeGreaterThan(0)
    }
  })

  it('never returns a confidence above 1 or below 0', () => {
    const a = analysed(FIXTURE)
    for (const f of a.findings) {
      expect(f.confidence).toBeGreaterThanOrEqual(0)
      expect(f.confidence).toBeLessThanOrEqual(1)
    }
  })
})

// Needs a score where some findings converge and others do not; no fixture is
// long enough to hold both, so this one stays on the real solo.
describe.skipIf(!existsSync(BLAKE))('detector convergence', () => {
  it('scores a finding seen by two detectors above one seen by a single detector', () => {
    const a = analysed(BLAKE)
    const converged = a.findings.filter((f) => f.detectedBy.length > 1)
    const single = a.findings.filter((f) => f.detectedBy.length === 1)
    if (converged.length && single.length) {
      expect(Math.max(...converged.map((f) => f.confidence)))
        .toBeGreaterThan(Math.min(...single.map((f) => f.confidence)))
    }
  })
})

// These assert magnitudes only a long real solo exhibits — a fixture with one
// or two findings cannot regress any of them.
describe.skipIf(!existsSync(BLAKE))('finding merge rules', () => {
  it('merges the same cell occurring in different bars into one finding', () => {
    // Regression: the first merge rule required identity AND overlapping spans,
    // so the same vocabulary in two bars stayed separate and produced two
    // identical exercises.
    const a = analysed(BLAKE)
    const byName = new Map<string, number>()
    for (const f of a.findings) byName.set(f.name, (byName.get(f.name) ?? 0) + 1)
    for (const [name, count] of byName) {
      expect(count, `"${name}" appears as ${count} separate findings`).toBe(1)
    }
  })

  it('converges detectors on the strongest finding', () => {
    // The Blake solo contains a maj7 arpeggio off the b3 at bars 73 and 77.
    // Three independent detectors should land on it.
    const a = analysed(BLAKE)
    const top = a.findings[0]
    expect(top.detectedBy.length).toBeGreaterThan(1)
    expect(top.confidence).toBeGreaterThan(0.9)
  })

  it('never grafts a foreign interval vector onto a cell with degrees', () => {
    // Regression: absorbing a recurring cell's intervals into a shape finding
    // gave a 6-interval vector for a 4-degree cell, so every generated
    // exercise failed the validity gate and silently vanished.
    const a = analysed(BLAKE)
    for (const f of a.findings) {
      if (f.degrees && f.intervals) {
        expect(f.intervals).toHaveLength(f.degrees.length - 1)
      }
    }
  })

  it('finds the maj7-arpeggio-off-the-b3 figure that was derived by hand', () => {
    const a = analysed(BLAKE)
    const cell = a.findings.find((f) => f.degrees?.join('') === '3572')
    expect(cell).toBeDefined()
    const bars = new Set(cell!.spans.map((s) => s.bar))
    expect(bars.has(73)).toBe(true)
    expect(bars.has(77)).toBe(true)
    // Regression: convergence used to absorb spans, so a finding snowballed —
    // a wider span overlapped more findings, widening it further, until one
    // finding claimed 36 bars of the solo.
    expect(bars.size).toBeLessThanOrEqual(4)
  })

  it('keeps every finding local rather than claiming the whole solo', () => {
    const a = analysed(BLAKE)
    const soloBars = new Set(a.contexts.map((c) => c.note.bar)).size
    for (const f of a.findings) {
      const bars = new Set(f.spans.map((s) => s.bar)).size
      expect(bars, `"${f.name}" claims ${bars} of ${soloBars} bars`)
        .toBeLessThan(soloBars / 3)
    }
  })
})

const ST_THOMAS = '/Users/michaelkourkov/dev/woodshed-data/peers/st-thomas-sonny-rollins-solo-transcription.mxl'

describe.skipIf(!existsSync(ST_THOMAS))('language marker', () => {
  it('carries language through the merge to the finding', () => {
    const a = analysed(ST_THOMAS)
    const named = a.findings.filter((f) => f.language === 'bebop')
    expect(named.map((f) => f.name)).toContain('dominant arpeggio 3 to the b9')
  })
})
