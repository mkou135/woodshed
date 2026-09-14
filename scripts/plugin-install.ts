/**
 * Copy the extension into MuseScore 4's user extensions folder.
 *
 *   npm run plugin:install            # builds first
 *   MUSESCORE_EXTENSIONS=<dir> …      # elsewhere (another machine, a test profile)
 *
 * MuseScore scans every folder under `extensions` for a manifest.json at
 * startup, so restart MuseScore after installing.
 */
import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const DEFAULT = join(homedir(), 'Library', 'Application Support', 'MuseScore', 'MuseScore4', 'extensions')
const target = join(process.env.MUSESCORE_EXTENSIONS ?? DEFAULT, 'woodshed')

if (!existsSync('plugin/woodshed.js')) {
  console.error('plugin/woodshed.js missing — run npm run plugin:build')
  process.exit(1)
}

mkdirSync(join(target, 'tmp'), { recursive: true })
for (const f of ['manifest.json', 'Woodshed.qml', 'woodshed.js']) {
  cpSync(join('plugin', f), join(target, f))
}
console.log(`installed to ${target} — restart MuseScore`)
