import { TICKS_PER_QUARTER } from '../core/types.ts'
import type { Score } from '../core/types.ts'
import type { Adjustment } from './adjustments.ts'
import type { FormResult } from './form.ts'

/**
 * Words that mark the transcriber's own doubt about what was played, rather
 * than an instruction to the reader.
 */
const DOUBT_WORDS = new Set(['sloppy', 'flat', 'sharp', 'approx', 'unclear', '?'])

/** Flag a first bar that is short but not marked implicit="yes". */
export function pickupCheck(score: Score): Adjustment[] {
  const barTicks = (score.timeSig[0] * 4 / score.timeSig[1]) * TICKS_PER_QUARTER
  const firstBar = score.notes.filter((n) => n.bar === 1)
  if (firstBar.length === 0) return []

  const filled = firstBar.reduce((sum, n) => sum + n.duration, 0)
  if (filled >= barTicks) return []

  return [
    {
      kind: 'unmarked-pickup',
      severity: 'warn',
      target: { bar: 1 },
      before: filled,
      after: barTicks,
      reason:
        'Bar 1 is shorter than the time signature but is not marked as a pickup. ' +
        'If it is an anacrusis, every downstream beat position is shifted.',
      decidedBy: 'engine',
      confidence: 0.7,
    },
  ]
}

/**
 * Report notes outside the normal written range. Always informational: on
 * saxophone these are usually altissimo, not errors.
 */
export function rangeCheck(score: Score): Adjustment[] {
  const { writtenRange, rangeKnown, altissimoTo, name } = score.instrument
  if (!rangeKnown) return []

  const outliers = score.notes.filter(
    (n) => n.midi < writtenRange.lo || n.midi > writtenRange.hi,
  )
  if (outliers.length === 0) return []

  const highest = Math.max(...outliers.map((n) => n.midi))
  const withinAltissimo = altissimoTo !== undefined && highest <= altissimoTo

  return [
    {
      kind: 'range-outlier',
      severity: 'info',
      target: { range: [outliers[0].bar, outliers[outliers.length - 1].bar] },
      before: outliers.length,
      reason:
        `${outliers.length} note(s) fall outside the normal written range for ${name}. ` +
        (withinAltissimo
          ? 'These are within reach in altissimo and are most likely real.'
          : 'Worth checking for an octave error, but do not assume one.'),
      decidedBy: 'engine',
      confidence: 0.5,
    },
  ]
}

/** Surface the transcriber's own uncertainty markers as confidence signals. */
export function transcriberNoteCheck(score: Score): Adjustment[] {
  return score.marks
    .filter((m) => m.kind === 'words' && DOUBT_WORDS.has(m.text.trim().toLowerCase()))
    .map((m) => ({
      kind: 'transcriber-note' as const,
      severity: 'warn' as const,
      target: { bar: m.bar },
      before: m.text,
      reason:
        `The transcriber marked bar ${m.bar} "${m.text}". Findings here should ` +
        'carry lower confidence, and may not represent what the player intended.',
      decidedBy: 'engine' as const,
      confidence: 0.9,
    }))
}

/**
 * Flag a chord that persists implausibly long. MusicXML harmony carries until
 * the next <harmony>, so "held" and "never entered" are indistinguishable from
 * the file alone — but regular, section-aligned gaps are held chords, not
 * errors, so this only fires without a detected form to explain them.
 */
export function chordPersistenceCheck(
  score: Score,
  form: FormResult | null,
): Adjustment[] {
  const track = score.chordTracks[0]
  if (!track || track.chords.length === 0) return []

  const threshold = form ? Math.max(2, Math.floor(form.periodBars / 2)) : 4
  const out: Adjustment[] = []

  for (let i = 0; i < track.chords.length; i++) {
    const start = track.chords[i].bar
    const end = i + 1 < track.chords.length ? track.chords[i + 1].bar : score.barCount + 1
    const span = end - start
    if (span <= threshold) continue

    out.push({
      kind: 'chord-persistence',
      severity: 'warn',
      target: { range: [start, end - 1] },
      before: span,
      reason:
        `One chord covers ${span} bars. MusicXML cannot distinguish a held chord ` +
        'from a missing one, so these degrees may rest on a chord that was never entered.',
      decidedBy: 'engine',
      confidence: 0.6,
    })
  }
  return out
}
