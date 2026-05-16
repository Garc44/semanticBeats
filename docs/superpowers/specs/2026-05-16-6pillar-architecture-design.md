# 6-Pillar Modular Architecture Design

**Date:** 2026-05-16  
**Status:** Approved  

## Overview

Refactor the single-input Strudel live-coding interface into a 6-pillar modular architecture. Each pillar (`foundation`, `bassline`, `percussion`, `melody`, `atmosphere`, `fx`) runs its own isolated LLM context and code sandbox. All pillars combine into a single `stack()` inside one unified Strudel engine instance. Global sliders modulate the final combined audio chain.

---

## Section 1: State & Data Model

Two top-level state objects in `app.js`:

```js
const PILLAR_NAMES = ['foundation', 'bassline', 'percussion', 'melody', 'atmosphere', 'fx'];

const pillars = PILLAR_NAMES.map(name => ({
  name,
  code: '',        // current Strudel code for this pillar
  muted: false,
  history: [],     // [{role, content}] isolated per pillar
}));

const globalState = {
  tempo: 1.0,        // cps multiplier
  masterVolume: 0.8, // gain 0–1
  masterFilter: 1.0, // normalized 0–1 → lpf cutoff Hz (200–18200); at 1.0 = fully open (18200 Hz ≈ bypass)
  intensity: 0.5,    // shape 0–1, also passed to LLM as intensityHint
  isPlaying: false,
  soloedPillar: null, // pillar name string or null
};
```

`rebuildStack()` is a pure function with no side effects:

```js
function rebuildStack() {
  const active = pillars.filter(p => {
    if (globalState.soloedPillar) return p.name === globalState.soloedPillar;
    return !p.muted && p.code.trim();
  });
  if (!active.length) return null;
  const inner = active.length === 1
    ? active[0].code
    : `stack(\n${active.map(p => p.code).join(',\n')}\n)`;
  const filterHz = Math.round(globalState.masterFilter * 18000 + 200); // 200–18200 Hz; 18200 ≈ bypass
  return `${inner}.cps(${globalState.tempo}).gain(${globalState.masterVolume}).lpf(${filterHz}).shape(${globalState.intensity})`;
}
```

---

## Section 2: LLM Integration per Pillar

### Signature change

```js
// llm.js
generateTransformationPlan(currentCode, prompt, history, intensityHint)
```

- `history` — pillar's own `[{role, content}]` array, isolated per pillar. Passed as the middle messages in the Ollama call: `[systemMsg, ...history, currentUserMsg]`. Enables multi-turn context within each pillar.
- `intensityHint` — `globalState.intensity`; LLM instructed to use this value for intensity in its response

### System prompt injection

Each pillar's LLM call receives its name as context:

```
You are editing the {pillarName} layer of a Strudel live-coding track.
```

This guides the LLM toward musically appropriate seed code for each layer type.

### Mode rules

- Empty pillar → `generate` mode only
- Non-empty pillar → `transform` mode only

### Removed concepts

`compose` mode is removed entirely. Layering now happens at the pillar level — each pillar IS a layer. `VOICE_TYPES`, `buildVoiceCode`, and `stackCode` in `patchEngine.js` become dead code and are deleted.

---

## Section 3: UI Layout

Replace the current 2-panel layout (chat + code) with:

```
┌─────────────────────────────────────────────────────────────┐
│  header: logo | status | ▶ Play / ■ Stop                    │
├─────────────────────────────────────────────────────────────┤
│  GLOBAL SLIDERS ROW                                         │
│  [tempo] [masterVolume] [masterFilter] [intensity]          │
├──────────┬──────────┬───────────┬─────────┬─────────┬───────┤
│FOUNDATION│ BASSLINE │PERCUSSION │ MELODY  │ATMOSPH. │  FX   │
│          │          │           │         │         │       │
│ [code]   │ [code]   │ [code]    │ [code]  │ [code]  │[code] │
│          │          │           │         │         │       │
│ [chat]   │ [chat]   │ [chat]    │ [chat]  │ [chat]  │[chat] │
│ [input]  │ [input]  │ [input]   │ [input] │ [input] │[inp]  │
│ [M] [S]  │ [M] [S]  │ [M] [S]  │ [M] [S] │ [M][S]  │[M][S] │
└──────────┴──────────┴───────────┴─────────┴─────────┴───────┘
```

### Rules

- 6 pillar cards in a horizontal scrollable row
- Each card contains: editable code display (`contenteditable`) + chat history + text input + Mute [M] and Solo [S] buttons
- Global sliders row sits between header and pillars — always visible
- Slider labels show current value live (e.g. `tempo: 1.2`)
- Solo: highlights one pillar, grays out others visually
- Muted pillar card is dimmed with strikethrough on code

### `ui.js` new exports

- `renderPillar(pillar)` — creates and returns a pillar card DOM element
- `updatePillarCode(name, code)` — updates code display for named pillar
- `updatePillarChat(name, msgs)` — appends message to pillar chat history
- `renderGlobalControls(globalState, onChange)` — renders slider panel, calls `onChange(key, value)` on input

---

## Section 4: Data Flow & Error Handling

### Slider change

```
slider input → update globalState → rebuildStack() → if playing: play(stack)
```

Sliders debounced 50ms to avoid hammering Strudel on drag.

### Pillar prompt

```
pillar input → handlePillarSend(name, prompt)
  → generateTransformationPlan(pillar.code, prompt, pillar.history, globalState.intensity)
  → generate mode:  generateSeed(plan)         → validateCode → addPreviewMessage(pillar)
  → transform mode: applyTransformation + expandStyle → validateCode → addPreviewMessage(pillar)
  → on apply: pillar.code = newCode → rebuildStack() → if playing: play(stack)
```

### Mute / Solo

```
toggle mute/solo → update pillars[] / globalState.soloedPillar → rebuildStack() → if playing: play(stack)
```

### Error handling

| Scenario | Behaviour |
|---|---|
| `generateTransformationPlan` returns `null` | Show error in that pillar's chat; no crash |
| `play()` throws | `autoFixCode()` one retry → revert pillar code on second failure |
| `rebuildStack()` returns `null` (all muted/empty) | `stop()` engine; show "Nothing active" in status |
| Manual pillar code edit (blur) | `validateCode` → if playing: `play(rebuildStack())` |

---

## File Changes Summary

| File | Change |
|---|---|
| `app.js` | Full rewrite: pillar state array, globalState, rebuildStack(), handlePillarSend(), slider handlers |
| `src/llm.js` | Add `history` + `intensityHint` params; add pillarName to system prompt; remove compose mode |
| `src/patchEngine.js` | Delete `buildVoiceCode`, `stackCode` |
| `src/ui.js` | Replace single-chat exports with pillar card + global controls exports |
| `index.html` | Replace 2-panel layout with pillar grid + slider row |
| `style.css` | New layout styles for pillar cards, slider row, mute/solo states |
| `tests/pillars.test.js` | New: `rebuildStack()` unit tests (mute, solo, empty combinations) |

### Unchanged

- `src/operations.js` — no changes
- `src/library/styles.js` — no changes
- `src/validate.js` — no changes
- `src/strudel.js` — no changes
- `tests/llm.test.js`, `tests/validate.test.js`, `tests/patchEngine.test.js`, `tests/library.test.js` — update for removed compose mode; rest unchanged
