# Gemini LLM Swap — Design

**Date:** 2026-06-14
**Status:** Implemented, then REVERTED to local Ollama.
**Restore point before this work:** commit `0d84d93`

## Outcome (post-implementation)

The Gemini swap was built and worked well on quality, but the free tier proved unusable:
the account's real quota was **20 requests/day per model** (not the 250/1500 the public
cheatsheets claimed — confirmed on the AI Studio dashboard). For a toy where every prompt
and chip-tap is one call, that's dead on arrival.

**Decision:** revert to **local Ollama** (free, unlimited, offline) but with a capable
**7-8B** model (`qwen2.5:7b`) instead of the original 3B — the 3B's flailing was a capacity
problem a 7-8B largely fixes. All provider-agnostic improvements were kept: producer-role
system prompts, few-shot examples, A `parseDirectCommand`, B zero-drop merge guards, and
the structured-output schemas (now using Ollama's fuller JSON-Schema `format`).

The Gemini-specific design below is retained as a record of the investigation.

## Goal

Replace the local `llama3.2:3b` (via Ollama) with Google Gemini as the only LLM.
The 3B model flails on intent mapping (over-selects effects, hallucinates, contradicts
itself). A capable model fixes free-text quality at the root, where deterministic
guards (A/B) only cover explicit commands.

## Constraints

- **Personal/local only.** API key in the browser is acceptable — no backend proxy.
- Client-side Vite SPA. Key via `import.meta.env.VITE_GEMINI_API_KEY` (local `.env`,
  bundled into the build). Never deploy publicly with this setup.

## Scope

`src/llm.js` internals **only**. Public exports keep identical signatures and return
contracts, so `app.js`, the A/B layer, and the compiler are untouched:

- `generateTransformationPlan(pillarName, userPrompt, currentTracksState)` → plan or `null`
- `generateTransformPatch(pillarName, userPrompt, pillar)` → patch object or `null`
- `autoFixCode(brokenCode, errorMsg)` → string; throws on HTTP error

## Design

### 1. Endpoint + auth
- `POST https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
- Key in `x-goog-api-key` header, from `VITE_GEMINI_API_KEY`.
- `MODEL` default `gemini-3-flash` (free tier: ~10 RPM / 1500 RPD — ample for
  click-driven use). Overridable via `VITE_GEMINI_MODEL`.
- If the key is missing: return `null` (plan/patch) / throw (autoFix), with a clear
  console error pointing at `.env`.

### 2. Request shape
- System prompt → `system_instruction.parts[].text`.
- User prompt → `contents[].parts[].text`.
- `generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema }`.
- Parse from `data.candidates[0].content.parts[0].text` → strip markdown fences
  (keep existing cleaner) → `JSON.parse`.

### 3. Schema port (the one gotcha)
Gemini `responseSchema` is an OpenAPI subset, not full JSON Schema:
- Nullable fields use `nullable: true` (not `type: ['number','null']`).
- `minimum`/`maximum` and `additionalProperties: false` are **not reliably enforced**.

**Mitigation — lose nothing:** schema still locks key set (enum of catalog/transform
ids), enum values (vowel), and types. Numeric ranges and unknown-key rejection remain
enforced at runtime by the existing guards:
- `validate.js` `validatePlan` (speed/slowdown ranges, selectedId in catalog)
- `mergeLlmTransformPatch` (drops keys not in `PILLAR_TRANSFORMS`; B drops/clamps zeros)
- `parseDirectCommand` clamps direct commands to range

### 4. Removed / kept
**Removed:** Ollama URL `http://localhost:11434/api/chat`, `llama3.2:3b`,
`model:'llama3:latest'`, Ollama-specific `format`/`options` blocks.
**Kept untouched:** `parseDirectCommand` (A — runs before any Gemini call: instant,
offline, deterministic for explicit commands), `mergeLlmTransformPatch` guards (B),
intent-first transform descriptions.

### 5. Tests
`tests/llm.test.js` mocks `fetch`. Update:
- Mock response shape: Ollama `message.content` → Gemini `candidates[].content.parts[].text`.
- Assert request targets the Gemini URL and includes `responseSchema` + `temperature:0`.
- Logic/contract assertions (null on failure, range validation, fence stripping,
  tempo-mod gating) unchanged.

### 6. Supporting files
- `.env.example` with `VITE_GEMINI_API_KEY=` and `VITE_GEMINI_MODEL=gemini-3-flash`.
- Update `CLAUDE.md` LLM Contract section (model/endpoint no longer hardcoded to Ollama).

## Out of scope (follow-ups)
- **Deterministic chips.** With a capable model, chips firing text prompts now works
  acceptably. Converting chips to direct-applied patches (reuse A infra) is a clean
  later improvement, not required for this fix.
- Few-shot examples — capable model likely doesn't need them; add only if quality gaps remain.
- Backend proxy / public deployment.

## Risks
- Free-tier rate limits (10 RPM) — fine for manual clicking, could bite rapid testing.
- Network/key dependency: no offline LLM after this. A (direct-parse) still works offline
  for explicit commands.
- `responseSchema` quirks could reject otherwise-valid output if over-constrained — keep
  the schema permissive (nullable everywhere) and lean on runtime validation.
