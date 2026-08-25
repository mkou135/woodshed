import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Read a directory of `<job>.json` verdict fixtures for `replayClient`.
 * Node-only (scripts and tests); `app/` never imports it.
 */
export function loadFixtures(dir: string): Record<string, unknown> {
  const fixtures: Record<string, unknown> = {}
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.json')) continue
    fixtures[file.slice(0, -'.json'.length)] = JSON.parse(readFileSync(join(dir, file), 'utf8'))
  }
  return fixtures
}
