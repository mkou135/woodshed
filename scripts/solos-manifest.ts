/**
 * Rewrite public/solos/manifest.json from whatever scores are sitting in
 * public/solos. The manifest is committed rather than generated at build
 * time, so that `npm run build` stays a pure `tsc && vite build` and the
 * deployed asset is exactly the one that was reviewed.
 *
 *   npm run solos:manifest
 *
 * Everything in public/solos is published publicly — see the README there.
 */
import { readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

interface SoloEntry {
  file: string
  title: string
}

const dir = fileURLToPath(new URL('../public/solos', import.meta.url))

/** "hey-lock_seamus-blake.mxl" -> "Hey Lock Seamus Blake": a starting point the
    owner is expected to edit in the manifest when the filename is terse. */
function titleOf(file: string): string {
  return file
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase())
}

const entries: SoloEntry[] = readdirSync(dir)
  .filter((f) => /\.(mxl|musicxml)$/i.test(f))
  .sort((a, b) => a.localeCompare(b))
  .map((file) => ({ file, title: titleOf(file) }))

writeFileSync(join(dir, 'manifest.json'), `${JSON.stringify(entries, null, 2)}\n`)
console.log(`manifest.json: ${entries.length} solo${entries.length === 1 ? '' : 's'}`)
