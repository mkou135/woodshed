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

function spell(midi: number): { step: string; alter: number; octave: number } {
  const pc = ((midi % 12) + 12) % 12
  const [step, alter] = SPELLING[pc]
  return { step, alter, octave: Math.floor(midi / 12) - 1 }
}

function pitchXml(midi: number): string {
  const { step, alter, octave } = spell(midi)
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

function attributesXml(
  instrument: Instrument,
  divisions: number,
  timeSig: [number, number],
): string {
  return (
    `<attributes><divisions>${divisions}</divisions>` +
    '<key><fifths>0</fifths></key>' +
    `<time><beats>${timeSig[0]}</beats><beat-type>${timeSig[1]}</beat-type></time>` +
    '<clef><sign>G</sign><line>2</line></clef>' +
    `${transposeXml(instrument)}</attributes>`
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

function eventXml(event: ExerciseEvent): string {
  const divisions = Math.max(1, Math.round(event.duration / TICKS_PER_DIVISION))
  const body = event.midi === null ? '<rest/>' : pitchXml(event.midi)
  const cue = event.cue ? '<cue/>' : ''
  return `<note>${cue}${body}<duration>${divisions}</duration>${typeXml(event.duration)}</note>`
}

/** A bar with real rhythm: chords at their offsets, events in order. */
function rhythmicMeasureXml(
  bar: ExerciseBar,
  number: number,
  instrument: Instrument,
  timeSig: [number, number],
): string {
  const events = bar.events ?? []
  const chords: BarChord[] = bar.chords ?? [{ onset: 0, rootPc: bar.rootPc, quality: bar.quality }]
  const head = number === 1 ? attributesXml(instrument, FINE_DIVISIONS, timeSig) : ''
  let out = `<measure number="${number}">${head}`
  let position = 0
  let chordIndex = 0
  for (const event of events) {
    while (chordIndex < chords.length && chords[chordIndex].onset <= position) {
      out += harmonyXml(chords[chordIndex])
      chordIndex++
    }
    out += eventXml(event)
    position += event.duration
  }
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

function measureXml(bar: ExerciseBar, number: number, instrument: Instrument): string {
  const midis = bar.midis.slice(0, EIGHTHS_PER_BAR)
  const notes = midis
    .map((midi) => `<note>${pitchXml(midi)}<duration>1</duration><type>eighth</type></note>`)
    .join('')
  const head = number === 1 ? attributesXml(instrument, DIVISIONS, [4, 4]) : ''
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
export function exerciseToMusicXml(exercise: Exercise, instrument: Instrument): string {
  const rhythmic = exercise.bars.some((b) => b.events)
  const timeSig = exercise.timeSig ?? [4, 4]
  const measures = exercise.bars
    .map((bar, index) => rhythmic
      ? rhythmicMeasureXml(bar, index + 1, instrument, timeSig)
      : measureXml(bar, index + 1, instrument))
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
