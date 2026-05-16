# Compose Mode Design

**Date:** 2026-05-16  
**Status:** Approved

## Problem

"Add a melody" applies effects to existing drum code instead of adding a new synth voice. The pipeline only transforms existing code — no mechanism exists to stack new voices.

## Solution

New `compose` LLM mode. LLM detects additive intent and outputs structured data describing a new voice. System builds Strudel code from it and stacks it onto existing code using `stack()`.

## LLM Contract

Trigger: user intent is additive ("add", "layer", "give me a", "put a") and `currentCode` is non-empty.

Output schema:
```json
{ "mode": "compose", "voiceType": "melody|bass|chords|percussion", "notes": "c4 e4 g4 ~", "style": "acid|groove|minimal|dub|breakcore" }
```

Validation rules in `llm.js`:
- `voiceType` must be one of: `melody`, `bass`, `chords`, `percussion`
- `notes` must be a non-empty string
- `style` must be a key in `STYLE_LIBRARY`
- compose mode with empty `currentCode` → return `null` (can't stack onto nothing)

## Voice Code Building

New function `buildVoiceCode(voiceType, notes, style, intensity)` in `patchEngine.js`.

**Default sounds per voiceType:**
| voiceType   | sound        | base pattern |
|-------------|--------------|--------------|
| melody      | `"sine"`     | `note("...").sound("sine").gain(0.5)` |
| bass        | `"sawtooth"` | `note("...").sound("sawtooth").gain(0.5)` |
| chords      | `"square"`   | `note("...").sound("square").gain(0.5)` |
| percussion  | `"bd"`       | `s("...").gain(0.7)` |

After building base code, `expandStyle(style, voiceType, intensity)` runs on it — same operation handlers as the transform pipeline. This ensures the new voice is stylistically coherent with the rest of the track.

## Stacking

New function `stackCode(existingCode, newVoiceCode)` in `patchEngine.js`:
- If `existingCode` already contains `stack(` → insert new voice as first argument
- Otherwise → wrap both in `stack(\n  newVoice,\n  existingCode\n)`

## App.js Flow

```
compose mode detected
  → buildVoiceCode(voiceType, notes, style, intensity)
  → stackCode(currentCode, voiceCode)
  → validateCode(result)
  → addPreviewMessage()
  → on apply: play() → fail → autoFixCode() → fail → revert
```

Error handling is identical to the existing transform path.

## Tests

**`tests/patchEngine.test.js` additions:**
- `buildVoiceCode` produces correct base code for each voiceType
- `buildVoiceCode` applies `expandStyle` effects correctly
- `stackCode` wraps plain code in `stack()`
- `stackCode` inserts into existing `stack()`

**`tests/llm.test.js` additions:**
- compose mode parses and validates correctly
- compose mode rejects invalid `voiceType`
- compose mode rejects when `currentCode` is empty

## Files Changed

| File | Change |
|------|--------|
| `src/llm.js` | Add compose mode to system prompt + validation |
| `src/patchEngine.js` | Add `buildVoiceCode`, `stackCode` exports |
| `src/app.js` | Handle compose mode in `handleSend` flow |
| `tests/patchEngine.test.js` | New tests for buildVoiceCode + stackCode |
| `tests/llm.test.js` | New tests for compose mode validation |
