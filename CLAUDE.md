# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev         # start Vite dev server (http://localhost:5173)
npm test            # run all tests once
npm run test:watch  # run tests in watch mode
npm run build       # production build to dist/
```

Run a single test file:
```bash
npx vitest run tests/llm.test.js
```

Ollama must be running for LLM features to work:
```bash
OLLAMA_ORIGINS="*" ollama serve
```

## Architecture

Single-page Vite app. No framework. `app.js` wires seven ES modules together.

**Pipeline (handleSend flow):**
```
generateTransformationPlan()  →  compileTrack()  →  rebuildStack()
         llm.js                    compiler.js         pillars.js
```

On apply: `play()` → if throws → `autoFixCode()` one retry → revert on second failure.

---

**`src/llm.js`** — Ollama interaction. Two exports:
- `generateTransformationPlan(pillarName, userPrompt, currentTracksState)` — Single LLM call. Returns a plan object or `null` on any failure (never throws). Builds cohesion context from `currentTracksState` (other channels' active pattern IDs). Uses `TRACK_ROLES` to inject track role description into system prompt.
- `autoFixCode(brokenCode, errorMsg)` — Fired only when `play()` throws. Throws on HTTP error.

Plan shape:
```js
{ selectedId: "string", explanation: "string", modifications: { speed: 1.0, slowdown: 1 } }
// speed: float 0.25–4.0; slowdown: integer >= 1
```

Validation: selectedId must be in `soundLibrary[pillarName]`; speed in [0.25, 4.0]; slowdown integer >= 1. `gain` is NOT in the schema. Returns `null` on any violation.

**`src/library/soundLibrary.js`** — Musical source of truth. Four pillars: `drums`, `bass_percussion`, `melody`, `transitions`. Exports `soundLibrary`, `GENRE_PRESETS`, `GENRE_NAMES`, `getPatternById`, `getGenreCode`. Pattern code strings are the hardcoded Strudel source — LLM never outputs code, only selects IDs.

**`src/compiler.js`** — NEW. One export:
- `compileTrack(plan, pillarName, pillar)` — Full compile chain: wraps `pattern.code` in parens, appends LLM structural mods (`.slow()` / `.fast()`), then appends per-track knob layer. Muted tracks compile to `.gain(0)`. Returns `''` on missing pattern.

Compile chain:
```
(pattern.code) → +LLM mods (slow/fast) → +knob layer (gain/drive/decay/etc.) → final code
```

**`src/pillars.js`** — Pillar state management. Three exports:
- `PILLAR_NAMES` — `['drums', 'bass_percussion', 'melody', 'transitions']`
- `makePillars()` — creates pillar objects with `{ name, code, muted, history, selectedId, lastMods, knobs }`
- `rebuildStack(pillars, globalState)` — stacks all active (non-empty, non-muted) pillars. Solo overrides mute. Applies global cps/gain/lpf/shape/room.

**`src/validate.js`** — Two exports:
- `validatePlan(plan, pillarName)` — validates selectedId against catalog, gain [0, 1.2], speed (positive), slowdown (integer >= 1)
- `validateCode(code)` → `{ valid: bool, errors: string[] }`. Checks: non-empty, no markdown fences, balanced parentheses, only allowed Strudel method names (against `ALLOWED_STRUDEL_FUNCTIONS` set).

**`src/strudel.js`** — Thin wrapper around `@strudel/web`. Exports `init()`, `play(code)`, `stop()`. `play()` calls `evaluate(code, true)` which hot-patches the running audio without stopping transport.

**`src/ui.js`** — DOM helpers only. `addPreviewMessage(code, onApply, onDismiss)` renders the Apply/Dismiss card; callbacks are wired in `app.js`.

## LLM Contract

- `generateTransformationPlan` returns `null` on all failures — caller must handle null (shows error, returns early)
- `autoFixCode` throws on HTTP error — caller catches and reverts
- Both strip markdown fences from LLM output
- Model hardcoded to `llama3:latest`; endpoint hardcoded to `http://localhost:11434/api/chat`
- LLM does NOT output code — only selectedId + structural mods (speed/slowdown)
- `compileTrack` owns all code generation; knob layer is appended after LLM mods

## Tests

Five test files, 85 tests total:
- `tests/library.test.js` — soundLibrary, GENRE_PRESETS, getPatternById, getGenreCode (19 cases)
- `tests/compiler.test.js` — compileTrack: all 4 pillars, muted state, slow/fast, edge cases (15 cases)
- `tests/llm.test.js` — generateTransformationPlan (14 cases) and autoFixCode (2 cases)
- `tests/validate.test.js` — validateCode (8 cases) and validatePlan (10 cases)
- `tests/pillars.test.js` — PILLAR_NAMES, makePillars, rebuildStack (14 cases)

Strudel and UI are not tested. No integration tests.
