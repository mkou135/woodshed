import { TICKS_PER_QUARTER } from '../core/types.ts'
import type { NoteContext } from './context.ts'
import type { Phrase } from './segment.ts'
import type { Finding } from './index.ts'

/**
 * What a solo looks like from a distance: how dense, how much silence, how
 * high, how chromatic, and how that changes over its choruses.
 *
 * Every number here is deterministic. This is what a model is allowed to
 * narrate — Mintzer's "first chorus sparse, builds to sixteenths by the
 * seventh" comes from a density curve, not from a model reading pitches.
 */
export interface BarProfile {
  bar: number
  notes: number
  /** Fraction of the bar with nothing sounding, 0-1. */
  silence: number
  /** Mean written MIDI of the bar's notes, or null for an empty bar. */
  register: number | null
  chromatic: number
}

export interface RegionProfile {
  startBar: number
  endBar: number
  notes: number
  notesPerBar: number
  silence: number
  phrases: number
  meanPhraseNotes: number
  register: { lo: number; hi: number; mean: number } | null
  /** Chromatic notes over notes that have a chord to be chromatic against. */
  chromaticRatio: number
  /** Findings with at least one span in this region. */
  findingIds: string[]
}

export interface SoloProfile {
  bars: BarProfile[]
  /** One per chorus when the form is known, else a single region. */
  choruses: RegionProfile[]
  overall: RegionProfile
  /**
   * Share of chromatic notes among the first two and last two notes of each
   * phrase. The Weimar corpus shows phrase starts markedly more chromatic
   * than phrase ends; this is the number the segmentation probe measured.
   */
  phraseChromaticism: { start: number; end: number }
}

export interface ProfileInput {
  contexts: NoteContext[]
  phrases: Phrase[]
  findings: Finding[]
  timeSig: [number, number]
  chorusStarts: number[]
}

const EDGE = 2

function ratio(n: number, d: number): number {
  return d === 0 ? 0 : n / d
}

function round(x: number): number {
  return Math.round(x * 1000) / 1000
}

function profileBars(ctx: NoteContext[], barTicks: number): BarProfile[] {
  const byBar = new Map<number, NoteContext[]>()
  for (const c of ctx) byBar.set(c.note.bar, [...(byBar.get(c.note.bar) ?? []), c])
  if (byBar.size === 0) return []

  const first = Math.min(...byBar.keys())
  const last = Math.max(...byBar.keys())
  const out: BarProfile[] = []
  for (let bar = first; bar <= last; bar++) {
    const notes = byBar.get(bar) ?? []
    const sounding = Math.min(barTicks, notes.reduce((sum, c) => sum + c.note.duration, 0))
    out.push({
      bar,
      notes: notes.length,
      silence: round(1 - sounding / barTicks),
      register: notes.length
        ? round(notes.reduce((sum, c) => sum + c.note.midi, 0) / notes.length)
        : null,
      chromatic: notes.filter((c) => c.chromatic).length,
    })
  }
  return out
}

function profileRegion(
  startBar: number,
  endBar: number,
  ctx: NoteContext[],
  bars: BarProfile[],
  phrases: Phrase[],
  findings: Finding[],
): RegionProfile {
  const inRegion = ctx.filter((c) => c.note.bar >= startBar && c.note.bar <= endBar)
  const regionBars = bars.filter((b) => b.bar >= startBar && b.bar <= endBar)
  const regionPhrases = phrases.filter((p) => p.startBar >= startBar && p.startBar <= endBar)
  const withChord = inRegion.filter((c) => c.chord !== null)
  const midis = inRegion.map((c) => c.note.midi)
  const barCount = endBar - startBar + 1

  return {
    startBar,
    endBar,
    notes: inRegion.length,
    notesPerBar: round(ratio(inRegion.length, barCount)),
    silence: round(ratio(regionBars.reduce((s, b) => s + b.silence, 0), regionBars.length)),
    phrases: regionPhrases.length,
    meanPhraseNotes: round(
      ratio(regionPhrases.reduce((s, p) => s + p.notes.length, 0), regionPhrases.length),
    ),
    register: midis.length
      ? {
        lo: Math.min(...midis),
        hi: Math.max(...midis),
        mean: round(midis.reduce((s, m) => s + m, 0) / midis.length),
      }
      : null,
    chromaticRatio: round(ratio(withChord.filter((c) => c.chromatic).length, withChord.length)),
    findingIds: findings
      .filter((f) => f.spans.some((s) => s.bar >= startBar && s.bar <= endBar))
      .map((f) => f.id),
  }
}

function phraseEdges(phrases: Phrase[], ctx: NoteContext[]): { start: number; end: number } {
  const byOnset = new Map(ctx.map((c) => [c.note.onset, c]))
  let startChromatic = 0
  let startTotal = 0
  let endChromatic = 0
  let endTotal = 0
  for (const phrase of phrases) {
    if (phrase.notes.length < EDGE * 2) continue
    for (const note of phrase.notes.slice(0, EDGE)) {
      const c = byOnset.get(note.onset)
      if (!c?.chord) continue
      startTotal++
      if (c.chromatic) startChromatic++
    }
    for (const note of phrase.notes.slice(-EDGE)) {
      const c = byOnset.get(note.onset)
      if (!c?.chord) continue
      endTotal++
      if (c.chromatic) endChromatic++
    }
  }
  return { start: round(ratio(startChromatic, startTotal)), end: round(ratio(endChromatic, endTotal)) }
}

export function profile(input: ProfileInput): SoloProfile {
  const { contexts, phrases, findings, timeSig, chorusStarts } = input
  const barTicks = (timeSig[0] * 4 * TICKS_PER_QUARTER) / timeSig[1]
  const bars = profileBars(contexts, barTicks)

  const empty: RegionProfile = {
    startBar: 0, endBar: 0, notes: 0, notesPerBar: 0, silence: 0, phrases: 0,
    meanPhraseNotes: 0, register: null, chromaticRatio: 0, findingIds: [],
  }
  if (bars.length === 0) {
    return { bars, choruses: [], overall: empty, phraseChromaticism: { start: 0, end: 0 } }
  }

  const first = bars[0].bar
  const last = bars[bars.length - 1].bar
  const overall = profileRegion(first, last, contexts, bars, phrases, findings)

  // Chorus boundaries that fall inside the solo split it into regions; the
  // solo may start mid-chorus, so the first region runs from its first bar.
  const starts = [first, ...chorusStarts.filter((b) => b > first && b <= last)]
  const choruses = starts.map((start, i) =>
    profileRegion(start, (starts[i + 1] ?? last + 1) - 1, contexts, bars, phrases, findings),
  )

  return { bars, choruses, overall, phraseChromaticism: phraseEdges(phrases, contexts) }
}
