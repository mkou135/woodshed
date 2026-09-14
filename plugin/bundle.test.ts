import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'
import { BLAKE, HAS_BLAKE } from '../src/test/solos.ts'
import { readScoreXml } from '../src/ingest/readScoreFile.ts'

const BUNDLE = 'plugin/woodshed.js'
const HAS_BUNDLE = existsSync(BUNDLE)

/**
 * A context with nothing in it MuseScore's QJSEngine would not have: no
 * TextDecoder, process, fetch, window, document, performance, require.
 * Only what ES2016 itself defines, which `vm` supplies.
 */
function bareLoad(): { analyseXml: (xml: string) => { findings: { name: string }[]; units: unknown[] } } {
  const ctx = createContext({})
  runInContext(readFileSync(BUNDLE, 'utf8'), ctx, { filename: BUNDLE })
  return runInContext('woodshed', ctx)
}

describe.skipIf(!HAS_BUNDLE)('plugin/woodshed.js (run `npm run plugin:build` first)', () => {
  it('is ES2016-safe and self-contained', () => {
    const src = readFileSync(BUNDLE, 'utf8')
    expect(src).not.toMatch(/\brequire\(/)
    expect(src).not.toMatch(/anthropic|zod/i)
    expect(src).not.toMatch(/\bTextDecoder\b/)
    // A bare `new (function () {})` is fine; ES2022 class fields are not.
    expect(src).not.toMatch(/^\s*#\w+/m)
  })

  it('runs a fixture in a bare context', () => {
    const w = bareLoad()
    const r = w.analyseXml(readFileSync('fixtures/minimal-tenor.musicxml', 'utf8'))
    expect(Array.isArray(r.findings)).toBe(true)
  })

  it.skipIf(!HAS_BLAKE)('reproduces the pinned Blake result', () => {
    const w = bareLoad()
    const r = w.analyseXml(readScoreXml(new Uint8Array(readFileSync(BLAKE))))
    expect(r.findings[0].name).toBe('major-seventh arpeggio from the b3')
    expect(r.findings.length).toBeLessThanOrEqual(17)
  })
})
