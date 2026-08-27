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
  it('toggles a boundary at one level directly', () => {
    const s = new AnnotationStore('x.mxl')
    expect(s.toggleBoundary(p(4, 1), 'phrase')).toBe('phrase')
    expect(s.toggleBoundary(p(4, 1), 'idea')).toBe('idea')     // switches level
    expect(s.toggleBoundary(p(4, 1), 'idea')).toBe(null)       // same level clears
    expect(s.boundaryAt(p(4, 1))).toBe(null)
  })
  it('seeding replaces marks, prefers phrase on overlap, and survives the round-trip', () => {
    const s = new AnnotationStore('x.mxl')
    s.cycleBoundary(p(2, 1))
    s.seedBoundaries([p(4, 1)], [p(4, 1), p(6, 3)])
    expect(s.boundaryAt(p(2, 1))).toBe(null)
    expect(s.boundaryAt(p(4, 1))).toBe('phrase')
    expect(s.boundaryAt(p(6, 3))).toBe('idea')
    const json = s.toJSON('2026-08-27')
    expect(json.seeded).toBe(true)
    expect(AnnotationStore.fromJSON(json).seeded).toBe(true)
  })
  it('seeds spans and variation groups wholesale', () => {
    const s = new AnnotationStore('x.mxl')
    s.addSpan('outside', p(1, 1), p(1, 4))
    s.seedSpans('outside', [{ from: p(10, 1), to: p(10, 4) }, { from: p(20, 1), to: p(20, 4) }])
    expect(s.spans('outside')).toHaveLength(2)
    expect(s.spans('outside')[0].from).toEqual(p(10, 1))
    s.seedVariations([[{ from: p(5, 1), to: p(6, 1) }, { from: p(8, 1), to: p(9, 1) }]])
    expect(s.variations()).toEqual([[{ from: p(5, 1), to: p(6, 1) }, { from: p(8, 1), to: p(9, 1) }]])
    expect(s.seeded).toBe(true)
  })
  it('round-trips rejected scales, normalising position spellings', () => {
    const s = new AnnotationStore('x.mxl')
    expect(s.toggleScaleRejected('4.1', 'G Mixolydian')).toBe(true)
    expect(s.scaleRejected('4.1', 'G Mixolydian')).toBe(true)
    const json = s.toJSON('2026-08-27')
    expect(json.scalesRejected).toEqual([{ at: '4.1', name: 'G Mixolydian' }])
    const back = AnnotationStore.fromJSON({ ...json, scalesRejected: [{ at: '4.1.0', name: 'G Mixolydian' }] })
    expect(back.scaleRejected('4.1', 'G Mixolydian')).toBe(true)
    expect(s.toggleScaleRejected('4.1', 'G Mixolydian')).toBe(false)
    expect(s.toJSON('2026-08-27').scalesRejected).toBeUndefined()
  })
  it('cycles an end mark none → idea → phrase → none', () => {
    const s = new AnnotationStore('x.mxl')
    expect(s.cycleEnd(p(6, 4))).toBe('idea')
    expect(s.cycleEnd(p(6, 4))).toBe('phrase')
    expect(s.cycleEnd(p(6, 4))).toBe(null)
    expect(s.endAt(p(6, 4))).toBe(null)
  })
  it('groups variation spans; an emptied group disappears', () => {
    const s = new AnnotationStore('x.mxl')
    const a = s.addVariation(p(4, 1), p(5, 4))
    expect(s.addVariation(p(8, 1), p(9, 4), a)).toBe(a)
    const b = s.addVariation(p(20, 1), p(21, 4))
    expect(b).not.toBe(a)
    expect(s.variations()).toHaveLength(2)
    expect(s.variations()[0]).toHaveLength(2)
    expect(s.removeVariationAt(p(20, 2))).toBe(true)
    expect(s.variations()).toHaveLength(1)
    expect(s.removeVariationAt(p(50, 1))).toBe(false)
  })
  it('round-trips through the file format, positions sorted', () => {
    const s = new AnnotationStore('hey-lock.mxl')
    s.cycleBoundary(p(8, 3.5))
    s.cycleBoundary(p(4, 1))
    s.cycleBoundary(p(4, 1))   // phrase
    s.cycleEnd(p(7, 2))
    s.cycleEnd(p(7, 2))        // phrase end
    s.cycleEnd(p(5, 4))        // idea end
    s.addSpan('stars', p(73, 1), p(74, 4.5))
    const g = s.addVariation(p(10, 1), p(11, 4))
    s.addVariation(p(14, 1), p(15, 4), g)
    const json = s.toJSON('2026-08-26')
    expect(json).toEqual({
      file: 'hey-lock.mxl',
      phrases: ['4.1'],
      ideas: ['8.3½'],
      phraseEnds: ['7.2'],
      ideaEnds: ['5.4'],
      outside: [],
      stars: [{ from: '73.1', to: '74.4½' }],
      variations: [[{ from: '10.1', to: '11.4' }, { from: '14.1', to: '15.4' }]],
      annotated: '2026-08-26',
    })
    expect(AnnotationStore.fromJSON(json).toJSON('2026-08-26')).toEqual(json)
  })
  it('loads an older file with no ends or variations', () => {
    const s = AnnotationStore.fromJSON({
      file: 'x.mxl',
      phrases: ['4.1'],
      ideas: [],
      outside: [],
      stars: [],
      annotated: '2026-08-26',
    })
    expect(s.counts()).toEqual({ phrases: 1, ideas: 0, ends: 0, outside: 0, stars: 0, variations: 0 })
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
    expect(s.counts()).toEqual({ phrases: 0, ideas: 1, ends: 0, outside: 0, stars: 0, variations: 0 })
  })
  it('counts phrases and ideas separately', () => {
    const s = new AnnotationStore('x.mxl')
    s.cycleBoundary(p(1, 1))
    s.cycleBoundary(p(1, 1))
    s.cycleBoundary(p(2, 1))
    expect(s.counts()).toEqual({ phrases: 1, ideas: 1, ends: 0, outside: 0, stars: 0, variations: 0 })
  })
})
