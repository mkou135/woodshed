import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

/**
 * The owner's transcriptions are other people's work and live outside the
 * repo (DECISIONS 2026-08-24 "Corpus licensing"), so a fresh clone cannot
 * read them. They sit in `~/dev/woodshed-data/peers`, the same folder
 * `npm run brackets`, `eval:owner` and `bench` read; `PEERS_DIR` points the
 * suites somewhere else. Blake is `hey-lock.mxl` there, byte-identical to
 * the MuseScore original, which stays the file the owner edits — a re-export
 * means re-copying it here. `WOODSHED_BLAKE` still overrides that one file.
 *
 * Suites that need a long real solo guard on `HAS_BLAKE` (or on
 * `peerFiles()` being non-empty) and skip cleanly without it; everything a
 * fixture can carry runs regardless.
 */
export const PEERS_DIR = process.env.PEERS_DIR ?? join(homedir(), 'dev', 'woodshed-data', 'peers')

export const BLAKE = process.env.WOODSHED_BLAKE ?? join(PEERS_DIR, 'hey-lock.mxl')
export const ST_THOMAS = join(PEERS_DIR, 'st-thomas-sonny-rollins-solo-transcription.mxl')
export const HAS_BLAKE = existsSync(BLAKE)

/** Every transcription in `PEERS_DIR`, sorted by name; empty when the folder is absent. */
export function peerFiles(): { name: string; path: string }[] {
  if (!existsSync(PEERS_DIR)) return []
  return readdirSync(PEERS_DIR)
    .filter((f) => /\.(mxl|musicxml)$/i.test(f))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ name, path: join(PEERS_DIR, name) }))
}

if (!HAS_BLAKE) {
  console.warn(`Blake transcription not found at ${BLAKE} — its golden suites skip. Set PEERS_DIR (or WOODSHED_BLAKE) to a copy to run them.`)
}
