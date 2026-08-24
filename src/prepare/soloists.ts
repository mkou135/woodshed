import type { Score } from '../core/types.ts'
import type { Adjustment } from './adjustments.ts'
import { parseChordSymbol } from '../ingest/parseChordText.ts'

export interface SoloistRegion {
  name: string
  startBar: number
  endBar: number
}

/**
 * Words that appear above the staff but describe how to play, not who is
 * playing. Compared case-insensitively as whole words.
 */
const DIRECTIONS = new Set([
  'swing', 'straight', 'straight 8ths', 'lay back', 'sloppy', 'flat', 'sharp',
  'growl', 'half-tonguing', 'subtone', 'rubato', 'solo', 'head', 'intro',
  'outro', 'tema', 'fine', 'break', 'vamp', 'open',
])

function looksLikeName(text: string): boolean {
  const t = text.trim()
  if (t.length === 0 || t.length > 24) return false
  if (DIRECTIONS.has(t.toLowerCase())) return false
  if (parseChordSymbol(t)) return false
  if (!/^[A-Z]/.test(t)) return false
  if (/\d/.test(t)) return false

  // Real corpus text contains capitalised multi-word performance directions
  // ("On Downbeat", "Up Down") that are indistinguishable from names by
  // capitalisation alone. Accept a multi-word phrase only when it says so —
  // "Cannonball Solo", "Solo Seamus Blake" — and otherwise require a single
  // word, which is how attribution is actually written ("Trane", "Sonny").
  if (/\bsolo\b/i.test(t)) return true
  return !/\s/.test(t)
}

/**
 * Identify which bars belong to which soloist. Attribution lives only in free
 * text, so this is a proposal for the user to confirm, never a silent split.
 */
export function detectSoloists(score: Score): SoloistRegion[] {
  const names = score.marks
    .filter((m) => m.kind === 'words' && looksLikeName(m.text))
    .map((m) => ({ name: m.text.trim(), bar: m.bar }))

  if (names.length === 0) {
    // Bound the region to the bars that carry notes: the head's empty bars
    // and a trailing double bar are not part of anyone's solo.
    const bars = score.notes.map((n) => n.bar)
    if (bars.length === 0) return [{ name: 'unknown', startBar: 1, endBar: score.barCount }]
    return [{ name: 'unknown', startBar: Math.min(...bars), endBar: Math.max(...bars) }]
  }

  const regions: SoloistRegion[] = []
  for (let i = 0; i < names.length; i++) {
    regions.push({
      name: names[i].name,
      startBar: names[i].bar,
      endBar: i + 1 < names.length ? names[i + 1].bar - 1 : score.barCount,
    })
  }

  // A name appearing after bar 1 leaves an unattributed head; keep it only if
  // it actually contains bars.
  if (regions[0].startBar > 1) {
    regions.unshift({ name: 'unknown', startBar: 1, endBar: regions[0].startBar - 1 })
  }
  return regions
}

/**
 * The region to analyse when the user has not chosen. The first named region
 * is often a one-bar tag ("Miles" over the last bar of the previous solo),
 * so take the named region with the most notes; ties go to the earlier one.
 */
export function chooseSoloist(score: Score, regions: SoloistRegion[]): SoloistRegion | undefined {
  const named = regions.filter((r) => r.name !== 'unknown')
  const candidates = named.length > 0 ? named : regions
  let best: SoloistRegion | undefined
  let bestNotes = -1
  for (const r of candidates) {
    const n = score.notes.filter((x) => x.bar >= r.startBar && x.bar <= r.endBar).length
    if (n > bestNotes) { best = r; bestNotes = n }
  }
  return best
}

export function soloistAdjustments(regions: SoloistRegion[]): Adjustment[] {
  const named = regions.filter((r) => r.name !== 'unknown')
  if (named.length < 2) return []

  return [
    {
      kind: 'soloist-boundary',
      severity: 'blocking',
      target: { range: [regions[0].startBar, regions[regions.length - 1].endBar] },
      after: regions,
      reason:
        `This score contains ${named.length} soloists (${named.map((r) => r.name).join(', ')}). ` +
        'Analysing across the boundary would blend their vocabularies. Choose one.',
      decidedBy: 'engine',
      confidence: 0.8,
    },
  ]
}
