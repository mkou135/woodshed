import type { Chord, Note } from '../core/types.ts'
import { degreeOf, isChordTone } from '../core/pitch.ts'

export interface NoteContext {
  note: Note
  chord: Chord | null
  degree: string | null
  chordTone: boolean
  chromatic: boolean
  /** Which phrase this note belongs to; set by analyse() after segmentation. */
  phrase: number
  /** Which idea (a gesture within a phrase), numbered across the solo. */
  idea: number
}

/**
 * Do these notes sit in one idea? A figure never straddles a boundary: a
 * cell across a held arrival is two gestures, not one piece of vocabulary.
 */
export function samePhrase(ctx: NoteContext[], from: number, to: number): boolean {
  const idea = ctx[from]?.idea
  for (let i = from; i <= to; i++) if (ctx[i]?.idea !== idea) return false
  return true
}

/** The chord sounding at an onset, or null if none has started yet. */
export function chordAt(chords: Chord[], onset: number): Chord | null {
  let found: Chord | null = null
  for (const chord of chords) {
    if (chord.onset <= onset) found = chord
    else break
  }
  return found
}

/**
 * Pair each note with the chord sounding under it and its degree.
 *
 * `chromatic` means altered AND not a chord tone. Spelling alone is not
 * enough: the b7 of a dominant carries a flat but is the most consonant note
 * in the chord, and treating it as chromatic hides real signal.
 */
export function contextualise(notes: Note[], chords: Chord[]): NoteContext[] {
  const sorted = [...chords].sort((a, b) => a.onset - b.onset)

  return notes.map((note) => {
    const chord = chordAt(sorted, note.onset)
    if (!chord) {
      return { note, chord: null, degree: null, chordTone: false, chromatic: false, phrase: 0, idea: 0 }
    }
    const degree = degreeOf(note.midi, chord)
    const chordTone = isChordTone(note.midi, chord)
    return {
      note,
      chord,
      degree,
      chordTone,
      chromatic: /^[b#]/.test(degree) && !chordTone,
      phrase: 0,
      idea: 0,
    }
  })
}
