import { corpusShare } from './corpus.ts'
import { barLabel, barRange, writtenBar } from '../core/bars.ts'
import type { Chord, Note, Score } from '../core/types.ts'
import type { Analysis, Finding } from '../analyse/index.ts'
import type { Exercise } from '../generate/index.ts'
import type { Tune } from './tune.ts'
import { loopStep } from './steps/loop.ts'
import { throughStep } from './steps/through.ts'
import { varyStep } from './steps/vary.ts'
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
  | { kind: 'vary'; exercises: Exercise[]; prompt: string }
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
  /** Share of the notes inside a scale run or plain arpeggio, 0-1. */
  stock: number
  rank: number
  /** One line a teacher would write above the excerpt. */
  header: string
  /** The header's parts, for a page that lays them out rather than prints them. */
  summary: UnitSummary
  steps: Step[]
}

export interface UnitSummary {
  /** 'Bars 76–77', printed numbers. */
  bars: string
  chords: string[]
  /** Distinct finding names, in order. */
  cells: string[]
  landing: string | null
  /** Printed bars, outside this unit, where its findings recur. */
  alsoAt: string[]
  /** Mostly a scale run or plain arpeggio (stock ≥ STOCK_SHOWN). */
  stock: boolean
}

/** Stock share at or above this reads as "mostly a scale run" on the page. */
const STOCK_SHOWN = 0.5

function summary(
  unit: Omit<PracticeUnit, 'header' | 'summary' | 'steps' | 'rank' | 'id'>,
  score: Pick<Score, 'repeats'>,
): UnitSummary {
  const first = unit.notes[0]
  const last = unit.notes[unit.notes.length - 1]
  const inside = new Set(unit.notes.map((n) => writtenBar(score, n.bar).bar))
  const also = new Set<string>()
  for (const f of unit.findings) {
    for (const s of f.spans) if (!inside.has(writtenBar(score, s.bar).bar)) also.add(barLabel(score, s.bar))
  }
  return {
    bars: barRange(score, first.bar, last.bar, true),
    chords: unit.harmony.map(chordName),
    cells: [...new Set(unit.findings.map((f) => f.name))],
    landing: unit.arrival?.degree ?? null,
    alsoAt: [...also].sort((a, b) => parseInt(a) - parseInt(b)),
    stock: unit.stock >= STOCK_SHOWN,
  }
}

const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

export function chordName(chord: Chord): string {
  const q: Record<string, string> = {
    'major': '', 'major-sixth': '6', 'minor': 'm', 'dominant': '7', 'major-seventh': 'maj7',
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

function header(unit: Omit<PracticeUnit, 'header' | 'summary' | 'steps' | 'rank' | 'id'>, score: Pick<Score, 'repeats'>): string {
  const first = unit.notes[0]
  const last = unit.notes[unit.notes.length - 1]
  const bars = barRange(score, first.bar, last.bar, true)
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

/** Fewer than this many notes in one direction is a turn, not a run. */
const STOCK_RUN = 4
/** Rank lost by a unit that is entirely stock (Blake's strongest unit ranks ~11). */
const STOCK_PENALTY = 2

/**
 * A scale run (every interval a step, one direction) or a plain arpeggio
 * (every interval a third or fourth, one direction) is the language, not
 * the player: Frieler's Omnibook mine put exactly these at the top of the
 * frequency table. The share of a unit inside such runs discounts its
 * rank, so a signature idea outranks a bar of bebop scale.
 */
export function stockShare(notes: Note[], exempt: ReadonlySet<number> = new Set()): number {
  if (notes.length === 0) return 0
  const kind = (iv: number): 'step' | 'third' | null => {
    const a = Math.abs(iv)
    return a >= 1 && a <= 2 ? 'step' : a >= 3 && a <= 5 ? 'third' : null
  }
  const stock = new Array<boolean>(notes.length).fill(false)
  const ivs = notes.slice(1).map((n, i) => n.midi - notes[i].midi)
  // A run is a maximal chain of intervals of one kind in one direction; it
  // covers one more note than it has intervals.
  let runStart = 0
  for (let i = 1; i <= ivs.length; i++) {
    const continues = i < ivs.length && kind(ivs[i]) !== null &&
      kind(ivs[i]) === kind(ivs[i - 1]) && Math.sign(ivs[i]) === Math.sign(ivs[i - 1])
    if (continues) continue
    const noteCount = i - runStart + 1
    if (kind(ivs[runStart]) !== null && noteCount >= STOCK_RUN) {
      for (let k = runStart; k <= i; k++) if (!exempt.has(k)) stock[k] = true
    }
    runStart = i
  }
  return stock.filter(Boolean).length / notes.length
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

      // Two views of "stock": the run rule and the corpus; take the larger.
      // Notes inside a named four-note cell are exempt: that is the vocabulary
      // (a bare triad is not; it is stock by definition).
      const exempt = new Set<number>()
      for (const f of inside) {
        if (!f.degrees || f.degrees.length < 4) continue
        for (const sp of f.spans) {
          if (sp.startIndex < startIndex || sp.endIndex > endIndex) continue
          for (let k = sp.startIndex; k <= sp.endIndex; k++) exempt.add(k - startIndex)
        }
      }
      const stock = Math.max(stockShare(partNotes, exempt), corpusShare(partNotes, exempt))
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
        stock,
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
        (byName.some((f) => f.degrees) ? 2 : 0) -
        STOCK_PENALTY * stock

      const unit: Omit<PracticeUnit, 'id'> = {
        ...partial,
        rank,
        header: header(partial, score),
        summary: summary(partial, score),
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
      ...throughStep(unit, options.tune, score, options.tuneName ?? options.tune.title),
      varyStep(unit, score),
      ...writeTemplate(unit, options.tune, score.instrument, options.tuneName ?? options.tune.title),
    ]
  }
  return ranked
}
