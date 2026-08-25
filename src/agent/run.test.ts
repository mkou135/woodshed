import { describe, expect, it } from 'vitest'
import { boundaryCandidates } from '../analyse/segment.ts'
import { TICKS_PER_QUARTER as Q } from '../core/types.ts'
import type { Note, Score } from '../core/types.ts'
import type { CleanupReport } from '../prepare/index.ts'
import { tuneFromScore } from '../practice/tune.ts'
import { replayClient } from './client.ts'
import { runAgent } from './run.ts'

/** Notes back to back from [midi, quarters, gapAfter-in-quarters]. */
function notesFrom(spec: [number, number, number][]): Note[] {
  const out: Note[] = []
  let onset = 0
  for (const [midi, dur, gap] of spec) {
    const duration = dur * Q
    out.push({ midi, onset, duration, bar: Math.floor(onset / (4 * Q)) + 1, beat: (onset % (4 * Q)) / Q })
    onset += duration + gap * Q
  }
  return out
}

const notes = notesFrom([
  [60, 1, 0], [62, 1, 0], [64, 1, 0.75], [65, 1, 0], [67, 1, 0], [69, 1, 0], [72, 1, 0], [74, 1, 0],
])
const score = {
  notes,
  chordTracks: [],
  instrument: { name: 'test', transpose: 0, writtenRange: { lo: 0, hi: 127 } },
  timeSig: [4, 4],
  keyFifths: 0,
  marks: [],
  barCount: 4,
} as unknown as Score
const report = { soloists: [], form: null, adjustments: [], counts: {}, needsUserDecision: false } as unknown as CleanupReport
const buildOptions = { tune: tuneFromScore(score) }

describe('runAgent', () => {
  it('degrades every job to the deterministic path with no fixtures', async () => {
    const result = await runAgent(replayClient({}), score, report, buildOptions)
    expect(result.agent.degraded).toEqual(['segment', 'rank', 'narrate', 'construct'])
    expect(result.agent.narration).toBeNull()
    expect(result.analysis.phrases.length).toBeGreaterThan(0)
  })

  it('applies boundary verdicts before the analysis the other jobs see', async () => {
    const plain = await runAgent(replayClient({}), score, report, buildOptions)
    const below = boundaryCandidates(notes).filter((c) => c.cue.total < 0.45)
    expect(below.length).toBeGreaterThan(0)
    const client = replayClient({
      segment: { verdicts: [{ candidateId: below[0].id, boundary: true, cue: 'rest' }] },
    })
    const adjudicated = await runAgent(client, score, report, buildOptions)
    expect(adjudicated.agent.boundaries).toEqual(new Map([[below[0].index, true]]))
    expect(adjudicated.analysis.phrases.length).toBeGreaterThan(plain.analysis.phrases.length)
    expect(adjudicated.agent.degraded).not.toContain('segment')
  })
})
