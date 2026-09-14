import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, normalize } from 'node:path'

// Walks relative imports from plugin/entry.ts, no build needed — the
// guarantee a fresh clone has.
const IMPORT_RE = /^\s*(?:import|export)[^'"]*from\s+['"]([^'"]+)['"]/gm

function walk(entry: string) {
  const visited = new Set<string>()
  const bare = new Set<string>()
  const queue = [entry]
  while (queue.length > 0) {
    const file = queue.pop()!
    if (visited.has(file)) continue
    visited.add(file)
    for (const [, spec] of readFileSync(file, 'utf8').matchAll(IMPORT_RE)) {
      if (!spec.startsWith('.')) { bare.add(spec); continue }
      const base = join(dirname(file), spec)
      queue.push(existsSync(base) ? base : normalize(base + '.ts'))
    }
  }
  return { visited, bare }
}

describe('plugin/entry.ts import graph', () => {
  const { visited, bare } = walk('plugin/entry.ts')

  it('never reaches the agent layer', () => {
    for (const file of visited) expect(file).not.toMatch(/\/agent\//)
  })

  it('never imports the Anthropic SDK or zod', () => {
    for (const spec of ['@anthropic-ai/sdk', '@anthropic-ai/sdk/helpers/zod', 'zod']) {
      expect(bare.has(spec)).toBe(false)
    }
  })

  it('reaches fflate only through src/ingest/readScoreFile.ts', () => {
    const importers = [...visited].filter((f) => /from\s+['"]fflate['"]/.test(readFileSync(f, 'utf8')))
    expect(importers).toEqual(['src/ingest/readScoreFile.ts'])
  })
})
