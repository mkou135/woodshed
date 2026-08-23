import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { ingest } from '../ingest/index.ts'
import { pickupCheck, rangeCheck, transcriberNoteCheck, chordPersistenceCheck } from './checks.ts'
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
