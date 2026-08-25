import { describe, expect, it } from 'vitest'
import { BoundaryVerdicts, Narration, RankVerdict, SessionPlan } from './verdicts.ts'

describe('verdict schemas', () => {
  it('parses a valid narration', () => {
    const v = Narration.parse({
      overview: ['First paragraph.', 'Second paragraph.'],
      findingNames: [{ id: 'f1', name: 'the relative-major maj7 arpeggio off the b3' }],
      lookFors: [{ unitId: 'u1', text: 'Bars 76-77: listen for the landing on the 3rd.' }],
    })
    expect(v.findingNames[0].id).toBe('f1')
  })

  it('rejects a three-paragraph overview', () => {
    expect(() =>
      Narration.parse({ overview: ['a', 'b', 'c'], findingNames: [], lookFors: [] }),
    ).toThrow()
  })

  it('rejects a session-plan step outside the four', () => {
    expect(() =>
      SessionPlan.parse({ units: [{ unitId: 'u1', steps: ['transpose'] }], interleave: 'rotate' }),
    ).toThrow()
  })

  it('rejects note data smuggled into a boundary verdict', () => {
    expect(() =>
      BoundaryVerdicts.parse({ verdicts: [{ candidateId: 'b3', boundary: true, cue: 'rest', midi: 62 }] }),
    ).toThrow()
  })

  it('parses a rank verdict', () => {
    const v = RankVerdict.parse({ order: [{ unitId: 'u2', keep: true, reason: 'strongest recurrence' }] })
    expect(v.order[0].keep).toBe(true)
  })
})
