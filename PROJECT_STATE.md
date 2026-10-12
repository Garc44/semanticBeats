# MusicAgent — Project State Summary

*Snapshot: 2026-10-12 · branch `feat/generative-pipeline` @ `7649a9f` · 198/198 tests passing*

Starting point for turning the app into a bachelor thesis project. Describes what exists **today** (verified against the code, not the docs), how it got here, and what is open.

---

## 1. What the app is

**MusicAgent** (published wiki name: *semanticBeats*) is a browser-based, AI-assisted **live-coding music app**. Users describe a sound in plain language ("dark hypnotic bass", "make it warmer"). A **local LLM** turns that into a structured decision, and a **deterministic compiler** turns the decision into [Strudel](https://strudel.cc/) live-coding code, which plays in real time in the browser.

Core idea, and the likely thesis angle:

> **The LLM never writes code.** It only makes constrained, schema-validated choices (pattern IDs, effect values, intent classifications). All code is produced deterministically. That gives reliability, safety, and reproducibility with a small local model (7B).

- **Target user:** non-programmers or amateur producers who want to make electronic music (mainly dark/minimal techno) without learning Strudel.
- **Fully local/offline:** Ollama + `qwen2.5:7b`. No API keys, no cloud, no cost.
- **Aesthetic:** dark minimal techno defaults (low LPF, minor/phrygian scales, 909 samples) with a "Berghain poster" UI (black, red accent `#E8302A`).

---

## 2. Tech stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JS (ES modules), no framework, single-page app |
| Build/dev | Vite 8 |
| Audio engine | `@strudel/web` 1.3 (live-coding pattern language on WebAudio), `@strudel/draw` for visualization |
| LLM | Ollama `/api/chat`, default `qwen2.5:7b`, JSON-Schema-constrained output (`format`), `temperature: 0`, `seed: 42` |
| Tests | Vitest 4: 12 test files, 198 tests, all green |
| Size | ~2,300 LOC of app code (`app.js` + `src/`), plus `style.css` |

---

## 3. User-facing functionality

### 3.1 Five pillars (parallel layers of one track)

| Pillar | UI label | Role | Library patterns |
|---|---|---|---|
| `drums` | DRUMS | kicks, rhythmic foundation | 9 |
| `bass` | BASS | low end: sub, acid, rolling lines | 16 |
| `percussion` | PERCS | hats, rides, claps, shakers | 13 |
| `melody` | MELODY | synths, arps, leads, chords | 13 |
| `transitions` | EFFECTS | sweeps, risers, atmosphere | 7 |
| | | **Total** | **58** |

All pillars are combined into one Strudel `stack(...)` and play together.

### 3.2 Two modes per pillar

- **GEN (generation):** the user types a prompt, and the system picks a matching pattern from the library. It shows a preview card (**Apply / Dismiss**). GEN also shows **browse chips**: the whole catalog, ranked by *cohesion* (tag overlap with what plays on the other pillars, marked with a fit indicator).
- **TRX (transformation):** shapes the current sound.
  - **Free text** ("more reverb", "darker"): the LLM produces an effect patch. A deterministic parser (`parseDirectCommand`) acts as an "airbag" if the LLM returns nothing.
  - **Emotion chips** (Dark, Gritty, Dreamy, Vintage, …): curated, deterministic effect recipes. One click, no LLM. Meant for amateurs ("pick a feeling, not an effect").
- **Auto mode detection:** effect words in a prompt (`reverb`, `darker`, `more`, `kill the`, …) route it to TRX automatically, regardless of the toggle.

### 3.3 Mixer and transport

- Play/Stop, per-pillar **Mute**, **Solo** (overrides mute), per-pillar **volume fader**.
- Global sliders: tempo (BPM → `cps`), master volume (`postgain`), master filter (LPF), intensity (shape + room).
- Per-pillar **visualization** toggle: pianoroll grid or spectrum, drawn on canvas.
- **Direct code editing:** each pillar's Strudel code can be edited by hand and applies live.
- **Onboarding:** welcome card + spotlight tour on first run, with a replay button.
- **Hot-swap:** `evaluate(code, true)` patches running audio without stopping the transport.

---

## 4. Architecture

### 4.1 Module map

```
app.js                         — wiring, event handlers, apply/revert flow, mode detection
src/
  llm.js                       — Ollama client (callOllama), plan selection, transform patch, autoFix, warm-up
  intent.js                    — [NEW] intent vocab, deterministic lexer, LLM intent classifier, buildIntent
  promptEngine.js              — [NEW] retrieval: rankPatternsByIntent (tag-overlap scoring)
  compiler.js                  — compileTrack: pattern code + LLM mods + gain + effect chain → Strudel code
  pillars.js                   — PILLAR_NAMES, makePillars (state), rebuildStack (mix → one Strudel program)
  validate.js                  — validatePlan, validateCode, [NEW] validateMiniNotation, countMiniEvents
  strudel.js                   — @strudel/web wrapper: init / play / stop + viz hooks
  ui.js                        — DOM rendering only (pillars, chips, preview cards, sliders)
  onboarding.js                — first-run tour logic + rendering
  library/
    soundLibrary.js            — 58 hand-written Strudel patterns (id, name, tags, code, initialTransforms)
    transformationsLibrary.js  — TRANSFORMS (effect catalog with ranges + semantic descriptions),
                                 PILLAR_TRANSFORMS, mergeLlmTransformPatch, applyEmotionRecipe, parseDirectCommand
    emotionsLibrary.js         — per-pillar emotion recipes (TRX chips)
    cohesion.js                — rankSoundsByCohesion (GEN browse chip ordering)
    strudelDocs.js             — [NEW] METHOD_CARDS: single source of truth for generable Strudel methods
```

### 4.2 GEN pipeline (current, live in app)

```
user prompt
   │
   ▼
buildIntent(prompt)                         intent.js
   ├─ lexIntent()      deterministic: bpm, genre, textures, instrument→pillar hints   (authoritative)
   └─ generateIntent() LLM call #1: classify into {genre,key,scale,energy,moods,textures,layers}
   merge: DEFAULT_INTENT ← LLM ← lexer   (lexer wins; never returns null)
   │
   ▼
rankPatternsByIntent(pillar, intent)        promptEngine.js
   tag overlap: genre match +2, mood/texture match +1 → top 8 candidates
   │
   ▼
generateTransformationPlan(...)             llm.js — LLM call #2
   input: narrowed catalog + other pillars' active patterns (cohesion context) + intent
   output (JSON Schema enforced): { selectedId ∈ catalog, explanation, modifications{speed, slowdown} }
   post-checks: id in catalog, ranges; tempo mods zeroed unless prompt mentions tempo
   returns null on ANY failure
   │
   ▼
compileTrack(plan, pillar)                  compiler.js — deterministic
   (pattern.code) → .slow/.fast → .gain(knob or 0 if muted)
   → effect chain in fixed DETERMINISTIC_AUDIO_CHAIN order (structure → timbre → filter → space)
   │
   ▼
Preview card → Apply → rebuildStack() → play()      (Dismiss restores previous state)
```

### 4.3 TRX pipeline

```
prompt ──► generateTransformPatch()  LLM: flat JSON patch {effectId: value|null}, schema built from
                                     the pillar's allowed effects with min/max per effect
            └─ empty/failed? ──► parseDirectCommand()  deterministic regex parser ("reverb 0.9", "more reverb")
       ──► mergeLlmTransformPatch() ──► compileTrack() ──► preview ──► apply / revert

emotion chip ──► applyEmotionRecipe() (replace semantics) ──► compileTrack() ──► preview ──► apply / revert
```

### 4.4 Key design principles (thesis-relevant)

1. **Constrained generation:** every LLM call uses Ollama's `format` with a full JSON Schema (enums, numeric ranges, `additionalProperties:false`). The model physically cannot emit an unknown ID or an out-of-range value.
2. **Separation of decision and code emission:** the LLM chooses, the compiler writes. Code always comes from curated templates plus a fixed effect ordering.
3. **Graceful degradation:** LLM entry points return `null` instead of throwing. The UI shows an error and state stays unchanged. Deterministic fallbacks exist: lexer over LLM for intent, parser airbag for TRX, emotion chips with no LLM at all.
4. **Determinism/reproducibility:** `temperature 0` + fixed seed, so identical prompts give identical output. Useful for evaluation.
5. **Hybrid symbolic + neural:** the deterministic lexer and tag retrieval narrow the search space before the LLM decides. With 58 patterns, tag overlap is enough; embeddings are deferred until the library has more than ~200 patterns.
6. **Human-in-the-loop:** every change goes through a preview with Apply/Dismiss.

---

## 5. Project history (evolution)

17 design specs and 19 implementation plans in `docs/superpowers/` record the design history. That trail is useful as thesis material on iterative design.

| Date (2026) | Milestone |
|---|---|
| 05-15 | Strudel AI companion concept; first LLM "classify → generate" pipeline |
| 05-16 | 6-pillar architecture, compose mode, semantic transform pipeline, style library |
| 05-19 | Synthesis refactor |
| 05-29 | Techno refactor (harmonic locking, sidechaining) |
| 06-01 | Restructure to 4 pillars; authentic sample migration |
| 06-08 | Split `bass_percussion` into `bass` + `percussion` (→ 5 pillars); studio console UI; Berghain reskin |
| 06-12 / 06-14 | Transformation (TRX) mode; guided TRX UI; LLM backend swap (Gemini, later replaced by local Ollama) |
| 06-22 | Emotion recipes, GEN browse chips + cohesion ranking, onboarding |
| 07-06 | **Generative Strudel pipeline** plan (current work, see §6) |

Key pivot: the LLM went from **writing code** (early versions, with `autoFixCode` repair) to **selecting** from a curated library, for reliability. The current branch begins moving back toward **controlled generation** through an intermediate representation.

---

## 6. Current work in progress: generative pipeline

Plan: `docs/superpowers/plans/2026-07-06-generative-strudel-pipeline.md` (15 tasks, 3 phases).

**Goal:** go beyond picking one of 58 patterns. A local 7B LLM turns loose prompts ("glitchy lo-fi hip hop beat with Rhodes chords") into a constrained JSON **intermediate representation (`LayerSpec`)**. A deterministic compiler turns that into valid Strudel. The existing selection pipeline stays as a guaranteed fallback.

| Phase | Task | Status |
|---|---|---|
| **1 — Intent layer** | 0 Checkpoint commit | ✅ |
| | 1 Intent vocabulary + deterministic lexer (`lexIntent`) | ✅ |
| | 2 LLM intent classifier + `buildIntent` orchestrator | ✅ |
| | 3 Retrieval scoring `rankPatternsByIntent` | ✅ |
| | 4 Wire intent + retrieval into selection flow | ✅ (live in `app.js`) |
| **2 — Deterministic IR foundation** | 5 `METHOD_CARDS` + generation vocabulary (`strudelDocs.js`) | ✅ |
| | 6 Mini-notation validator + event-density counter | ✅ |
| | 7 `validateLayerSpec` | ⬜ open |
| | 8 IR compiler `compileLayerSpec` | ⬜ open |
| | 9 AST validation with `acorn` | ⬜ open |
| **3 — Generative wiring** | 10 LayerSpec JSON schema + prompt assembly | ⬜ open |
| | 11 `generateLayerSpec` LLM call | ⬜ open |
| | 12 Repair loop: validate → repair → fallback to selection | ⬜ open |
| | 13 App wiring (generated tracks as first-class pillars) | ⬜ open |
| | 14 Docs + final verification | ⬜ open |

**Progress: 7 of 15 tasks done.** Phase 1 is complete and running. Phase 2 is about half done. Phase 3 has not started.

**Security boundary in the design:** in the planned IR, mini-notation strings are the only free-text field the LLM controls. `validateMiniNotation` restricts them to a whitelist charset, balanced brackets, known sample names (`bd`, `hh`, …) or valid note names (`a3`, `fs2`), so code injection is blocked. `countMiniEvents` + `MIN_EVENTS` keep generated layers from being silent.

**Explicitly deferred (YAGNI):** embedding retrieval, headless `queryArc` dry-run, `qwen2.5-coder`, multi-pillar one-shot generation ("build a whole track"), cohesion context for generated tracks.

---

## 7. Testing

| File | Covers |
|---|---|
| `library.test.js` | soundLibrary integrity, lookups |
| `compiler.test.js` | compileTrack across pillars, mute, slow/fast, effect chain |
| `llm.test.js` | plan generation, transform patch, autoFix (fetch mocked) |
| `validate.test.js` | validatePlan, validateCode, mini-notation validator, event counter |
| `pillars.test.js` | makePillars, rebuildStack (solo/mute, master chain) |
| `transformations.test.js` | merge/replace semantics, parseDirectCommand |
| `emotions.test.js` | recipe integrity (allowed effects, values in range) |
| `cohesion.test.js` | cohesion ranking |
| `intent.test.js` | lexer, vocabulary, buildIntent merge priority |
| `promptEngine.test.js` | retrieval ranking |
| `strudelDocs.test.js` | METHOD_CARDS consistency |
| `onboarding.test.js` | first-run logic |

**Total: 12 files, 198 tests, all passing.** Not tested: Strudel audio output, UI/DOM, end-to-end flows, and **LLM output quality** (all LLM tests mock `fetch`).

---

## 8. Known gaps and inconsistencies (found while writing this)

- **`CLAUDE.md` is out of date.** It describes 4 pillars, `bass_percussion`, `GENRE_PRESETS`/`GENRE_NAMES` (no longer exist), "85 tests", and mentions Gemini. Reality: 5 pillars, 198 tests, Ollama only.
- **The `autoFixCode` retry is not wired.** It is exported from `llm.js` but `app.js` never calls it; play errors just stop or revert. The docs claim a "one retry → revert" flow.
- **`validatePlan` / `validateCode` are not used at runtime.** They exist and are tested, but the live path relies on the JSON Schema plus inline checks in `llm.js`.
- **Typo in a few-shot example** in `generateTransformationPlan`: `"exlaplanation"`. It could mildly confuse the model.
- **Knobs are mostly unused:** `KNOB_DEFAULTS` defines drive/decay/cutoff/etc., but `applyKnobs` only applies `gain`.
- **`bass_percussion` legacy alias** still has special cases in several modules.
- **No evaluation yet:** nothing measures whether the LLM picks "good" patterns for a prompt, how often it fails, latency, or user satisfaction.

---

## 9. Possible thesis directions (starting points)

The project already has a clear research-shaped core: *how can a small local LLM reliably control a creative live-coding system?* Possible framings:

1. **Constrained LLM generation for creative code:** compare (a) free code generation, (b) selection from a library (current), (c) IR-based generation (Phase 3). Metrics: validity rate, silence/crash rate, latency, prompt-adherence.
2. **Natural-language interfaces for music production by non-programmers:** a user study on GEN vs. TRX vs. emotion chips (usability, SUS, perceived control, creativity support).
3. **Hybrid symbolic–neural intent understanding:** lexer + classifier + retrieval vs. LLM-only. Ablation study on retrieval narrowing (top-8 vs. full catalog).
4. **Reliability engineering for LLM-in-the-loop apps:** schema constraints, fallbacks, determinism, validate→repair loops.

**Needed in any direction:** an evaluation harness (prompt test set + logged outputs + metrics), finishing or scoping Phase 2/3, and a clean-up pass on the §8 inconsistencies.

---

## 10. How to run

```bash
npm install
ollama pull qwen2.5:7b
OLLAMA_ORIGINS="*" ollama serve     # terminal 1
npm run dev                          # terminal 2 → http://localhost:5173
npm test                             # 198 tests
```

Configure via `.env`: `VITE_OLLAMA_MODEL`, `VITE_OLLAMA_URL`.
Wiki: https://garc44.github.io/semanticBeats-wiki/
