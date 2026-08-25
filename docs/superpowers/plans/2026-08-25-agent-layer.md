# Agent Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `src/agent/` — the model layer that judges (segments, ranks, names, narrates, assembles practice sessions) over deterministic engine output, with a replay-fixture mode so everything runs and tests without an API key.

**Architecture:** One SDK-aware client (`agent/client.ts`) with live and replay modes; four jobs (`agent/jobs/`) each mapping typed engine evidence to a typed zod-validated verdict; an orchestrator (`agent/run.ts`) that runs segment→rank→narrate→construct and degrades per-job on failure; CLI and page entry points pass the key in (env / localStorage). Verdicts reference engine objects by id and cannot express note data.

**Tech Stack:** TypeScript ESM (no semicolons, single quotes, 2-space indent, explicit `.ts` imports), `@anthropic-ai/sdk` (model `claude-opus-5`, `messages.parse` + `zodOutputFormat`, `betaZodTool` + `toolRunner` for construction), `zod`, vitest.

**Spec:** `docs/superpowers/specs/2026-08-25-agent-layer-design.md`

## Global Constraints

- Judge yes, generate never: no verdict schema may carry pitches, midi, intervals, durations or counts — ids and prose only.
- `src/` is DOM-free; only `app/` touches localStorage/DOM. `client.ts` takes the key as an argument, never reads env.
- Tests and `pipeline.test.ts` run offline in replay mode; no live call anywhere in the suite or CI.
- Committed fixtures: Blake-derived + hand-written only. WJD-derived agent fixtures live in `~/dev/woodshed-data/agent-fixtures/`.
- `Score` immutable; segmentation re-runs with verdicts rather than editing.
- Model `claude-opus-5`; no fine-tuning; adaptive thinking default; structured outputs for every verdict.
- Run tests with `npm run test:run` (never bare `npm test`).

---

### Task 1: Dependencies + verdict schemas

**Files:**
- Modify: `package.json` (deps)
- Create: `src/agent/verdicts.ts`
- Test: `src/agent/verdicts.test.ts`

**Interfaces (Produces):**

```ts
import { z } from 'zod'

export const Narration = z.object({
  overview: z.array(z.string()).length(2),
  findingNames: z.array(z.object({ id: z.string(), name: z.string() })),
  lookFors: z.array(z.object({ unitId: z.string(), text: z.string() })),
})
export type Narration = z.infer<typeof Narration>

export const RankVerdict = z.object({
  order: z.array(z.object({ unitId: z.string(), keep: z.boolean(), reason: z.string() })),
})
export type RankVerdict = z.infer<typeof RankVerdict>

export const BoundaryVerdicts = z.object({
  verdicts: z.array(z.object({
    candidateId: z.string(),
    boundary: z.boolean(),
    cue: z.enum(['rest', 'length', 'leap', 'rhythm', 'metric', 'contour']),
  })),
})
export type BoundaryVerdicts = z.infer<typeof BoundaryVerdicts>

export const SessionPlan = z.object({
  units: z.array(z.object({
    unitId: z.string(),
    steps: z.array(z.enum(['loop', 'through', 'displace', 'write'])),
    note: z.string().optional(),
  })),
  interleave: z.string(),
})
export type SessionPlan = z.infer<typeof SessionPlan>
```

- [ ] Step 1: `npm install @anthropic-ai/sdk zod`
- [ ] Step 2: failing test — each schema parses a valid object; `Narration` rejects a 3-paragraph overview; `SessionPlan` rejects step `'transpose'`; `BoundaryVerdicts` rejects a verdict with a `midi` extra key via `.strict()` on the inner objects.
- [ ] Step 3: implement `verdicts.ts` (inner objects `.strict()`).
- [ ] Step 4: `npm run test:run -- src/agent/verdicts.test.ts` → PASS; commit `feat: agent verdict schemas`.

### Task 2: AgentClient — replay and live

**Files:**
- Create: `src/agent/client.ts`, `src/agent/fixtures.ts` (Node-only loader)
- Test: `src/agent/client.test.ts`

**Interfaces (Produces):**

```ts
export interface AgentUsage { job: string; inputTokens: number; outputTokens: number }
export interface AgentClient {
  /** One evidence→verdict call. Returns null on any failure (logged), never throws. */
  complete<T>(job: string, system: string, evidence: string, schema: z.ZodType<T>): Promise<T | null>
  usage: AgentUsage[]
}
export function replayClient(fixtures: Record<string, unknown>): AgentClient
export function liveClient(apiKey: string, opts?: { browser?: boolean }): AgentClient
// fixtures.ts (imported only by scripts/tests, never by app/):
export function loadFixtures(dir: string): Record<string, unknown>  // reads <job>.json files
```

Replay is keyed by job name (`narrate`, `rank`, `segment:0`, `construct`) — hand-writable, stable across evidence edits. `complete` validates fixtures through the same zod schema as live responses. Live mode: `client.messages.parse({ model: 'claude-opus-5', max_tokens: 16000, output_config: { format: zodOutputFormat(schema) }, system, messages: [{ role: 'user', content: evidence }] })`, records `usage`; `{ browser: true }` passes `dangerouslyAllowBrowser: true` to the SDK constructor. Any thrown error → one `console.warn` line, return null.

- [ ] Step 1: failing tests — replay returns parsed verdict for a valid fixture; returns null (not throw) for a fixture failing the schema; returns null for a missing job; `loadFixtures` reads a temp dir of JSON files.
- [ ] Step 2: implement; run → PASS.
- [ ] Step 3: typecheck (`npm run typecheck`); commit `feat: agent client with live and replay modes`.

### Task 3: Evidence documents

**Files:**
- Create: `src/agent/evidence.ts`
- Test: `src/agent/evidence.test.ts`

**Interfaces (Produces):**

```ts
/** The stable cached prefix: profile, findings, units, scale spans — no timestamps, keys sorted. */
export function analysisDocument(analysis: Analysis, units: PracticeUnit[], score: Score): string
/** Per-candidate segmentation evidence lines (Task 5 supplies BoundaryCandidate). */
export function segmentDocument(candidates: BoundaryCandidate[], timeSig: [number, number]): string
```

`analysisDocument` renders findings as `id · name · bars · degrees · confidence · detectors`, units as `id · bars · chords · finding ids · arrival · stock`, profile as the same numbers `scripts/run.ts` prints. Deterministic: same analysis → same string (test asserts two calls equal, and that the string contains no `Date`/random content by construction).

- [ ] Step 1: failing test using a tiny hand-built `Analysis` (reuse the fixtures pattern from `profile.test.ts`) — document contains finding id and unit id lines; two renders identical.
- [ ] Step 2: implement; PASS; commit `feat: agent evidence documents`.

### Task 4: Jobs — narrate and rank

**Files:**
- Create: `src/agent/jobs/narrate.ts`, `src/agent/jobs/rank.ts`, `src/agent/prompts.ts`
- Test: `src/agent/jobs/narrate.test.ts`, `src/agent/jobs/rank.test.ts`

**Interfaces (Produces):**

```ts
export async function narrate(client: AgentClient, doc: string, ids: { findings: Set<string>; units: Set<string> }): Promise<Narration | null>
export async function rank(client: AgentClient, doc: string, unitIds: Set<string>): Promise<RankVerdict | null>
```

Both filter the verdict: entries whose ids are not in the engine's id sets are discarded (spec: "discarded, not patched"); a `RankVerdict` that keeps zero units degrades to null. `prompts.ts` holds the system prompts as exported consts. The narrate prompt encodes the pedagogy rules verbatim: lead with style and ear, not theory; Owens's four-part template (what it is / what it does harmonically / where it sits / why); speak in cells and goal notes, never a run of degree names; every claim anchored to bars the evidence states; always end the overview by sending the player back to the record ("play it with the recording before you drill it"); never invent notes, counts or bar numbers not present in the evidence.

- [ ] Step 1: failing tests with `replayClient` — valid fixture passes through; a `findingNames` entry with unknown id is dropped while the rest survive; rank keeping zero units → null.
- [ ] Step 2: implement; PASS; typecheck; commit `feat: narrate and rank agent jobs`.

### Task 5: Segmentation candidates and verdict consumption

**Files:**
- Modify: `src/analyse/segment.ts` (export candidates; accept verdicts)
- Create: `src/agent/jobs/adjudicate.ts`
- Test: `src/analyse/segment.test.ts` (additions), `src/agent/jobs/adjudicate.test.ts`

**Interfaces (Produces):**

```ts
// segment.ts additions
export interface BoundaryCandidate { id: string; index: number; cue: Cue; bar: number; beat: number }
/** Gaps whose phrase-profile total lands in the ambiguous band around the threshold. */
export function boundaryCandidates(notes: Note[], options?: SegmentOptions, band?: number): BoundaryCandidate[]  // band default 0.15
export interface SegmentOptions { /* existing */; overrides?: Map<number, boolean> }  // note index → boundary forced open/closed
// adjudicate.ts
export async function adjudicate(client: AgentClient, candidates: BoundaryCandidate[], timeSig: [number, number]): Promise<Map<number, boolean> | null>
```

Candidate id is `b<index>`. `segment()` consults `overrides` exactly where it currently compares `cue.total >= o.threshold` (both the phrase and idea decisions at that index follow the override for the phrase-level test only; idea logic unchanged). With no overrides, output is byte-identical to today — the existing segment tests are the regression net. `adjudicate` batches all candidates into one call (job key `segment:0`), maps verdicts back by candidate id, drops unknown ids.

- [ ] Step 1: failing tests — `boundaryCandidates` on the existing segment test fixture returns only gaps within the band; an override `true` at a below-threshold gap opens a phrase there; override `false` suppresses one; `segment()` without overrides matches a snapshot of current behaviour (assert equality with a no-options call).
- [ ] Step 2: implement; full suite `npm run test:run` → all green (existing 325 must not change).
- [ ] Step 3: commit `feat: segmentation candidates and boundary verdict overrides`.

### Task 6: Exercise construction (tool-runner job)

**Files:**
- Create: `src/agent/jobs/construct.ts`
- Test: `src/agent/jobs/construct.test.ts`

**Interfaces (Produces):**

```ts
export interface ConstructContext { units: PracticeUnit[]; analysis: Analysis; score: Score }
export async function construct(client: AgentClient, ctx: ConstructContext, doc: string): Promise<SessionPlan | null>
```

Replay path: `client.complete('construct', …, SessionPlan)` — the loop is not replayed, only the final plan. Live path (inside `client.ts` via an optional `runTools` capability — add `runTools?<T>(job, system, evidence, tools, schema): Promise<T | null>` to `AgentClient`; `replayClient` implements it as `complete`): `client.beta.messages.toolRunner` with `betaZodTool` tools `list_steps` (unit id → the steps the engine generated, with validity-gate status) and `unit_detail` (unit id → its evidence block), `max_tokens 16000`, iteration ceiling 15, then a final `messages.parse` for the `SessionPlan`. Filter: unknown unit ids dropped; steps not generated by the engine for that unit dropped; empty plan → null.

- [ ] Step 1: failing tests with replay — valid plan passes; a plan naming step `'through'` for a unit whose engine steps lack it has that step dropped; plan with only unknown units → null.
- [ ] Step 2: implement construct + `runTools` on both clients (live path typechecked only — no key); PASS; commit `feat: exercise-construction agent job`.

### Task 7: Orchestrator and pipeline entry

**Files:**
- Create: `src/agent/run.ts`, `src/agent/index.ts` (re-exports)
- Modify: `src/pipeline.ts` (agent-aware entry that re-runs analyse with overrides)
- Test: `src/agent/run.test.ts`

**Interfaces (Produces):**

```ts
export interface AgentOutput {
  narration: Narration | null
  ranking: RankVerdict | null
  sessionPlan: SessionPlan | null
  boundaries: Map<number, boolean> | null
  usage: AgentUsage[]
  /** Jobs that degraded to the deterministic path. */
  degraded: string[]
}
export async function runAgent(client: AgentClient, score: Score, report: CleanupReport, options: BuildOptions): Promise<{ analysis: Analysis; units: PracticeUnit[]; agent: AgentOutput }>
```

Order: candidates → adjudicate → re-run `analyse` with overrides (segment consumes them via options threaded through `analyse`) → build units → assemble `analysisDocument` → rank → narrate → construct. Each null verdict appends to `degraded` and the deterministic result stands. `analyse()` gains an optional `{ overrides }` third parameter threaded to `segment`.

- [ ] Step 1: failing tests with replay fixtures for all four jobs on a small hand-built score (reuse an existing ingest test fixture): all four fields populated; with an empty fixture map, all degrade, `degraded` lists four jobs, analysis equals the deterministic run.
- [ ] Step 2: implement; full suite green; commit `feat: agent orchestrator`.

### Task 8: Blake replay fixtures + pipeline pin

**Files:**
- Create: `fixtures/agent/blake/{narrate,rank,segment:0 → segment.json,construct}.json` (job key `segment:0` stored as `segment.json`; loader maps filename→key with `:0` appended for segment)
- Modify: `src/pipeline.test.ts` (agent-enhanced pin), `src/agent/fixtures.ts` if key-mapping needs it

Fixture content is hand-written prose/ordering referencing real ids from a `npm run solo` run (ids are engine facts; no corpus notes involved). Keep them small: narration overview 2 paragraphs, names for the top ~5 findings, lookFors for the top 3 units; rank keeps ~12 units; segment verdicts for ~4 candidates; construct plans the top 3 units.

- [ ] Step 1: run `npm run solo -- ~/Documents/MuseScore4/Scores/"Hey Lock! - Seamus Blake Solo Transcription.mxl"` and note ids (u1 must be maj7-from-the-b3 at 76–77).
- [ ] Step 2: write the four fixtures by hand.
- [ ] Step 3: failing test in `pipeline.test.ts` — `runAgent(replayClient(loadFixtures('fixtures/agent/blake')), …)` on the Blake file: narration present, "major-seventh arpeggio from the b3" finding carries an agent name, ranked order starts with a kept unit, `degraded` empty.
- [ ] Step 4: PASS; full suite; commit `test: pin agent-enhanced Blake output via replay fixtures`.

### Task 9: CLI integration

**Files:**
- Modify: `scripts/run.ts`

Behaviour: `--no-agent` flag → deterministic path. Else if `AGENT_FIXTURES` env set → replay from that dir. Else if `ANTHROPIC_API_KEY` set → live. Else → print one line `agent: no ANTHROPIC_API_KEY — deterministic output (see docs/superpowers/specs/2026-08-25-agent-layer-design.md)` and run deterministic. Agent output printed in clearly headed sections (`overview`, `menu (agent order)`, `session`), each line sourced, followed by `agent tokens: <job> in/out …` and degraded-job warnings.

- [ ] Step 1: implement (no unit test — verified by running).
- [ ] Step 2: verify all three keyless paths by hand: `npm run solo -- <blake>` (notice line), `--no-agent` (unchanged output), `AGENT_FIXTURES=fixtures/agent/blake npm run solo -- <blake>` (agent sections printed, ranks/names from fixtures).
- [ ] Step 3: commit `feat: agent output in npm run solo`.

### Task 10: Page BYOK + agent display

**Files:**
- Create: `app/agentKey.ts`
- Modify: `app/main.ts`, `app/desk.ts` (or `details.ts` — wherever the ideas list renders; follow existing structure), `app/style.css`

`agentKey.ts`: a small settings row — password-type input, `localStorage` key `woodshed.anthropicKey`, the sentence "Your key stays in this browser's storage and is sent only to api.anthropic.com." When a key is present, after analysis the page calls `runAgent(liveClient(key, { browser: true }), …)` and: shows the two overview paragraphs above the ideas list, reorders the list by the agent ranking, appends agent names and look-fors to unit headers — every agent-sourced element gets class `agent-sourced` (subtle marker in CSS, both themes if the page has them). Errors degrade silently to today's page plus one status line.

- [ ] Step 1: implement.
- [ ] Step 2: `npm run build` green; `npm run dev`, load Blake, no key → page unchanged plus the key field; (live behaviour untestable without a key — verify the degrade path and console cleanliness).
- [ ] Step 3: commit `feat: bring-your-own-key agent layer on the page`.

### Task 11: eval:agent script

**Files:**
- Create: `scripts/eval-agent.ts`
- Modify: `package.json` (`"eval:agent": "node --experimental-strip-types --no-warnings scripts/eval-agent.ts"`)

Mirrors `eval-wjd.ts` scoring, but: for each solo in the fixed subset (first 20 WJD solos alphabetically), load recorded verdicts from `~/dev/woodshed-data/agent-fixtures/<solo>/segment.json`; skip with a printed line when absent; score idea/phrase recall with and without overrides; print the delta and the aggregate. With no fixtures at all: print how to record (run with a key and `AGENT_RECORD=~/dev/woodshed-data/agent-fixtures`) and exit 0. Add `AGENT_RECORD` support to `liveClient` callers in `scripts/` only (write each response JSON next to its job key).

- [ ] Step 1: implement; run `npm run eval:agent` → graceful no-fixture message.
- [ ] Step 2: commit `feat: eval:agent scores adjudicated segmentation from recordings`.

### Task 12: Docs

**Files:**
- Modify: `docs/ENGINE_SPEC.md` (new "Agent layer" section: jobs, order, degrade rule, replay keys, ambiguous band 0.15, construct ceiling 15), `CLAUDE.md` (commands: `eval:agent`, `--no-agent`, `AGENT_FIXTURES`), `docs/LEDGER.md`

- [ ] Step 1: write; typecheck+suite+build all green; commit `docs: agent layer in spec, commands and ledger`.

## Self-review notes

Spec coverage: availability/BYOK (T9, T10), architecture (T2–T7), four jobs (T4–T6), data flow ids/provenance (T4–T7, T10), failure/degrade (T2, T7), cost visibility (T2 usage, T9), testing/replay/pin (T2, T8), eval:agent + licensing fixture location (T11), docs (T12). Prompt-caching structure exists in evidence-document design; actual `cache_control` placement happens in `liveClient` (T2) with the analysis document as the cached system block — added to T2 implementation notes here so it is not lost: system prompt + document get `cache_control: {type: 'ephemeral'}` on the document block.
