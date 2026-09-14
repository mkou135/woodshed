import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { analyseXml } from './entry.ts'

describe('analyseXml', () => {
  const xml = readFileSync('fixtures/minimal-tenor.musicxml', 'utf8')

  it('returns plain data a QML ListView can bind to', () => {
    const r = analyseXml(xml)
    expect(Array.isArray(r.findings)).toBe(true)
    expect(Array.isArray(r.units)).toBe(true)
    expect(Array.isArray(r.warnings)).toBe(true)
    expect(typeof r.timing.total).toBe('number')
    // JSON round trip loses nothing: no class instances, Maps, Sets or functions.
    expect(JSON.parse(JSON.stringify(r))).toEqual(r)
  })

  it('carries each unit\'s header and step prompts', () => {
    const r = analyseXml(xml)
    for (const u of r.units) {
      expect(typeof u.header).toBe('string')
      expect(u.prompts.length).toBeGreaterThan(0)
      for (const p of u.prompts) expect(typeof p).toBe('string')
    }
  })
})
