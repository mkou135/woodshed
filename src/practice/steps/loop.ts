import { barLabel, barRange } from '../../core/bars.ts'
import { TICKS_PER_QUARTER } from '../../core/types.ts'
import type { Chord, Note, Score } from '../../core/types.ts'
import type { Exercise, ExerciseBar, ExerciseEvent, BarChord } from '../../generate/index.ts'
import type { PracticeUnit, Step } from '../unit.ts'
import { barTicks } from '../tune.ts'

/**
 * Lay notes out as played into bars, with rests where nothing sounds and
 * the chords that were under them. Shared by the loop and displacement
 * steps: the only difference is where the first note falls.
 */
export function excerpt(
  notes: Note[],
  harmony: Chord[],
  timeSig: [number, number],
  /** Tick offset of the first note within its first bar. */
  firstOffset: number,
): ExerciseBar[] {
  const ticks = barTicks(timeSig)
  const shift = firstOffset - (notes[0].onset % ticks)
  const base = notes[0].onset - (notes[0].onset % ticks)
  const bars: ExerciseBar[] = []
  const place = (absolute: number): { bar: number; at: number } => {
    const rel = absolute + shift - base
    return { bar: Math.floor(rel / ticks), at: rel - Math.floor(rel / ticks) * ticks }
  }
  const ensure = (bar: number): ExerciseBar => {
    while (bars.length <= bar) bars.push({ rootPc: 0, quality: 'unknown', midis: [], events: [] })
    return bars[bar]
  }
  let cursor = 0 // position within current bar, absolute across bars as bar*ticks + at
  const pushRest = (upto: number): void => {
    while (cursor < upto) {
      const bar = Math.floor(cursor / ticks)
      const at = cursor - bar * ticks
      const len = Math.min(upto - cursor, ticks - at)
      ensure(bar).events!.push({ midi: null, duration: len })
      cursor += len
    }
  }
  for (const note of notes) {
    const { bar, at } = place(note.onset)
    pushRest(bar * ticks + at)
    let remaining = note.duration
    let b = bar
    let pos = at
    while (remaining > 0) {
      const len = Math.min(remaining, ticks - pos)
      ensure(b).events!.push({ midi: note.midi, duration: len })
      remaining -= len
      cursor = b * ticks + pos + len
      b++
      pos = 0
    }
  }
  // Fill the last bar to the line.
  const lastBar = bars.length - 1
  pushRest((lastBar + 1) * ticks)

  // Chords: the ones that sounded under the notes, moved by the same shift.
  for (const chord of harmony) {
    const { bar, at } = place(Math.max(chord.onset, notes[0].onset))
    if (bar < 0 || bar >= bars.length) continue
    const target = bars[bar]
    const entry: BarChord = { onset: at, rootPc: chord.rootPc, quality: chord.quality }
    target.chords = [...(target.chords ?? []), entry]
  }
  for (const bar of bars) {
    if (bar.chords?.length) {
      bar.rootPc = bar.chords[0].rootPc
      bar.quality = bar.chords[0].quality
    }
  }
  // A bar without a chord symbol is still under the previous one.
  for (let i = 1; i < bars.length; i++) {
    if (!bars[i].chords?.length && bars[i - 1].chords?.length) {
      bars[i].rootPc = bars[i - 1].rootPc
      bars[i].quality = bars[i - 1].quality
    }
  }
  return bars
}

export function loopStep(unit: Omit<PracticeUnit, 'steps'>, score: Score): Step {
  const first = unit.notes[0]
  const ticks = barTicks(score.timeSig)
  const bars = excerpt(unit.notes, unit.harmony, score.timeSig, first.onset % ticks)
  const last = unit.notes[unit.notes.length - 1]
  const exercise: Exercise = {
    id: `${unit.id}-loop`,
    title: `As played, ${barRange(score, first.bar, last.bar)}`,
    findingId: unit.findings[0]?.id ?? '',
    findingName: unit.findings[0]?.name ?? '',
    transformation: 'loop',
    bars,
    sourceBar: first.bar,
    rationale: unit.header,
    timeSig: score.timeSig,
  }
  const beat = Math.floor((first.onset % ticks) / TICKS_PER_QUARTER) + 1
  return {
    kind: 'loop',
    exercise,
    prompt:
      `Sing it first — pitches, rhythm, accents. Then loop the record from bar ${barLabel(score, first.bar)}, ` +
      `beat ${beat}, and play along until the time feel matches, not just the notes.`,
  }
}
export type { ExerciseEvent }
