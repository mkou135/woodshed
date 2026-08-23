import { TICKS_PER_QUARTER } from '../core/types.ts'
import type { Note } from '../core/types.ts'

export interface Phrase {
  notes: Note[]
  startBar: number
  endBar: number
  confidence: number
}

/** A rest of this length or longer ends a phrase. */
const REST_THRESHOLD = TICKS_PER_QUARTER / 2

const REST_CONFIDENCE = 1
const STRUCTURAL_CONFIDENCE = 0.6

/**
 * Split a note stream into phrases on rests alone, plus any structural
 * boundaries supplied by the caller (chorus starts, soloist regions).
 *
 * Deliberately does NOT split on long notes or wide inter-onset intervals: a
 * probe over four real solos found both flatten the phrase-start/phrase-end
 * chromaticism asymmetry to nothing and fragment phrases into two-note pieces.
 * See docs/research/corpus-survey-cleanup.md.
 */
export function segment(notes: Note[], forcedBoundaryBars: number[] = []): Phrase[] {
  if (notes.length === 0) return []

  const forced = new Set(forcedBoundaryBars)
  const phrases: Phrase[] = []
  let current: Note[] = []
  let confidence = REST_CONFIDENCE

  const flush = (endedBy: number): void => {
    if (current.length === 0) return
    phrases.push({
      notes: current,
      startBar: current[0].bar,
      endBar: current[current.length - 1].bar,
      confidence,
    })
    current = []
    confidence = endedBy
  }

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i]

    // A forced bar boundary closes the phrase before this note joins it.
    if (current.length > 0 && forced.has(note.bar) && notes[i - 1].bar !== note.bar) {
      flush(STRUCTURAL_CONFIDENCE)
    }

    current.push(note)

    const next = notes[i + 1]
    if (!next) continue
    const gap = next.onset - (note.onset + note.duration)
    if (gap >= REST_THRESHOLD) flush(REST_CONFIDENCE)
  }

  flush(REST_CONFIDENCE)
  return phrases
}
