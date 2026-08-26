/** A spot on the printed page: bar number as printed, 1-based beat, 4.5 = the "and" of 4. */
export interface Position {
  bar: number
  beat: number
}

/** "4.4½" (the owner's notation) or "4.4.5"; a bare "7" is beat 1. */
export function parsePosition(s: string): Position {
  const [b, f = '1', rest] = s.replace('½', '.5').split('.')
  return { bar: Number(b), beat: Number(rest === undefined ? f : `${f}.${rest}`) }
}

export function formatPosition(p: Position): string {
  const whole = Math.floor(p.beat)
  const frac = p.beat - whole
  return `${p.bar}.${whole}${frac === 0 ? '' : frac === 0.5 ? '½' : frac.toString().substring(1)}`
}

/** Within `tolerance` beats of each other, bar lines crossed as `beatsPerBar`. */
export function positionsClose(a: Position, b: Position, beatsPerBar: number, tolerance: number): boolean {
  return Math.abs((a.bar - b.bar) * beatsPerBar + (a.beat - b.beat)) <= tolerance
}
