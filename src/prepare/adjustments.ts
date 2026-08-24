export type AdjustmentKind =
  | 'soloist-boundary'
  | 'region-proposal'
  | 'form-period'
  | 'chord-persistence'
  | 'unmarked-pickup'
  | 'range-outlier'
  | 'transcriber-note'
  | 'repeat-unrolled'
  | 'empty-stretch'

export type Severity = 'info' | 'warn' | 'blocking'

export interface Adjustment {
  kind: AdjustmentKind
  severity: Severity
  /** Either a single bar or an inclusive bar range. */
  target: { bar: number } | { range: [number, number] }
  before?: unknown
  after?: unknown
  reason: string
  decidedBy: 'engine' | 'model' | 'user'
  /** 0..1, heuristic. Not a probability. */
  confidence: number
}

export function summarise(adjustments: Adjustment[]): Record<Severity, number> {
  const out: Record<Severity, number> = { info: 0, warn: 0, blocking: 0 }
  for (const a of adjustments) out[a.severity]++
  return out
}
