import { describe, expect, it } from 'vitest'
import { instrumentFromTranspose } from '../../core/instrument.ts'
import { TICKS_PER_QUARTER as Q } from '../../core/types.ts'
import type { Chord, Note, Score } from '../../core/types.ts'
import type { PracticeUnit } from '../unit.ts'
import { visualiseStep } from './visualise.ts'

const chord = (rootPc: number, quality: Chord['quality'], onset: number, bar: number): Chord => ({
  rootPc, quality, onset, bar, tensions: [],
})
const notes: Note[] = [62, 65, 69, 72].map((midi, i) => ({ midi, onset: i * Q / 2, duration: Q / 2, bar: 1, beat: i / 2 }))
const score: Score = {
  notes, chordTracks: [{ chords: [chord(2, 'minor-seventh', 0, 1)], provenance: 'file', confidence: 1 }],
  instrument: instrumentFromTranspose(0, 0), timeSig: [4, 4], marks: [], barCount: 2,
}
const unit = (over: Partial<Omit<PracticeUnit, 'steps'>> = {}): Omit<PracticeUnit, 'steps'> => ({
  id: 'u1', phrase: 0, idea: 0, notes, startIndex: 0, endIndex: 3,
  harmony: [chord(2, 'minor-seventh', 0, 1)], degrees: ['1', '3', '5', '7'],
  findings: [{
    id: 'f1', kind: 'cell', name: 'minor seventh arpeggio', lemma: 'minor seventh arpeggio', ordering: '1-3-5-7',
    spans: [{ startIndex: 0, endIndex: 3, bar: 1, beat: 0 }],
    degrees: ['1', '3', '5', '7'], intervals: [3, 4, 3], quality: 'minor-seventh',
    detectedBy: ['shape'], weights: { shape: 1 }, confidence: 1,
  }],
  arrival: { degree: '7', chordTone: true }, stock: 0, stockParts: { run: 0, corpus: 0, language: 0 }, rank: 1, header: '',
  summary: { bars: 'Bar 1', chords: ['Dm7'], landing: '7', alsoAt: ['9', '17'], stock: false, resolves: false },
  ...over,
})

describe('visualiseStep', () => {
  it('is a step with cues and no exercise', () => {
    const step = visualiseStep(unit(), score)
    expect(step.kind).toBe('visualise')
    expect(step.prompt).toMatch(/away from the horn/i)
    expect(step.cues).toEqual([
      'The changes: Dm7.',
      'Hear the minor seventh arpeggio, landing on the 7.',
      'Then hear it where it comes back: bars 9, 17.',
      'Check one thing against the record at bar 1 — the note you were least sure of.',
    ])
  })

  it('degrades to the changes and the record when there is nothing named and nowhere else', () => {
    const step = visualiseStep(unit({ findings: [], arrival: null, summary: { bars: 'Bar 1', chords: ['Dm7'], landing: null, alsoAt: [], stock: false, resolves: false } }), score)
    expect(step.cues).toEqual([
      'The changes: Dm7.',
      'Hear the line as played, every note.',
      'Check one thing against the record at bar 1 — the note you were least sure of.',
    ])
  })
})
