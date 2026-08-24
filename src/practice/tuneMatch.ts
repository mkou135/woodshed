import type { Tune } from './tune.ts'

export interface TranspositionVote {
  /** Semitones to add to the concert chart to reach the solo's written pitch. */
  chromatic: number
  /** Fraction of compared bars whose root agrees under the winning shift. */
  agreement: number
  /** Agreement of the second-best shift. */
  runnerUp: number
  barsCompared: number
  /** True when the vote is decisive enough to override the chart's instrument. */
  confident: boolean
}

/** Winner needs at least this share of bars and this margin over the runner-up. */
export const MIN_AGREEMENT = 0.5
export const MIN_MARGIN = 2

/**
 * Which transposition of the concert chart matches the solo's own changes?
 * Chord players substitute and alter, so every bar votes on the root shift
 * and the majority wins; a tritone sub or a reharmonised turnaround loses
 * a vote, not the match. Bars are aligned from the first chorus start,
 * cycling through the chart, so the solo may run several choruses.
 */
export function inferTransposition(solo: Tune, concert: Tune): TranspositionVote | null {
  const n = concert.bars.length
  if (n === 0 || solo.bars.length === 0) return null
  const votes = new Array<number>(12).fill(0)
  let compared = 0
  solo.bars.forEach((bar, i) => {
    const a = bar.chords[0]
    const b = concert.bars[i % n].chords[0]
    if (!a || !b) return
    compared++
    votes[(((a.rootPc - b.rootPc) % 12) + 12) % 12]++
  })
  if (compared === 0) return null
  const order = votes.map((v, i) => ({ v, i })).sort((x, y) => y.v - x.v || x.i - y.i)
  const agreement = order[0].v / compared
  const runnerUp = order[1].v / compared
  return {
    chromatic: order[0].i,
    agreement,
    runnerUp,
    barsCompared: compared,
    confident: agreement >= MIN_AGREEMENT && order[0].v >= MIN_MARGIN * Math.max(1, order[1].v),
  }
}
