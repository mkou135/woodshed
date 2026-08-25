import { TICKS_PER_QUARTER } from '../../core/types.ts'
import type { Chord, Note, Score } from '../../core/types.ts'
import { chordTonePcs, degreeOf, pitchClass } from '../../core/pitch.ts'
import type { Exercise } from '../../generate/index.ts'
import { isValid } from '../../generate/validity.ts'
import type { PracticeUnit, Step } from '../unit.ts'
import { barTicks } from '../tune.ts'
import { excerpt } from './loop.ts'

/**
 * Vary the way in, keep the arrival (Ligon's goal notes; Bergonzi's
 * exercises A–H). The centrepiece is four on-ramps — prepended approaches
 * into the line's first note — with the old metric displacement demoted to
 * two variations at the end. Every exercise lands exactly as the player
 * played it.
 */

const EIGHTH = TICKS_PER_QUARTER / 2

interface Ramp {
  title: string
  midis: number[]
}

/** Nearest chord-tone midi strictly below/above a note, within an octave. */
function nearestChordTone(from: number, chord: Chord, direction: -1 | 1): number | null {
  const pcs = chordTonePcs(chord.quality)
  for (let step = 1; step <= 12; step++) {
    const midi = from + direction * step
    if (pcs.includes(pitchClass(midi - chord.rootPc))) return midi
  }
  return null
}

function ramps(first: Note, chord: Chord): Ramp[] {
  const below = nearestChordTone(first.midi, chord, -1)
  const above = nearestChordTone(first.midi, chord, 1)
  const out: Ramp[] = []
  if (below !== null) out.push({ title: 'From the chord tone below', midis: [below] })
  if (above !== null) out.push({ title: 'From the chord tone above', midis: [above] })
  out.push({ title: 'From a chromatic step below', midis: [first.midi - 1] })
  out.push({ title: 'Enclosed — from above, then below', midis: [first.midi + 1, first.midi - 1] })
  // A chord tone that happens to be the chromatic neighbour is one ramp, not two.
  const seen = new Set<string>()
  return out.filter((r) => {
    const key = r.midis.join(',')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function varyStep(unit: Omit<PracticeUnit, 'steps'>, score: Score): Extract<Step, { kind: 'vary' }> {
  const ticks = barTicks(score.timeSig)
  const first = unit.notes[0]
  const last = unit.notes[unit.notes.length - 1]
  const chord = [...unit.harmony].reverse().find((c) => c.onset <= first.onset) ?? unit.harmony[0]
  const { lo, hi } = score.instrument.writtenRange
  const exercises: Exercise[] = []
  const gateable = unit.findings.filter((f) => f.degrees && f.quality)

  if (chord) {
    for (const ramp of ramps(first, chord)) {
      if (ramp.midis.some((m) => m < lo || m > hi)) continue
      const start = first.onset - ramp.midis.length * EIGHTH
      if (start < 0) continue
      const approach: Note[] = ramp.midis.map((midi, i) => {
        const onset = start + i * EIGHTH
        return { midi, onset, duration: EIGHTH, bar: Math.floor(onset / ticks) + 1, beat: (onset % ticks) / TICKS_PER_QUARTER }
      })
      const notes = [...approach, ...unit.notes.map((n) => ({ ...n }))]
      const exercise: Exercise = {
        id: `${unit.id}-vary-${exercises.length + 1}`,
        title: `${ramp.title} — land the same way`,
        findingId: unit.findings[0]?.id ?? '',
        findingName: unit.findings[0]?.name ?? '',
        transformation: 'vary-approach',
        bars: excerpt(notes, unit.harmony, score.timeSig, notes[0].onset % ticks),
        sourceBar: first.bar,
        rationale: 'The body and the arrival are untouched; only the way in changes. Same landing, new door.',
        timeSig: score.timeSig,
      }
      // The line must still be itself: every named cell survives re-detection,
      // and the arrival keeps its degree against its chord.
      if (gateable.some((f) => !isValid(exercise, f))) continue
      const arrivalChord = [...unit.harmony].reverse().find((c) => c.onset <= last.onset)
      if (arrivalChord && unit.arrival && degreeOf(last.midi, arrivalChord) !== unit.arrival.degree) continue
      exercises.push(exercise)
    }
  }

  // Displacement, demoted: the same line at two other places in the bar.
  const original = first.onset % ticks
  const placements = [
    { label: 'on the "and" of 1', offset: EIGHTH },
    { label: 'as a pickup into beat 1', offset: -EIGHTH },
  ]
  for (const placement of placements) {
    const offset = ((placement.offset % ticks) + ticks) % ticks
    if (offset === original) continue
    let shift = offset - original
    if (shift > ticks / 2) shift -= ticks
    if (shift < -ticks / 2) shift += ticks
    const moved = unit.notes.map((n) => ({ ...n, onset: n.onset + shift }))
    const movedHarmony = unit.harmony.map((c) => ({
      ...c,
      onset: c.onset + shift,
      bar: Math.floor((c.onset + shift) / ticks) + 1,
    }))
    exercises.push({
      id: `${unit.id}-vary-${exercises.length + 1}`,
      title: `Displaced: start it ${placement.label}`,
      findingId: unit.findings[0]?.id ?? '',
      findingName: unit.findings[0]?.name ?? '',
      transformation: 'displace',
      bars: excerpt(moved, movedHarmony, score.timeSig, offset),
      sourceBar: first.bar,
      rationale: 'Same notes, same changes, another place in the bar. Metronome on, chords sounding, same fingering — the drill is hearing the accents land elsewhere.',
      timeSig: score.timeSig,
    })
  }

  return {
    kind: 'vary',
    exercises,
    prompt:
      'The arrival is the identity of the line; everything before it is negotiable. ' +
      'Play the original, then each on-ramp, always landing the same way. ' +
      'For the displaced versions: metronome on, chords sounding, same fingering — listen for where the accents land now.',
  }
}
