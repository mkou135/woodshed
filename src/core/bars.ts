import type { Score } from './types.ts'

export interface WrittenBar {
  /** The bar number printed in the score. */
  bar: number
  /** 1 on the first pass through a repeated section, 2 on the second. */
  pass: 1 | 2
}

/**
 * Played bar (what `Note.bar` holds after repeats are unrolled) → the number
 * printed in the score. The player reads the printed page; every bar number
 * shown to them must be the printed one, and the rendered score is keyed by
 * printed numbers too. Identity for a score without repeats.
 */
export function writtenBar(score: Pick<Score, 'repeats'>, played: number): WrittenBar {
  let shift = 0
  for (const { from, to } of score.repeats ?? []) {
    const length = to - from + 1
    const secondPassStart = to + 1 + shift
    if (played < secondPassStart) break
    if (played < secondPassStart + length) return { bar: played - shift - length, pass: 2 }
    shift += length
  }
  return { bar: played - shift, pass: 1 }
}

/** "33", or "17 (2nd time)" inside a repeated section's second pass. */
export function barLabel(score: Pick<Score, 'repeats'>, played: number): string {
  const w = writtenBar(score, played)
  return w.pass === 2 ? `${w.bar} (2nd time)` : String(w.bar)
}

/** "bar 33" / "bars 33–36", in printed numbers. */
export function barRange(score: Pick<Score, 'repeats'>, from: number, to: number, capital = false): string {
  const word = capital ? 'Bar' : 'bar'
  if (from === to) return `${word} ${barLabel(score, from)}`
  return `${word}s ${barLabel(score, from)}–${barLabel(score, to)}`
}
