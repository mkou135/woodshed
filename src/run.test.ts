import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { run, runXml } from './run.ts'
import { readScoreXml } from './ingest/readScoreFile.ts'
import { BLAKE, HAS_BLAKE } from './test/solos.ts'

const strip = (r: ReturnType<typeof run>) => ({ ...r, timing: undefined })

describe('runXml', () => {
  it('matches run on a fixture', () => {
    const path = 'fixtures/minimal-tenor.musicxml'
    const fromBytes = run(new Uint8Array(readFileSync(path)))
    const fromXml = runXml(readFileSync(path, 'utf8'))
    expect(strip(fromXml)).toEqual(strip(fromBytes))
  })

  it.skipIf(!HAS_BLAKE)('matches run on Blake', () => {
    const bytes = new Uint8Array(readFileSync(BLAKE))
    // .mxl is a zip; runXml wants the XML inside, which readScoreXml unpacks.
    expect(strip(runXml(readScoreXml(bytes)))).toEqual(strip(run(bytes)))
  })
})

describe('run.ts imports', () => {
  it('reaches no agent module', () => {
    const src = readFileSync('src/run.ts', 'utf8')
    expect(src).not.toMatch(/agent\//)
  })
})
