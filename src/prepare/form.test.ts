import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { ingest } from '../ingest/index.ts'
import { detectForm, formAdjustments } from './form.ts'

const load = (name: string) => ingest(new Uint8Array(readFileSync(`fixtures/${name}`)))

describe('detectForm', () => {
  it('finds an 8-bar repeating form by absolute root', () => {
    const form = detectForm(load('form-8bar-x3.musicxml'))!
    expect(form.periodBars).toBe(8)
    expect(form.agreement).toBe(1)
    expect(form.method).toBe('absolute')
    expect(form.chorusStarts).toEqual([1, 9, 17])
  })

  it('agrees with the rehearsal marks when they are present', () => {
    expect(detectForm(load('form-8bar-x3.musicxml'))!.agreesWithMarks).toBe(true)
  })

  it('falls back to root intervals for a form that transposes each chorus', () => {
    const form = detectForm(load('transposing-form.musicxml'))!
    expect(form.method).toBe('relative')
    expect(form.periodBars).toBe(4)
    expect(form.agreement).toBe(1)
  })

  it('returns null when there are too few chords to test', () => {
    expect(detectForm(load('minimal-tenor.musicxml'))).toBeNull()
  })
})

describe('formAdjustments', () => {
  it('reports the detected form as an info adjustment', () => {
    const score = load('form-8bar-x3.musicxml')
    const adjustments = formAdjustments(detectForm(score), score)
    expect(adjustments).toHaveLength(1)
    expect(adjustments[0].kind).toBe('form-period')
    expect(adjustments[0].severity).toBe('info')
  })

  it('reports nothing when no form was found', () => {
    const score = load('minimal-tenor.musicxml')
    expect(formAdjustments(null, score)).toEqual([])
  })
})

describe('form phase', () => {
  it('starts the choruses at the double bars, not bar 1, when a chart has an intro', () => {
    const form = detectForm(load('form-intro-doublebars.musicxml'))!
    expect(form.periodBars).toBe(8)
    expect(form.chorusStarts).toEqual([5, 13, 21])
    expect(form.phaseFrom).toBe('double-bar')
    expect(form.agreesWithMarks).toBe(true)
  })

  it('reports where the phase came from', () => {
    expect(detectForm(load('form-8bar-x3.musicxml'))!.phaseFrom).toBe('rehearsal')
    expect(detectForm(load('transposing-form.musicxml'))!.phaseFrom).toBe('none')
  })
})

describe('form phase with letters inside the chorus', () => {
  it('phases from the earliest rehearsal letter even when no two letters are a period apart', () => {
    const form = detectForm(load('form-letters-in-chorus.musicxml'))!
    expect(form.periodBars).toBe(8)
    expect(form.chorusStarts).toEqual([2, 10])
    expect(form.phaseFrom).toBe('rehearsal')
  })
})

describe('form phase with a pickup bar and no marks', () => {
  it('treats a first bar that only has notes in its second half as a pickup', () => {
    const form = detectForm(load('form-pickup-bar.musicxml'))!
    expect(form.periodBars).toBe(8)
    expect(form.chorusStarts).toEqual([2, 10])
    expect(form.phaseFrom).toBe('pickup')
    expect(form.agreesWithMarks).toBe(false)
  })
})
