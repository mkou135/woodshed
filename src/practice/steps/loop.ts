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
  // Floor semantics, not `%`: `throughStep` moves a line so its first chord
  // meets the match's, which drags a pickup note before tick 0 when the
  // match sits at the top of the form. JS `%` truncates towards zero, so a
  // negative onset landed in bar -1 and `ensure` handed back `undefined`.
  // Flooring puts the pickup in bar 0 of the excerpt, where it belongs.
  const mod = (value: number): number => ((value % ticks) + ticks) % ticks
  const offset = mod(firstOffset)
  const shift = offset - mod(notes[0].onset)
  const base = Math.floor(notes[0].onset / ticks) * ticks
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
  // Chords: the ones that sounded under the notes, moved by the same shift.
  const placedHarmony = harmony.map((chord) => {
    // A chord already sounding before the excerpt is carried at its start;
    // otherwise retain its real offset from the line instead of pinning it
    // to the first note.
    const { bar, at } = place(Math.max(chord.onset, base - shift))
    return { chord, bar, at }
  }).filter(({ bar }) => bar >= 0)

  // A supplied resolution after the last note still belongs in the excerpt:
  // extend with a rest bar so the player can see where the line is going.
  const lastBar = Math.max(bars.length - 1, ...placedHarmony.map(({ bar }) => bar))
  ensure(lastBar)
  pushRest((lastBar + 1) * ticks)

  for (const { chord, bar, at } of placedHarmony) {
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
  // Bar 0 has no previous bar to carry from, and there is nothing to carry:
  // a pickup that lands before the excerpt's first chord genuinely precedes
  // the harmony we were given — `throughStep` passes the *target* slot's
  // chords, whose first is the one the pickup leads into. Left alone the bar
  // keeps its `rootPc: 0, quality: 'unknown'` placeholder, and the renderer's
  // fallback to those fields prints a bare "C" (`kindOf` maps 'unknown' to
  // 'major') over a bar whose chord nobody knows. An empty list says "no
  // chord symbol here", which is what a lead sheet does with a pickup — same
  // representation `write.ts` already emits for a chordless tune bar.
  // The placeholder itself stays: `rootPc`/`quality` are required on every
  // `ExerciseBar` because the cell-per-bar exercises read them (`validity.ts`
  // re-detects a finding against them), so making them optional would churn
  // that path to delete a value only this bar leaves meaningless. The empty
  // list is the guard — the renderer is its only reader (`musicxml.ts:232`).
  if (bars.length > 0 && !bars[0].chords?.length) bars[0].chords = []
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
    rationale: unit.header + (unit.findings.some((f) => f.language)
      ? ' A standard bebop cliché — worth having in every key; listen for where the player places it.'
      : ''),
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
