import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { writeTemplate, checkWriting } from './write.ts'
import { instrumentFromTranspose } from '../../core/instrument.ts'
import { TICKS_PER_QUARTER as Q } from '../../core/types.ts'
import type { Chord } from '../../core/types.ts'
import type { Finding } from '../../analyse/index.ts'
import type { PracticeUnit, Step } from '../unit.ts'
import type { Tune } from '../tune.ts'

// Outside the repo (DECISIONS 2026-08-24 "Corpus licensing"). `checkWriting`
// is only worth testing against a score that actually contains the device —
// asserting "missing" on a fixture would pass even if the matcher never
// matched anything — so this suite skips where the solo is absent.
const BLAKE = '/Users/michaelkourkov/Documents/MuseScore4/Scores/Hey Lock! - Seamus Blake Solo Transcription.mxl'
const tenor = instrumentFromTranspose(-2, -1)

const cell: Finding = {
  id: 'f1', kind: 'cell', name: 'major-seventh arpeggio from the b3',
  spans: [{ startIndex: 0, endIndex: 3, bar: 1, beat: 0 }],
  degrees: ['3', '5', '7', '2'], intervals: [4, 3, 4], quality: 'minor-seventh',
  detectedBy: ['shape'], weights: { shape: 1 }, confidence: 1,
}
const c = (bar: number, rootPc: number, quality: Chord['quality'], onset = 0): Chord =>
  ({ onset, bar, rootPc, quality, tensions: [] })
const tune: Tune = {
  title: 'test', timeSig: [4, 4],
  bars: [{ chords: [c(1, 2, 'minor-seventh')] }, { chords: [c(2, 7, 'dominant')] }, { chords: [c(3, 0, 'major-seventh')] }],
}
const unit = {
  id: 'u1', phrase: 0, idea: 0, notes: [{ midi: 60, onset: 0, duration: Q, bar: 1, beat: 0 }],
  startIndex: 0, endIndex: 0, harmony: [], degrees: [], findings: [cell], arrival: null, stock: 0, stockParts: { run: 0, corpus: 0, language: 0 },
  summary: { bars: 'Bar 1', chords: [], cells: [], landing: null, alsoAt: [], stock: false },
    rank: 0, header: '',
} as Omit<PracticeUnit, 'steps'>

describe('writeTemplate', () => {
  const [step] = writeTemplate(unit, tune, tenor, 'test')

  it('marks the arrival degree as a cue on matching chords only', () => {
    expect(step.kind).toBe('write')
    const xml = step.kind === 'write' ? step.template : ''
    // One cue note: the 9 of Dm7 (E) in bar 1. The dominant and major bars are blank.
    expect(xml.match(/<cue\/>/g)).toHaveLength(1)
    expect(xml).toMatch(/<measure number="1">.*<cue\/><pitch><step>E<\/step>/s)
  })
})

describe.skipIf(!existsSync(BLAKE))('checkWriting', () => {
  it('finds the device in a file that contains it', () => {
    const result = checkWriting(new Uint8Array(readFileSync(BLAKE)), { findings: [cell] })
    expect(result.found).toEqual(['major-seventh arpeggio from the b3'])
    expect(result.bars['major-seventh arpeggio from the b3']).toContain(73)
  })

  it('reports a device that is missing', () => {
    const other: Finding = { ...cell, id: 'f9', name: 'minor cell 1345', degrees: ['1', '3', '4', '5'] }
    const result = checkWriting(new Uint8Array(readFileSync(BLAKE)), { findings: [other] })
    expect(result.missing).toEqual(['minor cell 1345'])
  })
})

describe('worked examples', () => {
  const dm: Chord = c(1, 2, 'minor-seventh')
  const eighth = Q / 2
  // Cell = the first four notes (3 5 7 2 over Dm7); four more notes follow.
  const midis = [65, 69, 72, 76, 74, 72, 69, 65]
  const rich = {
    ...unit,
    notes: midis.map((midi, i) => ({ midi, onset: i * eighth, duration: eighth, bar: 1, beat: i / 2 })),
    endIndex: 7,
    harmony: [dm],
  } as Omit<PracticeUnit, 'steps'>

  const [step] = writeTemplate(rich, tune, tenor, 'test') as Extract<Step, { kind: 'write' }>[]

  it('opens with device-labelled examples that keep the cell intact', () => {
    const titles = step.examples.map((e) => e.title)
    expect(titles.some((t) => t.startsWith('Fragmented'))).toBe(true)
    expect(titles.some((t) => t.startsWith('Diminished') || t.startsWith('Augmented'))).toBe(true)
  })

  it('drops a fragmentation that would cut the cell', () => {
    // Six notes: the fragment halves are three notes, the cell needs four.
    const cut = {
      ...rich,
      notes: rich.notes.slice(0, 6),
      endIndex: 5,
    } as Omit<PracticeUnit, 'steps'>
    const [short] = writeTemplate(cut, tune, tenor, 'test') as Extract<Step, { kind: 'write' }>[]
    expect(short.examples.map((e) => e.title).some((t) => t.startsWith('Fragmented'))).toBe(false)
  })

  it('keeps the template and prompt', () => {
    expect(step.template).toContain('cue')
    expect(step.prompt).toContain('now write a fourth')
  })
})
