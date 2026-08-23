import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { zipSync, strToU8 } from 'fflate'
import { readScoreXml } from './readScoreFile.ts'

describe('readScoreXml', () => {
  it('returns plain MusicXML unchanged', () => {
    const bytes = readFileSync('fixtures/minimal-tenor.musicxml')
    const xml = readScoreXml(new Uint8Array(bytes))
    expect(xml).toContain('<score-partwise')
  })

  it('extracts the root score from an .mxl container', () => {
    const inner = readFileSync('fixtures/minimal-tenor.musicxml', 'utf8')
    const container = `<?xml version="1.0" encoding="UTF-8"?>
<container><rootfiles><rootfile full-path="score.xml"/></rootfiles></container>`
    const mxl = zipSync({
      'META-INF/container.xml': strToU8(container),
      'score.xml': strToU8(inner),
    })
    expect(readScoreXml(mxl)).toContain('<score-partwise')
  })

  it('falls back to the first non-META-INF xml entry when container.xml is absent', () => {
    const inner = readFileSync('fixtures/minimal-tenor.musicxml', 'utf8')
    const mxl = zipSync({ 'anything.musicxml': strToU8(inner) })
    expect(readScoreXml(mxl)).toContain('<score-partwise')
  })

  it('throws a clear error when the zip contains no score', () => {
    const mxl = zipSync({ 'readme.txt': strToU8('nothing here') })
    expect(() => readScoreXml(mxl)).toThrow(/no MusicXML/i)
  })
})
