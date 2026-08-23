import type { Chord, Note, Score } from '../core/types.ts'
import type { Analysis, Finding } from '../analyse/index.ts'
import type { Exercise } from '../generate/index.ts'
import type { Tune } from './tune.ts'
import { loopStep } from './steps/loop.ts'
import { throughStep } from './steps/through.ts'
import { displaceStep } from './steps/displace.ts'
import { writeTemplate } from './steps/write.ts'

/**
 * The practice unit is the idea: the gesture between rests, held notes and
 * leaps. Findings name what is inside it. Each unit carries the four steps
 * the owner chose from the practice literature — analyse, micro-unit,
 * through a tune, vary and write your own.
 */
export type Step =
  | { kind: 'loop'; exercise: Exercise; prompt: string }
  | { kind: 'through'; tune: string; exercises: Exercise[]; prompt: string }
  | { kind: 'displace'; exercises: Exercise[]; prompt: string }
  | { kind: 'write'; template: string; prompt: string }

export interface PracticeUnit {
  id: string
  phrase: number
  idea: number
  /** A long idea is practised in parts of at most two bars: 1-based, with the count. */
  part?: { n: number; of: number }
  notes: Note[]
  startIndex: number
  endIndex: number
  /** Distinct chords under the notes, in order. */
  harmony: Chord[]
  degrees: (string | null)[]
  findings: Finding[]
  arrival: { degree: string; chordTone: boolean } | null
  rank: number
  /** One line a teacher would write above the excerpt. */
  header: string
  steps: Step[]
}

const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

export function chordName(chord: Chord): string {
  const q: Record<string, string> = {
    'major': '', 'minor': 'm', 'dominant': '7', 'major-seventh': 'maj7',
    'minor-seventh': 'm7', 'half-diminished': 'm7b5', 'diminished': 'dim',
    'diminished-seventh': 'dim7', 'minor-major': 'm(maj7)', 'augmented': '+',
    'augmented-seventh': '7#5', 'suspended-fourth': 'sus4', 'unknown': '',
  }
  return `${NOTE_NAMES[chord.rootPc]}${q[chord.quality] ?? ''}`
}

export function noteName(midi: number): string {
  return NOTE_NAMES[((midi % 12) + 12) % 12]
}

function sameChord(a: Chord | null, b: Chord | null): boolean {
  return !!a && !!b && a.rootPc === b.rootPc && a.quality === b.quality
}

function header(unit: Omit<PracticeUnit, 'header' | 'steps' | 'rank' | 'id'>): string {
  const first = unit.notes[0]
  const last = unit.notes[unit.notes.length - 1]
  const bars = first.bar === last.bar ? `Bar ${first.bar}` : `Bars ${first.bar}–${last.bar}`
  const over = unit.harmony.length > 0 ? ` over ${unit.harmony.map(chordName).join(' → ')}` : ''
  const notes = unit.notes.map((n) => noteName(n.midi)).join(' ')
  const named = unit.findings.map((f) => f.name)
  const what = named.length > 0 ? ` — ${[...new Set(named)].join('; ')}` : ''
  const landing = unit.arrival ? `, landing on the ${unit.arrival.degree}` : ''
  return `${bars}${over}: ${notes}${what}${landing}.`
}

export interface BuildOptions {
  tune: Tune
  tuneName?: string
}

/** The most bars a practice chunk spans: "a measure long, a couple of beats". */
const MAX_PART_BARS = 2

/**
 * Split a long idea at bar lines into parts of at most two bars. The idea
 * is still the musical unit; a 32-note line is four things to shed.
 */
export function partition(notes: Note[]): Note[][] {
  const parts: Note[][] = []
  let current: Note[] = []
  for (const note of notes) {
    if (current.length > 0 && note.bar > current[0].bar + MAX_PART_BARS - 1 && note.bar !== current[current.length - 1].bar) {
      parts.push(current)
      current = []
    }
    current.push(note)
  }
  if (current.length > 0) parts.push(current)
  // A tail of one or two notes belongs with the part before it.
  if (parts.length > 1 && parts[parts.length - 1].length < 3) {
    const tail = parts.pop()!
    parts[parts.length - 1].push(...tail)
  }
  return parts
}

export function buildUnits(analysis: Analysis, score: Score, options: BuildOptions): PracticeUnit[] {
  const { contexts, phrases, findings } = analysis
  const occurrences = new Map(findings.map((f) => [f.id, f.spans.length]))
  const units: Omit<PracticeUnit, 'id'>[] = []

  let index = 0
  phrases.forEach((phrase, p) => {
    phrase.ideas.forEach((idea, i) => {
      const parts = partition(idea.notes)
      parts.forEach((partNotes, k) => {
      const startIndex = index
      const endIndex = index + partNotes.length - 1
      index = endIndex + 1
      const slice = contexts.slice(startIndex, endIndex + 1)

      const harmony: Chord[] = []
      for (const c of slice) {
        if (c.chord && !sameChord(harmony[harmony.length - 1] ?? null, c.chord)) harmony.push(c.chord)
      }
      const inside = findings.filter((f) =>
        f.spans.some((s) => s.startIndex >= startIndex && s.endIndex <= endIndex))
      const last = slice[slice.length - 1]
      const arrival = last.degree ? { degree: last.degree, chordTone: last.chordTone } : null

      const partial = {
        phrase: p,
        idea: i,
        part: parts.length > 1 ? { n: k + 1, of: parts.length } : undefined,
        notes: partNotes,
        startIndex,
        endIndex,
        harmony,
        degrees: slice.map((c) => c.degree),
        findings: inside,
        arrival,
      }
      // Strongest finding first, then breadth, recurrence, a clean landing,
      // and a bonus for having something that can be taken through a tune:
      // the menu exists to make the next action obvious.
      const byName = [...new Map(inside.map((f) => [f.name, f])).values()]
      const rank =
        4 * Math.max(0, ...byName.map((f) => f.confidence)) +
        byName.reduce((sum, f) => sum + f.confidence, 0) +
        0.25 * byName.reduce((sum, f) => sum + (occurrences.get(f.id) ?? 0), 0) +
        (arrival?.chordTone ? 0.5 : 0) +
        (byName.some((f) => f.degrees) ? 2 : 0)

      const unit: Omit<PracticeUnit, 'id'> = {
        ...partial,
        rank,
        header: header(partial),
        steps: [],
      }
      units.push(unit)
      })
    })
  })

  const ranked = units
    .map((u, i) => ({ u, i }))
    .sort((a, b) => b.u.rank - a.u.rank || a.i - b.i)
    .map(({ u }, n) => ({ ...u, id: `u${n + 1}` }))

  for (const unit of ranked) {
    unit.steps = [
      loopStep(unit, score),
      ...throughStep(unit, options.tune, score.instrument, options.tuneName ?? options.tune.title),
      displaceStep(unit, score),
      ...writeTemplate(unit, options.tune, score.instrument, options.tuneName ?? options.tune.title),
    ]
  }
  return ranked
}
