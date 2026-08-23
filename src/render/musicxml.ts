import type { Exercise, ExerciseBar } from '../generate/index.ts'
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

/** An eighth is 1 division, a quarter 2, a half 4. */
const DIVISIONS = 2
const EIGHTHS_PER_BAR = 8

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

function attributesXml(instrument: Instrument): string {
  return (
    `<attributes><divisions>${DIVISIONS}</divisions>` +
    '<key><fifths>0</fifths></key>' +
    '<time><beats>4</beats><beat-type>4</beat-type></time>' +
    '<clef><sign>G</sign><line>2</line></clef>' +
    `${transposeXml(instrument)}</attributes>`
  )
}

function harmonyXml(bar: ExerciseBar): string {
  const { step, alter } = spell(60 + (((bar.rootPc % 12) + 12) % 12))
  const alterXml = alter === 0 ? '' : `<root-alter>${alter}</root-alter>`
  return (
    `<harmony><root><root-step>${step}</root-step>${alterXml}</root>` +
    `<kind>${kindOf(bar.quality)}</kind></harmony>`
  )
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
  const head = number === 1 ? attributesXml(instrument) : ''
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
  const measures = exercise.bars
    .map((bar, index) => measureXml(bar, index + 1, instrument))
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
