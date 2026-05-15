# LLM Classify → Generate Pipeline

**Date:** 2026-05-15
**Status:** Approved

## Problem

Two pain points with current single-call LLM approach:
- **A:** LLM writes bad/invalid Strudel code (wrong API usage, syntax errors)
- **C:** LLM misunderstands vague musical intent ("make it darker", "more energy")

## Solution

Two-step pipeline: classify intent first, then generate code with a precise spec instead of raw user text.

## Architecture

### New functions in `src/llm.js`

**`classifyIntent(currentCode, userPrompt) → Classification | null`**

Call 1. Small system prompt: music intent classifier, return JSON only.

Input to LLM:
```
Current code: <code>
User request: <prompt>
```

Expected JSON output:
```json
{
  "interpretation": "reduce high frequencies, add reverb to full mix",
  "strudelFunctions": ["lpf", "room"],
  "preserve": ["rhythm", "bass notes"]
}
```

Returns `null` if JSON parse fails (triggers fallback).

**`generateCode(history, currentCode, userPrompt, classification?) → string`**

Call 2. Uses existing Strudel system prompt.

If classification provided, user message becomes:
```
Current code:
<code>

Do exactly: <interpretation>
Use: <strudelFunctions joined>
Preserve: <preserve joined>
Request: <original userPrompt>
```

If classification is null (fallback), user message is current format:
```
Current code:
<code>

Request: <userPrompt>
```

Strips markdown fences on output (already exists).

### Changes in `app.js`

**Call sequence:**
```
setStatus('Interpreting...')
classification = await classifyIntent(currentCode, prompt)
setStatus('Thinking...')
newCode = await generateCode(history, currentCode, prompt, classification)
```

**Auto-retry on Strudel error (new):**

In the `onApply` callback, if `play(newCode)` throws:
```
fixedCode = await autoFixCode(newCode, error.message)
await play(fixedCode)
// apply fixedCode instead
```

One retry only. If fix attempt also throws, show error and revert (existing behavior).

**`autoFixCode(code, errorMessage) → string`** in `src/llm.js`

Single call with minimal prompt:
```
system: "Fix the Strudel JS syntax error. Return only corrected code. No markdown."
user: "Code:\n<code>\n\nError: <errorMessage>"
```

No history, no classification. Just error + code → fixed code.

## Files Changed

| File | Change |
|------|--------|
| `src/llm.js` | Add `classifyIntent()`, `autoFixCode()`. Update `generateCode()` signature to accept optional `classification`. |
| `app.js` | Update `handleSend()` call sequence. Add retry logic in `onApply`. |

## Fallback Behavior

| Failure | Behavior |
|---------|----------|
| `classifyIntent` returns invalid JSON | `classification = null`, proceed with original prompt |
| `classifyIntent` fetch fails | Same as above |
| `generateCode` returns bad Strudel | Strudel throws on `play()` → trigger `autoFixCode` |
| `autoFixCode` also fails | Show error, revert to previous code |

## Out of Scope

- Slot-based architecture (drums/bass/lead layers)
- Conversation history changes
- UI changes beyond status label updates
