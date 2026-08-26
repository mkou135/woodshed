import type { Position } from '../core/position.ts'
import { formatPosition, parsePosition } from '../core/position.ts'

export type BoundaryLevel = 'idea' | 'phrase'

export interface Span {
  from: Position
  to: Position
}

export interface AnnotationFile {
  file: string
  phrases: string[]
  ideas: string[]
  /** End marks are optional in older files; missing means none. */
  phraseEnds?: string[]
  ideaEnds?: string[]
  outside: { from: string; to: string }[]
  stars: { from: string; to: string }[]
  /** Groups of ranges: the first span is the idea, the rest its variations. */
  variations?: { from: string; to: string }[][]
  annotated: string
}

type SpanKind = 'outside' | 'stars'

const order = (p: Position) => p.bar * 1000 + p.beat

const withinSpan = (span: Span, p: Position): boolean => {
  const v = order(p)
  return order(span.from) <= v && v <= order(span.to)
}

const byPosition = (a: string, b: string): number => order(parsePosition(a)) - order(parsePosition(b))

export class AnnotationStore {
  readonly file: string
  readonly boundaries: Map<string, BoundaryLevel> = new Map()
  readonly ends: Map<string, BoundaryLevel> = new Map()
  private readonly spanLists: Record<SpanKind, Span[]> = { outside: [], stars: [] }
  private readonly variationGroups: Span[][] = []

  constructor(file: string) {
    this.file = file
  }

  cycleBoundary(p: Position): BoundaryLevel | null {
    const key = formatPosition(p)
    const current = this.boundaries.get(key) ?? null
    const next: BoundaryLevel | null = current === null ? 'idea' : current === 'idea' ? 'phrase' : null
    if (next === null) this.boundaries.delete(key)
    else this.boundaries.set(key, next)
    return next
  }

  boundaryAt(p: Position): BoundaryLevel | null {
    return this.boundaries.get(formatPosition(p)) ?? null
  }

  cycleEnd(p: Position): BoundaryLevel | null {
    const key = formatPosition(p)
    const current = this.ends.get(key) ?? null
    const next: BoundaryLevel | null = current === null ? 'idea' : current === 'idea' ? 'phrase' : null
    if (next === null) this.ends.delete(key)
    else this.ends.set(key, next)
    return next
  }

  endAt(p: Position): BoundaryLevel | null {
    return this.ends.get(formatPosition(p)) ?? null
  }

  /**
   * Add a range to a variation group. `group` is an index from a previous
   * call; out of range (or omitted) starts a new group. Returns the index the
   * span landed in, which the page holds as its current group.
   */
  addVariation(from: Position, to: Position, group?: number): number {
    const [earlier, later] = order(from) <= order(to) ? [from, to] : [to, from]
    if (group !== undefined && group >= 0 && group < this.variationGroups.length) {
      this.variationGroups[group].push({ from: earlier, to: later })
      return group
    }
    this.variationGroups.push([{ from: earlier, to: later }])
    return this.variationGroups.length - 1
  }

  /** Remove the variation span containing `p`; a group emptied by this disappears. */
  removeVariationAt(p: Position): boolean {
    for (let g = 0; g < this.variationGroups.length; g++) {
      const idx = this.variationGroups[g].findIndex(span => withinSpan(span, p))
      if (idx === -1) continue
      this.variationGroups[g].splice(idx, 1)
      if (this.variationGroups[g].length === 0) this.variationGroups.splice(g, 1)
      return true
    }
    return false
  }

  variations(): Span[][] {
    return this.variationGroups.map(group => [...group])
  }

  addSpan(kind: SpanKind, from: Position, to: Position): void {
    const [earlier, later] = order(from) <= order(to) ? [from, to] : [to, from]
    this.spanLists[kind].push({ from: earlier, to: later })
  }

  removeSpanAt(kind: SpanKind, p: Position): boolean {
    const list = this.spanLists[kind]
    const idx = list.findIndex(span => withinSpan(span, p))
    if (idx === -1) return false
    list.splice(idx, 1)
    return true
  }

  spans(kind: SpanKind): Span[] {
    return [...this.spanLists[kind]]
  }

  counts(): { phrases: number; ideas: number; ends: number; outside: number; stars: number; variations: number } {
    let phrases = 0
    let ideas = 0
    for (const level of this.boundaries.values()) {
      if (level === 'phrase') phrases++
      else ideas++
    }
    return {
      phrases,
      ideas,
      ends: this.ends.size,
      outside: this.spanLists.outside.length,
      stars: this.spanLists.stars.length,
      variations: this.variationGroups.length,
    }
  }

  toJSON(date: string): AnnotationFile {
    const levelKeys = (map: Map<string, BoundaryLevel>, level: BoundaryLevel): string[] =>
      [...map].filter(([, l]) => l === level).map(([key]) => key).sort(byPosition)
    const sortedSpans = (spans: Span[]) =>
      [...spans]
        .sort((a, b) => order(a.from) - order(b.from))
        .map(span => ({ from: formatPosition(span.from), to: formatPosition(span.to) }))
    return {
      file: this.file,
      phrases: levelKeys(this.boundaries, 'phrase'),
      ideas: levelKeys(this.boundaries, 'idea'),
      phraseEnds: levelKeys(this.ends, 'phrase'),
      ideaEnds: levelKeys(this.ends, 'idea'),
      outside: sortedSpans(this.spanLists.outside),
      stars: sortedSpans(this.spanLists.stars),
      // Groups keep their creation order; spans inside a group sort by position.
      variations: this.variationGroups.map(sortedSpans),
      annotated: date,
    }
  }

  static fromJSON(json: AnnotationFile): AnnotationStore {
    const store = new AnnotationStore(json.file)
    for (const key of json.ideas) store.boundaries.set(formatPosition(parsePosition(key)), 'idea')
    for (const key of json.phrases) store.boundaries.set(formatPosition(parsePosition(key)), 'phrase')
    for (const key of json.ideaEnds ?? []) store.ends.set(formatPosition(parsePosition(key)), 'idea')
    for (const key of json.phraseEnds ?? []) store.ends.set(formatPosition(parsePosition(key)), 'phrase')
    for (const { from, to } of json.outside) store.addSpan('outside', parsePosition(from), parsePosition(to))
    for (const { from, to } of json.stars) store.addSpan('stars', parsePosition(from), parsePosition(to))
    for (const group of json.variations ?? []) {
      let idx: number | undefined
      for (const { from, to } of group) idx = store.addVariation(parsePosition(from), parsePosition(to), idx)
    }
    return store
  }
}
