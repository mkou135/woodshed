import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'
import { BLAKE, HAS_BLAKE } from '../src/test/solos.ts'
import { readScoreXml } from '../src/ingest/readScoreFile.ts'

const BUNDLE = 'plugin/woodshed.js'
const HAS_BUNDLE = existsSync(BUNDLE)

/**
 * A context with no host globals (no TextDecoder, process, fetch, window,
 * document, performance, require) and with the ES2019+ builtins Qt 6.10's
 * V4 lacks removed, so a bundle that runs here runs in MuseScore. Verified
 * by string-scanning the shipped QtQml framework: V4 has no
 * `Array.prototype.flat`/`flatMap`/`at`/`findLast`/`findLastIndex`,
 * `String.prototype.trimStart`/`trimEnd`/`matchAll`/`replaceAll`, or
 * `Object.fromEntries`.
 */
function bareLoad(): { analyseXml: (xml: string) => { findings: { name: string }[]; units: unknown[]; marks: unknown[] } } {
  const ctx = createContext({})
  runInContext(`
    delete Array.prototype.flat; delete Array.prototype.flatMap
    delete Array.prototype.at; delete Array.prototype.findLast; delete Array.prototype.findLastIndex
    delete String.prototype.trimStart; delete String.prototype.trimEnd
    delete String.prototype.matchAll; delete String.prototype.replaceAll
    delete Object.fromEntries
  `, ctx)
  runInContext(readFileSync(BUNDLE, 'utf8'), ctx, { filename: BUNDLE })
  return runInContext('woodshed', ctx)
}

describe.skipIf(!HAS_BUNDLE)('plugin/woodshed.js (run `npm run plugin:build` first)', () => {
  it('is ES2016-safe and self-contained', () => {
    const src = readFileSync(BUNDLE, 'utf8')
    expect(src).not.toMatch(/\brequire\(/)
    expect(src).not.toMatch(/anthropic|zod/i)
    expect(src).not.toMatch(/\bTextDecoder\b/)
    expect(src).not.toMatch(/fflate|unzipSync|inflt/)
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
    expect(r.findings.length).toBeGreaterThanOrEqual(6)
    expect(r.findings.length).toBeLessThanOrEqual(17)
    expect(r.marks.length).toBeGreaterThan(0)
  })
})
