# Practice variations and agent look-fors on the score — 2026-08-25

Redesign of practice steps 2–4 after the owner read the Blake output and
found the Bergonzi cell drill illegible, the displace step opaque, and the
write step unseeded. Grounded in the pedagogy research
(`docs/research/jazz-pedagogy-literature.md` §2.9, §2.10, §3.1 — local
only) and the owner's own proposal: vary the way in, keep the arrival.
Plus one page feature: agent look-fors as tooltips on the score.

## 1. Vary It — `vary` step, replacing `displace`

The arrival is the identity of the line; everything before it is
negotiable (Ligon goal notes; Bergonzi exercises A–H).

- **On-ramps** (~4 exercises, the centrepiece): body and arrival
  untouched; the first note or two replaced or preceded by a different
  approach, each computed from the chord under it —
  from the chord tone below the original start, from the chord tone
  above, from a chromatic step below, and connected by step out of the
  previous chord (the practice-room form of 7-3 resolution). Approach
  notes come from chord degrees the engine computes; every variation
  passes the validity gate (finding still detectable, arrival degree
  unchanged) or is discarded.
- **Displacement** (1–2 exercises, demoted): the metric shift survives as
  one variation among several, with practising instructions: metronome
  on, chords sounding, same fingering — the drill is hearing the accents
  land elsewhere, not learning notes.
- Prompt: "The arrival is the identity of the line; everything before it
  is negotiable. Play the original, then each on-ramp, always landing the
  same way."
- Step kind renames `displace` → `vary` everywhere: `Step`, desk labels,
  agent `SessionPlan` enum (`'loop'|'through'|'vary'|'write'`), Blake
  construct fixture, tests.

## 2. Through the Tune — legibility, not new generation

Generation untouched. Every Bergonzi cell drill gains provenance computed
from the finding's span inside the unit: "this is notes 3–6 of the line
(bar 76): the maj7 arpeggio isolated from its approach." The prompt says
why isolating matters: the cell is the transferable part; the drill
installs it under every compatible chord so it stops belonging to one
tune.

## 3. Write Your Own — worked examples first

The step opens with 2–3 engine-generated variations labelled with their
compositional device (Ligon p. 483 taxonomy) and a listening cue:

- fragmentation — "the first three notes alone — a riff you can place
  anywhere"
- augmentation ×2 / diminution ÷2 — "same line, half/double speed against
  the same bar"
- editing (Bergonzi) — "two notes removed — listen for the space they
  leave"

Only gate-passing outputs are shown. The cue-note template and
`checkWriting` follow unchanged. Prompt frames them as models: "three
ways the line already knows how to change — now write a fourth."

## 4. Agent look-fors as tooltips on the score

`Narration.lookFors` moves from the agent section list onto the sheet:

- One marker per look-for above the staff at the unit's first notehead
  (existing `bar:beat` note→SVG mapping; the unit's `startIndex` gives
  the note). Amber dot, `agent-sourced`; placed clear of chord symbols
  and scale bands via the same measured-collision approach as `bandY`.
- Hover or click opens a positioned HTML tooltip with the agent's text;
  one open at a time; click elsewhere dismisses. SVG `<title>` is not
  enough for multi-sentence text.
- The agent section keeps the overview and replaces the look-for list
  with "look-fors are marked on the score."
- No agent or all-degraded: no markers.

Precondition: the owner's uncommitted `app/score.ts` band-collision work
must be committed or discarded before this lands — same file.

## Where it lives

- New `src/practice/variations.ts`: pure device transforms over `Note[]`
  (fragment, augment, diminish, edit) used by vary and write.
- New `src/practice/steps/vary.ts` (absorbs `displace.ts`).
- `src/practice/` still never changes detection; all variations pass
  `generate/validity.ts` `isValid`.
- Page work in `app/score.ts` (markers, tooltip) and `app/main.ts`
  (section text change).

## Testing

- Generator unit tests: an on-ramp from the chord tone below starts on
  that degree; a variation failing the gate is absent; displacement
  output unchanged from today's displace.
- Device transforms: fragmentation is a strict prefix/suffix ≥ 3 notes;
  augmentation doubles every tick duration; editing drops 1–2 non-arrival
  notes and replaces them with rests.
- Blake fixture + pinned pipeline test updated for the `vary` rename.
- Read-the-output check on Blake (`npm run solo`) before done: u1's vary
  step shows on-ramps landing identically; write shows labelled examples.
