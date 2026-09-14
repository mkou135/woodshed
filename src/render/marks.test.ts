import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { runXml } from '../run.ts'
import { findingColour, markPlan, PAPER } from './marks.ts'
import { writtenBar } from '../core/bars.ts'

const load = (name: string) => runXml(readFileSync(`fixtures/${name}.musicxml`, 'utf8'))

describe('findingColour', () => {
  it('follows the page\'s lane precedence: language, device, cell, recurring', () => {
    expect(findingColour({ language: 'bebop', kind: 'cell', degrees: ['1'] })).toBe(PAPER.language)
    expect(findingColour({ kind: 'device' })).toBe(PAPER.device)
    expect(findingColour({ kind: 'cell', degrees: ['1', '3'] })).toBe(PAPER.cell)
    expect(findingColour({ kind: 'cell' })).toBe(PAPER.recurring)
  })
})

describe('markPlan', () => {
  it('colours every note of every finding span, at its written bar and beat', () => {
    const r = load('minimal-tenor')
    const marks = markPlan(r)
    for (const f of r.analysis.findings) {
      for (const s of f.spans) {
        for (let i = s.startIndex; i <= s.endIndex; i++) {
          const n = r.analysis.contexts[i].note
          const w = writtenBar(r.score, n.bar)
          if (w.pass === 2) continue
          expect(marks).toContainEqual({ kind: 'colour', bar: w.bar, beat: n.beat, colour: findingColour(f), findingId: f.id })
        }
      }
    }
  })

  it('labels each occurrence with the finding\'s panel number and name', () => {
    const r = load('minimal-tenor')
    const marks = markPlan(r)
    r.analysis.findings.forEach((f, i) => {
      const first = r.analysis.contexts[f.spans[0].startIndex].note
      const w = writtenBar(r.score, first.bar)
      expect(marks).toContainEqual({
        kind: 'text', bar: w.bar, beat: first.beat, text: `${i + 1} · ${f.name}`, placement: 'staff', colour: findingColour(f),
      })
    })
  })

  it('numbers phrases and their inner ideas the way the page does', () => {
    const r = load('minimal-tenor')
    const marks = markPlan(r).filter((m) => m.kind === 'text' && m.placement === 'system')
    const labels = marks.map((m) => (m as { text: string }).text)
    expect(labels[0]).toBe('1')
    r.analysis.phrases.forEach((p, i) => {
      expect(labels).toContain(String(i + 1))
      p.ideas.slice(1).forEach((_, j) => expect(labels).toContain(`${i + 1}.${j + 2}`))
    })
  })

  it('anchors a phrase that begins before its first note at the phrase onset', () => {
    const r = load('ties-tuplets-div24')
    const marks = markPlan(r)
    r.analysis.phrases.forEach((p, i) => {
      const first = p.notes[0]
      const barStart = first.onset - first.beat * 960
      const beat = (p.onset - barStart) / 960
      const w = writtenBar(r.score, first.bar)
      expect(marks).toContainEqual({ kind: 'text', bar: w.bar, beat, text: String(i + 1), placement: 'system', colour: PAPER.phrase })
    })
  })

  it('drops marks on a repeat\'s second pass', () => {
    const r = load('has-repeats')
    const marks = markPlan(r)
    // score.barCount counts played bars (after repeats are unrolled); the
    // written bar count is that minus the length of every repeated section.
    const repeatedLength = (r.score.repeats ?? []).reduce((n, { from, to }) => n + (to - from + 1), 0)
    const writtenBarCount = r.score.barCount - repeatedLength
    for (const m of marks) expect(m.bar).toBeLessThanOrEqual(writtenBarCount)
  })

  it('places each warn or blocking adjustment at its bar', () => {
    const r = load('two-soloists')
    const marks = markPlan(r)
    for (const a of r.report.adjustments) {
      if (a.severity === 'info') continue
      const bar = 'bar' in a.target ? a.target.bar : a.target.range[0]
      expect(marks).toContainEqual({ kind: 'text', bar: writtenBar(r.score, bar).bar, beat: 0, text: `⚠ ${a.reason}`, placement: 'staff', colour: PAPER.warning })
    }
  })

  it('is JSON-safe', () => {
    const marks = markPlan(load('minimal-tenor'))
    expect(JSON.parse(JSON.stringify(marks))).toEqual(marks)
  })
})
