# Online datasets of jazz solo transcriptions (2026-08-24)

Survey prompted by "what's out there in MusicXML?". The engine's hard
requirement is MusicXML with `<harmony>`/`<kind>` — melody-only formats and
SQL/MIDI corpora need a converter before `analyse/` can see them.

## Verdict

One drop-in find: the **LORIA Charlie Parker Omnibook**. Everything else is
gated behind a research agreement, is the wrong format, or is lead sheets
rather than solos.

---

## 1. Charlie Parker Omnibook (Inria/LORIA) — USABLE TODAY

- 50 `.xml` files, one per Omnibook tune, MuseScore 2.0.1 export.
- <https://homepages.loria.fr/evincent/omnibook/> → `omnibook_xml.zip` (424 KB,
  no registration).
- Licence **CC BY-NC-SA 2.0 UK**; original copyright Atlantic Music Corp.
  Cite Déguernel, Vincent & Assayag, SMC 2016.
- Copy lives at `~/dev/woodshed-data/omnibook/`, beside `wjazzd.db`.
  **Do not vendor into the repo** — the site is published to GitHub Pages and
  the licence is non-commercial with third-party copyright underneath.

Verified against the actual pipeline, not just inspected:

- All 50 carry `<harmony>` with real `<kind>` elements. Kinds used: `dominant`
  2412, `minor` 1259, `major` 704, `half-diminished` 45, `diminished` 43,
  `major-sixth` 1. No reliance on the `text` attribute (cf. F1 in
  `corpus-survey-cleanup.md`).
- **Concert pitch.** No `<transpose>` in any file; `<fifths>` is 0 everywhere
  (accidentals written out, so key signature tells you nothing). Confirmed by
  chord roots instead: Confirmation in F, Blues For Alice in F, Yardbird Suite
  in C, Ornithology D7→G. Register readings and generated exercises are
  therefore in the right octave and key.
- 50/50 parse and produce findings — 9 to 29 each, mean ~17. Form detected on
  42/50 (12-, 24-, 32- and 64-bar choruses, agreement 76–100%).

### Caveat: these are head **and** solo

The LORIA page says "all 50 themes *and* Charlie Parker's improvisations". Donna
Lee comes back as `32-bar chorus x3` with `soloists: unknown (1-97)`, and the
profile shows chorus 1 at 6.9 notes/bar against 5.6/5.7 for the two after it —
consistent with chorus 1 being the composed head, pooled with the improvisation.
For a tool that drills *improvised* vocabulary this matters, and soloist
detection gives no head/solo split to work with. Check per tune before treating
a finding as Bird's improvised language.

### Bug lead: 8 files detect no form

Bar counts are each a multiple of 12 or 32/64 **plus 1 or 2**:

| file | bars | = |
|---|---|---|
| Cosmic_Rays | 37 | 3x12 + 1 |
| Another_Hairdo | 61 | 5x12 + 1 |
| Back_Home_Blues | 62 | 5x12 + 2 |
| Chasing_The_Bird | 65 | 2x32 + 1 |
| Steeplechase | 65 | 2x32 + 1 |
| Bird_Gets_The_Worm | 66 | 2x32 + 2 |
| Card_Board | 66 | 2x32 + 2 |
| Red_Cross | 66 | 2x32 + 2 |

No `implicit="yes"` pickup and every file starts at `measure number="1"`, so the
extra bars are trailing (tag/coda) rather than an anacrusis. Hypothesis: 1–2
extra bars defeat the residue-class phase rule — adjacent to the "final double
bar → no mark" work of session 3. Logged in `OPEN_QUESTIONS.md`; not fixed here.

---

## 2. Gated behind a research agreement

- **Filosax** — 48 pieces x 5 saxophonists, PDF + MusicXML of each typeset solo,
  plus audio and note-level MIDI. Zenodo, permission granted on agreeing to
  terms. <https://zenodo.org/records/5625643>, docs at
  <https://dave-foster.github.io/filosax/>. **Filosax Lite** (2 tracks) is the
  no-commitment taster: <https://zenodo.org/records/5643734>. This is the
  strongest second corpus if the terms suit — modern players, real MusicXML.
- **FiloBass** — 48 verified double-bass transcriptions over the same backing
  tracks, with chord symbols and form markers.
  <https://zenodo.org/records/10069709>. Basslines, so not solo vocabulary, but
  the form/chord annotations are a clean test of form detection.
- **QMUL auto-Omnibook** — 32 Omnibook scores as MusicXML from an
  audio-to-score pipeline. <https://aim-qmul.github.io/SaxTranscriptionPipeline/>.
  Restricted to non-commercial research, non-transferable. Machine-estimated,
  so useful as a noisy-input robustness test rather than ground truth.

## 3. Wrong format or wrong content

- **Weimar Jazz Database** — already in use via `npm run eval:wjd`. 456 solos,
  but it is a SQLite file rebuilt onto a metrical grid; there is no MusicXML
  export. Chord changes live in the DB, not in a score.
- **Effendi "Modern Jazz Fake Book"** — 400+ tunes as `.xml`, but lead sheets
  (melody + changes), not solos. <https://effendi.me/jazz/>. Possible source of
  changes for the practice side, though formatting is lossy after conversion
  from `.musx`.
- **PDMX** — large public-domain MusicXML scrape of MuseScore; general-purpose,
  little jazz solo content. <https://github.com/pnlong/PDMX/>

## Suggested next step

The Omnibook is a free 50-solo regression corpus that needs no conversion — an
`eval:omnibook` harness alongside `eval:wjd` would catch form and detector
regressions across 50 files instead of the current handful. Not built here; the
head/solo caveat should be settled first, since it decides whether the corpus is
scored as improvisation or as mixed material.
