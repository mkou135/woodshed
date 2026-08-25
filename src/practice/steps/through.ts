import { TICKS_PER_QUARTER } from '../../core/types.ts'
import type { Chord, Note, Score } from '../../core/types.ts'
import { overChanges, throughCycleOfFourths } from '../../generate/transform.ts'
import { isValid } from '../../generate/validity.ts'
import type { Exercise, ExerciseBar } from '../../generate/index.ts'
import type { PracticeUnit, Step } from '../unit.ts'
import type { Tune } from '../tune.ts'
import { qualityFamily } from '../../core/pitch.ts'
import { chordRunStart, findProgressionSlots, progressionSlot, transposeLine } from '../slots.ts'
import { barTicks } from '../tune.ts'
import { excerpt } from './loop.ts'
import { chordName } from '../unit.ts'

function sameChord(a: Chord | undefined, b: Chord): boolean {
  return !!a && a.rootPc === b.rootPc && a.quality === b.quality
}

/** The first new harmony after the line, when it arrives within one bar. */
export function resolutionChord(unit: Pick<PracticeUnit, 'notes' | 'harmony'>, score: Score): Chord | null {
  const lastNote = unit.notes[unit.notes.length - 1]
  if (!lastNote) return null
  const lastHarmony = unit.harmony[unit.harmony.length - 1]
  if (!lastHarmony) return null
  const lineEnd = lastNote.onset + lastNote.duration
  const next = (score.chordTracks[0]?.chords ?? []).find((chord) =>
    chord.onset >= lineEnd && !sameChord(lastHarmony, chord))
  if (!next) return null
  return next.onset - lineEnd <= barTicks(score.timeSig) ? next : null
}

/**
 * The whole line goes wherever its progression recurs (Baker/Galper). The
 * named cell on each compatible chord remains available as Bergonzi's drill.
 */
/** "bars 12, 28 and 52", or the span when the progression sits in one place. */
function placeBars(match: { bars: number[]; toBar: number }): string {
  if (match.bars.length > 1) {
    return `bars ${match.bars.slice(0, -1).join(', ')} and ${match.bars[match.bars.length - 1]}`
  }
  return match.bars[0] === match.toBar ? `bar ${match.bars[0]}` : `bars ${match.bars[0]}–${match.toBar}`
}

export function throughStep(
  unit: Omit<PracticeUnit, 'steps'>,
  tune: Tune,
  score: Score,
  tuneName: string,
): Extract<Step, { kind: 'through' }>[] {
  const { instrument } = score
  const cells = unit.findings.filter((f) => f.degrees && f.quality)
  const chords = tune.bars.flatMap((b, i) => b.chords.map((c) => ({ ...c, bar: i + 1 })))
  const exercises: Exercise[] = []
  const lines: string[] = []

  const resolution = resolutionChord(unit, score)
  const sourceHarmony = resolution ? [...unit.harmony, resolution] : unit.harmony
  const slot = progressionSlot(sourceHarmony)
  // Where the line already sits, in the tune's own bar numbers.
  const homeBar = tune.startBar !== undefined && sourceHarmony.length > 0 && tune.bars.length > 0
    ? chordRunStart(tune, ((sourceHarmony[0].bar - tune.startBar) % tune.bars.length + tune.bars.length) % tune.bars.length + 1)
    : undefined
  const matches = slot ? findProgressionSlots(slot, tune, { homeBar }) : []
  const sourceStart = unit.harmony[0]?.onset ?? unit.notes[0]?.onset ?? 0
  const ticks = barTicks(tune.timeSig)
  const lineBars: ExerciseBar[] = []
  const places: string[] = []
  for (const match of matches) {
    const transposed = transposeLine(unit.notes, match.shift, instrument)
    if (!transposed) continue
    const move = match.chords[0].onset - sourceStart
    const notes: Note[] = transposed.map((note) => {
      const onset = note.onset + move
      return { ...note, onset, bar: Math.floor(onset / ticks) + 1, beat: (onset % ticks) / TICKS_PER_QUARTER }
    })
    const harmony: Chord[] = match.chords.map((chord) => ({ ...chord }))
    lineBars.push(...excerpt(notes, harmony, tune.timeSig, notes[0].onset % ticks))
    places.push(`${placeBars(match)} (${match.chords.map(chordName).join(' → ')})`)
  }
  if (lineBars.length > 0) {
    exercises.push({
      id: `${unit.id}-through-line`,
      title: `The line through ${tuneName}`,
      findingId: unit.findings[0]?.id ?? '',
      findingName: unit.findings[0]?.name ?? '',
      transformation: 'through-tune',
      bars: lineBars,
      sourceBar: unit.notes[0].bar,
      rationale: `Same line and rhythm, transposed wherever the progression recurs: ${places.join('; ')}.`,
      timeSig: tune.timeSig,
    })
    const times = matches.reduce((n, m) => n + m.bars.length, 0)
    lines.push(`The progression occurs ${times === 1 ? 'once' : `${times} times`} in ${tuneName}: ${places.join('; ')}.`)
    if (homeBar !== undefined) {
      lines.push(`The line is written at bar ${homeBar}; ${times === 1 ? 'this is the other place' : 'these are the others'}.`)
    }
  }

  const nowhere: string[] = []
  for (const finding of cells) {
    const over = overChanges(finding, chords, instrument)
    if (!over || !isValid(over, finding)) nowhere.push(finding.name)
    if (over && isValid(over, finding)) {
      over.id = `${unit.id}-${finding.id}-cell`
      const family = qualityFamily(finding.quality!)
      over.title = `The cell alone on every ${family} chord`
      const inUnit = finding.spans.find((s) => s.startIndex >= unit.startIndex && s.endIndex <= unit.endIndex)
      const from = inUnit
        ? ` This is notes ${inUnit.startIndex - unit.startIndex + 1}–${inUnit.endIndex - unit.startIndex + 1} of the line (bar ${inUnit.bar}): the cell isolated from its approach.`
        : ''
      over.rationale = `Bergonzi’s drill: the named cell alone, one compatible chord at a time.${from}`
      exercises.push(over)
      const bars = chords
        .filter((c) => qualityFamily(c.quality) === family)
        .map((c) => c.bar)
      lines.push(`${finding.name}: every ${family} chord in ${tuneName} (bars ${[...new Set(bars)].join(', ')}).`)
    }
    const cycle = throughCycleOfFourths(finding, instrument)
    if (cycle && isValid(cycle, finding)) {
      cycle.id = `${unit.id}-${finding.id}-cycle`
      exercises.push(cycle)
    }
  }
  if (exercises.length === 0) return []

  lines.push(...nowhere.map((n) => `No chord in ${tuneName} fits ${n}; the cycle of fourths stands in.`))
  lines.push('Learn it by ear, then play it slowly in each place with a play-along.')
  if (cells.length > 0) {
    lines.push(
      'The cell is the transferable part of the line: the drill installs it under every compatible chord so it stops belonging to one tune.',
    )
  }

  return [{
    kind: 'through',
    tune: tuneName,
    exercises,
    prompt: lines.join(' '),
  }]
}
