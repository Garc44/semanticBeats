# Synthesis Refactor Design

**Date:** 2026-05-19  
**Scope:** `soundLibrary.js`, `operations.js`, `styles.js`, `strudel.js`, `app.js`, `pillars.js`  
**Goal:** Complete the shift to a 100% self-contained, deterministic, sample-free synthesis paradigm; expand the operation vocabulary for synthesis-native mutations; hot-patch tempo without string rebuild; expand intensity to control spatial depth.

---

## 1. soundLibrary.js — Pure Synthesis Drum Replacements

### SYNTH_DRUMS lookup table

Export a canonical map from sample name → Strudel synthesis chain:

```js
export const SYNTH_DRUMS = {
  "909:0":      `note("c1").s("sine").penv("4 0").decay(0.12).sustain(0)`,
  "bd:0":       `note("b0").s("sine").penv("3 0").decay(0.09).sustain(0)`,
  "snare:0":    `s("white").decay(0.08).sustain(0).lpf(3000)`,
  "hh:0":       `s("white").decay(0.03).sustain(0).hpf(5000)`,
  "hh:1":       `s("white").decay(0.18).sustain(0).hpf(4000)`,
  "hh:2":       `s("white").decay(0.05).sustain(0).hpf(5500)`,
  "industrial": `note("c1").s("square").decay(0.08).sustain(0).distort(0.7)`,
};
```

### Genre preset rewrites

All `foundation` and `percussion` fields across the 10 genres are rewritten using these chains. Rhythm structure is preserved; only the synthesis source changes.

Multi-voice comma patterns (e.g. `s("909:0 ~ ~, ~ snare:0 ~")`) become inline `stack()` calls — syntactically mandatory for mixed synth chains:

```js
// before
foundation: `s("909:0 ~ 909:0 ~, ~ ~ 909:5 ~").gain(0.82)`

// after
foundation: `stack(
  note("c1 ~ c1 ~").s("sine").penv("4 0").decay(0.12).sustain(0),
  s("white").decay(0.08).sustain(0).lpf(3000).mask("<0 1 0 1>")
).gain(0.82)`
```

`SYNTH_DRUMS` is exported for future use by `operations.js` (e.g. a `change_drum_voice` op).

---

## 2. operations.js — New Synthesis-Native Handlers

### New ALLOWED_OPERATIONS entries

```
'change_waveform'
'adjust_decay'
'adjust_lpq'
```

### New OPERATION_HANDLERS entries

```js
change_waveform: (code, amt) => {
  const waves = ['sine', 'triangle', 'sawtooth', 'square'];
  const index = Math.min(waves.length - 1, Math.floor(amt * 4));
  const target = waves[index];
  // g flag: catches all oscillators inside inline stack() pillars
  return code.replace(/\.s\("(sine|triangle|sawtooth|square)"\)/g, `.s("${target}")`);
},

adjust_decay: (code, amt) =>
  adjustMethod(code, 'decay', amt, { min: 0.01, max: 4.0, defaultVal: 0.1 }),

adjust_lpq: (code, amt) =>
  adjustMethod(code, 'lpq', amt * 10, { min: 0, max: 40, defaultVal: 0 }),
```

### Invariants

- `change_waveform` only matches oscillator waveform names — safe against `s("white")`, `s("bd:0")`, and any non-synth strings.
- `adjust_decay` / `adjust_lpq` use existing `adjustMethod` + `clamp` helpers — no new logic.

### styles.js updates

New operations added to relevant style entries:

| Style | Target | New ops |
|---|---|---|
| `acid` | `bass` | `change_waveform` (→ square, amt=1.0), `adjust_lpq` |
| `acid` | `melody` | `adjust_lpq` |
| `ambient` | `global` | `adjust_decay` (up) |
| `dub` | `bass` | `adjust_decay` (up) |
| `breakcore` | `drums` | `change_waveform` (→ square, amt=1.0) |

---

## 3. strudel.js + app.js + pillars.js — Hot-Patch & Intensity Expansion

### strudel.js

Re-export `setcpm` from the Strudel engine package:

```js
export { setcpm } from '@strudel/web';
```

### app.js — tempo bypass

Import `setcpm`. In the `renderGlobalControls` callback, intercept `tempo` before it triggers a full rebuild:

```js
import { init, play, stop, setcpm } from './src/strudel.js';

renderGlobalControls(globalState, (key, value) => {
  globalState[key] = value;
  if (key === 'tempo') { setcpm(value); return; }
  debouncedRebuild();
});
```

Raw BPM/CPM values go directly to `setcpm()` — never fed to `setcps()` (which requires ÷60).

### pillars.js — intensity expansion

`rebuildStack` master chain:

```js
// before
`.cps(${tempo}).gain(${masterVolume}).lpf(${filterHz}).shape(${intensity})`

// after
`.cps(${tempo}).gain(${masterVolume}).lpf(${filterHz}).shape(${intensity}).room(${Math.round(intensity * 0.4 * 100) / 100})`
```

Room reverb scales with intensity: 0.0 intensity → 0.0 room, 1.0 intensity → 0.4 room. Keeps reverb tasteful at max intensity.

---

## Data Flow (unchanged)

```
handlePillarSend → generateTransformationPlan → expandStyle → applyTransformation → validateCode → addPillarPreviewMessage
```

On apply: `pillar.code` updated → `rebuildStack` → `play(stack)` (hot-patches via `evaluate(code, true)`).  
Tempo slider: `setcpm(value)` directly — bypasses `rebuildStack` entirely.

---

## Files Changed

| File | Change |
|---|---|
| `src/library/soundLibrary.js` | Export `SYNTH_DRUMS`; rewrite all `foundation`/`percussion` strings |
| `src/operations.js` | Add 3 new handlers + 3 new `ALLOWED_OPERATIONS` entries |
| `src/library/styles.js` | Add new op entries to `acid`, `ambient`, `dub`, `breakcore` |
| `src/strudel.js` | Re-export `setcpm` |
| `app.js` | Import + use `setcpm`; intercept `tempo` key in slider callback |
| `pillars.js` | Append `.room(...)` to master chain in `rebuildStack` |

## Files NOT Changed

`validate.js`, `llm.js`, `ui.js`, `patchEngine.js` — no changes required.

---

## Testing

Existing 40 tests unaffected (no logic changes to `patchEngine`, `validate`, `llm`, `expandStyle`).  
New unit tests needed in `tests/operations.test.js`:
- `change_waveform` with each of the 4 zone values
- `change_waveform` on a `stack()` string with multiple oscillators (verifies `g` flag)
- `adjust_decay` append when absent, adjust when present
- `adjust_lpq` append when absent, adjust when present
