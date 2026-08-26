import type { Position } from '../core/position.ts'
import { positionsClose } from '../core/position.ts'

export interface MatchResult {
  matched: [Position, Position][]   // [owner, engine]
  missed: Position[]                // owner marks the engine lacks
  falseStarts: Position[]           // engine marks the owner lacks
}

/**
 * Greedy in-order matching: walk owner marks in order; each takes the
 * nearest unclaimed engine mark within tolerance. An engine mark is
 * claimed by at most one owner mark.
 */
export function matchStarts(owner: Position[], engine: Position[], beatsPerBar: number, tolerance: number): MatchResult {
  const claimed = new Array<boolean>(engine.length).fill(false)
  const matched: [Position, Position][] = []
  const missed: Position[] = []

  for (const o of owner) {
    let bestIndex = -1
    let bestDistance = Infinity
    for (let i = 0; i < engine.length; i++) {
      if (claimed[i]) continue
      const e = engine[i]
      if (!positionsClose(o, e, beatsPerBar, tolerance)) continue
      const distance = Math.abs((o.bar - e.bar) * beatsPerBar + (o.beat - e.beat))
      if (distance < bestDistance) {
        bestDistance = distance
        bestIndex = i
      }
    }
    if (bestIndex === -1) {
      missed.push(o)
    } else {
      claimed[bestIndex] = true
      matched.push([o, engine[bestIndex]])
    }
  }

  const falseStarts = engine.filter((_, i) => !claimed[i])

  return { matched, missed, falseStarts }
}

export function prf(matched: number, missed: number, falseStarts: number): { precision: number; recall: number; f1: number } {
  const precisionDenominator = matched + falseStarts
  const recallDenominator = matched + missed
  const precision = precisionDenominator === 0 ? 0 : matched / precisionDenominator
  const recall = recallDenominator === 0 ? 0 : matched / recallDenominator
  const f1 = precision + recall === 0 ? 0 : 2 * precision * recall / (precision + recall)
  return { precision, recall, f1 }
}
