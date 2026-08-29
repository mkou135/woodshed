import { describe, expect, it } from 'vitest'
import type { Analysis } from '../analyse/index.ts'
import type { PracticeUnit } from '../practice/unit.ts'
import type { Score } from '../core/types.ts'
import { analysisDocument, segmentDocument } from './evidence.ts'
import type { BoundaryCandidate } from '../analyse/segment.ts'

const score = { repeats: [] } as unknown as Score

const analysis = {
  phrases: [],
  contexts: [],
  findings: [
    {
      id: 'f1', kind: 'cell', name: 'major-seventh arpeggio from the b3',
      spans: [{ startIndex: 0, endIndex: 3, bar: 73, beat: 1 }],
      degrees: ['b3', '5', 'b7', '9'], detectedBy: ['shape', 'recurring'],
      weights: { shape: 1 }, confidence: 0.97,
    },
    {
      id: 'f2', kind: 'cell', name: 'dominant arpeggio 3 to the b9',
      spans: [{ startIndex: 8, endIndex: 11, bar: 97, beat: 0 }],
      degrees: ['3', '5', 'b7', 'b9'], detectedBy: ['shape'],
      weights: { shape: 1 }, confidence: 0.8, language: 'bebop', lickShare: 0.47,
    },
  ],
  profile: {
    bars: [],
    choruses: [],
    overall: {
      startBar: 63, endBar: 130, notes: 420, notesPerBar: 6.2, silence: 0.31,
      phrases: 18, meanPhraseNotes: 12, register: { lo: 55, hi: 84, mean: 70 },
      chromaticRatio: 0.14, findingIds: ['f1'],
    },
    phraseChromaticism: { start: 0.16, end: 0.13 },
  },
  scaleSpans: [],
} as unknown as Analysis

const units = [
  {
    id: 'u1', phrase: 3, idea: 1, notes: [], startIndex: 0, endIndex: 3,
    harmony: [{ onset: 0, bar: 76, rootPc: 0, quality: 'minor-seventh', tensions: [] }],
    degrees: [], findings: analysis.findings,
    arrival: { degree: '9', chordTone: false }, stock: 0.1,
    stockParts: { run: 0.1, corpus: 0.05, language: 0.61 }, rank: 2.5,
    header: 'x', summary: { bars: 'Bars 76–77', chords: ['Cm7'], landing: null, alsoAt: [], stock: false },
    steps: [],
  },
] as unknown as PracticeUnit[]

describe('analysisDocument', () => {
  it('names findings and units by id with their evidence', () => {
    const doc = analysisDocument(analysis, units, score)
    expect(doc).toContain('f1')
    expect(doc).toContain('major-seventh arpeggio from the b3')
    expect(doc).toContain('u1')
    expect(doc).toContain('Bars 76–77')
  })

  it('marks common-language findings and the unit stock split', () => {
    const doc = analysisDocument(analysis, units, score)
    expect(doc).toContain('common language (in 47% of recorded solos)')
    expect(doc).toContain('stock 0.10 (run 0.10, corpus 0.05, language 0.61)')
  })

  it('is deterministic', () => {
    expect(analysisDocument(analysis, units, score)).toBe(analysisDocument(analysis, units, score))
  })
})

describe('segmentDocument', () => {
  it('renders one line per candidate with its cue numbers', () => {
    const candidates = [
      { id: 'b12', index: 12, bar: 68, beat: 3, cue: { rest: 0.2, length: 0.1, leap: 0.05, rhythm: 0, gap: 240, total: 0.38, idea: 0.2 } },
    ] as BoundaryCandidate[]
    const doc = segmentDocument(candidates, [4, 4])
    expect(doc).toContain('b12')
    expect(doc).toContain('0.38')
  })
})
