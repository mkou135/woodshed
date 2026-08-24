import type { Score } from '../core/types.ts'
import type { IRealSong } from './ireal.ts'

/** Words a transcription title carries that a tune title never does. */
const NOISE = new Set([
  'solo', 'solos', 'transcription', 'transcribed', 'transcript', 'tenor', 'alto',
  'soprano', 'baritone', 'sax', 'saxophone', 'trumpet', 'trombone', 'guitar',
  'piano', 'bass', 'on', 'by', 'the', 'a', 'an', 'of', 'and', 'from', 'with',
  'live', 'take', 'version', 'ver', 'mxl', 'musicxml', 'xml',
])
const PLACEHOLDERS = new Set(['', 'title', 'untitled', 'score', 'new score'])

export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function words(text: string): string[] {
  return normalise(text).split(' ').filter((w) => w && !NOISE.has(w))
}

/**
 * A search query for the tune this transcription is of: the score's title,
 * or the file name when the title is a placeholder, minus the words that
 * describe the transcription rather than the tune. A guess, not an answer.
 */
export function guessTitle(score: Pick<Score, 'title'>, filename = ''): string {
  const title = score.title?.trim() ?? ''
  const base = PLACEHOLDERS.has(title.toLowerCase())
    ? filename.replace(/\.[a-z0-9]+$/i, '')
    : title
  return words(base).join(' ')
}

export interface TuneMatch {
  song: IRealSong
  score: number
}

/**
 * Rank the book against a query. Exact title beats prefix beats a title
 * wholly inside the query ("clifford brown sandu" → Sandu) beats
 * every-query-word-present beats most-words-present. A query word that is
 * a prefix of a title word counts, so typing works letter by letter.
 */
export function searchTunes(query: string, songs: IRealSong[], limit = 8): TuneMatch[] {
  const q = words(query)
  if (q.length === 0) return []
  const qn = q.join(' ')
  const out: TuneMatch[] = []
  for (const song of songs) {
    const t = words(song.title)
    const tn = t.join(' ')
    let score: number
    if (tn === qn) score = 4
    else if (tn.startsWith(qn)) score = 3
    else if (t.length > 0 && t.every((x) => q.includes(x))) score = 2.5 // title inside a longer query
    else {
      const hit = q.filter((w) => t.some((x) => x === w || x.startsWith(w))).length
      if (hit === 0) continue
      score = hit === q.length ? 2 : hit / q.length
    }
    out.push({ song, score })
  }
  return out
    .sort((a, b) => b.score - a.score || a.song.title.localeCompare(b.song.title))
    .slice(0, limit)
}
