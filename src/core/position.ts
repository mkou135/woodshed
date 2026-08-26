/**
 * A spot on the printed page: bar number as printed, 1-based beat, 4.5 = the "and" of 4.
 * Positions are quantised to a thousandth of a beat (3 decimal places), well inside the
 * 0.5-beat matching tolerance.
 */
export interface Position {
  bar: number
  beat: number
}

/** "4.4½" (the owner's notation) or "4.4.5"; a bare "7" is beat 1. */
export function parsePosition(s: string): Position {
  const [b, f = '1', rest] = s.replace('½', '.5').split('.')
  return { bar: Number(b), beat: Number(rest === undefined ? f : `${f}.${rest}`) }
}

/** "4.4½" (the owner's notation) or "4.4.5"; quantises fractional beats to 3 decimal places. */
export function formatPosition(p: Position): string {
  const beat = Math.round(p.beat * 1000) / 1000
  const whole = Math.floor(beat)
  const frac = beat - whole
  if (frac === 0) return `${p.bar}.${whole}`
  if (frac === 0.5) return `${p.bar}.${whole}½`
  // Emit remaining fractions via decimal digits, removing trailing zeros.
  // Derived from `frac`, not `beat` — the whole part can be multiple digits
  // (e.g. beat 10.25), and beat.toFixed(3).substring(2) assumed exactly one.
  const decimal = frac.toFixed(3).substring(1).replace(/0+$/, '')
  return `${p.bar}.${whole}${decimal}`
}

/** Within `tolerance` beats of each other, bar lines crossed as `beatsPerBar`. */
export function positionsClose(a: Position, b: Position, beatsPerBar: number, tolerance: number): boolean {
  return Math.abs((a.bar - b.bar) * beatsPerBar + (a.beat - b.beat)) <= tolerance
}
