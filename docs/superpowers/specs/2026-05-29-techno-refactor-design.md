# Techno Refactor: Harmonic Locking + Sidechaining

**Date:** 2026-05-29  
**Status:** Approved

## Overview

Remove all non-techno styles. Add two architectural operations (`lock_to_scale`, `apply_sidechain`) that enforce harmonic and spatial cohesion. Extend the plan shape to carry root/scale/tempo in generate mode. Store harmonicState in `app.js` and pass it explicitly to `applyTransformation`.

## Section 1: Plan Shape & LLM Changes

### New generate mode plan
```js
{
  mode: "generate",
  style: "techno",
  root: "G",          // A–G
  scale: "aeolian",   // phrygian | aeolian | dorian | minorPentatonic
  tempo: 128,         // 100–160
  seedCode: "s(\"bd ~ bd ~\")"
}
```

### Transform mode plan (unchanged)
```js
{ mode: "transform", style: "techno", target: "bass|drums|melody|all", intensity: 0.7 }
```

### LLM system prompt constraints (techno)
- Style fixed to `"techno"`
- Allowed scales: `phrygian`, `aeolian`, `dorian`, `minorPentatonic`
- Root: single letter A–G
- Tempo: integer 100–160

### `llm.js` validation rules (all return `null` on violation)
1. `style` must be `"techno"`
2. Transform: `target` must be one of `["bass", "drums", "melody", "all"]`
3. Generate: `root` must match `/^[A-G]$/`
4. Generate: `scale` must be in allowed list
5. Generate: `tempo` must be integer 100–160
6. Generate: `seedCode` must contain at least one `(` and `)` — early reject on malformed LLM output

## Section 2: New Operations

### `lock_to_scale`
- Strips any existing `.scale(...)` or `.quantise(...)` via regex before appending
- Appends: `.quantise(scale("${context.root}:${context.scale}"))`
- If `harmonicState` is `null` or `root` is `null`: no-op, return code unchanged
- Idempotent: safe to call repeatedly on same string

### `apply_sidechain`
- Strips any existing `.gain(...)` via regex before appending
- `duckedVolume = round2(1 - amount * 0.95)`
- Appends: `.gain("${duckedVolume} 1 1 1")`
- Idempotent: safe to call repeatedly on same string

### Handler signature extension
All handlers gain optional third arg: `(code, amount, context = null)`.  
Existing handlers ignore `context`. Only `lock_to_scale` reads it.

### `patchEngine.js` signature
```js
export function applyTransformation(code, plan, harmonicState = null)
```
Passes `harmonicState` as `context` to every handler call.

## Section 3: `styles.js` — Techno Only

`STYLE_LIBRARY` reduced to single key. `DEFAULT_STYLE` changes to `'techno'`.

```js
export const STYLE_LIBRARY = {
  techno: {
    global: [
      { type: 'lock_to_scale',      amount: 1.0 },
      { type: 'increase_resonance', amount: 0.4 },
      { type: 'decrease_cutoff',    amount: 0.3 },
    ],
    drums: [
      { type: 'increase_density', amount: 0.4 },
      { type: 'add_distortion',   amount: 0.3 },
    ],
    bass: [
      { type: 'apply_sidechain',    amount: 0.8 },
      { type: 'lock_to_scale',      amount: 1.0 },
      { type: 'increase_resonance', amount: 0.5 },
      { type: 'adjust_lpq',         amount: 0.4 },
    ],
    melody: [
      { type: 'lock_to_scale',          amount: 1.0 },
      { type: 'increase_filter_motion', amount: 0.5 },
    ],
  },
};
```

Each layer processed independently — `lock_to_scale` must appear in each target that needs it.

## Section 4: `app.js` Changes

```js
let harmonicState = { root: null, scale: null };
```

On generate mode success:
```js
harmonicState = { root: plan.root, scale: plan.scale };
setcpm(plan.tempo / 4);  // 128 BPM → setcpm(32), one cycle = 4 beats
```

Pass to both modes:
```js
applyTransformation(code, plan, harmonicState)
```

If user runs transform before any generate, `harmonicState.root` is `null` → `lock_to_scale` silently skips. No crash.

## Section 5: Tests

### `tests/llm.test.js` — new validation cases
- `style: "groove"` → null
- transform `target: "synthesizer"` → null
- generate missing `root` → null
- generate `scale: "major"` (not in allowed list) → null
- generate `tempo: 200` (out of range) → null
- generate `seedCode: "bd ~ sn ~"` (no parens) → null

### `tests/patchEngine.test.js` — new op cases
- `apply_sidechain` amount 0.8 → gain pattern `"0.24 1 1 1"` appended
- `apply_sidechain` called twice → only one `.gain(...)` in output (idempotency)
- `lock_to_scale` with `{ root: "G", scale: "aeolian" }` → `.quantise(scale("G:aeolian"))` appended
- `lock_to_scale` called twice → only one `.quantise(...)` in output (idempotency)
- `lock_to_scale` with `harmonicState = null` → code unchanged

### `tests/library.test.js`
- Remove all non-techno style tests
- Add techno target coverage: global, drums, bass, melody each return non-empty op arrays
- Add fallback test: unknown style passed to `expandStyle` returns techno global ops (not empty, no crash)

### `tests/validate.test.js`
No changes.
