import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { ingest } from '../ingest/index.ts'
import { pickupCheck, rangeCheck, transcriberNoteCheck, chordPersistenceCheck, emptyStretchCheck } from './checks.ts'
import { instrumentFromTranspose } from '../core/instrument.ts'
import { TICKS_PER_QUARTER as Q } from '../core/types.ts'
import type { Score } from '../core/types.ts'
import { detectForm } from './form.ts'

const load = (name: string) => ingest(new Uint8Array(readFileSync(`fixtures/${name}`)))

describe('pickupCheck', () => {
  it('flags a first bar that is short but not marked implicit', () => {
    const adjustments = pickupCheck(load('unmarked-pickup.musicxml'))
    expect(adjustments).toHaveLength(1)
    expect(adjustments[0].kind).toBe('unmarked-pickup')
    expect(adjustments[0].severity).toBe('warn')
    expect(adjustments[0].target).toEqual({ bar: 1 })
  })

  it('does not flag a score whose bars all sum correctly', () => {
    expect(pickupCheck(load('minimal-tenor.musicxml'))).toEqual([])
  })
})

describe('rangeCheck', () => {
  it('flags notes above the normal written range as info, never as an error', () => {
    const adjustments = rangeCheck(load('altissimo-tenor.musicxml'))
    expect(adjustments.length).toBeGreaterThan(0)
    expect(adjustments.every((a) => a.severity === 'info')).toBe(true)
    expect(adjustments[0].kind).toBe('range-outlier')
    expect(adjustments[0].reason).toMatch(/altissimo/i)
  })

  it('does not flag notes inside the range', () => {
    expect(rangeCheck(load('minimal-tenor.musicxml'))).toEqual([])
  })
})

describe('transcriberNoteCheck', () => {
  it('flags words that mark doubtful transcription', () => {
    const adjustments = transcriberNoteCheck(load('transcriber-notes.musicxml'))
    expect(adjustments.map((a) => a.target)).toEqual([{ bar: 2 }, { bar: 3 }])
    expect(adjustments.every((a) => a.kind === 'transcriber-note')).toBe(true)
  })

  it('ignores ordinary performance directions', () => {
    const texts = transcriberNoteCheck(load('transcriber-notes.musicxml'))
      .map((a) => String(a.before))
    expect(texts).not.toContain('Swing')
  })
})

describe('chordPersistenceCheck', () => {
  it('does not flag a form where every bar carries its own chord', () => {
    const score = load('form-8bar-x3.musicxml')
    expect(chordPersistenceCheck(score, detectForm(score))).toEqual([])
  })

  it('flags a chord persisting across most of a detected form', () => {
    const score = load('two-soloists.musicxml')
    // Bars 1-4 all carry F7 and bars 5-8 all carry Bb7, so nothing persists
    // unusually; a null form means the check has no period to compare against.
    expect(chordPersistenceCheck(score, null)).toEqual([])
  })
})

describe('emptyStretchCheck', () => {
  const scoreWithNotesIn = (bars: number[]): Score => ({
    notes: bars.map((bar) => ({ midi: 60, onset: (bar - 1) * 4 * Q, duration: Q, bar, beat: 0 })),
    chordTracks: [],
    instrument: instrumentFromTranspose(-9, 0),
    timeSig: [4, 4],
    marks: [],
    barCount: 128,
  })
  const form = { periodBars: 16, agreement: 1, method: 'absolute' as const, chorusStarts: [1], phaseFrom: 'none' as const, agreesWithMarks: true }

  it('reports a run of empty bars at least one chorus long as another player\'s solo', () => {
    // Notes through bar 16, nothing until bar 97: five empty choruses.
    const bars = [...Array.from({ length: 16 }, (_, i) => i + 1), 97, 100, 112]
    const adjustments = emptyStretchCheck(scoreWithNotesIn(bars), form)
    expect(adjustments).toHaveLength(1)
    expect(adjustments[0]).toMatchObject({ kind: 'empty-stretch', severity: 'info', target: { range: [17, 96] } })
    expect(adjustments[0].reason).toContain('80 empty bars')
    expect(adjustments[0].reason).toContain('5 choruses')
  })

  it('ignores rests shorter than a chorus and the silence before the first note', () => {
    expect(emptyStretchCheck(scoreWithNotesIn([17, 18, 30, 45, 60]), form)).toEqual([])
  })

  it('uses 8 bars as the threshold when no form was found', () => {
    expect(emptyStretchCheck(scoreWithNotesIn([1, 10]), null)).toHaveLength(1)
    expect(emptyStretchCheck(scoreWithNotesIn([1, 9]), null)).toEqual([])
  })
})
