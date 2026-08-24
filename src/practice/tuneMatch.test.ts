import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { ingest } from '../ingest/index.ts'
import { tuneFromScore, transposeTune } from './tune.ts'
import { inferTransposition } from './tuneMatch.ts'
import type { Tune } from './tune.ts'

const load = (name: string) => ingest(new Uint8Array(readFileSync(`fixtures/${name}`)))

describe('inferTransposition', () => {
  const concert = tuneFromScore(load('form-8bar-x3.musicxml'), [1, 9, 17])

  it('finds the shift between a concert chart and the written changes', () => {
    const written = transposeTune(concert, 2)
    const vote = inferTransposition(written, concert)!
    expect(vote.chromatic).toBe(2)
    expect(vote.agreement).toBe(1)
    expect(vote.confident).toBe(true)
  })

  it('survives substitutions: a minority of bars with other roots loses votes, not the match', () => {
    const written = transposeTune(concert, 9)
    const subbed: Tune = {
      ...written,
      bars: written.bars.map((b, i) =>
        i % 4 === 1 ? { chords: b.chords.map((c) => ({ ...c, rootPc: (c.rootPc + 6) % 12 })) } : b),
    }
    const vote = inferTransposition(subbed, concert)!
    expect(vote.chromatic).toBe(9)
    expect(vote.agreement).toBe(0.75)
    expect(vote.confident).toBe(true)
  })

  it('is not confident when the changes do not fit the chart', () => {
    const other: Tune = {
      ...concert,
      bars: concert.bars.map((b, i) => ({ chords: b.chords.map((c) => ({ ...c, rootPc: (c.rootPc + i * 5) % 12 })) })),
    }
    const vote = inferTransposition(other, concert)!
    expect(vote.confident).toBe(false)
  })

  it('cycles the chart when the solo runs several choruses', () => {
    const three = tuneFromScore(load('form-8bar-x3.musicxml'), [1])
    expect(three.bars.length).toBe(24)
    expect(inferTransposition(transposeTune(three, 3), concert)!.chromatic).toBe(3)
  })

  it('returns null with nothing to compare', () => {
    expect(inferTransposition({ title: '', timeSig: [4, 4], bars: [] }, concert)).toBeNull()
  })
})
