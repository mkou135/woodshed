import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { analyseXml } from './entry.ts'
import { runXml } from '../src/run.ts'

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

  it('maps title, tune and warnings from the engine result', () => {
    const r = analyseXml(xml)
    const engine = runXml(xml)
    // No fixture carries a title: the fallback is null, never undefined or ''.
    expect(r.title).toBeNull()
    expect(r.tune).toBe(engine.tune.title || null)
    expect(r.warnings).toEqual(
      engine.report.adjustments.filter((a) => a.severity !== 'info').map((a) => a.reason),
    )
    // Only warn/blocking reach the panel; every info reason stays out.
    for (const a of engine.report.adjustments) {
      if (a.severity === 'info') expect(r.warnings).not.toContain(a.reason)
    }

    // Test with two-soloists.musicxml to exercise the filter on non-empty list
    const twoXml = readFileSync('fixtures/two-soloists.musicxml', 'utf8')
    const r2 = analyseXml(twoXml)
    const engine2 = runXml(twoXml)
    expect(r2.warnings).toEqual(
      engine2.report.adjustments.filter((a) => a.severity !== 'info').map((a) => a.reason),
    )
    for (const a of engine2.report.adjustments) {
      if (a.severity === 'info') expect(r2.warnings).not.toContain(a.reason)
    }
  })

  it('carries a mark plan, a colour per finding and a score per unit', () => {
    const r = analyseXml(xml)
    expect(Array.isArray(r.marks)).toBe(true)
    for (const f of r.findings) expect(f.colour).toMatch(/^#[0-9a-f]{6}$/)
    for (const u of r.units) {
      expect(u.scoreXml.startsWith('<?xml')).toBe(true)
      expect(u.scoreXml).toContain('<transpose>')
    }
    expect(JSON.parse(JSON.stringify(r))).toEqual(r)
  })
})
