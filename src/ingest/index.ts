import type { Score } from '../core/types.ts'
import { readScoreXml } from './readScoreFile.ts'
import { parseScore } from './parseScore.ts'
import { parseHarmonyTrack } from './parseHarmony.ts'
import { chordTrackFromMarks } from './parseChordText.ts'

export { UnsupportedScoreError } from './parseScore.ts'

/**
 * Read a .mxl or .musicxml file into a Score with its chord track attached.
 * <harmony> elements are preferred; staff text is the documented fallback for
 * the roughly one file in eight that carries chords only as words.
 */
export function ingest(bytes: Uint8Array): Score {
  const xml = readScoreXml(bytes)
  const score = parseScore(xml)

  const harmony = parseHarmonyTrack(xml)
  const track = harmony ?? chordTrackFromMarks(score.marks)

  return { ...score, chordTracks: track ? [track] : [] }
}
