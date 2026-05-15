# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start Vite dev server (http://localhost:5173)
npm test          # run all tests once
npm run test:watch  # run tests in watch mode
npm run build     # production build to dist/
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

Single-page Vite app. No framework. Four ES modules wired together in `app.js`:

**`src/llm.js`** — All Ollama interaction. Three exports:
- `classifyIntent(currentCode, prompt)` — Call 1 of the pipeline. Returns structured JSON `{interpretation, strudelFunctions, preserve}` or `null` on any failure (never throws).
- `generateCode(history, currentCode, prompt, classification?)` — Call 2. Builds a classification-aware prompt when classification is provided; falls back to plain prompt when null. Throws on HTTP error.
- `autoFixCode(brokenCode, errorMsg)` — Fired only when Strudel throws on apply. One-shot fix attempt. Throws on failure.

**`src/strudel.js`** — Thin wrapper around `@strudel/web`. Exports `init()`, `play(code)`, `stop()`. `play()` calls `evaluate(code, true)` which hot-patches the running audio without stopping transport.

**`src/ui.js`** — DOM helpers only. `addPreviewMessage(code, onApply, onDismiss)` renders the Apply/Dismiss card; `onApply` and `onDismiss` are async callbacks wired in `app.js`.

**`app.js`** — State (`currentCode`, `conversationHistory`, `isPlaying`) and event wiring. The `handleSend` flow: `classifyIntent` → `generateCode` → `addPreviewMessage`. The `onApply` callback runs `play()`, updates state, and pushes to `conversationHistory`. If `play()` throws, `autoFixCode` fires for one retry before reverting.

## LLM Contract

- `classifyIntent` returns `null` on all failures — callers must handle null gracefully
- `generateCode` and `autoFixCode` throw on HTTP error — callers catch and show error UI
- All three strip markdown fences from LLM output before returning
- Model is hardcoded to `llama3:latest`; endpoint hardcoded to `http://localhost:11434/api/chat`

## Tests

`tests/llm.test.js` — unit tests for all three LLM functions using `global.fetch` mocks via `vi.fn()`. 13 tests. No integration tests (Strudel and UI are not tested).
