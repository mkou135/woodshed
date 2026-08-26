import { describe, it, expect } from 'vitest'
import { AnnotationStore } from './store.ts'

const p = (bar: number, beat: number) => ({ bar, beat })

describe('AnnotationStore', () => {
  it('cycles a boundary none → idea → phrase → none', () => {
    const s = new AnnotationStore('x.mxl')
    expect(s.cycleBoundary(p(4, 1))).toBe('idea')
    expect(s.cycleBoundary(p(4, 1))).toBe('phrase')
    expect(s.cycleBoundary(p(4, 1))).toBe(null)
    expect(s.boundaryAt(p(4, 1))).toBe(null)
  })
  it('adds and deletes spans; a span is normalised earliest-first', () => {
    const s = new AnnotationStore('x.mxl')
    s.addSpan('outside', p(12, 4), p(12, 2))
    expect(s.spans('outside')).toEqual([{ from: p(12, 2), to: p(12, 4) }])
    expect(s.removeSpanAt('outside', p(12, 3))).toBe(true)
    expect(s.spans('outside')).toEqual([])
  })
  it('round-trips through the file format, positions sorted', () => {
    const s = new AnnotationStore('hey-lock.mxl')
    s.cycleBoundary(p(8, 3.5))
    s.cycleBoundary(p(4, 1))
    s.cycleBoundary(p(4, 1))   // phrase
    s.addSpan('stars', p(73, 1), p(74, 4.5))
    const json = s.toJSON('2026-08-26')
    expect(json).toEqual({
      file: 'hey-lock.mxl',
      phrases: ['4.1'],
      ideas: ['8.3½'],
      outside: [],
      stars: [{ from: '73.1', to: '74.4½' }],
      annotated: '2026-08-26',
    })
    expect(AnnotationStore.fromJSON(json).toJSON('2026-08-26')).toEqual(json)
  })
  it('normalises alternate position spellings on load', () => {
    const s = AnnotationStore.fromJSON({
      file: 'x.mxl',
      phrases: [],
      ideas: ['8.3.5'],
      outside: [],
      stars: [],
      annotated: '2026-08-26',
    })
    expect(s.boundaryAt(p(8, 3.5))).toBe('idea')
    expect(s.counts()).toEqual({ phrases: 0, ideas: 1, outside: 0, stars: 0 })
  })
  it('counts phrases and ideas separately', () => {
    const s = new AnnotationStore('x.mxl')
    s.cycleBoundary(p(1, 1))
    s.cycleBoundary(p(1, 1))
    s.cycleBoundary(p(2, 1))
    expect(s.counts()).toEqual({ phrases: 1, ideas: 1, outside: 0, stars: 0 })
  })
})
