import { describe, expect, it } from 'vitest'
import { barSpans, detail, displayName, headline, namedCells, teacherNames } from './describe.ts'
import type { Finding } from '../analyse/index.ts'
import type { Described } from './describe.ts'
import type { UnitSummary } from './unit.ts'

function finding(over: Partial<Finding> & { id: string }): Finding {
  return {
    kind: 'cell', name: 'major-seventh arpeggio', spans: [], detectedBy: ['shape'],
    weights: { shape: 1 }, confidence: 0.8, ...over,
  }
}

function unit(findings: Finding[], summary: Partial<UnitSummary> = {}): Described {
  return {
    findings,
    summary: {
      bars: 'Bars 204–205', chords: ['Gmaj7', 'C7'], landing: null, alsoAt: [],
      stock: false, resolves: false, ...summary,
    },
  }
}

describe('displayName', () => {
  it('shows the engine name of a finding the dictionary knows', () => {
    expect(displayName(finding({ id: 'f1' }))).toBe('major-seventh arpeggio')
  })

  it('shows nothing for a shape the engine cannot name', () => {
    expect(displayName(finding({ id: 'f1', unnamed: true, name: 'recurring cell [5, -5, 0]' }))).toBeNull()
  })

  it('prefers the agent name, per finding, with the engine name as the fallback', () => {
    const names = teacherNames([{ id: 'f2', name: 'a rocking fourth' }])
    expect(displayName(finding({ id: 'f2', unnamed: true }), names)).toBe('a rocking fourth')
    expect(displayName(finding({ id: 'f1' }), names)).toBe('major-seventh arpeggio')
  })
})

describe('headline', () => {
  it('names the strongest named finding', () => {
    const u = unit([
      finding({ id: 'f1', name: 'chromatic enclosure into the 3', confidence: 0.5 }),
      finding({ id: 'f2', name: 'major-seventh arpeggio from the b3', confidence: 0.9 }),
    ])
    expect(headline(u)).toBe('major-seventh arpeggio from the b3')
  })

  it('says so plainly when every finding is a shape without a word', () => {
    const u = unit([finding({ id: 'f1', unnamed: true, name: 'recurring cell [5, -5, 0]' })])
    expect(headline(u)).toBe('A figure the player keeps returning to — the score shows it')
  })

  it('falls back to the stock lines when there is no finding at all', () => {
    expect(headline(unit([], { stock: true, stockKind: 'scale-run' }))).toMatch(/scale run/)
    expect(headline(unit([], { stock: true, stockKind: 'common-language' }))).toMatch(/common jazz language/)
    expect(headline(unit([]))).toMatch(/still the player/)
  })

  it('says the same four things terse enough for a table row', () => {
    expect(headline(unit([]), undefined, true)).toBe('no named vocabulary')
    expect(headline(unit([], { stock: true, stockKind: 'scale-run' }), undefined, true)).toBe('mostly a scale run')
    const u = unit([finding({ id: 'f1', unnamed: true })])
    expect(headline(u, undefined, true)).toBe('a figure the player returns to')
    // A name is a name at either length.
    expect(headline(unit([finding({ id: 'f1' })]), undefined, true)).toBe('major-seventh arpeggio')
  })

  it('lets an agent name rescue an unnamed finding into the headline', () => {
    const u = unit([finding({ id: 'f1', unnamed: true, name: 'recurring cell [5, -5, 0]' })])
    expect(headline(u, teacherNames([{ id: 'f1', name: 'the rocking fourth' }]))).toBe('the rocking fourth')
  })
})

describe('detail', () => {
  it('carries the asides in the order a player asks for them', () => {
    const u = unit(
      [
        finding({ id: 'f1', name: 'major-seventh arpeggio', confidence: 0.9 }),
        finding({
          id: 'f2', name: 'recurring cell [5, -7, 2]', unnamed: true, confidence: 0.5,
          variants: [
            { intervals: [5, -7, 3], occurrences: [1, 2], relation: 'near' },
            { intervals: [-5, 7, -2], occurrences: [9], relation: 'inversion' },
          ],
        }),
        finding({ id: 'f3', name: 'chromatic enclosure into the 3', confidence: 0.6 }),
      ],
      { landing: 'b13', alsoAt: ['194', '195', '196', '208'] },
    )
    expect(detail(u)).toEqual([
      'chromatic enclosure into the 3',
      'lands on the b13',
      '3 variants of the same shape',
      'also at bars 194–196, 208',
      '1 shape the engine cannot name',
    ])
  })

  it('counts the shapes the headline could not stand for', () => {
    const two = [
      finding({ id: 'f1', unnamed: true, name: 'recurring cell [5, -5, 0]' }),
      finding({ id: 'f2', unnamed: true, name: 'recurring cell [2, -2, -5]' }),
    ]
    // The fallback headline stands for one of them; the other is counted.
    expect(detail(unit(two))).toEqual(['1 more shape the engine cannot name'])
    expect(detail(unit([two[0]]))).toEqual([])
  })

  it('trims an agent name to its first half for a table row', () => {
    const names = teacherNames([{ id: 'f1', name: 'the maj7 off the b3 — a bright colour over the minor chord' }])
    const u = unit([finding({ id: 'f1', unnamed: true })])
    expect(headline(u, names)).toBe('the maj7 off the b3 — a bright colour over the minor chord')
    expect(headline(u, names, true)).toBe('the maj7 off the b3')
  })

  it('is empty when there is nothing to add', () => {
    expect(detail(unit([finding({ id: 'f1' })]))).toEqual([])
  })

  it('says when the idea resolves its 7 to the 3 of the next chord', () => {
    const u = unit([finding({ id: 'f1' })], { resolves: true })
    expect(detail(u)).toContain('its 7 falls to the 3 of the next chord')
  })

  it('says nothing about resolution when nothing in the idea resolves', () => {
    const u = unit([finding({ id: 'f1' })])
    expect(detail(u)).not.toContain('its 7 falls to the 3 of the next chord')
  })
})

describe('namedCells', () => {
  it('drops unnamed findings and keeps each name once', () => {
    const u = unit([
      finding({ id: 'f1', name: 'major triad 5-3-1', confidence: 0.7 }),
      finding({ id: 'f2', unnamed: true, name: 'recurring cell [5, -5, 0]', confidence: 0.9 }),
      finding({ id: 'f3', name: 'major triad 5-3-1', confidence: 0.4 }),
    ])
    expect(namedCells(u)).toEqual(['major triad 5-3-1'])
  })
})

describe('barSpans', () => {
  it('collapses consecutive printed bars into ranges', () => {
    const bars = ['194', '195', '196', '197', '198', '199', '200', '202', '203', '206', '208', '209']
    expect(barSpans(bars)).toBe('194–200, 202–203, 206, 208–209')
  })

  it('never folds a repeat label into a run — the arithmetic would lie', () => {
    expect(barSpans(['16', '17 (2nd time)', '18'])).toBe('16, 17 (2nd time), 18')
  })
})
