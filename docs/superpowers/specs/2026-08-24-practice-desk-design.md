# Practice desk — page design (2026-08-24, session 6)

Owner-approved design for the woodshed page. The engine is untouched
except for one structured header field on `PracticeUnit`.

## Job

A working jazz musician drops a transcription and knows, without reading
anything, which idea to practise first and what the four steps are. The
notation is the product; everything else is quiet.

## Visual system

- Ground `#e4e6e8` (the desk), paper `#ffffff` (score and exercise
  sheets), ink `#1a1c20`, pencil `#5a5f68`, rule `#cfd3d8`.
- Signature: **highlighter** `#f5e27a` — the selected idea's bars on the
  score, the current step title, the named cells in the browser. Phrase
  ticks stay amber `#c4641d`, idea ticks blue `#2b6cb0`.
- Warning amber `#b8471c` on `#fdeee6` only for "which tune?".
- Type: Barlow Condensed (labels, headings, buttons), Source Serif 4
  (prompts, body), JetBrains Mono (bar numbers). **Self-hosted** in
  `app/fonts/` (woff2, SIL OFL), never a CDN — the practice room may be
  offline.
- Buttons are ink outlines; the one primary action ("Done — next step →")
  is solid ink.

## Layout, top to bottom (single column, full width)

1. **Header**: WOODSHED · solo title · instrument · bars. Right: the
   **tune chip** ("Through · St. Thomas (C) · 96 % ✓ ▾"), **Details**,
   **New solo**.
2. **Start here** strip (highlighter-tinted): "Idea 1 of N is highlighted
   — bars, chords, name. Four steps under the score; do them in order,
   then ‹ › to the next idea." Shown until the player advances a step or
   changes idea; dismissible.
3. **Blocking adjustments** ("needs your decision") inline, as today.
4. **Score sheet**: the full solo via OSMD, phrase/idea ticks, a legend
   row (phrase, idea, now practising, "go to bar"). Selected unit's bars
   get a highlighter rect behind the staff and dark-yellow noteheads.
5. **Desk head**: big idea number "1 of 32", bars · chords, named cell(s)
   in highlighter, landing degree, "same shape at bars …" when the finding
   recurs. ‹ Prev · Next › · **All ideas**. No note names anywhere.
6. **Steps**: two columns — step path (15 rem: number, title, one-line
   intent, ✓ when done) and the pane (prompt, exercise cards full width,
   Download MusicXML per card, write step's template + file check,
   "Done — <next step> →"). Collapses to one column under 52 rem.
7. **All ideas** drawer (toggled): table rank · bars · chords · cells;
   stock units say "mostly a scale run"; selected row highlighted.

## Tune chip and picker

- Chip always visible. Confident vote → "Through · Title (key) · pct ✓".
  Not confident → amber "Through · which tune? ▾", **nothing auto-taken**,
  units come from the solo's own changes until the player picks.
- Picker (popover under the chip): search box seeded with `guessTitle`,
  results with agreement per candidate ("11 % — probably not" in warn
  colour when < MIN_AGREEMENT), "This solo's own changes", irealb:// paste.
  Choosing re-runs `practiseOver` and keeps the selected idea.

## Details drawer

Summary, non-blocking adjustments, profile table — exactly today's
content, behind the Details button. Off by default.

## State

`localStorage`:
- `woodshed.tune` — pasted irealb link (as today).
- `woodshed.done.<solo key>` — set of `<unit id>:<step kind>` marked done,
  where solo key = title + note count + bar count. Ticks survive reload;
  "Reset" link in the desk head clears the solo's ticks.

## Code shape (no framework — owner's call)

`app/main.ts` (wiring, file handling) · `app/score.ts` (OSMD render,
ticks, highlight, note map) · `app/desk.ts` (idea head, step path, panes,
done state) · `app/tune.ts` (chip + picker) · `app/details.ts` (drawer)
· `app/dom.ts` (`el`, download) · `app/style.css` · `app/fonts/`.

`src/practice/unit.ts`: add `PracticeUnit.summary: { bars, chords,
cells, landing?, alsoAt: number[] }` (printed bar strings from
`core/bars.ts`); `header` string stays for the CLI and the loop rationale.

## Not in scope

Engine rules, segmentation, exercise content, the CLI output, mobile
notation (OSMD width is whatever the viewport gives it).
