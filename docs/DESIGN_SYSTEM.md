# DESIGN_SYSTEM — the studio console

Single source of truth for how the browser layer looks. **Never quote a
colour from memory; re-read this file.** Update it in the same commit as any
change under `app/` that alters presentation — the same rule `ENGINE_SPEC.md`
carries for the engine.

Implemented by `app/style.css` (tokens + the analyser), `app/engine.css`,
`app/bench.css`, and `app/export.ts` (the printed sheet). Nothing in `src/`
touches presentation; nothing outside `app/` may.

Last updated: 2026-09-06 (session 24).

## The idea in one line

A dark room with one lit sheet of paper on the desk.

## Why it is dark, and the constraint that decided everything

OSMD renders notation as **black ink on white**, and we cannot recolour it —
not the staves, not the noteheads, not the chord symbols. Every dark-UI
design has to answer that, and there are only two honest answers: invert the
score (impossible), or make the sheet the point.

This system takes the second. The page is a console — near-black, recessive,
all chrome. The score is the only light surface on it, and it carries a faint
cyan bloom (`--lit`) that nothing else has. The player's eye goes to the
music because the music is the only thing lit.

Everything below follows from that one decision.

## Two ramps

Because the score is a white sheet on a near-black page, **every colour that
means something exists twice**:

| where it lands | token | example |
|---|---|---|
| on the **sheet** (marks the engine draws on the score) | `--x` | `--phrase` `#b3187a` |
| on the **console** (that mark's toggle, legend, chart, chip) | `--x-lit` | `--phrase-lit` `#ff6bc4` |

The pair is the same hue at two lightnesses: the plain value is dark enough
to read on `#f7f8fa`, the `-lit` value bright enough to read on `#161a22`.
One value cannot do both — a cyan that sings on near-black is a pale wash on
paper, and a teal that reads on paper disappears into the console.

**Getting this backwards is the mistake this system is arranged to prevent.**
Before using a colour, ask what surface it lands on, not what it means.

The overlay control row is the clearest case: the *toggle* for "cells" is a
chip on the console, so it takes `--ov-cell-lit`; the *mark* it draws sits on
the score, so it takes `--ov-cell`. Same idea, two colours, on purpose.

## Tokens

All defined once, at the top of `app/style.css`. `engine.css` and
`bench.css` define no colour of their own — they only reference these, which
is what lets the whole app be rethemed from one block.

### The console

| token | value | meaning |
|---|---|---|
| `--ground` | `#0d0f14` | the page |
| `--panel` | `#161a22` | cards, drawers, controls, chart figures |
| `--panel-2` | `#1c212b` | raised: popovers, the score's control strip, active rows |
| `--rule` | `#2a303c` | every hairline |
| `--ink` | `#e7eaf0` | primary text |
| `--pencil` | `#8b93a4` | secondary text |
| `--faint` | `#7b8496` | recessive figures (inactive step numbers) |

### The sheet

`--paper` is **the score's own surface**. Never reuse it for a panel; that is
what `--panel` is for. Two places are paper and no others: `.sheet` (the
score) and `.notation` (an exercise card's stave).

| token | value | meaning |
|---|---|---|
| `--paper` | `#f7f8fa` | the sheet |
| `--paper-ink` | `#14161c` | text drawn on the sheet |
| `--paper-pencil` | `#5a5f68` | secondary marks on the sheet (scale bands) |
| `--paper-rule` | `#d7dae0` | hairlines on the sheet |

### Marks — the pairs

| meaning | on the sheet | on the console |
|---|---|---|
| phrase start | `--phrase` `#b3187a` | `--phrase-lit` `#ff6bc4` |
| idea start | `--idea` `#0d7c8a` | `--idea-lit` `#35d6e6` |
| now practising | `--marker` `#9fe8f0` (wash) · `--marker-ink` `#0a5560` (noteheads) | `--marker-lit` `#35d6e6` |
| cells | `--ov-cell` `#0d7c8a` | `--ov-cell-lit` `#35d6e6` |
| devices | `--ov-device` `#9a6206` | `--ov-device-lit` `#ffb454` |
| recurring | `--ov-recurring` `#2e7d4f` | `--ov-recurring-lit` `#a9e34b` |
| common language | `--ov-language` `#7a3bb8` | `--ov-language-lit` `#c69bff` |
| stock | `--ov-stock` `#6b7280` | `--ov-stock-lit` `#8b93a4` |

Sheet-only, no console twin (they are never chips): `--outside` `#b0306e`,
`--variation` `#2f7d52`, `--star` `#8a6a15`.

### Verdicts

`--ok` `#a9e34b` · `--warn` `#ffb454` · `--warn-bg` `#2a2113` ·
`--alarm` `#ff8a80`. All console values. `--ok-paper` `#2e7d4f` is the one
paper twin, for a verdict drawn on a sheet.

### Cyan is the one accent

`--marker-lit` / `--idea-lit` / `--ov-cell-lit` are all `#35d6e6`. That is
deliberate: the app has **one** accent, and it means "this is the thing you
are working on". It fills exactly three things — the primary button, the
named-cell chip in the desk head, and the active step's rail. Text on a cyan
fill is `#06222a`, never white.

Do not introduce a fourth accent hue. If something needs emphasis, it takes
the cyan or it takes weight.

## Contrast

Every mark clears **4.5:1 against the surface it actually lands on** — that
is the acceptance test for any new colour, and the reason the ramps exist.
Measured (session 24):

- On paper: phrase 5.94, idea/cell 4.63, device 4.79, recurring 4.75,
  language 6.28, stock 4.55, marker-ink 7.96, paper-ink 17.02,
  paper-pencil 6.04.
- On panel: phrase-lit 6.77, idea-lit 9.89, device-lit 9.88,
  recurring-lit 11.43, language-lit 7.91, stock-lit 5.65, ink 14.46,
  pencil 5.65, faint 4.63, ok 11.43, warn 9.88, alarm 7.63.
- `#06222a` on cyan: 9.38.

Focus rings are `2px solid var(--idea-lit)` and must stay visible on
everything. The overlay chips take the ring on the *chip*, not the 13px box —
a 2px ring round a 13px control is unreadable, and `--idea-lit` is the same
cyan as `--ov-cell-lit`, so it would vanish against that swatch.

## Type

Two families, self-hosted in `app/fonts/` as woff2 latin subsets. **No CDN**
— the practice room may be offline (DECISIONS 2026-08-24).

- `--disp` and `--body`: **Space Grotesk** 400/500/700. One family for both;
  headings are the same face at weight 700, tightened (`letter-spacing`
  −0.01 to −0.035em at display sizes).
- `--mono`: **IBM Plex Mono** 400/500 — bar numbers, figures, file names,
  anything tabular. `.mono` also sets `font-variant-numeric: tabular-nums`.

Body is 16px/1.55. Uppercase + `letter-spacing: 0.14–0.18em` is the label
voice (`.label`, `.cap`, `.field-lbl`, `.ctl-lbl`, buttons, nav).

**Never uppercase a chord symbol.** `text-transform: uppercase` turns `Cm7`
into `CM7`, which is a different chord. The rule cost a round in the design
canvas; do not rediscover it.

## Shape and depth

- Radii: `6px` controls (buttons, fields, chips), `8–10px` panels and cards,
  `22px` the tune chip (the one pill).
- Borders are `1px solid var(--rule)`. The old system's 1.5px ink outlines
  are gone; on a dark ground a hairline is enough.
- `--shadow` is for lifted chrome. `--lit` is **only** for `.sheet` — it is
  what makes the score read as illuminated rather than merely pale.
- Native controls are restyled, never replaced. The `<select>` caret is a
  data-URI SVG whose stroke must track `--pencil`.

## The printed sheet is not the app

`app/export.ts` builds standalone HTML — annotation exports and the session
report — that gets printed and sent. It **stays light** and sets its type in
Georgia, because a document opened outside the app cannot reach the
self-hosted faces and nobody wants a near-black page coming out of a printer.

What it does share is the marks: its legend swatches quote the **paper** half
of each pair, so a printout matches the screen. Change a mark's paper value
here and change it there in the same commit.

## Working on this

- `src/` is DOM-free. Only `app/` may touch presentation.
- No CSS framework, no component library, no new runtime dependency.
- Keep every `id`/`class` other modules query; presentation changes,
  behaviour does not.
- Acceptance is visual: run `npm run dev`, drop a real `.mxl`, and look at
  it. A CSS diff is not evidence. `.claude/agents/ui-designer.md` carries the
  working loop and constraints for that; this file carries the values.

## History

Replaces the "practice desk" system (grey desk `#e4e6e8`, white sheets, one
yellow highlighter `#f5e27a`, Barlow Condensed / Source Serif 4 / JetBrains
Mono) that ran from session 6. Chosen from three directions drawn on the real
desk on a Claude Design canvas; see DECISIONS 2026-09-06.
