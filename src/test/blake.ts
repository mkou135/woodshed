import { existsSync } from 'node:fs'

/**
 * The Blake transcription is someone else's work and lives outside the repo
 * (DECISIONS 2026-08-24 "Corpus licensing"), so a fresh clone cannot read it.
 * The golden suites that need a long real solo guard on `HAS_BLAKE` and skip
 * cleanly without it; everything a fixture can carry runs regardless.
 * `WOODSHED_BLAKE` points the suites at a copy kept somewhere else.
 */
const OWNER_COPY = '/Users/michaelkourkov/Documents/MuseScore4/Scores/Hey Lock! - Seamus Blake Solo Transcription.mxl'

export const BLAKE = process.env.WOODSHED_BLAKE ?? OWNER_COPY
export const HAS_BLAKE = existsSync(BLAKE)

if (!HAS_BLAKE) {
  console.warn(`Blake transcription not found at ${BLAKE} — its golden suites skip. Set WOODSHED_BLAKE to a copy to run them.`)
}
