import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { run, describeFinding } from './pipeline.ts'
import type { Finding } from './analyse/index.ts'

const BLAKE = '/Users/michaelkourkov/Documents/MuseScore4/Scores/Hey Lock! - Seamus Blake Solo Transcription.mxl'

const finding = (over: Partial<Finding> = {}): Finding => ({
  id: 'f1',
  kind: 'cell',
  name: 'digital pattern 1235',
  spans: [{ startIndex: 0, endIndex: 3, bar: 73, beat: 2 }],
  degrees: ['1', '2', '3', '5'],
  detectedBy: ['shape'],
  confidence: 0.8,
  ...over,
})

describe('describeFinding', () => {
  it('describes a single occurrence with its bar and beat', () => {
    const view = describeFinding(finding())
    expect(view.location).toBe('bar 73, beat 3')
    expect(view.occurrences).toBe(1)
    expect(view.confidenceLabel).toBe('strong')
  })

  it('lists the bars when a finding recurs', () => {
    const view = describeFinding(finding({
      spans: [
        { startIndex: 0, endIndex: 3, bar: 73, beat: 2 },
        { startIndex: 40, endIndex: 43, bar: 77, beat: 0 },
      ],
    }))
    expect(view.location).toBe('bars 73, 77')
    expect(view.occurrences).toBe(2)
  })

  it('labels confidence bands', () => {
    expect(describeFinding(finding({ confidence: 0.7 })).confidenceLabel).toBe('strong')
    expect(describeFinding(finding({ confidence: 0.5 })).confidenceLabel).toBe('moderate')
    expect(describeFinding(finding({ confidence: 0.2 })).confidenceLabel).toBe('weak')
  })
})

describe('run', () => {
  it('runs the whole pipeline over a real solo', () => {
    const result = run(new Uint8Array(readFileSync(BLAKE)))
    expect(result.score.notes.length).toBeGreaterThan(0)
    expect(result.report.form?.periodBars).toBe(56)
    expect(result.findingViews.length).toBe(result.analysis.findings.length)
  })

  it('runs over every fixture without throwing, except the repeats one', () => {
    const names = [
      'minimal-tenor', 'kind-text-trap', 'words-chords-alto', 'unmarked-pickup',
      'two-soloists', 'form-8bar-x3', 'transposing-form', 'altissimo-tenor',
      'transcriber-notes', 'ties-tuplets-div24',
    ]
    for (const name of names) {
      expect(() => run(new Uint8Array(readFileSync(`fixtures/${name}.musicxml`)))).not.toThrow()
    }
  })
})
