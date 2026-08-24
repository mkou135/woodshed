/** All durations and onsets are in ticks; 960 ticks = one quarter note. */
export const TICKS_PER_QUARTER = 960

export type Provenance = 'file' | 'reference' | 'user' | 'inferred'

export type Quality =
  | 'major'
  | 'minor'
  | 'dominant'
  | 'major-seventh'
  | 'minor-seventh'
  | 'half-diminished'
  | 'diminished'
  | 'diminished-seventh'
  | 'minor-major'
  | 'augmented'
  | 'augmented-seventh'
  | 'suspended-fourth'
  | 'unknown'

export interface Note {
  /** Written pitch as a MIDI number. */
  midi: number
  /** Ticks from the start of the score. */
  onset: number
  duration: number
  bar: number
  /** 0-based position within the bar, in quarter notes. */
  beat: number
  /** True when this note absorbed a following tied note. */
  tiedFrom?: boolean
}

export interface Chord {
  onset: number
  bar: number
  /** Root pitch class, 0-11, C = 0. */
  rootPc: number
  quality: Quality
  /** Added or altered degrees, e.g. ['b13', '#11']. */
  tensions: string[]
}

export interface ChordTrack {
  chords: Chord[]
  provenance: Provenance
  confidence: number
}

export interface Instrument {
  name: string
  transpose: { chromatic: number; octave: number }
  /** Normal written range as MIDI numbers. */
  writtenRange: { lo: number; hi: number }
  /** Highest written note reachable in altissimo, if the instrument has one. */
  altissimoTo?: number
  /** False when the transposition did not match a known instrument. */
  rangeKnown: boolean
}

export interface Mark {
  bar: number
  /** 'double-bar' sits on the bar *after* a light-light barline. */
  kind: 'rehearsal' | 'words' | 'double-bar'
  /** Verbatim. Never normalised at ingest; '' for a double bar. */
  text: string
}

export interface Score {
  /** <work-title>, else <movement-title>; verbatim, may be a placeholder like 'Title'. */
  title?: string
  notes: Note[]
  chordTracks: ChordTrack[]
  instrument: Instrument
  timeSig: [number, number]
  marks: Mark[]
  barCount: number
}
