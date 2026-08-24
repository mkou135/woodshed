import { TICKS_PER_QUARTER } from '../core/types.ts'
import type { Chord, ChordTrack, Mark, Quality } from '../core/types.ts'

const STEP_SEMITONES: Record<string, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
}

/** Chords read from staff text are less trustworthy than <harmony> elements. */
const TEXT_CONFIDENCE = 0.7

const ROOT = /^([A-G])([b#]?)/

export interface ParsedSymbol {
  rootPc: number
  quality: Quality
  tensions: string[]
}

/**
 * Parse one chord symbol. Returns null for anything that is not a chord —
 * this doubles as the filter deciding which staff text is harmony at all.
 */
export function parseChordSymbol(text: string): ParsedSymbol | null {
  const trimmed = text.trim()
  const rootMatch = ROOT.exec(trimmed)
  if (!rootMatch) return null

  const [, letter, accidental] = rootMatch
  const alter = accidental === 'b' ? -1 : accidental === '#' ? 1 : 0
  const rootPc = (((STEP_SEMITONES[letter] ?? 0) + alter) % 12 + 12) % 12

  // A slash bass ("C-/Bb", "F/A") names an inversion or pedal; the chord
  // quality is unchanged and the bass is not a tension.
  let rest = trimmed.slice(rootMatch[0].length).replace(/\/[A-G][b#]?$/, '')

  const tensions: string[] = []
  // "+9" is this dialect's spelling of "#9".
  rest = rest.replace(/\+9/g, '#9')
  for (const t of ['b9', '#9', '#11', 'b13', '#5', 'b5']) {
    // b5 is structural in m7b5, handled below; only treat it as a tension
    // when the symbol is not half-diminished.
    if (t === 'b5' && /m7b5|-7b5/.test(rest)) continue
    if (rest.includes(t)) {
      tensions.push(t)
      rest = rest.replace(t, '')
    }
  }

  const quality = qualityOf(rest)
  if (quality === null) return null

  return { rootPc, quality, tensions }
}

function qualityOf(rest: string): Quality | null {
  const s = rest.trim()

  if (s === '') return 'major'
  if (/^(sus|7sus|9sus)/.test(s)) return 'suspended-fourth'
  if (/^(m7b5|-7b5|ø)/.test(s)) return 'half-diminished'
  if (/^(o7|dim7|°7)/.test(s)) return 'diminished-seventh'
  if (/^(o|dim|°)/.test(s)) return 'diminished'
  if (/^(\+7|7\+5|aug7)/.test(s)) return 'augmented-seventh'
  if (/^(\+|aug)/.test(s)) return 'augmented'
  if (/^(maj7|M7|Δ7|Δ|ma7)/.test(s)) return 'major-seventh'
  if (/^(-|m|min)(maj7|M7|Δ)/.test(s)) return 'minor-major'
  if (/^(-|m|min)(7|9|11|13)/.test(s)) return 'minor-seventh'
  if (/^(-|m|min)6/.test(s)) return 'minor'
  if (/^(-|m|min)$/.test(s)) return 'minor'
  if (/^maj/.test(s)) return 'major'
  if (/^(7|9|11|13)/.test(s)) return 'dominant'
  if (/^6/.test(s)) return 'major'

  // Anything else is not a chord symbol.
  return null
}

/** Build a chord track from staff text, skipping words that are not chords. */
export function chordTrackFromMarks(marks: Mark[]): ChordTrack | null {
  const chords: Chord[] = []

  for (const mark of marks) {
    if (mark.kind !== 'words') continue
    const parsed = parseChordSymbol(mark.text)
    if (!parsed) continue
    chords.push({
      // Staff text carries no offset, so position is bar-level only.
      onset: (mark.bar - 1) * 4 * TICKS_PER_QUARTER,
      bar: mark.bar,
      rootPc: parsed.rootPc,
      quality: parsed.quality,
      tensions: parsed.tensions,
    })
  }

  if (chords.length === 0) return null
  return { chords, provenance: 'file', confidence: TEXT_CONFIDENCE }
}
