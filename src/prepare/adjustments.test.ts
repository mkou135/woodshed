import { describe, it, expect } from 'vitest'
import { summarise } from './adjustments.ts'
import type { Adjustment } from './adjustments.ts'

const adj = (severity: Adjustment['severity']): Adjustment => ({
  kind: 'range-outlier',
  severity,
  target: { bar: 1 },
  reason: 'test',
  decidedBy: 'engine',
  confidence: 0.5,
})

describe('summarise', () => {
  it('counts adjustments by severity', () => {
    expect(summarise([adj('info'), adj('warn'), adj('warn'), adj('blocking')]))
      .toEqual({ info: 1, warn: 2, blocking: 1 })
  })

  it('returns zeroes for an empty list', () => {
    expect(summarise([])).toEqual({ info: 0, warn: 0, blocking: 0 })
  })
})
