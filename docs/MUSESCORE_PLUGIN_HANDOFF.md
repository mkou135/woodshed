# Handoff — Woodshed as a MuseScore Studio plugin

**Written 11 September 2026. For Claude Code, working in the `woodshed` repo.**

Read this whole file before writing code. Two feasibility spikes come before any porting, and if either fails the plan changes. Do not skip to Phase 2.

---

## 1. What we're doing and why

Woodshed today: a user exports a transcribed solo as MusicXML, uploads it to a web app, and gets findings plus graded practice material back.

The proposal: run the same analysis **inside MuseScore Studio**, as a plugin, against the score the user already has open.

Two reasons, and the product one comes first:

**Product.** The export-and-upload step is the whole friction. People who transcribe jazz solos are, overwhelmingly, already sitting in MuseScore with the solo on screen. "Plugins → Analyse this solo" removes the export, the upload, and the context switch. Same engine, an order of magnitude less friction.

**Career.** Michael wants to work in music notation software. A published MuseScore plugin with real users is the most credible possible artefact for that — it's public, it's in the domain, and it's in the ecosystem of Muse Group (MuseScore, Audacity, Ultimate Guitar, Hal Leonard). It accrues value regardless of whether any job comes of it. This is context, not a requirement: **do not let it influence technical decisions.** Build the good version of the tool.

---

## 2. Verified facts — don't re-litigate these

Checked 11 September 2026 against the MuseScore Studio Handbook and the MuseScore 4.x plugin documentation.

- **MuseScore Studio plugins are QML files** containing a `MuseScore { }` component. Logic is JavaScript inside QML. They are **not** MuseHub products.
- **MuseHub "Plugins" means audio plugins** — the accepted binaries are `.vst3`, `.component`, `.aaxplugin`. Wrong category entirely. MuseHub's other types are Applications, Loops & Audio, MuseSounds. Becoming a MuseHub partner is by enrolment and invitation, with content review per submission. **MuseHub is not the distribution target for this work.**
- **Distribution is `musescore.org/plugins`** plus the GitHub topics `musescore-plugin` / `musescore-plugins`. The repository is open and, in the handbook's own word, *unvetted*. No gatekeeper, no review queue.
- **Install location** is `~/Documents/MuseScore4/Plugins/` on macOS, configurable in Preferences → Folders.

### Hard constraints in the 4.x API

These are documented breaking changes and limitations. Design around them; don't discover them.

| Constraint | Consequence |
|---|---|
| `readScore()` and `writeScore()` are **non-functional** in Mu4 | Cannot read or write score files from the plugin. No MusicXML round-trip. Everything must go through the live score object. |
| `filePath` property doesn't work | Can't locate the current score on disk either. |
| Score modification must be wrapped in `curScore.startCmd()` / `curScore.endCmd()` | Any score writing — annotations, generated exercises — must be inside a command block, or undo breaks. |
| `Qt.quit()` **crashes MuseScore 4** | Use `quit()` or `return`. |
| 4.4+ requires **Qt 6** updates | A plugin written against Qt 5 idioms won't appear in the menu at all on current versions. `TextField` → `TextEdit`, `ExclusiveGroup` → `ButtonGroup`. |
| `pluginType: "dock"` unsupported | The UI is a dialog, not a docked panel. |
| `playEvents` capped at 1000 (was 2000) | Only matters if we touch playback. We shouldn't. |
| First `SymID` call can take ~5 seconds | Don't put one in a startup path and call it a performance bug. |

**Network access from a Mu4 plugin is undocumented.** Treat it as unknown — see Spike B.

---

## 3. The two spikes — do these first

Both are throwaway. Neither should take more than a day. Report findings before proceeding.

### Spike A — can the engine even run in there?

**The question:** MuseScore's QML JavaScript engine is not Node and not a browser. Woodshed's engine is TypeScript, ES modules, bundled by Vite. Can a bundled build of `src/core/` + `src/analyse/` be loaded and executed inside a MuseScore 4 plugin?

**What to determine, concretely:**

1. What ECMAScript level does the QML JS engine in MuseScore 4.4+ actually support? Test real things: `const`/`let`, arrow functions, destructuring, spread, `Map`/`Set`, `Array.prototype.flatMap`, template literals, optional chaining, generators, `class`.
2. Can a plugin load an external `.js` file — via `Qt.include()`, a QML `import` of a JS resource, or otherwise — and what are the restrictions on that file's form? (Notably: does it tolerate a module wrapper, or does it need a plain script that assigns to a global?)
3. What Rollup/esbuild target produces something that engine accepts? Produce an actual working bundle, not a theory.

**Success looks like:** a trivial plugin that loads a bundled JS file, calls one pure function from `src/core/pitch.ts`, and prints the right answer in a dialog. That's it. If that works, the whole port is mechanical.

**If it fails:** stop and report. The fallback — hand-porting the detectors to plain QML JavaScript — is a different project with a much worse maintenance story (two implementations of the same analysis, guaranteed to drift). Don't start it without a decision from Michael.

### Spike B — read the score, and can we write to it?

**The question:** the plugin API gives a `Cursor` over the open score. Woodshed's ingest layer currently parses MusicXML. Can the Cursor produce everything the engine needs?

**What to determine:**

1. Walk `curScore` with a `Cursor` and extract, for a real jazz lead sheet: pitches (with correct enharmonic spelling — the detectors care about spelling, not just pitch class), durations, tie/slur state, measure and beat position, time signature, key signature, and **chord symbols / harmony elements**.
2. Compare that against what `src/ingest/parseScore.ts`, `parseHarmony.ts` and `parseChordText.ts` currently extract from MusicXML. Produce a written gap list: what the Cursor gives cleanly, what needs derivation, what isn't reachable at all.
3. Separately: can a plugin **create a new score** and populate it via Cursor (for exercise output), given `writeScore()` is dead? Test `newScore()` or whatever the current equivalent is.

**Success looks like:** a gap-list document, plus a proof that a new score can be created and written into. `docs/research/` is the right home for the gap list — that's the existing convention in this repo.

---

## 4. Architecture, assuming both spikes pass

The repo is already shaped for this, which is why it's worth doing.

```
src/ingest/     ← MusicXML in. THIS IS THE LAYER THAT GETS A SIBLING.
src/core/       ← pitch, bars, position, types, instrument. Pure. Ports unchanged.
src/analyse/    ← segment, context, chordScale, language, profile
                  + detectors: recurring, resolutions, shapes, targets. Pure. Ports unchanged.
src/generate/   ← exercise generation
src/practice/   ← variations
src/render/     ← musicxml.ts writes exercise scores. Needs a Cursor-based sibling.
src/agent/      ← Claude API layer. OUT OF SCOPE. See non-goals.
src/pipeline.ts ← orchestration
```

**The shape of the work:** add a second ingest adapter — MuseScore Cursor → the same internal model that `src/ingest/` already produces. Everything downstream is untouched. If porting requires changes inside `src/analyse/`, something has gone wrong: stop and reconsider, because the value of this architecture is that the engine doesn't know where its input came from.

**Repo layout:** decide between a `plugin/` directory in this repo versus a separate repo, and say why. Default to in-repo — the engine and the adapter must version together, and a split makes that a release-coordination problem for no benefit at this scale.

**The bundle must be built, not committed by hand.** Add a build script that produces the plugin's JS from `src/`, and wire it into CI alongside the existing test suite. A hand-maintained copy of the engine inside `plugin/` is the failure mode to avoid above all others.

---

## 5. Phasing

**Phase 1 — v0.1, analysis only.** Open a score, run the detectors, show findings in a dialog. No score modification, no exercise generation, no writing anything. This is shippable to `musescore.org/plugins` on its own and is the smallest thing that proves the idea.

**Phase 2 — annotate the score.** Write findings back onto the open score as staff text or similar, inside `startCmd()`/`endCmd()`. This is where it stops being a read-only curiosity.

**Phase 3 — exercise output.** Generate practice material as a new score, using whatever Spike B established. Highest risk, lowest certainty — don't let it block 1 and 2.

Ship Phase 1 before starting Phase 2.

---

## 6. Non-goals — explicitly out of scope

- **The `src/agent/` Claude API layer.** Network access from a Mu4 plugin is unverified, shipping an API-key-requiring plugin to an unvetted public repository raises questions nobody has answered, and the deterministic core is the part worth having in there anyway. The plugin is the deterministic engine. If Spike B incidentally establishes that network calls work, note it and move on — don't build on it.
- **MuseHub.** Wrong product category, and gated. Revisit only if a desktop app version of Woodshed ever exists, which is a separate conversation.
- **Replacing the web app.** The plugin is an additional surface. The web app stays.
- **Windows/Linux polish in Phase 1.** Develop against macOS; keep the code portable but don't spend time on cross-platform QA before there's a user.
- **MuseScore 3.x support.** The 3.x and 4.x APIs differ enough that supporting both doubles the surface. 4.x only.

---

## 7. House rules for this work

From `CLAUDE.md` and the existing repo conventions, restated because they matter here:

- **Verify against the running application, not against documentation or memory.** The MuseScore plugin API is thinly documented and the docs lag the releases. Every claim in Section 2 above came from published docs and should still be confirmed empirically the first time it matters. If something in this handoff turns out to be wrong, fix the handoff.
- **`docs/DECISIONS.md` is append-only.** Every choice made during this work goes in with what would reverse it. That log is a load-bearing part of what Woodshed is.
- **Open questions go in `docs/OPEN_QUESTIONS.md`** rather than being guessed at.
- **Tests come with the code.** The existing engine has near-total test coverage; the ingest adapter must too. Cursor-reading logic is exactly the kind of code that silently mis-reads an edge case.
- **Don't write the QML UI first.** The dialog is the least interesting part and the easiest to redo.

---

## 8. First message to send

> Read `docs/MUSESCORE_PLUGIN_HANDOFF.md`. Start with Spike A only — determine what the MuseScore 4.4+ QML JavaScript engine supports and whether a bundled build of `src/core/` can be loaded and executed inside a plugin. Build the trivial proof plugin described there. Report findings before touching anything else.
