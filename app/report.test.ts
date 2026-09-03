import { readFileSync } from 'node:fs'
import { BLAKE, HAS_BLAKE } from '../src/test/blake.ts'
import { describe, expect, it } from 'vitest'
import { ideaViews, sessionReportHtml } from './report.ts'
import type { IdeaView, ReportInput } from './report.ts'
import type { AgentOutput, PracticeUnit } from '../src/index.ts'
import type { OverlayItem } from './score.ts'

// sessionReportHtml is a pure string function: the drills arrive as SVG
// already engraved (app/engrave.ts does that against a live OSMD), so this
// suite needs no DOM. What it pins is composition — which sections exist,
// and in particular which ones vanish rather than standing empty.

const SVG = '<svg viewBox="0 0 100 50"><rect class="phrase-tick" width="4" height="4"/></svg>'

const ITEMS: OverlayItem[] = [
  { id: 'f3', label: 'digital pattern 1235', where: 'b12', detail: 'degrees 1 2 3 5 over Cmaj7', vector: 'cell' },
]

const idea = (over: Partial<IdeaView> = {}): IdeaView => ({
  id: 'u1',
  position: 1,
  headline: 'major-seventh arpeggio from the b3',
  detail: ['lands on the #11', 'also at bars 73, 102'],
  where: 'bars 73–74',
  keep: null,
  reason: null,
  lookFor: null,
  steps: [],
  ...over,
})

const input = (over: Partial<ReportInput> = {}): ReportInput => ({
  title: 'Hey Lock!',
  svgMarkup: SVG,
  items: ITEMS,
  overview: [],
  degraded: [],
  ideas: [idea()],
  ideasTotal: 34,
  drilledCount: 8,
  ...over,
})

describe('sessionReportHtml, the agent sections', () => {
  it('prints each overview paragraph the agent wrote', () => {
    const html = sessionReportHtml(input({
      overview: ['Blake opens inside the changes.', 'By the last chorus he is playing across them.'],
    }))
    expect(html).toContain('Blake opens inside the changes.')
    expect(html).toContain('By the last chorus he is playing across them.')
  })

  // A keyless run has no agent output at all. The desk drops the whole
  // section rather than showing an empty one (main.ts builds `agentBox` only
  // when `agent` is non-null), and a report a peer reads must not carry a
  // heading over nothing.
  it('omits the agent heading entirely when no agent ran', () => {
    const html = sessionReportHtml(input({ overview: [] }))
    expect(html).not.toContain('What the agent hears')
  })

  it('says which jobs fell back to the engine when some degraded', () => {
    const html = sessionReportHtml(input({ overview: ['A paragraph.'], degraded: ['rank', 'adjudicate'] }))
    expect(html).toContain('rank, adjudicate')
  })

  it('says the analysis is the engine alone when every job degraded', () => {
    const html = sessionReportHtml(input({
      overview: ['A paragraph.'],
      degraded: ['narrate', 'rank', 'adjudicate', 'plan'],
    }))
    expect(html).toContain('could not be reached')
  })
})

describe('sessionReportHtml, the ideas', () => {
  it('numbers each idea by its rank position and gives its headline and bars', () => {
    const html = sessionReportHtml(input({ ideas: [idea({ position: 3 })] }))
    expect(html).toContain('3. major-seventh arpeggio from the b3')
    expect(html).toContain('bars 73–74')
  })

  it('lists the detail lines under the headline', () => {
    const html = sessionReportHtml(input())
    expect(html).toContain('lands on the #11')
    expect(html).toContain('also at bars 73, 102')
  })

  // The ranking reason is the part a peer can actually argue with, and until
  // now it never left the page.
  it('prints the reason the agent gave for keeping an idea', () => {
    const html = sessionReportHtml(input({
      ideas: [idea({ keep: true, reason: 'The clearest statement of his b3 shape.' })],
    }))
    expect(html).toContain('The clearest statement of his b3 shape.')
  })

  it('marks an idea the agent dropped rather than hiding it', () => {
    const html = sessionReportHtml(input({
      ideas: [idea({ keep: false, reason: 'A scale run everybody plays.' })],
    }))
    expect(html).toContain('A scale run everybody plays.')
    expect(html).toContain('set aside')
  })

  it('prints the look-for note when the agent wrote one', () => {
    const html = sessionReportHtml(input({ ideas: [idea({ lookFor: 'Hear the #11 as the arrival, not a passing note.' })] }))
    expect(html).toContain('Hear the #11 as the arrival, not a passing note.')
  })

  it('carries no agent attribution on an idea with no verdict', () => {
    const html = sessionReportHtml(input({ ideas: [idea()] }))
    expect(html).not.toContain('The agent')
    expect(html).not.toContain('set aside')
  })

  it('escapes markup in a headline, a reason and a look-for', () => {
    const html = sessionReportHtml(input({
      ideas: [idea({ headline: 'a <b>bold</b> & brash cell', reason: '<script>alert(1)</script>', lookFor: 'x & y' })],
    }))
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<b>bold</b>')
    expect(html).toContain('a &lt;b&gt;bold&lt;/b&gt; &amp; brash cell')
    expect(html).toContain('x &amp; y')
  })
})

describe('sessionReportHtml, how much of the run it carries', () => {
  it('says how many ideas were drilled out of how many the run found', () => {
    const html = sessionReportHtml(input({ ideasTotal: 34, drilledCount: 8 }))
    expect(html).toContain('8')
    expect(html).toContain('34')
  })

  it('says nothing about omitted ideas when every one is drilled', () => {
    const html = sessionReportHtml(input({ ideasTotal: 1, drilledCount: 1 }))
    expect(html).not.toContain('remaining')
  })

  it('embeds each engraved drill with its title', () => {
    const html = sessionReportHtml(input({
      ideas: [idea({
        steps: [{
          title: 'Vary it',
          prompt: 'New ways into the same arrival.',
          drills: [{ title: 'approach from below', svg: '<svg id="d1"></svg>' }],
        }],
      })],
    }))
    expect(html).toContain('Vary it')
    expect(html).toContain('New ways into the same arrival.')
    expect(html).toContain('approach from below')
    expect(html).toContain('<svg id="d1"></svg>')
  })

  // A loop step's whole instruction is "play along with the record"; it
  // engraves one excerpt. A step with nothing engraved still has a prompt
  // worth printing, so the step survives an empty drill list.
  it('keeps a step that engraved nothing, for its prompt', () => {
    const html = sessionReportHtml(input({
      ideas: [idea({ steps: [{ title: 'Write your own', prompt: 'Three lines into the targets.', drills: [] }] })],
    }))
    expect(html).toContain('Write your own')
    expect(html).toContain('Three lines into the targets.')
  })
})

describe('sessionReportHtml, the engine record', () => {
  it('embeds the annotated score markup verbatim', () => {
    expect(sessionReportHtml(input())).toContain(SVG)
  })

  it('carries the annotation tables and the legend, as the annotation export does', () => {
    const html = sessionReportHtml(input())
    expect(html).toContain('<h3>Named cells (1)</h3>')
    expect(html).toContain('digital pattern 1235')
    expect(html).toContain('How it is detected:')
    expect(html).toContain('Phrase tick (amber, numbered)')
  })

  it('titles the document as a session report', () => {
    const html = sessionReportHtml(input())
    expect(html).toContain('<title>Hey Lock! — session report</title>')
  })
})

// ideaViews turns a real run into the shape above. The fixtures are partial
// PracticeUnits cast to the type: these functions read `id`, `summary`,
// `findings` and `steps`, and a full unit would be forty lines of notes and
// harmony that no assertion here touches.
const unit = (over: Record<string, unknown> = {}): PracticeUnit => ({
  id: 'u1',
  summary: { bars: 'Bars 73–74', chords: ['Cmaj7'], landing: '#11', alsoAt: [], stock: false },
  findings: [],
  steps: [],
  ...over,
} as unknown as PracticeUnit)

const noDrills = async (): Promise<string> => '<svg/>'

describe('ideaViews', () => {
  it('numbers ideas 1-based in the order given', async () => {
    const views = await ideaViews([unit({ id: 'a' }), unit({ id: 'b' })], { drilled: 0, engrave: noDrills })
    expect(views.map((v) => v.position)).toEqual([1, 2])
    expect(views.map((v) => v.id)).toEqual(['a', 'b'])
  })

  it('takes where an idea sits from the unit summary', async () => {
    const [view] = await ideaViews([unit()], { drilled: 0, engrave: noDrills })
    expect(view.where).toBe('Bars 73–74')
  })

  // The headline and detail must come from describe.ts, not from a second
  // register written here — that is what DECISIONS 2026-08-29 settled.
  it('heads a findings-free idea with the engine’s own honest sentence', async () => {
    const [view] = await ideaViews([unit()], { drilled: 0, engrave: noDrills })
    expect(view.headline).toBe('No named vocabulary — still the player’s idea')
    expect(view.detail).toContain('lands on the #11')
  })

  it('attaches the agent’s keep, reason and look-for to the matching unit', async () => {
    const agent = {
      ranking: { order: [{ unitId: 'u1', keep: true, reason: 'His clearest statement.' }] },
      narration: { overview: [], findingNames: [], lookFors: [{ unitId: 'u1', text: 'Hear the arrival.' }] },
      degraded: [],
    } as unknown as AgentOutput
    const [view] = await ideaViews([unit()], { drilled: 0, engrave: noDrills, agent })
    expect(view.keep).toBe(true)
    expect(view.reason).toBe('His clearest statement.')
    expect(view.lookFor).toBe('Hear the arrival.')
  })

  it('leaves the verdict null for a unit the agent said nothing about', async () => {
    const [view] = await ideaViews([unit()], { drilled: 0, engrave: noDrills })
    expect(view.keep).toBeNull()
    expect(view.reason).toBeNull()
    expect(view.lookFor).toBeNull()
  })

  // Every idea is listed — a peer should see the whole shape of the run —
  // but only the strongest few carry engraved drills, because all 34 of
  // Blake's units is 275 exercises and about a hundred printed pages.
  it('lists every idea but engraves drills only for the first `drilled` of them', async () => {
    const withStep = (id: string): PracticeUnit => unit({
      id,
      steps: [{ kind: 'vary', prompt: 'New ways in.', exercises: [{ title: 'from below' }] }],
    })
    const views = await ideaViews([withStep('a'), withStep('b'), withStep('c')], { drilled: 2, engrave: noDrills })
    expect(views).toHaveLength(3)
    expect(views[0].steps[0].drills).toHaveLength(1)
    expect(views[1].steps[0].drills).toHaveLength(1)
    expect(views[2].steps).toHaveLength(0)
  })

  it('reads a loop step’s single exercise and a write step’s examples', async () => {
    const u = unit({
      steps: [
        { kind: 'loop', prompt: 'Sing it.', exercise: { title: 'as played' } },
        { kind: 'write', prompt: 'Three lines.', template: 't', examples: [{ title: 'one' }, { title: 'two' }] },
      ],
    })
    const [view] = await ideaViews([u], { drilled: 1, engrave: noDrills })
    expect(view.steps[0].drills.map((d) => d.title)).toEqual(['as played'])
    expect(view.steps[1].drills.map((d) => d.title)).toEqual(['one', 'two'])
  })

  it('titles each step the way the desk does', async () => {
    const u = unit({ steps: [{ kind: 'vary', prompt: 'p', exercises: [] }] })
    const [view] = await ideaViews([u], { drilled: 1, engrave: noDrills })
    expect(view.steps[0].title).toBe('Vary it')
    expect(view.steps[0].prompt).toBe('p')
  })

  // One exercise failing to engrave must not lose the other thirty-four
  // ideas: the report is the record of a run that already cost money.
  it('drops a drill that fails to engrave and keeps the rest', async () => {
    const u = unit({
      steps: [{ kind: 'vary', prompt: 'p', exercises: [{ title: 'bad' }, { title: 'good' }] }],
    })
    const engrave = async (ex: { title: string }): Promise<string> => {
      if (ex.title === 'bad') throw new Error('OSMD said no')
      return '<svg id="ok"/>'
    }
    const [view] = await ideaViews([u], { drilled: 1, engrave: engrave as never })
    expect(view.steps[0].drills.map((d) => d.title)).toEqual(['good'])
  })
})

describe('sessionReportHtml, printing', () => {
  // Printed, `break-before: page` on the first section left page 1 holding
  // nothing but the h1. The first heading follows the title on the same page;
  // only later sections start a new one.
  it('does not force a page break before the first section', () => {
    const html = sessionReportHtml(input())
    const first = html.indexOf('The ideas, and the drills')
    const heading = html.lastIndexOf('<h2', first)
    expect(html.slice(heading, first)).not.toContain('page-break')
  })

  it('still breaks the page before the score and the legend', () => {
    const html = sessionReportHtml(input())
    for (const section of ['The score, annotated', 'Legend —']) {
      const at = html.indexOf(section)
      expect(html.slice(html.lastIndexOf('<h2', at), at)).toContain('page-break')
    }
  })
})

// The agent path, end to end against the recorded verdicts. The unit tests
// above build an AgentOutput by hand, which cannot catch the failure that
// actually happens: an id in `ranking.order` or `lookFors` drifting out of
// step with the ids `buildUnits` mints, so every verdict silently renders
// nothing. That is not hypothetical — session 17 found a recorded
// `findingNames` id had drifted and fallen back unnoticed.

describe.skipIf(!HAS_BLAKE)('the agent path, through the replay fixtures', () => {
  it('lands the agent’s reasons and look-fors on real units', async () => {
    const { runWithAgent } = await import('../src/pipeline.ts')
    const { replayClient } = await import('../src/agent/client.ts')
    const { loadFixtures } = await import('../src/agent/fixtures.ts')
    const result = await runWithAgent(
      new Uint8Array(readFileSync(BLAKE)),
      replayClient(loadFixtures('fixtures/agent/blake')),
    )
    const views = await ideaViews(result.units, {
      drilled: 0,
      engrave: noDrills,
      agent: result.agent,
    })
    const withReason = views.filter((v) => v.reason)
    const withLookFor = views.filter((v) => v.lookFor)
    // Non-vacuous: the equalities below would both hold at zero.
    expect(withReason.length).toBeGreaterThan(0)
    expect(withLookFor.length).toBeGreaterThan(0)
    expect(withReason.length).toBe(result.agent.ranking?.order.length)
    expect(withLookFor.length).toBe(result.agent.narration?.lookFors.length)

    // And the report actually prints them, with the attribution attached.
    const html = sessionReportHtml({
      title: 'Hey Lock!',
      svgMarkup: SVG,
      items: ITEMS,
      overview: result.agent.narration?.overview ?? [],
      degraded: result.agent.degraded,
      ideas: views,
      ideasTotal: views.length,
      drilledCount: 0,
    })
    expect(html).toContain('What the agent hears')
    expect(html).toContain(withReason[0].reason!)
    expect(html).toContain(withLookFor[0].lookFor!)
  })
})
