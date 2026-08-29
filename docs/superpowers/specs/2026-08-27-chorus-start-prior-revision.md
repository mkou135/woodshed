# SPEC REVISION — chorus-start prior, after measuring the actual gaps

Date: 2026-08-27, session 15, before Task 5 was dispatched.
Amends `2026-08-27-chorus-start-prior.md` §3.2, §4 and §5. Everything not
named here stands.

## What was measured

A read-only probe over `blues-in-all-keys-bob-mintzer.mxl` — the owner's
annotated solo, the only human-labelled evidence this change has — dumped
`boundaryCue` at every chorus-start gap together with which branch of
`segment()`'s if-chain currently fires.

```
bar.beat  current branch      cue
13.1      STRUCTURAL (wall)   total 0.00  rest 0.00  idea 0.00  gap 0.00q
25.1      STRUCTURAL (wall)   total 0.00  rest 0.00  idea 0.00  gap 0.00q
37.1      STRUCTURAL (wall)   total 0.09  rest 0.00  idea 0.09  gap 0.00q
49.1.5    STRUCTURAL (wall)   total 0.09  rest 0.00  idea 0.09  gap 0.50q
61.1      STRUCTURAL (wall)   total 0.00  rest 0.00  idea 0.00  gap 0.00q
73.1      STRUCTURAL (wall)   total 0.03  rest 0.00  idea 0.03  gap 0.00q
85.2      STRUCTURAL (wall)   total 0.11  rest 0.00  idea 0.11  gap 0.00q
97.1      STRUCTURAL (wall)   total 0.00  rest 0.00  idea 0.00  gap 0.00q
109.1     STRUCTURAL (wall)   total 0.00  rest 0.00  idea 0.00  gap 0.00q
121.1     STRUCTURAL (wall)   total 0.00  rest 0.00  idea 0.00  gap 0.00q
133.1     STRUCTURAL (wall)   total 0.09  rest 0.00  idea 0.09  gap 0.00q
145.1     STRUCTURAL (wall)   total 0.00  rest 0.00  idea 0.00  gap 0.00q

chorus-start gaps: 12  |  rest > 0: 0  |  rest == 0: 12
```

## Finding 1 — the original design deletes every chorus boundary

The phrase branch is `cue.total >= threshold && cue.rest > 0`. The
structural branch has **no rest requirement** — that is precisely why it
can force a break where the line plays through. Mintzer plays continuous
eighths across every double bar on this solo: **all 12 chorus-start gaps
have `rest == 0`.**

So §3.2's plan — put chorus starts through the ordinary phrase path with a
`wChorus` bonus — deletes all 12 chorus boundaries at **any** value of
`wChorus`, including the nine the owner kept. The original acceptance
criterion 2 was unsatisfiable, and §3.2's worked example ("an eighth rest
gives rest 0.5 → breaks") describes a gap that does not occur here.

The original spec also called the current rule "an unconditional wall".
It is not: it is **fourth** in the if-chain, so a chorus start clearing
`ideaThreshold`, or a local peak, or a pickup, becomes an idea boundary and
never reaches it. On this solo none do — every one falls through to
structural — but the framing was wrong and the WJD may differ.

### Revised rule

The bonus relaxes the rest gate **at chorus starts only**:

```
at a chorus start:  boundary  iff  min(1, total + wChorus) >= threshold
otherwise:          boundary  iff  total >= threshold && rest > 0
```

Everywhere else is untouched. This has a property worth having:
**`wChorus = 0.45` reproduces the current wall's boundary positions**
(0.00 + 0.45 = 0.45 ≥ 0.45, always breaks), so the existing behaviour
becomes one point on the sweep and a free regression check. Lower values
ask the surface to show *something* before breaking at the double bar.

### Two conditions on the rewiring, neither visible in the probe

The probe is one solo on which every chorus gap falls through to the
structural branch. The corpus will not be so uniform, and two details
decide whether the refactor is faithful:

1. **The chorus test keeps the structural branch's position in the
   if-chain — fourth, after `cue.idea >= ideaThreshold || isPeak(i) ||
   isPickup(i)`.** A chorus-start gap that clears the idea branch today
   becomes an **idea** boundary and never reaches structural. Moving the
   chorus test earlier — the natural reading of "the phrase branch with a
   relaxed gate" — would turn those gaps into *phrase* boundaries and
   break the `wChorus = 0.45` equivalence check. Same slot, new test.
2. **`pickupInto(i + 1)` stays.** The current branch carries
   `&& !pickupInto(i + 1)`, and ENGINE_SPEC documents it. The original
   §3.2 argued the exemption "becomes unnecessary", but that argument
   rested entirely on `rest > 0` failing at a pickup. This revision
   relaxes the rest gate, so the argument no longer holds and the
   exemption is load-bearing again. Keep it, and keep it documented.

### On confidence

The wall recorded `STRUCTURAL_CONFIDENCE` 0.6. The new rule records the
boosted total, which at `wChorus = 0.45` on a rest-free gap is 0.45. So
the equivalence check is over **the set of phrase-boundary positions**,
not over confidences — those change by design. `app/score.ts` draws
structural ticks at half opacity and ENGINE_SPEC quotes the 0.6; both key
on a distinction that no longer exists and both must be updated.

### Corroborated on the second annotated solo

The same probe over `hey-lock.json` finds one chorus-start gap (65.1):
`total 0.03, rest 0.00`, structural branch, and the owner **deleted** it.

**13 of 13 chorus-start gaps across both annotated solos have
`rest == 0`.** This is not a Mintzer quirk. It raises the prior
probability that the WJD looks the same, which is what makes 5a a
decision gate rather than a formality — and it means the likely honest
outcome of this task is "the hard-coded wall becomes a tunable
parameter whose current value is 0.45", not "the engine now hears
chorus starts the way the owner does".

## Finding 2 — the cue cannot reproduce the owner's decisions

Under either reading of the annotation file (see Finding 3), cue total
**0.00 appears on both sides** of the owner's keep/delete split:

- kept, total 0.00: 97.1, 121.1, 145.1
- deleted, total 0.00: 13.1, 25.1, 61.1, 109.1

Whatever the owner is hearing at a chorus start on this solo, it is **not
in rest, length or leap**. No value of `wChorus` reproduces their marks,
because the input the bonus modifies is identical across the split.

This is a real negative result, and it must not be buried. It does not
kill the change — a tunable chorus weight is still better than a hard-coded
wall, and the WJD may behave differently — but it means:

### Revised acceptance

- **Criterion 2 is downgraded from a gate to a reported diagnostic.** Task
  5 reports, for each `wChorus` in the sweep, which of the owner's chorus
  marks it reproduces. It does **not** have to reproduce them, and an
  implementer must not contort the rule trying to. Report the table.
- The owner-side check that *does* remain a gate is narrow and does not
  depend on the disputed file: at the chosen `wChorus`, state plainly
  whether 13.1, 25.1 and 73.1 are engine phrase starts. Either answer is
  acceptable; a silent one is not.
- **Criteria 1 (`eval:wjd` phrase F1 within 0.5) and 3 (`brackets` no
  regression) stand unchanged and remain hard gates.**

### Task 5a becomes a decision gate

Wiring chorus starts into `eval:wjd` is no longer only a measurement
convenience — it is what decides whether 5b is worth building. 5a must
additionally report **the distribution of `rest` at chorus-start gaps
across the 456 solos**. If the corpus looks like this solo (rest ≈ 0
almost everywhere), the prior can only ever be a tunable wall and the
report should say so in those words. If chorus starts there often carry a
real rest, the prior does the job the owner wanted and the sweep is
meaningful.

## Finding 3 — the owner's annotation file has been damaged, and I did not fix it

`OPEN_QUESTIONS.md` records the owner deleting the forced chorus starts at
**13.1, 25.1 and 73.1**. The version committed at `44f60e0` agrees: those
three are absent. The working-tree version committed today at `56425ca`
has **re-added exactly those three**, while also carrying changes that look
like genuine newer work (two phrase deletions at 38.4½ and 43.1½, an idea
deletion at 51.1) *and* changes that look like fresh seed output (stars
0 → 5, variation groups 2 → 4, which is what the cont.-8 star-seeding rules
would produce).

That matches the hazard the ledger already flagged at session 13 cont. 8:
*"the working copy differed from HEAD before the reseed (possible owner
corrections overwritten)"*. The file appears to be part owner correction,
part reseed clobber, and I cannot separate them from outside.

**Ruling: do not edit the owner's annotation file.** It is their data, it
has already been damaged once by an automated reseed, and a second
automated guess is the wrong instinct. Both versions are preserved in git
(`44f60e0` and `56425ca`). The owner decides.

Consequence for Task 5: its owner-side check asserts on the three named
positions directly rather than running `eval:owner` against a file whose
provenance is in doubt. `eval:owner` may still be run for information.
