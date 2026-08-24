import { TICKS_PER_QUARTER } from '../core/types.ts'
import type { Chord, Mark, Note, Score } from '../core/types.ts'
import { instrumentFromTranspose } from '../core/instrument.ts'
import { parseChordSymbol } from './parseChordText.ts'

/**
 * Weimar Jazz Database rows → Score. The database is SQLite; this module
 * takes plain rows so that `src/` stays free of node APIs, and the eval
 * scripts do the querying.
 */

export interface WjdSolo {
  melid: number
  title: string
  performer: string
  /** WJD instrument code: ts, as, tp, tb, p, g … */
  instrument: string
}

export interface WjdMelodyRow {
  onset: number
  /** Concert MIDI pitch. */
  pitch: number
  duration: number
  /** Beats per bar. */
  period: number
  /** Tatums per beat. */
  division: number
  bar: number
  beat: number
  tatum: number
  beatdur: number
}

export interface WjdBeatRow {
  bar: number
  beat: number
  /** WJD chord symbol at this beat, '' when the chord carries on, 'NC' for none. */
  chord: string
  /** Form label such as A1, B2, I1 (intro); '' between labels. */
  form: string
  /** 'num/denom' or ''. */
  signature: string
}

const Q = TICKS_PER_QUARTER

/**
 * Transposition per WJD instrument code: how the instrument's written pitch
 * relates to concert, as MusicXML <transpose> chromatic + octave-change.
 */
const TRANSPOSE: Record<string, [number, number]> = {
  ts: [-2, -1], ss: [-2, 0], tp: [-2, 0], cor: [-2, 0], cl: [-2, 0], bcl: [-2, -1],
  as: [-9, 0], bs: [-9, -1],
}

function writtenFromConcert(midi: number, code: string): number {
  const [chromatic, octave] = TRANSPOSE[code] ?? [0, 0]
  return midi - (chromatic + 12 * octave)
}

/** Concert-pitch note rows → notes on the tick grid, bar 1 = the earliest bar. */
export function notesFromWjd(rows: WjdMelodyRow[], minBar: number, code = ''): Note[] {
  const notes: Note[] = []
  for (const r of rows) {
    const quarters = (r.bar - minBar) * r.period + (r.beat - 1) + (r.tatum - 1) / r.division
    const onset = Math.round(quarters * Q)
    const beats = r.beatdur > 0 ? r.duration / r.beatdur : 0.5
    const grid = Q / Math.max(1, r.division)
    const duration = Math.max(grid, Math.round((beats * Q) / grid) * grid)
    notes.push({
      midi: writtenFromConcert(r.pitch, code),
      onset,
      duration,
      bar: r.bar - minBar + 1,
      beat: quarters % r.period,
    })
  }
  // No overlaps: a note ends where the next begins at the latest.
  for (let i = 0; i < notes.length - 1; i++) {
    const floor = Math.min(notes[i].duration, Q / 4)
    notes[i].duration = Math.min(notes[i].duration, Math.max(floor, notes[i + 1].onset - notes[i].onset))
  }
  return notes
}

/** WJD spells major seventh as `j7` / `j`, and alterations after the quality. */
export function wjdChordText(chord: string): string {
  return chord
    .replace(/j7?/, 'maj7')
    .replace(/alt$/, '')
}

export interface WjdIngest {
  score: Score
  /** Chord symbols the parser could not read, verbatim. */
  unparsedChords: string[]
}

export function scoreFromWjd(solo: WjdSolo, melody: WjdMelodyRow[], beats: WjdBeatRow[]): WjdIngest {
  if (melody.length === 0) throw new Error(`WJD solo ${solo.melid} has no notes`)
  const period = melody[0].period
  // One time signature per score is an engine-wide assumption; a solo that
  // changes meter (Don Ellis, some Brecker) is out of scope, not a crash.
  const periods = new Set(melody.map((r) => r.period))
  if (periods.size > 1) {
    throw new Error(`WJD solo ${solo.melid} changes meter (${[...periods].join('/')} beats per bar)`)
  }
  const minBar = Math.min(...melody.map((r) => r.bar), ...beats.map((b) => b.bar))
  const notes = notesFromWjd(melody, minBar, solo.instrument)
  const ticksPerBar = period * Q

  const chords: Chord[] = []
  const unparsedChords: string[] = []
  const marks: Mark[] = []
  let lastForm = ''
  for (const b of beats) {
    const bar = b.bar - minBar + 1
    if (b.form && b.form !== lastForm) {
      lastForm = b.form
      const letter = b.form.replace(/[^A-Za-z]/g, '')
      if (letter) marks.push({ bar, kind: 'rehearsal', text: letter })
    }
    if (!b.chord || b.chord === 'NC') continue
    const parsed = parseChordSymbol(wjdChordText(b.chord))
    if (!parsed) { unparsedChords.push(b.chord); continue }
    chords.push({
      onset: (bar - 1) * ticksPerBar + (b.beat - 1) * Q,
      bar,
      rootPc: parsed.rootPc,
      quality: parsed.quality,
      tensions: parsed.tensions,
    })
  }

  const [chromatic, octave] = TRANSPOSE[solo.instrument] ?? [0, 0]
  const lastBar = Math.max(notes[notes.length - 1].bar, ...beats.map((b) => b.bar - minBar + 1))
  const sig = beats.find((b) => b.signature)?.signature ?? `${period}/4`
  const [num, denom] = sig.split('/').map(Number)

  return {
    score: {
      title: solo.title,
      notes,
      chordTracks: chords.length ? [{ chords, provenance: 'file', confidence: 0.9 }] : [],
      instrument: instrumentFromTranspose(chromatic, octave),
      timeSig: [num || period, denom || 4],
      marks,
      barCount: lastBar,
    },
    unparsedChords,
  }
}
