import { TICKS_PER_QUARTER } from '../core/types.ts'
import type { Chord, Score } from '../core/types.ts'

export interface TuneBar {
  chords: Chord[]
}

/** A set of changes to take vocabulary through: this solo's, or a chart. */
export interface Tune {
  title: string
  timeSig: [number, number]
  /** Unrolled, one entry per bar played; chords in the player's written pitch. */
  bars: TuneBar[]
}

export function barTicks(timeSig: [number, number]): number {
  return (timeSig[0] * 4 * TICKS_PER_QUARTER) / timeSig[1]
}

/** One chorus of the solo's own changes, in the order they are written. */
export function tuneFromScore(score: Score, chorusStarts: number[] = []): Tune {
  const chords = score.chordTracks[0]?.chords ?? []
  const ticks = barTicks(score.timeSig)
  // The first chorus with chords under at least half its bars: a chordless
  // intro (St Thomas: 16 empty bars, then the head) is not the changes.
  const starts = chorusStarts.length ? chorusStarts : [1]
  let pick = 0
  for (let k = 0; k < starts.length; k++) {
    const a = starts[k]
    const b = starts[k + 1] !== undefined ? starts[k + 1] - 1 : score.barCount
    const withChord = new Set(chords.filter((c) => c.bar >= a && c.bar <= b).map((c) => c.bar)).size
    if (withChord * 2 >= b - a + 1) { pick = k; break }
  }
  const from = starts[pick]
  const to = starts[pick + 1] !== undefined ? starts[pick + 1] - 1 : score.barCount
  const bars: TuneBar[] = []
  let carried: Chord | null = null
  for (let bar = from; bar <= to; bar++) {
    const here = chords
      .filter((c) => c.bar === bar)
      .map((c) => ({ ...c, onset: c.onset - (bar - 1) * ticks }))
    if (here.length === 0 || here[0].onset > 0) {
      // A bar that starts without a chord symbol is still under the last one.
      if (carried) here.unshift({ ...carried, onset: 0, bar })
    }
    if (here.length > 0) carried = here[here.length - 1]
    bars.push({ chords: here })
  }
  return { title: 'this solo', timeSig: score.timeSig, bars }
}

/** Every bar whose chords all belong to the given quality set. */
export function transposeTune(tune: Tune, semitones: number): Tune {
  return {
    ...tune,
    bars: tune.bars.map((b) => ({
      chords: b.chords.map((c) => ({ ...c, rootPc: (((c.rootPc + semitones) % 12) + 12) % 12 })),
    })),
  }
}
