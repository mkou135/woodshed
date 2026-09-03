import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { BLAKE, HAS_BLAKE } from './test/solos.ts'
import { run, describeFinding } from './pipeline.ts'
import type { Finding } from './analyse/index.ts'

// The Blake transcription is someone else's work and lives outside the repo
// (DECISIONS 2026-08-24 "Corpus licensing"), so a fresh clone cannot read it.
// Every suite that needs it is guarded; the rest run on `fixtures/`.

const finding = (over: Partial<Finding> = {}): Finding => ({
  id: 'f1',
  kind: 'cell',
  name: 'digital pattern 1235',
  spans: [{ startIndex: 0, endIndex: 3, bar: 73, beat: 2 }],
  degrees: ['1', '2', '3', '5'],
  detectedBy: ['shape'],
  weights: { shape: 1 },
  confidence: 0.8,
  ...over,
})

describe('describeFinding', () => {
  it('describes a single occurrence with its bar and beat', () => {
    const view = describeFinding(finding())
    expect(view.location).toBe('bar 73, beat 3')
    expect(view.occurrences).toBe(1)
    expect(view.confidenceLabel).toBe('strong')
  })

  it('lists the bars when a finding recurs', () => {
    const view = describeFinding(finding({
      spans: [
        { startIndex: 0, endIndex: 3, bar: 73, beat: 2 },
        { startIndex: 40, endIndex: 43, bar: 77, beat: 0 },
      ],
    }))
    expect(view.location).toBe('bars 73, 77')
    expect(view.occurrences).toBe(2)
  })

  it('labels confidence bands', () => {
    expect(describeFinding(finding({ confidence: 0.7 })).confidenceLabel).toBe('strong')
    expect(describeFinding(finding({ confidence: 0.5 })).confidenceLabel).toBe('moderate')
    expect(describeFinding(finding({ confidence: 0.2 })).confidenceLabel).toBe('weak')
  })
})

describe('run', () => {
  it('runs over every fixture without throwing, except the repeats one', () => {
    const names = [
      'minimal-tenor', 'kind-text-trap', 'words-chords-alto', 'unmarked-pickup',
      'two-soloists', 'form-8bar-x3', 'transposing-form', 'altissimo-tenor',
      'transcriber-notes', 'ties-tuplets-div24',
    ]
    for (const name of names) {
      expect(() => run(new Uint8Array(readFileSync(`fixtures/${name}.musicxml`)))).not.toThrow()
    }
  })
})

describe.skipIf(!HAS_BLAKE)('run over a real solo', () => {
  it('runs the whole pipeline end to end', () => {
    const result = run(new Uint8Array(readFileSync(BLAKE)))
    expect(result.score.notes.length).toBeGreaterThan(0)
    expect(result.report.form?.periodBars).toBe(56)
    // 8-bar intro, head at 9, solo chorus at 65: phased by the double bars.
    expect(result.report.form?.chorusStarts).toEqual([9, 65])
    expect(result.report.form?.agreesWithMarks).toBe(true)
    expect(result.findingViews.length).toBe(result.analysis.findings.length)
  })
})

/**
 * Golden check on a real solo. Green unit tests are not evidence the output
 * is any good — the engine once passed 156 of them while ranking its best
 * finding 9th of 81. This pins what a player should see.
 */
describe.skipIf(!HAS_BLAKE)('run: the Blake solo, read as a player would', () => {
  // Called in `beforeAll`, not in the describe body: vitest runs a suite's
  // factory even when `skipIf` will skip the suite, so a read out here throws
  // during collection — an error that names no test — on any machine without
  // the transcription. The guard alone would not have been enough.
  let result: ReturnType<typeof run>
  beforeAll(() => {
    result = run(new Uint8Array(readFileSync(BLAKE)))
  })

  it('ranks the hand-derived figure first, with every detector agreeing', () => {
    const top = result.analysis.findings[0]
    expect(top.name).toBe('major-seventh arpeggio from the b3')
    expect([...new Set(top.spans.map((s) => s.bar))]).toEqual([73, 77])
    expect(top.detectedBy.sort()).toEqual(['recurring', 'shape', 'target'])
  })

  it('offers a menu a player can read, not a dump', () => {
    // 13 before the 7-3 resolution detector, 15 after: Blake holds two
    // resolutions and they carry different names, so neither merges away.
    // Two of slack over the measured value, as when the bound was 15.
    expect(result.analysis.findings.length).toBeLessThanOrEqual(17)
    expect(result.analysis.findings.length).toBeGreaterThanOrEqual(6)
  })

  it('hears the b7 fall to the 3 across the bar line at 116', () => {
    const resolutions = result.analysis.findings.filter((f) => f.detectedBy.includes('resolution'))
    expect(resolutions.map((f) => f.name)).toEqual(['7-3 resolution', 'V–i 7-3 resolution'])
    const vi = resolutions.find((f) => f.name === 'V–i 7-3 resolution')!
    // F6, the b7 of G7, tied over the bar into Eb6, the 3 of Cm7.
    expect(vi.spans.map((s) => s.bar)).toEqual([116])
    expect(vi.degrees).toEqual(['b7', '3'])
    expect(vi.kind).toBe('device')
  })

  it('does not tie six findings at the same confidence', () => {
    const counts = new Map<number, number>()
    for (const f of result.analysis.findings) {
      const key = Math.round(f.confidence * 100)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(3)
  })

  it('drills the top figure with the contour Blake played', () => {
    const cycle = result.exercises.find((e) => e.id === 'f1-cycle')!
    for (const bar of cycle.bars) {
      const m = bar.midis
      expect(m[1]).toBeGreaterThan(m[0])
      expect(m[2]).toBeGreaterThan(m[1])
      expect(m[3]).toBeGreaterThan(m[2])
    }
  })

  it('never drills a major seventh over a dominant or sus chord', () => {
    for (const e of result.exercises) {
      if (!e.findingName.startsWith('major-seventh arpeggio')) continue
      for (const bar of e.bars) {
        expect(['dominant', 'suspended-fourth', 'augmented-seventh']).not.toContain(bar.quality)
      }
    }
  })
})

describe.skipIf(!HAS_BLAKE)('runWithAgent: the Blake solo through replay fixtures', () => {
  it('carries all four verdicts with nothing degraded', async () => {
    const { runWithAgent } = await import('./pipeline.ts')
    const { replayClient } = await import('./agent/client.ts')
    const { loadFixtures } = await import('./agent/fixtures.ts')
    const bytes = new Uint8Array(readFileSync(BLAKE))
    const result = await runWithAgent(bytes, replayClient(loadFixtures('fixtures/agent/blake')))

    expect(result.agent.degraded).toEqual([])
    // The adjudicated boundaries confirm the engine here, so the pinned
    // deterministic reading must be unchanged.
    expect(result.analysis.findings[0].name).toBe('major-seventh arpeggio from the b3')
    expect(result.agent.narration?.findingNames.find((f) => f.id === 'f1')?.name).toContain('maj7')
    expect(result.agent.narration?.overview[1]).toContain('record')
    const kept = result.agent.ranking?.order.filter((o) => o.keep) ?? []
    expect(kept[0]?.unitId).toBe('u1')
    expect(result.agent.sessionPlan?.units[0]).toEqual({
      unitId: 'u1',
      steps: ['loop', 'through', 'write'],
      note: 'sing it with the record first; write comes last, after it is in the ear',
    })
    expect(result.agent.boundaries?.size).toBe(3)
  })
})

describe('describeFinding language', () => {
  it('carries the language marker and corpus share to the view', () => {
    const view = describeFinding(finding({ language: 'bebop', lickShare: 0.47 }))
    expect(view.language).toBe('bebop')
    expect(view.lickShare).toBeCloseTo(0.47)
  })

  it('leaves both unset on an unmarked finding', () => {
    const view = describeFinding(finding())
    expect(view.language).toBeUndefined()
    expect(view.lickShare).toBeUndefined()
  })
})
