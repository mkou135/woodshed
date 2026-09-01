import { detail, headline } from '../src/index.ts'
import type { AgentOutput, Exercise, PracticeUnit, Step, TeacherNames } from '../src/index.ts'
import { STEP_TITLES } from './desk.ts'
import { annotationTablesHtml, esc, legendHtml, pageHtml } from './export.ts'
import type { OverlayItem } from './score.ts'

/**
 * The session report: everything one run produced, in one standalone file a
 * player can print to PDF and hand to a peer — the agent's reading, the ideas
 * in the order it ranked them, the drills engraved, and the annotated score
 * with its tables and legend.
 *
 * It exists so a run is worth keeping. The agent costs money per run, so
 * re-running an analysis to show somebody is paying twice for one judgement.
 *
 * Pure string composition. The drills arrive already engraved as SVG
 * (`app/engrave.ts` drives OSMD for that), which is what keeps this module
 * testable without a DOM.
 */

/** One exercise, already engraved. */
export interface DrillView {
  title: string
  svg: string
}

export interface StepView {
  title: string
  prompt: string
  drills: DrillView[]
}

export interface IdeaView {
  id: string
  /** 1-based position in the order the desk shows. */
  position: number
  headline: string
  detail: string[]
  where: string
  /** The agent's ranking verdict, or null when no agent ran. */
  keep: boolean | null
  reason: string | null
  lookFor: string | null
  steps: StepView[]
}

export interface ReportInput {
  title: string
  svgMarkup: string
  items: OverlayItem[]
  /** The agent's overview paragraphs; empty means no agent ran. */
  overview: string[]
  /** Agent jobs that fell back to the engine. */
  degraded: string[]
  ideas: IdeaView[]
  /** How many ideas the run produced, which may exceed `ideas.length`. */
  ideasTotal: number
  /** How many of the listed ideas carry engraved drills. */
  drilledCount: number
}

const AGENT_JOBS = 4

/** Every exercise a step engraves, whatever shape that step keeps them in. */
export function exercisesOf(step: Step): Exercise[] {
  switch (step.kind) {
    case 'loop': return [step.exercise]
    case 'through': return step.exercises
    case 'vary': return step.exercises
    case 'write': return step.examples
  }
}

export interface IdeaViewOptions {
  /** How many of the units, from the front, carry engraved drills. */
  drilled: number
  /** MusicXML in, SVG out. Throwing loses that one drill, never the report. */
  engrave: (exercise: Exercise) => Promise<string>
  agent?: AgentOutput | null
  names?: TeacherNames
}

/**
 * A run's units as the report wants them. Every unit is listed — the shape of
 * the whole run is what a reader is being shown — but only the first
 * `drilled` carry engraved drills: Blake's 34 units hold 275 exercises, which
 * prints to something nobody reads.
 *
 * Names and prose come from `practice/describe.ts`, the same functions the
 * desk and the CLI compose from.
 */
export async function ideaViews(units: PracticeUnit[], opts: IdeaViewOptions): Promise<IdeaView[]> {
  const verdicts = new Map((opts.agent?.ranking?.order ?? []).map((o) => [o.unitId, o]))
  const lookFors = new Map((opts.agent?.narration?.lookFors ?? []).map((l) => [l.unitId, l.text]))

  const views: IdeaView[] = []
  for (const [i, unit] of units.entries()) {
    const verdict = verdicts.get(unit.id)
    const steps: StepView[] = []
    if (i < opts.drilled) {
      for (const step of unit.steps) {
        const drills: DrillView[] = []
        for (const exercise of exercisesOf(step)) {
          try {
            drills.push({ title: exercise.title, svg: await opts.engrave(exercise) })
          } catch {
            // One exercise OSMD cannot lay out must not cost the other
            // thirty-four ideas; the run it records has already been paid for.
          }
        }
        steps.push({ title: STEP_TITLES[step.kind], prompt: step.prompt, drills })
      }
    }
    views.push({
      id: unit.id,
      position: i + 1,
      headline: headline(unit, opts.names),
      detail: detail(unit, opts.names),
      where: unit.summary.bars,
      keep: verdict?.keep ?? null,
      reason: verdict?.reason ?? null,
      lookFor: lookFors.get(unit.id) ?? null,
      steps,
    })
  }
  return views
}

/**
 * Absent, not empty. A keyless run has no agent output at all, so the whole
 * section goes — the same call `main.ts` makes when it builds `agentBox` only
 * for a non-null agent. A heading over nothing reads as a failure.
 */
function agentHtml(input: ReportInput): string {
  if (input.overview.length === 0) return ''
  const paragraphs = input.overview.map((p) => `<p>${esc(p)}</p>`).join('\n')
  let footnote = ''
  if (input.degraded.length >= AGENT_JOBS) {
    footnote = '<p class="note">The agent could not be reached on this run — every job fell back to the engine.</p>'
  } else if (input.degraded.length > 0) {
    footnote = `<p class="note">The deterministic path stood in for: ${esc(input.degraded.join(', '))}.</p>`
  }
  return `<h2>What the agent hears</h2>
<p class="note">Model-written; every number in it is the engine's.</p>
${paragraphs}
${footnote}`
}

/**
 * The agent's verdict on one idea. Attribution is explicit — a peer reading
 * this has to be able to tell the model's judgement from the engine's
 * measurement, which is the whole reason the two are kept apart in the first
 * place (DECISIONS 2026-08-25 "Agent layer scope").
 */
function verdictHtml(idea: IdeaView): string {
  const lines: string[] = []
  if (idea.reason) {
    const stance = idea.keep === false ? 'The agent set aside' : 'The agent kept'
    lines.push(`<p><span class="who">${stance}</span> ${esc(idea.reason)}</p>`)
  }
  if (idea.lookFor) lines.push(`<p>${esc(idea.lookFor)}</p>`)
  return lines.length === 0 ? '' : `<div class="verdict">${lines.join('\n')}</div>`
}

function stepHtml(step: StepView): string {
  const drills = step.drills.map((d) => `<div class="drill">
<div class="dt">${esc(d.title)}</div>
${d.svg}
</div>`).join('\n')
  return `<h4>${esc(step.title)}</h4>
<p class="note">${esc(step.prompt)}</p>
${drills}`
}

function ideaHtml(idea: IdeaView): string {
  const detail = idea.detail.length === 0
    ? ''
    : `<ul>${idea.detail.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>`
  return `<section class="idea">
<h3>${idea.position}. ${esc(idea.headline)}</h3>
<div class="where">${esc(idea.where)}</div>
${detail}
${verdictHtml(idea)}
${idea.steps.map(stepHtml).join('\n')}
</section>`
}

export function sessionReportHtml(input: ReportInput): string {
  const omitted = input.ideasTotal - input.drilledCount
  const scope = omitted > 0
    ? `<p class="note">Drills are engraved for the ${input.drilledCount} strongest of the ${input.ideasTotal} ideas this run found; the remaining ${omitted} are in the app.</p>`
    : `<p class="note">All ${input.ideasTotal} ideas this run found, with their drills.</p>`

  const body = `${agentHtml(input)}
<h2>The ideas, and the drills</h2>
${scope}
${input.ideas.map(ideaHtml).join('\n')}
<h2 class="page-break">The score, annotated</h2>
<div class="score">${input.svgMarkup}</div>
<h2>The annotations</h2>
${annotationTablesHtml(input.items)}
<h2 class="page-break">Legend — what each mark means, and how it is detected</h2>
${legendHtml()}
<p class="note">Generated by Woodshed. Parameter values mirror docs/ENGINE_SPEC.md at export time.</p>`

  return pageHtml(
    `${input.title} — session report`,
    `<h1>${esc(input.title)} — what this run found</h1>`,
    body,
  )
}
