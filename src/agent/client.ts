import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import type { z } from 'zod'

/**
 * The only file that knows the SDK exists. Jobs speak to it through
 * `AgentClient`; the pipeline never constructs one itself — the CLI passes a
 * key from the environment, the page passes one from its own storage, tests
 * pass fixtures. Every failure degrades to null with one warning line; the
 * deterministic path always stands behind it.
 */

const DEFAULT_MODEL = 'claude-opus-5'
const MAX_TOKENS = 16000
/** Tool-loop ceiling for the construction job; best verdict so far after that. */
const MAX_TOOL_TURNS = 15

export interface AgentPrompt {
  /** The per-solo analysis document: the stable, cached prefix shared by every job. */
  document: string
  /** The job's own rules and question, after the cache breakpoint. */
  instruction: string
}

export interface AgentUsage {
  job: string
  inputTokens: number
  outputTokens: number
}

export interface AgentTool {
  definition: Anthropic.Tool
  run: (input: unknown) => string
}

export interface AgentClient {
  /** One evidence → verdict call. Null on any failure (logged), never a throw. */
  complete<T>(job: string, prompt: AgentPrompt, schema: z.ZodType<T>): Promise<T | null>
  /** A bounded tool loop, then the same structured verdict. */
  runTools<T>(job: string, prompt: AgentPrompt, tools: AgentTool[], schema: z.ZodType<T>): Promise<T | null>
  usage: AgentUsage[]
}

function check<T>(job: string, raw: unknown, schema: z.ZodType<T>): T | null {
  const parsed = schema.safeParse(raw)
  if (parsed.success) return parsed.data
  console.warn(`agent ${job}: verdict failed the schema — deterministic path stands`)
  return null
}

/** Fixture-backed client: offline, deterministic, what every test runs on. */
export function replayClient(fixtures: Record<string, unknown>): AgentClient {
  const complete = async <T>(job: string, _prompt: AgentPrompt, schema: z.ZodType<T>): Promise<T | null> => {
    if (!(job in fixtures)) {
      console.warn(`agent ${job}: no fixture — deterministic path stands`)
      return null
    }
    return check(job, fixtures[job], schema)
  }
  return { complete, runTools: (job, prompt, _tools, schema) => complete(job, prompt, schema), usage: [] }
}

export interface LiveOptions {
  /** Set from `app/` only: the visitor's own key, sent browser-direct. */
  browser?: boolean
  /** Record every verdict to `<dir>/<job>.json` (Node callers only). */
  recordDir?: string
  /** Model id for every job; the page's dropdown or ANTHROPIC_MODEL. */
  model?: string
}

export function liveClient(apiKey: string, options: LiveOptions = {}): AgentClient {
  const anthropic = new Anthropic({ apiKey, ...(options.browser ? { dangerouslyAllowBrowser: true } : {}) })
  const model = options.model ?? DEFAULT_MODEL
  const usage: AgentUsage[] = []

  function request(prompt: AgentPrompt, schema: z.ZodType<unknown>, extra: Partial<Anthropic.MessageCreateParamsNonStreaming> = {}) {
    return anthropic.messages.create({
      model,
      max_tokens: MAX_TOKENS,
      system: [{ type: 'text', text: prompt.document, cache_control: { type: 'ephemeral' } }],
      output_config: { format: zodOutputFormat(schema) },
      messages: [{ role: 'user', content: prompt.instruction }],
      ...extra,
    })
  }

  function note(job: string, response: Anthropic.Message) {
    usage.push({ job, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens })
  }

  async function record(job: string, verdict: unknown, dir: string | undefined) {
    if (!dir) return
    const { writeFileSync, mkdirSync } = await import('node:fs')
    mkdirSync(dir, { recursive: true })
    writeFileSync(`${dir}/${job}.json`, JSON.stringify(verdict, null, 2) + '\n')
  }

  function text(job: string, response: Anthropic.Message): unknown | null {
    if (response.stop_reason === 'refusal') {
      console.warn(`agent ${job}: model declined — deterministic path stands`)
      return null
    }
    const block = response.content.find((b) => b.type === 'text')
    if (!block || block.type !== 'text') return null
    try {
      return JSON.parse(block.text)
    } catch {
      console.warn(`agent ${job}: unparseable verdict — deterministic path stands`)
      return null
    }
  }

  const complete = async <T>(job: string, prompt: AgentPrompt, schema: z.ZodType<T>): Promise<T | null> => {
    try {
      const response = await request(prompt, schema)
      note(job, response)
      const raw = text(job, response)
      if (raw === null) return null
      const verdict = check(job, raw, schema)
      if (verdict !== null) await record(job, verdict, options.recordDir)
      return verdict
    } catch (error) {
      console.warn(`agent ${job}: ${error instanceof Error ? error.message : String(error)} — deterministic path stands`)
      return null
    }
  }

  const runTools = async <T>(job: string, prompt: AgentPrompt, tools: AgentTool[], schema: z.ZodType<T>): Promise<T | null> => {
    try {
      const definitions = tools.map((t) => t.definition)
      const messages: Anthropic.MessageParam[] = [{ role: 'user', content: prompt.instruction }]
      for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
        const response = await anthropic.messages.create({
          model,
          max_tokens: MAX_TOKENS,
          system: [{ type: 'text', text: prompt.document, cache_control: { type: 'ephemeral' } }],
          tools: definitions,
          messages,
        })
        note(job, response)
        messages.push({ role: 'assistant', content: response.content })
        if (response.stop_reason !== 'tool_use') break
        const results: Anthropic.ToolResultBlockParam[] = response.content
          .filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
          .map((block) => {
            const tool = tools.find((t) => t.definition.name === block.name)
            let content: string
            let isError = false
            try {
              content = tool ? tool.run(block.input) : `no such tool: ${block.name}`
              isError = !tool
            } catch (error) {
              content = error instanceof Error ? error.message : String(error)
              isError = true
            }
            return { type: 'tool_result', tool_use_id: block.id, content, is_error: isError }
          })
        messages.push({ role: 'user', content: results })
      }
      messages.push({ role: 'user', content: 'Return your verdict now.' })
      const final = await anthropic.messages.create({
        model,
        max_tokens: MAX_TOKENS,
        system: [{ type: 'text', text: prompt.document, cache_control: { type: 'ephemeral' } }],
        tools: definitions,
        tool_choice: { type: 'none' },
        output_config: { format: zodOutputFormat(schema) },
        messages,
      })
      note(job, final)
      const raw = text(job, final)
      if (raw === null) return null
      const verdict = check(job, raw, schema)
      if (verdict !== null) await record(job, verdict, options.recordDir)
      return verdict
    } catch (error) {
      console.warn(`agent ${job}: ${error instanceof Error ? error.message : String(error)} — deterministic path stands`)
      return null
    }
  }

  return { complete, runTools, usage }
}
