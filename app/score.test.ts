import { describe, it, expect } from 'vitest'
import { WEAK_CONFIDENCE } from './score.ts'
import { CANDIDATE_BAND, DEFAULTS } from '../src/analyse/segment.ts'

/**
 * The faint phrase tick makes a claim about the music, and the standalone
 * annotation export prints that claim in words: "A faint tick with no caret
 * under it is a chorus start". ENGINE_SPEC derives it rather than asserting
 * it (see the `phrase-tick weak` bullet), and the derivation turns on two
 * relationships between tuning parameters that nothing else forces to hold.
 * A tuning pass that moves any one of them makes the sentence false on a
 * page a musician is holding, with no test failing — so these are here.
 *
 * They live in `app/` because one of the four terms does: `WEAK_CONFIDENCE`
 * is the app's own rendering threshold. Reconstructing it in a `src/` test
 * would assert the invariant against a *copy* of `score.ts`'s derivation,
 * which is exactly the drift the test exists to catch. `src/` stays DOM-free;
 * this file is not in `src/` and touches no DOM.
 *
 * Compared with `toBeCloseTo`, not `toBe`: the equalities are exact in
 * arithmetic but not in binary floating point (0.6 × 0.25 and (0.45 + 0.15)
 * − 0.45 differ by one ulp). Any real change to a tuning parameter moves
 * these by 1e-3 or more, so the tolerance costs nothing — do not "tighten"
 * it to `toBe`, it will fail on representation alone.
 */
describe('the faint-tick rule’s parameter knife-edges', () => {
  it('keeps a faint chorus tick rest-free: wRest × (minRest/fullRest) = WEAK − wChorus', () => {
    // Faint means total < WEAK − wChorus, and total >= wRest × rest, so
    // rest < (WEAK − wChorus) / wRest. A nonzero rest cue is floored at
    // minRest/fullRest, so rest = 0 follows only while that floor is not
    // below the bound. They are equal today, with no margin at all.
    expect(
      DEFAULTS.wRest * (DEFAULTS.minRest / DEFAULTS.fullRest),
      'The smallest nonzero rest cue no longer sits exactly on the faint-tick ceiling, ' +
      'so a faint chorus tick can now carry a rest. The annotation export legend ' +
      '("A faint tick with no caret under it is a chorus start") and the ENGINE_SPEC ' +
      'derivation both go false. Re-derive the rule before changing wRest, minRest, ' +
      'fullRest, threshold or CANDIDATE_BAND.',
    ).toBeCloseTo(WEAK_CONFIDENCE - DEFAULTS.wChorus, 10)
  })

  it('keeps a faint chorus tick out of the candidate set: wChorus >= 2 × CANDIDATE_BAND', () => {
    // A faint chorus tick has total < WEAK − wChorus; a boundary candidate
    // needs total >= threshold − CANDIDATE_BAND. Disjoint exactly while
    // wChorus >= 2 × CANDIDATE_BAND (0.45 vs 0.30 — this one has margin).
    expect(
      DEFAULTS.wChorus,
      'A faint chorus tick can now also be a boundary candidate, so it would draw ' +
      'a caret. The annotation export legend ("A faint tick with no caret under it ' +
      'is a chorus start") stops distinguishing anything, and the ENGINE_SPEC ' +
      'disjointness argument fails.',
    ).toBeGreaterThanOrEqual(2 * CANDIDATE_BAND)
  })

  it('keeps a full rest out of the faint band: wRest × 1 = WEAK', () => {
    // The other half of the same coincidence: a bare full rest scores exactly
    // WEAK, so only the strict `<` in the tick's class test keeps it from
    // drawing faint. This is why every faint rest boundary has rest < 1.00.
    expect(
      DEFAULTS.wRest,
      'A boundary carrying nothing but a full rest is no longer exactly on the faint ' +
      'ceiling, so the faint band now admits (or excludes) full-rest boundaries and ' +
      'the ENGINE_SPEC claim that a faint rest boundary always has rest < 1.00 goes ' +
      'false. Note the strict `<` at the phrase-tick class test is what makes the ' +
      'current equality safe; `<=` would break it without touching a parameter.',
    ).toBeCloseTo(WEAK_CONFIDENCE, 10)
  })
})
