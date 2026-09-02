import { z } from 'zod'

/**
 * What the model may return, and nothing else. Every verdict references
 * engine objects by id; the schemas are strict so a pitch, count or interval
 * cannot ride along (the judge-yes-generate-never rule, DECISIONS
 * 2026-08-25 "Agent layer scope").
 */

export const Narration = z.object({
  /**
   * The architecture-over-time overview. Asked for as two paragraphs; the
   * API does not enforce exact array lengths, so the schema tolerates up to
   * four and `narrate()` collapses to two.
   */
  overview: z.array(z.string()).min(1).max(4),
  /** Teacher-language display names; the dictionary string stays the stable id. */
  findingNames: z.array(z.object({ id: z.string(), name: z.string() }).strict()),
  lookFors: z.array(z.object({ unitId: z.string(), text: z.string() }).strict()),
}).strict()
export type Narration = z.infer<typeof Narration>

export const RankVerdict = z.object({
  order: z.array(z.object({ unitId: z.string(), keep: z.boolean(), reason: z.string() }).strict()),
}).strict()
export type RankVerdict = z.infer<typeof RankVerdict>

export const BoundaryVerdicts = z.object({
  verdicts: z.array(
    z.object({
      candidateId: z.string(),
      boundary: z.boolean(),
      /** Which cue convinced it, for the eval and the ledger. */
      cue: z.enum(['rest', 'length', 'leap', 'rhythm', 'metric', 'contour']),
    }).strict(),
  ),
}).strict()
export type BoundaryVerdicts = z.infer<typeof BoundaryVerdicts>

export const SessionPlan = z.object({
  units: z.array(
    z.object({
      unitId: z.string(),
      steps: z.array(z.enum(['loop', 'through', 'visualise', 'vary', 'write'])),
      note: z.string().optional(),
    }).strict(),
  ),
  /** How to rotate the units in a sitting, in the model's words. */
  interleave: z.string(),
}).strict()
export type SessionPlan = z.infer<typeof SessionPlan>
