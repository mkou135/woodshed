import type { Chord, Quality } from './types.ts'

/** Semitones above the root -> degree label, for major-family chords. */
const MAJOR_FAMILY: Record<number, string> = {
  0: '1', 1: 'b9', 2: '2', 3: '#9', 4: '3', 5: '4',
  6: '#11', 7: '5', 8: 'b13', 9: '6', 10: 'b7', 11: '7',
}

/**
 * Minor-family numbering, where the minor third is simply "3" — this is how
 * players talk ("1345 over minor"), and it is what makes the same shape read
 * correctly over a minor chord.
 */
const MINOR_FAMILY: Record<number, string> = {
  0: '1', 1: 'b9', 2: '2', 3: '3', 4: '#3', 5: '4',
  6: 'b5', 7: '5', 8: 'b6', 9: '6', 10: '7', 11: 'n7',
}

const MINOR_QUALITIES: ReadonlySet<Quality> = new Set<Quality>([
  'minor', 'minor-seventh', 'minor-major', 'half-diminished',
  'diminished', 'diminished-seventh',
])

const CHORD_TONES: Record<Quality, number[]> = {
  'major': [0, 4, 7],
  'minor': [0, 3, 7],
  'dominant': [0, 4, 7, 10],
  'major-seventh': [0, 4, 7, 11],
  'minor-seventh': [0, 3, 7, 10],
  'half-diminished': [0, 3, 6, 10],
  'diminished': [0, 3, 6],
  'diminished-seventh': [0, 3, 6, 9],
  'minor-major': [0, 3, 7, 11],
  'augmented': [0, 4, 8],
  'augmented-seventh': [0, 4, 8, 10],
  'suspended-fourth': [0, 5, 7, 10],
  'unknown': [0],
}

export function pitchClass(midi: number): number {
  return ((midi % 12) + 12) % 12
}

/** Successive semitone differences. One element shorter than the input. */
export function intervalsOf(midis: number[]): number[] {
  const out: number[] = []
  for (let i = 0; i < midis.length - 1; i++) out.push(midis[i + 1] - midis[i])
  return out
}

/** Chord-relative degree label, with chromatics named explicitly. */
export function degreeOf(midi: number, chord: Chord): string {
  const semis = pitchClass(midi - chord.rootPc)
  const table = MINOR_QUALITIES.has(chord.quality) ? MINOR_FAMILY : MAJOR_FAMILY
  return table[semis]
}

export function isChordTone(midi: number, chord: Chord): boolean {
  return CHORD_TONES[chord.quality].includes(pitchClass(midi - chord.rootPc))
}

/** Inverse of degreeOf: a degree label and chord quality back to semitones. */
export function semitonesOfDegree(degree: string, quality: Quality): number | null {
  const table = MINOR_QUALITIES.has(quality) ? MINOR_FAMILY : MAJOR_FAMILY
  for (const [semis, label] of Object.entries(table)) {
    if (label === degree) return Number(semis)
  }
  return null
}
