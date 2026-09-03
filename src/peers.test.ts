import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { run } from './pipeline.ts'
import type { PipelineResult } from './pipeline.ts'
import { peerFiles } from './test/solos.ts'
import { qualityFamily } from './core/pitch.ts'

/**
 * Every transcription the owner keeps in `peers` runs through the checks
 * that any solo must pass. The Blake-only suites pin *values* — a top
 * finding, a chorus grid, a bar-116 resolution; these pin *shape*, and a
 * transcription that crashes the pipeline or breaks a merge rule shows up
 * here instead of at the next `npm run bench`. Skips, not fails, on a
 * machine without the folder (see src/test/solos.ts).
 */
const peers = peerFiles()

/** One pipeline run per file, shared by the invariants and the pin. */
const results = new Map<string, PipelineResult>()
function resultFor(path: string): PipelineResult {
  let r = results.get(path)
  if (!r) {
    r = run(new Uint8Array(readFileSync(path)))
    results.set(path, r)
  }
  return r
}

describe.skipIf(peers.length === 0)('every peer transcription', () => {
  for (const peer of peers) {
    describe(peer.name, () => {
      // In `beforeAll`, not the describe body: vitest runs the factory even
      // when the suite will skip, so a read out here would throw during
      // collection on a machine without the file.
      let result: PipelineResult
      beforeAll(() => {
        result = resultFor(peer.path)
      })

      it('runs end to end with a view per finding', () => {
        expect(result.score.notes.length).toBeGreaterThan(0)
        expect(result.findingViews.length).toBe(result.analysis.findings.length)
      })

      it('keeps every confidence in [0, 1]', () => {
        for (const f of result.analysis.findings) {
          expect(f.confidence).toBeGreaterThanOrEqual(0)
          expect(f.confidence).toBeLessThanOrEqual(1)
        }
      })

      it('merges the same vocabulary into one finding', () => {
        // Identity as ENGINE_SPEC "Finding confidence" defines it for pass 1:
        // degrees within a quality family, else the name. Not the name alone:
        // St Thomas carries a major-family and a minor-family "5-3-2-1
        // descent", two cells by this rule that print the same — recorded in
        // OPEN_QUESTIONS 2026-09-03, not papered over here.
        const identity = (f: (typeof result.analysis.findings)[number]): string =>
          f.degrees ? `${f.degrees.join(',')}|${qualityFamily(f.quality ?? 'unknown')}` : f.name
        const seen = new Map<string, number>()
        for (const f of result.analysis.findings) seen.set(identity(f), (seen.get(identity(f)) ?? 0) + 1)
        for (const [key, count] of seen) {
          expect(count, `"${key}" appears as ${count} separate findings`).toBe(1)
        }
      })

      it('never grafts a foreign interval vector onto a cell with degrees', () => {
        for (const f of result.analysis.findings) {
          if (f.degrees && f.intervals) {
            expect(f.intervals, `"${f.name}"`).toHaveLength(f.degrees.length - 1)
          }
        }
      })

      it('keeps every finding local rather than claiming the whole solo', () => {
        const soloBars = new Set(result.analysis.contexts.map((c) => c.note.bar)).size
        for (const f of result.analysis.findings) {
          const bars = new Set(f.spans.map((s) => s.bar)).size
          expect(bars, `"${f.name}" claims ${bars} of ${soloBars} bars`).toBeLessThan(soloBars / 3)
        }
      })

      it('shapes every 7-3 resolution as a two-note device landing on the 3', () => {
        // Over the resolutions that exist: not every solo has one.
        for (const f of result.analysis.findings.filter((f) => f.detectedBy.includes('resolution'))) {
          expect(f.kind, `"${f.name}"`).toBe('device')
          expect(f.degrees, `"${f.name}"`).toHaveLength(2)
          expect(f.degrees![1]).toBe('3')
          for (const s of f.spans) expect(s.endIndex - s.startIndex).toBe(1)
        }
      })

      it('segments into phrases that each hold notes', () => {
        expect(result.analysis.phrases.length).toBeGreaterThan(0)
        for (const p of result.analysis.phrases) expect(p.notes.length).toBeGreaterThan(0)
      })

      it('builds units of at most two bars, each opening with the loop step', () => {
        // A unit is an idea, not a finding (ENGINE_SPEC "Practice units"):
        // roughly half carry no vocabulary and rank on arrival alone.
        expect(result.units.length).toBeGreaterThan(0)
        for (const u of result.units) {
          expect(u.notes[u.notes.length - 1].bar - u.notes[0].bar, u.id).toBeLessThanOrEqual(2)
          expect(u.steps[0]?.kind, u.id).toBe('loop')
        }
      })
    })
  }

  /**
   * The pin. One line per solo so a diff reads as a list of solos that
   * moved. Counts and the form-phase token are computed as `corpus:wjd`
   * computes them; the top finding's name and bars are what the Blake and
   * St Thomas suites already assert. Nothing richer — no note spellings, no
   * form length — per DECISIONS 2026-08-27 "What may live in a corpus
   * golden". Re-pin after an intended engine change: npm run test:run -- -u
   */
  it('matches goldens/peers.txt', async () => {
    const lines = peers.map((peer) => {
      const r = resultFor(peer.path)
      const top = r.analysis.findings[0]
      const bars = top ? [...new Set(top.spans.map((s) => s.bar))].join(',') : ''
      return [
        peer.name.replace(/\.(mxl|musicxml)$/i, ''),
        `findings=${r.analysis.findings.length}`,
        `units=${r.units.length}`,
        `phrases=${r.analysis.phrases.length}`,
        `ideas=${r.analysis.phrases.reduce((s, p) => s + p.ideas.length, 0)}`,
        `form=${r.report.form?.phaseFrom ?? 'no-form'}`,
        `top="${top?.name ?? '—'}"`,
        `bars=${bars}`,
      ].join(' ')
    })
    await expect(`${lines.join('\n')}\n`).toMatchFileSnapshot('../goldens/peers.txt')
  })
})
