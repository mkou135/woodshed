import type { Exercise, ExerciseBar, ExerciseEvent, BarChord } from '../generate/index.ts'
import { TICKS_PER_QUARTER } from '../core/types.ts'
import type { Instrument, Quality } from '../core/types.ts'

/**
 * Written pitch spelling, flats preferred — the jazz convention, and the way
 * the method books print these patterns.
 */
const SPELLING: [string, number][] = [
  ['C', 0], ['D', -1], ['D', 0], ['E', -1], ['E', 0], ['F', 0],
  ['G', -1], ['G', 0], ['A', -1], ['A', 0], ['B', -1], ['B', 0],
]

/** Diatonic step count of a semitone distance, for <transpose><diatonic>. */
const DIATONIC_OF_SEMITONE = [0, 0, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6]

/** An eighth is 1 division, a quarter 2, a half 4 — for even-eighth bars. */
const DIVISIONS = 2
const EIGHTHS_PER_BAR = 8
/** For bars with real rhythm: 48 per quarter covers 16ths and triplets. */
const FINE_DIVISIONS = 48
const TICKS_PER_DIVISION = TICKS_PER_QUARTER / FINE_DIVISIONS

/**
 * Every Quality except `unknown` is already a valid MusicXML <kind>, so the
 * inverse of the ingest table is the identity plus one fallback.
 */
function kindOf(quality: Quality): string {
  return quality === 'unknown' ? 'major' : quality
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const SHARP_SPELLING: Record<number, [string, number]> = {
  1: ['C', 1], 3: ['D', 1], 6: ['F', 1], 8: ['G', 1], 10: ['A', 1],
}

/** Black keys spell as flats, or as sharps in a sharp key (F# in D, not Gb). */
function spell(midi: number, sharps = false): { step: string; alter: number; octave: number } {
  const pc = ((midi % 12) + 12) % 12
  const [step, alter] = (sharps && SHARP_SPELLING[pc]) || SPELLING[pc]
  return { step, alter, octave: Math.floor(midi / 12) - 1 }
}

function pitchXml(midi: number, sharps: boolean): string {
  const { step, alter, octave } = spell(midi, sharps)
  const alterXml = alter === 0 ? '' : `<alter>${alter}</alter>`
  return `<pitch><step>${step}</step>${alterXml}<octave>${octave}</octave></pitch>`
}

function transposeXml(instrument: Instrument): string {
  const { chromatic, octave } = instrument.transpose
  if (chromatic === 0 && octave === 0) return ''
  const magnitude = DIATONIC_OF_SEMITONE[Math.abs(chromatic) % 12]
  const diatonic = chromatic < 0 ? -magnitude : magnitude
  const octaveXml = octave === 0 ? '' : `<octave-change>${octave}</octave-change>`
  return `<transpose><diatonic>${diatonic}</diatonic><chromatic>${chromatic}</chromatic>${octaveXml}</transpose>`
}

export interface RenderOptions {
  /** Written key signature (MusicXML fifths); the exercise is in the solo's key. */
  keyFifths?: number
  /**
   * Leave out the <transpose> element. OSMD applies it and draws the part
   * at concert pitch, so a tenor line came out a tone below its chord
   * symbols on the page; MuseScore needs it, so the download keeps it.
   */
  forDisplay?: boolean
}

function attributesXml(
  instrument: Instrument,
  divisions: number,
  timeSig: [number, number],
  options: RenderOptions,
): string {
  return (
    `<attributes><divisions>${divisions}</divisions>` +
    `<key><fifths>${options.keyFifths ?? 0}</fifths></key>` +
    `<time><beats>${timeSig[0]}</beats><beat-type>${timeSig[1]}</beat-type></time>` +
    '<clef><sign>G</sign><line>2</line></clef>' +
    `${options.forDisplay ? '' : transposeXml(instrument)}</attributes>`
  )
}

function harmonyXml(chord: { rootPc: number; quality: Quality }): string {
  const { step, alter } = spell(60 + (((chord.rootPc % 12) + 12) % 12))
  const alterXml = alter === 0 ? '' : `<root-alter>${alter}</root-alter>`
  return (
    `<harmony><root><root-step>${step}</root-step>${alterXml}</root>` +
    `<kind>${kindOf(chord.quality)}</kind></harmony>`
  )
}

/**
 * Note type, dots and tuplet for a duration in ticks. Plain, dotted and
 * triplet values are exact; anything else takes the nearest plain type,
 * which keeps the bar's arithmetic right even if the glyph is approximate.
 */
function typeXml(ticks: number): string {
  const q = TICKS_PER_QUARTER
  const plain: [number, string][] = [
    [4 * q, 'whole'], [2 * q, 'half'], [q, 'quarter'], [q / 2, 'eighth'],
    [q / 4, '16th'], [q / 8, '32nd'],
  ]
  for (const [t, type] of plain) {
    if (ticks === t) return `<type>${type}</type>`
    if (ticks === t * 1.5) return `<type>${type}</type><dot/>`
    if (ticks * 3 === t * 2) {
      return `<type>${type}</type><time-modification><actual-notes>3</actual-notes>` +
        '<normal-notes>2</normal-notes></time-modification>'
    }
  }
  const nearest = plain.reduce((best, cur) =>
    Math.abs(cur[0] - ticks) < Math.abs(best[0] - ticks) ? cur : best)
  return `<type>${nearest[1]}</type>`
}

/**
 * Beam marks for a bar's events, one entry per event ('' for none). Notes
 * shorter than a quarter beam within a beat; a rest, a longer note or the
 * beat line ends the group. Adjacent 16ths inside a group share a second
 * beam. Without these every eighth gets its own flag, which is unreadable.
 */
function beamMarks(events: ExerciseEvent[]): string[] {
  const marks = events.map(() => '')
  const positions: number[] = []
  let position = 0
  for (const e of events) { positions.push(position); position += e.duration }
  const beamable = (i: number): boolean => events[i].midi !== null && events[i].duration < TICKS_PER_QUARTER
  const beat = (i: number): number => Math.floor(positions[i] / TICKS_PER_QUARTER)

  const runs: [number, number][] = []
  let start = -1
  for (let i = 0; i <= events.length; i++) {
    const joins = i < events.length && beamable(i) && (start < 0 || beat(i) === beat(start))
    if (joins) { if (start < 0) start = i; continue }
    if (start >= 0 && i - start >= 2) runs.push([start, i - 1])
    start = i < events.length && beamable(i) ? i : -1
  }

  const mark = (level: number, from: number, to: number): void => {
    for (let k = from; k <= to; k++) {
      const state = k === from ? 'begin' : k === to ? 'end' : 'continue'
      marks[k] += `<beam number="${level}">${state}</beam>`
    }
  }
  for (const [from, to] of runs) {
    mark(1, from, to)
    let s = -1
    for (let k = from; k <= to + 1; k++) {
      const fine = k <= to && events[k].duration <= TICKS_PER_QUARTER / 4
      if (fine) { if (s < 0) s = k; continue }
      if (s >= 0 && k - s >= 2) mark(2, s, k - 1)
      s = -1
    }
  }
  return marks
}

function eventXml(event: ExerciseEvent, beam: string, sharps: boolean): string {
  const divisions = Math.max(1, Math.round(event.duration / TICKS_PER_DIVISION))
  const body = event.midi === null ? '<rest/>' : pitchXml(event.midi, sharps)
  const cue = event.cue ? '<cue/>' : ''
  return `<note>${cue}${body}<duration>${divisions}</duration>${typeXml(event.duration)}${beam}</note>`
}

/** A bar with real rhythm: chords at their offsets, events in order. */
function rhythmicMeasureXml(
  bar: ExerciseBar,
  number: number,
  instrument: Instrument,
  timeSig: [number, number],
  options: RenderOptions,
): string {
  const events = bar.events ?? []
  const chords: BarChord[] = bar.chords ?? [{ onset: 0, rootPc: bar.rootPc, quality: bar.quality }]
  const head = number === 1 ? attributesXml(instrument, FINE_DIVISIONS, timeSig, options) : ''
  let out = `<measure number="${number}">${head}`
  const beams = beamMarks(events)
  let position = 0
  let chordIndex = 0
  events.forEach((event, i) => {
    while (chordIndex < chords.length && chords[chordIndex].onset <= position) {
      out += harmonyXml(chords[chordIndex])
      chordIndex++
    }
    out += eventXml(event, beams[i], (options.keyFifths ?? 0) > 0)
    position += event.duration
  })
  while (chordIndex < chords.length) out += harmonyXml(chords[chordIndex++])
  return `${out}</measure>`
}

/** Fill the rest of the bar with as few rests as will cover it. */
function restsXml(eighths: number): string {
  const shapes: [number, string][] = [[4, 'half'], [2, 'quarter'], [1, 'eighth']]
  let remaining = eighths
  let out = ''
  for (const [size, type] of shapes) {
    while (remaining >= size) {
      out += `<note><rest/><duration>${size}</duration><type>${type}</type></note>`
      remaining -= size
    }
  }
  return out
}

function measureXml(bar: ExerciseBar, number: number, instrument: Instrument, options: RenderOptions): string {
  const midis = bar.midis.slice(0, EIGHTHS_PER_BAR)
  const beams = beamMarks(midis.map((midi) => ({ midi, duration: TICKS_PER_QUARTER / 2 })))
  const notes = midis
    .map((midi, i) => `<note>${pitchXml(midi, (options.keyFifths ?? 0) > 0)}<duration>1</duration><type>eighth</type>${beams[i]}</note>`)
    .join('')
  const head = number === 1 ? attributesXml(instrument, DIVISIONS, [4, 4], options) : ''
  return (
    `<measure number="${number}">${head}${harmonyXml(bar)}${notes}` +
    `${restsXml(EIGHTHS_PER_BAR - midis.length)}</measure>`
  )
}

/**
 * One 4/4 measure per exercise bar: the chord symbol, the cell as even
 * eighths, then rests to the bar line.
 *
 * Even eighths are deliberate. The method books present material this way, and
 * it guarantees we never reproduce a rhythm that may be a transcription
 * artefact rather than something the player meant.
 */
export function exerciseToMusicXml(exercise: Exercise, instrument: Instrument, options: RenderOptions = {}): string {
  const rhythmic = exercise.bars.some((b) => b.events)
  const timeSig = exercise.timeSig ?? [4, 4]
  const measures = exercise.bars
    .map((bar, index) => rhythmic
      ? rhythmicMeasureXml(bar, index + 1, instrument, timeSig, options)
      : measureXml(bar, index + 1, instrument, options))
    .join('\n      ')

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work><work-title>${escapeXml(exercise.title)}</work-title></work>
  <part-list><score-part id="P1"><part-name>Exercise</part-name></score-part></part-list>
  <part id="P1">
      ${measures}
  </part>
</score-partwise>
`
}
