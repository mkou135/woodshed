# Notation conventions the parser relies on

Researched 2026-08-24 (session 3). Sources at the end.

## Double bar lines

- A double bar (MusicXML `<bar-style>light-light`) marks the **end of a
  section**, or a key/time signature change. It is placed at intentional
  structural points by the transcriber; there is no rule that it falls
  every N bars.
- Jazz forms are mostly built from 8-bar sections, so double bars *tend* to
  land every 8 (or 16) bars — a consequence of the form, not a convention
  in itself. Blake: sections of 16/16/8/16 inside a 56-bar chorus.
- `light-heavy` is the final barline. Repeats (`heavy-light` with
  `<repeat>`) are not section markers for our purposes.

## Rehearsal letters

- Sections (A, B, intro, verse …) are marked with rehearsal letters, and
  "further clarified with double bar lines" — the two normally coincide.
- Jazz chart convention (Tim Davies): **letter A is always the start of the
  head.**
- Many transcriptions (Blake included) carry no letters at all; the double
  bars are then the only structural marks.

## What the corpus actually does (8 charts, 2026-08-24)

- Letters per chorus, numbered: 26-2 (1–4 at 1/33/65/97), Blues in all
  keys (1–13 every 12). Letters per *section*: Bartley (A–E every 40 with a
  4-bar intro), Autumn Leaves (A A B C inside one chorus), Blake (A–G on
  the solo chorus only, none on the head).
- Double bars every chorus (Tenor Madness, 26-2, Blues) or every section
  (Blake, Bartley); none at all (Mintzer Rhythm Changes, Sandu).
- A `light-light` on the last measure closes the piece (Autumn Leaves).
- Chords as staff text instead of `<harmony>` (Parker ATTYA); pickup as
  measure 0 (same file).
- Soloist names as words: "Trane"/"Sonny"; "Miles" over a one-bar tag
  before "Cannonball Solo". Performance words seen: swing, sloppy, flat,
  lay back, growl, half-tonguing, (straight 8ths), On Downbeat, Up Down,
  quick F, (8ve.

## Consequence for `prepare/form.ts`

Double bars and letters are evidence of **section boundaries**, not chorus
boundaries. They fix the *phase* of the form; autocorrelation of the changes
fixes the *period*. Phase = residue class (mod period) with the most
marks; choruses on every bar in it. Precedence: rehearsal letters, then double
bars, then bar 1 with reduced confidence. Bars before the first chorus
start are an intro.

## Sources

- https://musicsymbols.me/double-bar-line/
- https://www.timusic.net/debreved/jazz-notation/
- https://www.learnjazzstandards.com/blog/how-to-write-out-a-lead-sheet-jazz/
- https://ultimatemusictheory.com/writing-bar-lines/
- https://en.wikipedia.org/wiki/Bar_(music)
- https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/bar-style
