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
generateTransformationPlan()  →  expandStyle() / generateSeed()  →  applyTransformation()  →  validateCode()  →  addPreviewMessage()
         llm.js                  library/styles.js / patchEngine.js      patchEngine.js           validate.js          ui.js
```

On apply: `play()` → if throws → `autoFixCode()` one retry → revert on second failure.

---

**`src/llm.js`** — Ollama interaction. Two exports:
- `generateTransformationPlan(currentCode, prompt)` — Single LLM call. Returns a plan object or `null` on any failure (never throws). When `currentCode` is empty, LLM returns `generate` mode; otherwise `transform` mode.
- `autoFixCode(brokenCode, errorMsg)` — Fired only when `play()` throws. Throws on HTTP error.

Plan shape:
```js
// transform mode — LLM selects style, NOT operations
{ mode: "transform", style: "acid|groove|minimal|dub|breakcore", target: "bass|drums|melody|all", intensity: 0.7 }
// generate mode
{ mode: "generate", seedCode: "s(\"bd ~ sn ~\")" }
```

Validation in `llm.js`: style must be a key in `STYLE_LIBRARY`, intensity must be 0.1–1.0, target must be bass/drums/melody/all. Returns `null` on any violation.

**`src/library/styles.js`** — Musical source of truth. Two exports:
- `STYLE_LIBRARY` — map of style name → target → `[{type, amount}]` operation arrays. Every style must have a `global` key as fallback target.
- `expandStyle(style, target, intensity)` — looks up style (fallback: `minimal`) → target (fallback: `global`) → scales amounts by intensity. Returns `[{type, amount}]`.

To add a new style: add a key to `STYLE_LIBRARY` with at least a `global` target. Only use types from `ALLOWED_OPERATIONS`.

**`src/operations.js`** — Operation vocabulary. Two exports:
- `ALLOWED_OPERATIONS` — array of 9 allowed operation type strings
- `OPERATION_HANDLERS` — map of `type → (code, amount) => string`. Each handler deterministically modifies a Strudel code string.

**`src/patchEngine.js`** — Applies operations to code. Two exports:
- `applyTransformation(code, plan)` — reduces `plan.operations` over `code` using `OPERATION_HANDLERS`. Skips unknown ops. Returns original code if operations is empty or non-array.
- `generateSeed(plan)` — uses `plan.seedCode` (or a hardcoded default) and applies operations to it.

**`src/validate.js`** — Guards before `play()`. One export:
- `validateCode(code)` → `{ valid: bool, errors: string[] }`. Checks: non-empty, no markdown fences, balanced parentheses, only allowed Strudel method names (against `ALLOWED_STRUDEL_FUNCTIONS` set).

**`src/strudel.js`** — Thin wrapper around `@strudel/web`. Exports `init()`, `play(code)`, `stop()`. `play()` calls `evaluate(code, true)` which hot-patches the running audio without stopping transport.

**`src/ui.js`** — DOM helpers only. `addPreviewMessage(code, onApply, onDismiss)` renders the Apply/Dismiss card; callbacks are wired in `app.js`.

## LLM Contract

- `generateTransformationPlan` returns `null` on all failures — caller must handle null (shows error, returns early)
- `autoFixCode` throws on HTTP error — caller catches and reverts
- Both strip markdown fences from LLM output
- Model hardcoded to `llama3:latest`; endpoint hardcoded to `http://localhost:11434/api/chat`
- If `plan.mode === 'generate'` but `currentCode` is non-empty, `app.js` rejects it and shows an error
- LLM does NOT output operations — `expandStyle()` owns all musical logic

## Tests

Four test files, 40 tests total, all using `global.fetch` mocks via `vi.fn()`:
- `tests/llm.test.js` — `generateTransformationPlan` (10 cases) and `autoFixCode` (3 cases)
- `tests/validate.test.js` — `validateCode` (8 cases)
- `tests/patchEngine.test.js` — `applyTransformation` and `generateSeed` (13 cases)
- `tests/library.test.js` — `expandStyle` (6 cases)

Strudel and UI are not tested. No integration tests.
