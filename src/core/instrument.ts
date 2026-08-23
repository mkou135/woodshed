import type { Instrument } from './types.ts'

interface Known {
  name: string
  lo: number
  hi: number
  altissimoTo?: number
}

/** Keyed by `${chromatic}/${octave}` from MusicXML's <transpose>. */
const KNOWN: Record<string, Known> = {
  '-2/-1': { name: 'Bb tenor saxophone', lo: 58, hi: 89, altissimoTo: 96 },
  '-9/-1': { name: 'Eb baritone saxophone', lo: 58, hi: 89, altissimoTo: 96 },
  '-9/0': { name: 'Eb alto saxophone', lo: 58, hi: 89, altissimoTo: 96 },
  '-2/0': { name: 'Bb trumpet', lo: 54, hi: 84 },
  '0/-1': { name: 'C instrument (8vb)', lo: 40, hi: 84 },
  '0/0': { name: 'C instrument', lo: 55, hi: 88 },
}

export function instrumentFromTranspose(chromatic: number, octave: number): Instrument {
  const hit = KNOWN[`${chromatic}/${octave}`]
  if (!hit) {
    return {
      name: 'Unknown instrument',
      transpose: { chromatic, octave },
      // Deliberately wide: an unknown instrument must not trigger range flags.
      writtenRange: { lo: 0, hi: 127 },
      rangeKnown: false,
    }
  }
  return {
    name: hit.name,
    transpose: { chromatic, octave },
    writtenRange: { lo: hit.lo, hi: hit.hi },
    ...(hit.altissimoTo === undefined ? {} : { altissimoTo: hit.altissimoTo }),
    rangeKnown: true,
  }
}
