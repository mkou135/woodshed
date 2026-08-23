import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { ingest } from '../ingest/index.ts'
import { prepare } from './index.ts'

const load = (name: string) => ingest(new Uint8Array(readFileSync(`fixtures/${name}`)))

describe('prepare', () => {
  it('reports a clean score with no blocking adjustments', () => {
    const report = prepare(load('form-8bar-x3.musicxml'))
    expect(report.counts.blocking).toBe(0)
    expect(report.needsUserDecision).toBe(false)
    expect(report.form?.periodBars).toBe(8)
    expect(report.soloists).toHaveLength(1)
  })

  it('blocks on a score with two soloists', () => {
    const report = prepare(load('two-soloists.musicxml'))
    expect(report.needsUserDecision).toBe(true)
    expect(report.counts.blocking).toBe(1)
    expect(report.soloists.map((s) => s.name)).toEqual(['Trane', 'Sonny'])
  })

  it('collects the pickup warning', () => {
    const report = prepare(load('unmarked-pickup.musicxml'))
    expect(report.adjustments.some((a) => a.kind === 'unmarked-pickup')).toBe(true)
  })

  it('collects altissimo as information, not as a problem', () => {
    const report = prepare(load('altissimo-tenor.musicxml'))
    expect(report.adjustments.some((a) => a.kind === 'range-outlier')).toBe(true)
    expect(report.counts.blocking).toBe(0)
  })

  it('collects transcriber doubt markers', () => {
    const report = prepare(load('transcriber-notes.musicxml'))
    expect(report.adjustments.filter((a) => a.kind === 'transcriber-note')).toHaveLength(2)
  })

  it('never mutates the score it is given', () => {
    const score = load('form-8bar-x3.musicxml')
    const before = JSON.stringify(score)
    prepare(score)
    expect(JSON.stringify(score)).toBe(before)
  })
})
