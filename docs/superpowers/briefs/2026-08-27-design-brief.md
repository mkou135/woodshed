# BRIEF — UI/UX pass over the woodshed app (Task 4)

The owner asked to "see some improvement" and delegated the judgement.
This brief is the requirements. Read it fully before writing any CSS.

## Read this first

**Load the `frontend-design:frontend-design` skill before you start.** It
calibrates the design work; this brief supplies the specifics.

## What the app is

Woodshed analyses a transcribed jazz solo and generates exercises that
drill the vocabulary it contains. The user is a working saxophonist. They
drop a `.mxl` on the page and get: a ranked list of practice units, four
practice steps per unit, and the full transcription with engine-evidence
overlays drawn on it.

The tone the existing design reaches for — and mostly hits — is **a
practice desk**: white sheets on a grey desk, one yellow highlighter, a
pencil for annotations. It reads like printed practice material, not a SaaS
dashboard. That is correct and deliberate.

## The prime directive: refine, do not replace

`app/style.css` carries a real design system, chosen on purpose:

- **Barlow Condensed** (`--disp`) for headings and small-caps labels
- **Source Serif 4** (`--body`) for prose
- **JetBrains Mono** (`--mono`) for engine data, with tabular numerals
- A paper-on-desk palette: `--ground #e4e6e8`, `--paper #fff`,
  `--ink #1a1c20`, `--pencil #5a5f68`, `--marker #f5e27a`
- Per-vector colours that the score overlays depend on: `--phrase #c4641d`,
  `--idea #2b6cb0`, and the overlay colours in the `.eng-overlay` rules

**Do not change the typefaces. Do not change the palette's character.** Do
not introduce a CSS framework, a component library, or a build step. The
fonts are self-hosted in `app/fonts/` and must stay so. Your job is to make
the existing system work harder and apply consistently — not to restyle
the app into something else.

## The problems to solve

Observed on the running app with the Blake solo loaded. Screenshots are
worth taking yourself: `npm run dev`, then drive it with `agent-browser`
(see the `agent-browser` skill) and upload an `.mxl`.

### 1. The overlay control strip is the worst thing on the page

A row reading `ENGINE: ☐PHRASES ☐CELLS ☐DEVICES ☐RECURRING ☐COMMON
LANGUAGE ☐BOUNDARY CANDIDATES ☐STOCK` — seven raw native checkboxes in a
line, in condensed uppercase, with **no colour connection to the marks
they toggle**. Every one of those vectors already has a colour on the
score. The control should carry its own swatch, so the strip doubles as
the legend it currently duplicates. This is the highest-value fix in the
brief.

### 2. Two control rows that should be one system

Directly above it sits a second, differently-styled row: phrase/idea
colour keys, "NOW PRACTISING", and a bare native `<select>` for scales.
Two rows, two visual languages, one job (control what the score shows).
Unify them.

### 3. Native form controls against a hand-set typographic system

The `<select>` elements, the checkboxes and the file input are browser
defaults sitting inside carefully-set type. `.btn` is already styled well —
extend that care to the rest. Style controls with CSS only; do not replace
a `<select>` with a scripted custom dropdown (it costs keyboard and
screen-reader behaviour for nothing).

### 4. The landing page wastes two-thirds of the viewport

Heading, blurb, drop zone, the four numbered step cards and the API-key
field are all crammed into a narrow left column with dead space to the
right. `main` is `max-width: 92rem` but the landing content does not use
it. The four step cards in particular are cramped and clipped.

### 5. Hierarchy on the results view

The score — the thing the musician actually reads — sits below a tall desk
section. Consider what earns the top of the page. Do not reorganise the
information architecture wholesale; improve what competes for attention.

### 6. Small things

- "GO TO BAR" and its input float far right with a weak visual link.
- The `.export-annotations` button is jammed into the checkbox row.
- Focus states exist (`outline: 2px solid var(--idea)`) — verify they are
  visible on every control you restyle.
- There is no dark mode. **Adding one is optional and explicitly not
  required.** If you do, it must be complete and correct — the score SVG
  is black-on-white from OSMD and does not invert for free. A half-done
  dark mode is worse than none; skipping it is a fine outcome.

## Constraints

- **`app/` only.** Never touch `src/` — it is DOM-free by rule.
- `app/annotate.ts` is the separate annotation tool. Improving it too is
  welcome but secondary; the main page comes first.
- **Do not change the score overlay colours** (`--phrase`, `--idea`, and
  the `.eng-overlay.ov-*` rules). `app/export.ts` hard-codes matching hex
  values for the standalone export — if you change one, change both, and
  say so in your report.
- Do not change behaviour, only presentation and layout — with one
  exception: consolidating the two control rows into one may move DOM
  around in `app/main.ts`. Keep every existing control working, keep every
  `id`/`class` the other modules query, and keep `OVERLAY_DEFAULTS`
  semantics intact.
- No new runtime dependencies.
- Style: no semicolons, single quotes, 2-space indent, explicit `.ts`
  extensions in imports.
- `npm run typecheck` (both configs) and `npm run test:run` green.

## Acceptance

You are the reviewer of your own visual work, so the evidence has to be
real:

1. **Drive the running app in a browser and screenshot it** — landing page
   and results view, before and after. Save them under
   `.superpowers/sdd/<workspace>/` and reference the paths in your report.
   A change you have not looked at is not done.
2. Every control in the overlay strip still toggles what it toggled, and
   the checkbox swatches match the colours actually drawn on the score.
   Verify by toggling them in the browser, not by reading the CSS.
3. No console errors with a solo loaded.
4. The page is usable at 1280px and does not scroll horizontally at
   1024px.
5. Keyboard focus is visible on every control you restyled.
6. `npm run typecheck` and `npm run test:run` green.

## What "good" means here

The owner said "I'd just like to see some improvement" — that is trust,
not indifference. Aim for the pass a careful designer would make on their
own work: the same system, applied consistently, with the controls given
the same care the type already has. Restraint scores higher than novelty.
If you find yourself adding a gradient, an animation, or a third accent
colour, stop and ask what problem it solves.
