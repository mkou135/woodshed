# OPEN QUESTIONS

Everything unresolved, with what would resolve it. Remove an entry only by
moving its resolution into DECISIONS.md.

- **A pickup before the first chorus shows as its own "chorus" region** in
  the profile (Blake 63–64). Resolve: label regions before the first chorus
  start as "pickup" in `analyse/profile.ts` and the page.
- **Parker "All the Things" chart has chords only as staff text** (41
  parsed at 0.7 confidence) and a pickup numbered bar 0; a single chorus,
  so no form. Resolve: check the text-chord degrees look right on the page;
  decide whether bar 0 should be renumbered at ingest.
- **A 2–4 bar vamp is taken as the form** in 34 WJD solos (modal tunes,
  "Nature of the Beast", one Stardust): `smallestPeriod` accepts the first
  p > 0.75. Resolve: when rehearsal marks exist, prefer the smallest period
  consistent with same-letter mark spacing; otherwise a minimum period
  (8?) — but `transposing-form` pins period 4, so decide with the owner.
- **Mixed-meter solos** (3 in WJD) are rejected; MusicXML with a mid-score
  `<time>` change silently takes the last one. Resolve: per-bar time
  signatures in `Score`, or reject in `parseScore` the same way.
- **Corpus numbers are printed, not pinned.** Resolve: a golden file for
  `corpus:wjd` (per-solo findings/units counts) so a change shows its blast
  radius — like `pipeline.test.ts` does for Blake.
- **Omnibook as a regression corpus.** 50 Parker heads+solos (Inria, CC
  BY-NC-SA, `~/dev/woodshed-data/omnibook`) all run; ~1,800 units. Not in
  the repo (licence, 50 MB with the WJD copy). Resolve: an
  `npm run eval:omnibook` that points at the folder and pins counts, like
  `eval:wjd`; decide whether the licence allows a few as fixtures.
- **Correct tune, weak vote** — Barbados 33%, Perhaps 41%, Cheryl 24%
  (period detected as 24 not 12), Blue Bird, Relaxing With Lee (title →
  Donna Lee). Resolve: try the vote over period × phase offsets, not just
  the detected phase; that is also the "rank the book by changes" item.
- **Tunes not in the book** ("Blues in all keys", "Rhythm Changes", "Hey
  Lock") only get "paste a link". Resolve: aliases (rhythm changes → I Got
  Rhythm; blues → a 12-bar template) and, later, ranking the book by how
  well each chart's changes vote against the solo.
- **Blues in all keys reports 87% on a 12-bar period by absolute roots**,
  which a key-changing blues should not. Resolve: inspect the chord track.
- **Charts with neither letters nor double bars** fall back to bar 1 with
  no warning. Resolve: when `phaseFrom` is 'none' and the solo starts
  mid-period, raise a warning adjustment; test on such a chart when one
  arrives.
- **Idea recall is 68%.** The missing boundaries are changes of character /
  motivic repetition with no duration cue (14% have no surface cue at all).
  Resolve: a "same contour or rhythm as the previous unit" detector, scored
  against WJD IDEA sections.
- **AI summariser** (SoloProfile → two-paragraph overview + one line per
  finding). Blocked: owner has no API key yet; and where should the call
  run (CLI with env key vs local proxy for the page)? Resolve: owner gets a
  key and picks; build the deterministic SoloProfile prompt around
  `analysis.profile`.
- **Cycle exercise: twelve keys printed, or one key + "take it through the
  cycle"?** Coker says the latter; code prints twelve (as a non-default
  now). Resolve: owner tries both on the horn.
- **8 of 18 Blake phrase ends are non-chord-tones.** Blake ending on
  tensions, or the last note actually belongs to the next chord
  (anticipation), or boundaries a note off? Resolve: check those 8 spots by
  ear against the record; also test "phrase can end at a chord-tone target
  without a rest" (Weimar hypothesis 8).
- **Session planning / interleaving.** Research says rotate units in short
  blocks and mix keys (feels worse, retains better). Resolve: design a
  "today's session" view over units once units themselves are validated.
- **Dictionary is 13 entries.** Grow quality-aware (Coker's elements:
  7-3 resolution, CESH, bebop-scale runs). Resolve: add with tests per
  entry, watch the Blake goldens.
- **WBA atom parser as substrate** — probe said its output reads as
  nothing on its own. Keep deferred unless something needs it.
- **Analyse the head (bars 9–64)** to catch the soloist quoting the tune.
  Form phase is fixed, so this is now cheap.
- **displace step and 3/4+ time**: placements assume 4/4 feel (beat 2,
  and-of-1). Check against a 3/4 solo when one arrives.

- **Mintzer rhythm changes phrase markers** (2026-08-24, owner: "not sure
  about quite a few"). 56 phrases in 130 bars at ♩=220; segmentation was
  tuned on Blake, St Thomas and the WJD, none this fast. Suspects: rest
  thresholds in beats are short in seconds at 220; the file has an
  unmarked pickup (warn), which shifts every beat position. Resolve: owner
  draws brackets on one chorus (as for St Thomas printed 57–76), then
  `diag:wjd`-style comparison. File: ~/dev/woodshed-data/peers.

## Segmentation cues (2026-08-24, from a ChatGPT comparison)

Tested against WJD the same day (DECISIONS 2026-08-24): separate idea
profile with rest/rhythm-change terms, harmonic arrival, metric position —
all rejected, no surface cue reaches 20% precision on the unmarked gaps.
Local peak picking accepted (ideas F1 77.6); similarity (family starts)
also rejected, 3% precision — idea recall is at its ceiling. Still open:

- **Variant clustering — done for bend/inversion** (DECISIONS 2026-08-24).
  Not yet: retrograde, a bent interval in a 3-note cell, two small bends in
  a 6-note cell, and "same idea, different length" (a 4-note head inside a
  5-note variant). Also a near-trivia family ([-1,-1,-1,-1,-1,2] vs …,3])
  passes because trivia is judged on the whole cell. Resolve: look at the
  families on the page for a few solos before widening.
- **Contour closure cue.** Line reaches an extreme then settles. Peak
  (up-then-down) was 23% at missed boundaries vs 20% elsewhere — likely
  nothing; only if headroom remains.
- **Stock-vocabulary discount, corpus version** — in (DECISIONS 2026-08-24
  "Stock discount, corpus version"): WJD document frequency, named 4-note
  cells exempt. Left open: Omnibook and Bopland are not in the table yet
  (WJD only); "5-3-2-1 descent" and "scalar cell 1234" are exempt as named
  cells although they are the most stock cells the dictionary has (St
  Thomas u2/u3) — should a cell's own corpus frequency discount its
  finding?; and the owner's page read of unit order on 2–3 solos is still
  the real test.
- **Bopland lick corpus** (~/dev/woodshed-data/bopland; licensing in
  DECISIONS 2026-08-24). Uses in payoff order: dictionary-coverage
  benchmark (named vs unnamed licks with their changes); second corpus for
  the stock-vocabulary frequency table; variant-family checks. OMR noise
  unmeasured — spot-check against the PNGs before trusting any lick.
- **Dictionary coverage on Bopland is 37% named / 39% unnamed-only / 24%
  nothing** (`npm run bench:bopland`, 1,785 licks with their own changes).
  The "nothing" sample shows shapes the degree-cell dictionary lacks: bare
  triads in any order (done 2026-08-24: nothing 23.9 → 14.8%),
  dominant b9 cells (done 2026-08-24: nothing 14.8 → 14.3%), and 3-note
  approach cells. Coverage now 69.3% named / 16.4% unnamed / 14.3% nothing;
  the remaining "nothing" sample has not been re-read since the triads went
  in. Adding cells changes what the app names on every solo, so it is
  the owner's call: propose triads first (measure the Blake/WJD finding
  counts before and after), then the b9 family.
