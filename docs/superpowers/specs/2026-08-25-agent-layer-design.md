# Agent layer design — 2026-08-25

The AI layer, scoped in a brainstorming session with the owner. Supersedes
§8 of `2026-08-23-woodshed-design.md` where they differ; the pedagogy
constraints in `docs/research/jazz-pedagogy-literature.md` Part 1 apply to
all prose output.

## Governing rule (amends the CLAUDE.md non-negotiable)

**Judge yes, generate never.** The model may weigh engine-computed
evidence (degrees, contours, rest lengths, candidate boundaries) and cast
judgments — pick between candidates, break ties, order, name, narrate. It
never produces a note, count, or interval; every number in the output
comes from deterministic code. Verdict schemas reference engine objects by
id and structurally cannot express note data.

## Availability

The agent runs whenever an API key is present; keyless contexts degrade to
today's deterministic output.

- **CLI**: `npm run solo` reads `ANTHROPIC_API_KEY` from the environment.
  `--no-agent` forces the deterministic path even with a key.
- **Page (local dev and public GitHub Pages alike)**: bring-your-own-key,
  one mechanism everywhere. An optional field on the page takes an
  Anthropic key (the owner's own locally, a visitor's own on Pages), kept
  in `localStorage`, calling the API browser-direct (CORS via the
  `anthropic-dangerous-direct-browser-access` opt-in header). The bundle
  contains no secret; the owner's key is never involved, so the public
  site can never charge the owner. The page must say, next to the field,
  that the key stays in the visitor's browser storage. No key entered →
  engine-only, with a note saying which parts would light up.

## Architecture: `src/agent/`

DOM-free like the rest of `src/`.

- **`agent/client.ts`** — the only file that knows `@anthropic-ai/sdk`
  exists. Model `claude-opus-5`, structured outputs everywhere, prompt
  caching over a per-solo analysis document (serialised profile +
  findings + candidates) as the stable prefix. Takes the key as a
  constructor argument — it never reads env or localStorage itself. Two
  modes: **live** (key present; can record) and **replay** (reads
  recorded call/response pairs from `fixtures/agent/`, keyed by a hash of
  the request).
- **`agent/jobs/`** — one file per job (`narrate.ts`, `rank.ts`,
  `segment.ts`, `construct.ts`). Typed engine evidence in, typed verdict
  out. The engine consumes verdicts the way `prepare/` emits
  `Adjustment[]`: as data, never as edits.
- **`agent/tools/`** — the engine-as-API surface for tool-runner jobs:
  thin wrappers over existing pure engine code (validity gate,
  transformation functions, dictionary lookup, profile and chord-track
  queries). Tools may *run* deterministic generators and report results;
  the model only chooses among outputs the engine produced.

## The four jobs

Build order 1→4; runtime order 3→2→1→4 (segmentation verdicts change the
evidence for everything downstream, so the cached analysis document is
assembled after final segmentation).

1. **Narrate + name** (staged call, one per solo). Evidence:
   `SoloProfile`, findings, scale spans, unit list. Verdict: two-paragraph
   overview (architecture over time), a teacher-language display name per
   finding (dictionary string stays the stable id), one
   things-to-look-for line per unit anchored to bars. Prompt rules from
   the pedagogy research: lead with style and ear, Owens's four-part
   sentence template, cells and goal notes never degree runs, and the
   standing "play it with the record" instruction.
2. **Rank & select** (staged call). Evidence: all units with findings,
   recurrence, breadth, chord-tone landings, corpus frequency, variant
   relations. Verdict: ordering + keep/cut + a one-line reason each. The
   deterministic rank stays computed and pinned in tests; the model's
   ordering is what the page shows.
3. **Segmentation adjudication** (staged, batched). The engine emits
   candidate boundaries with evidence (rest length, leap, contour change,
   metric position, riff-binding state) and a confidence; only the
   ambiguous band goes to the model. Verdict: boundary yes/no + deciding
   cue, by candidate id. Ships only if `eval:agent` beats the current
   68% idea recall on recorded runs.
4. **Exercise construction** (the one tool-runner job). Tools: list
   transformations, apply one, run the validity gate, query profile and
   tune chords. The model assembles each unit's practice sequence —
   steps, order, interleaving across units — from gate-approved parts.
   Hard ceiling ~15 tool calls per solo, then best-so-far.

## Data flow

- `Analysis` grows three optional fields — `narration`, `ranking`,
  `sessionPlan` — absent in keyless runs. `Score` stays immutable;
  segmentation re-runs with verdicts rather than editing.
- Every model-influenced element carries `source: 'agent'` so the page
  can mark it and an engine-vs-agent diff is one filter away.
- `npm run solo` prints agent output inline, clearly sectioned, with
  token usage per job.

## Failure and cost

- Any agent error (network, rate limit, malformed verdict after the
  SDK's structured-output retry) degrades that job to the deterministic
  path with one warning line; never a crash. A verdict referencing a
  nonexistent id is discarded, not patched.
- One solo = one cached document + three staged calls + one bounded tool
  loop; order tens of cents on `claude-opus-5`, dominated by
  construction. Per-job token usage printed so surprises surface.
- **No fine-tuning** (unchanged from the original spec §8): the levers
  are tool design, few-shot examples, structured outputs, effort.

## Testing and evals

- The normal suite and `pipeline.test.ts` run in replay mode:
  deterministic, offline, keyless. A replay-mode variant pins the full
  agent-enhanced Blake output next to the existing deterministic pin.
- Replay fixtures are hand-checked recordings, hand-written for edge
  cases (consistent with the fixtures rule). Nothing in CI or the normal
  suite ever makes a live call.
- WJD/brackets evals stay engine-only by default. `eval:agent` scores
  model-adjudicated segmentation over a fixed ~20-solo WJD subset from
  recordings; re-recording is a deliberate, logged act.
- **Licensing**: fixtures containing WJD-derived evidence stay out of the
  repo, in `~/dev/woodshed-data/agent-fixtures/`; only Blake-derived and
  hand-written fixtures are committed. Sending WJD-derived evidence to
  the API at adjudication time is local use and allowed.

## Phasing

One spec, four implementation plans — each job is its own session-sized
build, in build order. Job 1 (narrate + name) goes first because it is
pure output with zero risk to analysis correctness and exercises the
whole client/replay/caching apparatus. No key exists yet, so every phase
is built and tested against replay fixtures; the live path is a switch
flipped when the owner has a key.
