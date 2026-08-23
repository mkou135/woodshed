import { describe, it, expect } from 'vitest'
import { instrumentFromTranspose } from './instrument.ts'

describe('instrumentFromTranspose', () => {
  it('identifies Bb tenor saxophone', () => {
    const i = instrumentFromTranspose(-2, -1)
    expect(i.name).toBe('Bb tenor saxophone')
    expect(i.rangeKnown).toBe(true)
    expect(i.writtenRange).toEqual({ lo: 58, hi: 89 })
    expect(i.altissimoTo).toBe(96)
  })

  it('identifies Eb alto saxophone, which shares the saxophone written range', () => {
    const i = instrumentFromTranspose(-9, 0)
    expect(i.name).toBe('Eb alto saxophone')
    expect(i.writtenRange).toEqual({ lo: 58, hi: 89 })
  })

  it('identifies Bb trumpet', () => {
    const i = instrumentFromTranspose(-2, 0)
    expect(i.name).toBe('Bb trumpet')
    expect(i.writtenRange).toEqual({ lo: 54, hi: 84 })
  })

  it('identifies a concert-pitch instrument sounding an octave lower', () => {
    expect(instrumentFromTranspose(0, -1).name).toBe('C instrument (8vb)')
  })

  it('identifies concert pitch', () => {
    expect(instrumentFromTranspose(0, 0).name).toBe('C instrument')
  })

  it('falls back for an unknown transposition without throwing', () => {
    const i = instrumentFromTranspose(-7, 0)
    expect(i.rangeKnown).toBe(false)
    expect(i.name).toBe('Unknown instrument')
    expect(i.transpose).toEqual({ chromatic: -7, octave: 0 })
  })
})
