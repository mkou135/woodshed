import type { Note } from '../core/types.ts'
import { CORPUS_FREQUENCY } from '../data/corpusFrequency.ts'

/** Notes in a corpus pattern: three intervals. */
export const PATTERN_NOTES = 4

/** Intervals as played, clipped to an octave so register leaps do not split a pattern. */
export function patternKey(notes: Note[]): string {
  return notes.slice(1)
    .map((n, i) => Math.max(-12, Math.min(12, n.midi - notes[i].midi)))
    .join(',')
}

/**
 * How much of a line is language rather than the player, by the corpus:
 * each note takes the largest share of WJD solos containing any 4-note
 * pattern that covers it; the unit's share is the mean over its notes. A
 * bebop scale fragment scores ~0.7, a bare maj7 arpeggio ~0.4, a figure the
 * corpus has not seen 0. `exempt` indexes are notes inside a named finding:
 * the dictionary already says that is vocabulary the player chose.
 */
export function corpusShare(notes: Note[], exempt: ReadonlySet<number> = new Set()): number {
  if (notes.length === 0) return 0
  const best = new Array<number>(notes.length).fill(0)
  for (let i = 0; i + PATTERN_NOTES <= notes.length; i++) {
    const share = CORPUS_FREQUENCY[patternKey(notes.slice(i, i + PATTERN_NOTES))] ?? 0
    for (let k = i; k < i + PATTERN_NOTES; k++) if (!exempt.has(k)) best[k] = Math.max(best[k], share)
  }
  return best.reduce((a, b) => a + b, 0) / notes.length
}
