# Synthesis Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all remaining sample dependencies with pure Strudel synthesis, add three synthesis-native operation handlers, hot-patch tempo via `setcpm`, and expand intensity to drive master reverb.

**Architecture:** Six targeted file edits with no changes to the overall pipeline. New operations follow the existing `adjustMethod` pattern. Genre presets are static string rewrites — rhythm structure preserved, only synthesis source changes. `setcpm` bypasses string rebuild entirely for the tempo slider.

**Tech Stack:** Strudel (`@strudel/web`), Vitest (tests), vanilla JS ES modules

**Spec:** `docs/superpowers/specs/2026-05-19-synthesis-refactor-design.md`

---

## File Map

| File | What changes |
|---|---|
| `src/operations.js` | Add `change_waveform`, `adjust_decay`, `adjust_lpq` to handlers + ALLOWED_OPERATIONS |
| `src/library/styles.js` | Add new ops to `acid`, `ambient`, `dub`, `breakcore` entries |
| `src/library/soundLibrary.js` | Export `SYNTH_DRUMS`; rewrite all `foundation`/`percussion`/`fx` strings |
| `src/strudel.js` | Re-export `setcpm`; remove `samples()` prebake |
| `app.js` | Import `setcpm`; intercept `tempo` key in slider callback |
| `src/pillars.js` | Append `.room(...)` to master chain |
| `tests/operations.test.js` | New test file for the three new handlers |

---

## Task 1: Write failing tests for new operation handlers

**Files:**
- Create: `tests/operations.test.js`

- [ ] **Step 1: Create the test file**

```js
import { describe, it, expect } from 'vitest';
import { OPERATION_HANDLERS, ALLOWED_OPERATIONS } from '../src/operations.js';

describe('ALLOWED_OPERATIONS includes new ops', () => {
  it('includes change_waveform', () => {
    expect(ALLOWED_OPERATIONS).toContain('change_waveform');
  });
  it('includes adjust_decay', () => {
    expect(ALLOWED_OPERATIONS).toContain('adjust_decay');
  });
  it('includes adjust_lpq', () => {
    expect(ALLOWED_OPERATIONS).toContain('adjust_lpq');
  });
});

describe('change_waveform', () => {
  it('keeps sine at amt=0.0', () => {
    const code = `note("c1").s("sine").decay(0.1)`;
    expect(OPERATION_HANDLERS.change_waveform(code, 0.0)).toBe(`note("c1").s("sine").decay(0.1)`);
  });
  it('replaces sine with triangle at amt=0.3', () => {
    const code = `note("c1").s("sine").decay(0.1)`;
    expect(OPERATION_HANDLERS.change_waveform(code, 0.3)).toBe(`note("c1").s("triangle").decay(0.1)`);
  });
  it('replaces sine with sawtooth at amt=0.6', () => {
    const code = `note("c1").s("sine").decay(0.1)`;
    expect(OPERATION_HANDLERS.change_waveform(code, 0.6)).toBe(`note("c1").s("sawtooth").decay(0.1)`);
  });
  it('replaces sine with square at amt=1.0', () => {
    const code = `note("c1").s("sine").decay(0.1)`;
    expect(OPERATION_HANDLERS.change_waveform(code, 1.0)).toBe(`note("c1").s("square").decay(0.1)`);
  });
  it('replaces all oscillators in stack() — g flag', () => {
    const code = `stack(note("c1").s("sine").decay(0.1), note("c2").s("sine").decay(0.2))`;
    expect(OPERATION_HANDLERS.change_waveform(code, 1.0))
      .toBe(`stack(note("c1").s("square").decay(0.1), note("c2").s("square").decay(0.2))`);
  });
  it('does not match s("white")', () => {
    const code = `s("white").decay(0.08).hpf(5000)`;
    expect(OPERATION_HANDLERS.change_waveform(code, 1.0)).toBe(`s("white").decay(0.08).hpf(5000)`);
  });
});

describe('adjust_decay', () => {
  it('increases decay when present', () => {
    const code = `note("c1").s("sine").decay(0.1)`;
    expect(OPERATION_HANDLERS.adjust_decay(code, 0.1)).toBe(`note("c1").s("sine").decay(0.2)`);
  });
  it('appends decay when absent', () => {
    const code = `note("c1").s("sine")`;
    expect(OPERATION_HANDLERS.adjust_decay(code, 0.1)).toBe(`note("c1").s("sine")\n  .decay(0.2)`);
  });
  it('clamps to max 4.0', () => {
    const code = `note("c1").s("sine").decay(3.95)`;
    expect(OPERATION_HANDLERS.adjust_decay(code, 0.1)).toBe(`note("c1").s("sine").decay(4)`);
  });
  it('clamps to min 0.01', () => {
    const code = `note("c1").s("sine").decay(0.02)`;
    expect(OPERATION_HANDLERS.adjust_decay(code, -0.05)).toBe(`note("c1").s("sine").decay(0.01)`);
  });
});

describe('adjust_lpq', () => {
  it('increases lpq when present', () => {
    const code = `note("c1").s("sine").lpq(5)`;
    expect(OPERATION_HANDLERS.adjust_lpq(code, 0.3)).toBe(`note("c1").s("sine").lpq(8)`);
  });
  it('appends lpq when absent', () => {
    const code = `note("c1").s("sine")`;
    expect(OPERATION_HANDLERS.adjust_lpq(code, 0.3)).toBe(`note("c1").s("sine")\n  .lpq(3)`);
  });
  it('clamps to max 40', () => {
    const code = `note("c1").s("sine").lpq(39)`;
    expect(OPERATION_HANDLERS.adjust_lpq(code, 0.5)).toBe(`note("c1").s("sine").lpq(40)`);
  });
});
```

- [ ] **Step 2: Run tests to confirm all fail**

```bash
npx vitest run tests/operations.test.js
```

Expected: all 15 tests fail — `OPERATION_HANDLERS.change_waveform is not a function` (or similar)

---

## Task 2: Implement new handlers in operations.js

**Files:**
- Modify: `src/operations.js`

- [ ] **Step 1: Add three entries to ALLOWED_OPERATIONS**

In `src/operations.js`, replace:
```js
export const ALLOWED_OPERATIONS = [
  'increase_resonance',
  'decrease_cutoff',
  'add_delay',
  'add_distortion',
  'increase_density',
  'simplify_pattern',
  'increase_reverb',
  'reduce_reverb',
  'increase_filter_motion',
];
```
With:
```js
export const ALLOWED_OPERATIONS = [
  'increase_resonance',
  'decrease_cutoff',
  'add_delay',
  'add_distortion',
  'increase_density',
  'simplify_pattern',
  'increase_reverb',
  'reduce_reverb',
  'increase_filter_motion',
  'change_waveform',
  'adjust_decay',
  'adjust_lpq',
];
```

- [ ] **Step 2: Add three entries to OPERATION_HANDLERS**

Append to the `OPERATION_HANDLERS` export object (before the closing `};`):

```js
  change_waveform: (code, amt) => {
    const waves = ['sine', 'triangle', 'sawtooth', 'square'];
    const index = Math.min(waves.length - 1, Math.floor(amt * 4));
    const target = waves[index];
    return code.replace(/\.s\("(sine|triangle|sawtooth|square)"\)/g, `.s("${target}")`);
  },
  adjust_decay: (code, amt) =>
    adjustMethod(code, 'decay', amt, { min: 0.01, max: 4.0, defaultVal: 0.1 }),
  adjust_lpq: (code, amt) =>
    adjustMethod(code, 'lpq', amt * 10, { min: 0, max: 40, defaultVal: 0 }),
```

- [ ] **Step 3: Run tests — all 15 should pass**

```bash
npx vitest run tests/operations.test.js
```

Expected: 15 passed

- [ ] **Step 4: Run full test suite to confirm no regressions**

```bash
npm test
```

Expected: all 40 existing tests + 15 new = 55 passed

- [ ] **Step 5: Commit**

```bash
git add tests/operations.test.js src/operations.js
git commit -m "feat: add change_waveform, adjust_decay, adjust_lpq operations"
```

---

## Task 3: Update styles.js with new operations

**Files:**
- Modify: `src/library/styles.js`

- [ ] **Step 1: Replace the full STYLE_LIBRARY export**

Replace the entire contents of `src/library/styles.js` with:

```js
export const STYLE_LIBRARY = {
  acid: {
    global: [
      { type: 'increase_resonance', amount: 0.8 },
      { type: 'decrease_cutoff', amount: 0.5 },
    ],
    bass: [
      { type: 'increase_resonance', amount: 0.8 },
      { type: 'decrease_cutoff', amount: 0.5 },
      { type: 'add_distortion', amount: 0.4 },
      { type: 'increase_filter_motion', amount: 0.5 },
      { type: 'change_waveform', amount: 1.0 },
      { type: 'adjust_lpq', amount: 0.6 },
    ],
    melody: [
      { type: 'increase_filter_motion', amount: 0.6 },
      { type: 'increase_resonance', amount: 0.5 },
      { type: 'adjust_lpq', amount: 0.4 },
    ],
  },

  groove: {
    global: [
      { type: 'increase_density', amount: 0.3 },
      { type: 'add_delay', amount: 0.2 },
    ],
    drums: [
      { type: 'increase_density', amount: 0.3 },
      { type: 'add_delay', amount: 0.25 },
    ],
    bass: [
      { type: 'add_delay', amount: 0.3 },
      { type: 'increase_reverb', amount: 0.2 },
    ],
  },

  minimal: {
    global: [
      { type: 'simplify_pattern', amount: 1 },
      { type: 'reduce_reverb', amount: 0.4 },
    ],
    all: [
      { type: 'simplify_pattern', amount: 1 },
      { type: 'reduce_reverb', amount: 0.4 },
    ],
  },

  dub: {
    global: [
      { type: 'add_delay', amount: 0.6 },
      { type: 'increase_reverb', amount: 0.5 },
    ],
    bass: [
      { type: 'add_delay', amount: 0.7 },
      { type: 'increase_reverb', amount: 0.6 },
      { type: 'adjust_decay', amount: 0.3 },
    ],
    drums: [
      { type: 'add_delay', amount: 0.5 },
      { type: 'reduce_reverb', amount: 0.2 },
    ],
  },

  breakcore: {
    global: [
      { type: 'increase_density', amount: 0.8 },
      { type: 'add_distortion', amount: 0.5 },
    ],
    drums: [
      { type: 'increase_density', amount: 0.9 },
      { type: 'add_distortion', amount: 0.4 },
      { type: 'change_waveform', amount: 1.0 },
    ],
    all: [
      { type: 'increase_density', amount: 0.8 },
      { type: 'add_distortion', amount: 0.6 },
    ],
  },

  ambient: {
    global: [
      { type: 'simplify_pattern', amount: 1 },
      { type: 'increase_reverb', amount: 0.5 },
      { type: 'adjust_decay', amount: 0.4 },
    ],
    atmosphere: [
      { type: 'adjust_decay', amount: 0.6 },
      { type: 'increase_reverb', amount: 0.4 },
    ],
  },
};

const DEFAULT_STYLE = 'minimal';
const DEFAULT_INTENSITY = 0.5;

export function expandStyle(style, target, intensity = DEFAULT_INTENSITY) {
  const styleEntry = STYLE_LIBRARY[style] ?? STYLE_LIBRARY[DEFAULT_STYLE];
  const ops = styleEntry[target] ?? styleEntry.global ?? [];
  return ops.map(op => ({ type: op.type, amount: op.amount * intensity }));
}
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: 55 passed (library.test.js tests still pass — `expandStyle` signature unchanged)

- [ ] **Step 3: Commit**

```bash
git add src/library/styles.js
git commit -m "feat: add ambient style; expand acid/dub/breakcore with synthesis ops"
```

---

## Task 4: Export SYNTH_DRUMS and rewrite genre presets in soundLibrary.js

**Files:**
- Modify: `src/library/soundLibrary.js`

Drum synthesis reference (keep this mapping in mind for all rewrites below):
- kick (909:0): `note("c1").s("sine").penv("4 0").decay(0.12).sustain(0)`
- kick variant (bd:0): `note("b0").s("sine").penv("3 0").decay(0.09).sustain(0)`
- snare: `s("white").decay(0.08).sustain(0).lpf(3000)`
- closed HH: `s("white").decay(0.03).sustain(0).hpf(5000)`
- open HH (hh:1): `s("white").decay(0.18).sustain(0).hpf(4000)`
- HH variant (hh:2): `s("white").decay(0.05).sustain(0).hpf(5500)`
- industrial: `note("c1").s("square").decay(0.08).sustain(0).distort(0.7)`

Multi-voice comma patterns in the original (e.g. `s("kick ~, ~ snare")`) become inline `stack()` — this is syntactically mandatory since different synth sources can't share a single `s()` call.

- [ ] **Step 1: Replace the entire file**

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

export const GENRE_NAMES = [
  'techno', 'house', 'acid', 'drum_and_bass', 'ambient',
  'breakbeat', 'minimal', 'industrial', 'lo_fi', 'trance',
];

export function getGenre(name) {
  return STYLE_LIBRARY[name] ?? null;
}

export const STYLE_LIBRARY = {
  techno: {
    foundation:   `note("c1*4").s("sine").penv("4 0").decay(0.12).sustain(0).gain(0.82)`,
    bassline:     `note("c1 ~ c1 ~").s("sawtooth").decay(0.08).sustain(0).gain(0.75)`,
    percussion:   `note("c6*8").s("white").decay(0.03).sustain(0).hpf(5000).gain(0.25)`,
    melody:       `note("c3 eb3 g3 bb3").s("triangle").decay(0.3).sustain(0).slow(2).gain(0.3)`,
    atmosphere:   `note("[c2,g2,bb2]").s("sine").slow(4).decay(3).sustain(0).gain(0.2)`,
    fx:           `note("~ ~ ~ c1").s("square").decay(0.08).sustain(0).distort(0.7).gain(0.35)`,
  },

  house: {
    foundation:   `stack(note("c1 ~ c1 ~").s("sine").penv("4 0").decay(0.12).sustain(0), note("~ ~ g2 ~").s("white").decay(0.08).sustain(0).lpf(3000)).gain(0.8)`,
    bassline:     `note("c2 ~ eb2 g2").s("sawtooth").decay(0.15).sustain(0).gain(0.75)`,
    percussion:   `note("c6*8").s("white").decay(0.03).sustain(0).hpf(5000).gain(0.28)`,
    melody:       `note("c4 eb4 g4 bb4").s("triangle").decay(0.25).sustain(0).slow(2).gain(0.25)`,
    atmosphere:   `note("[c3,eb3,g3]").s("sine").slow(2).decay(2).sustain(0).gain(0.2)`,
    fx:           `note("~ ~ g2 ~").s("white").decay(0.06).sustain(0).lpf(4000).gain(0.3)`,
  },

  acid: {
    foundation:   `stack(note("c1 ~ c1 c1").s("sine").penv("4 0").decay(0.12).sustain(0), note("~ g2 ~ ~").s("white").decay(0.08).sustain(0).lpf(3000)).gain(0.82)`,
    bassline:     `note("c2 c2 eb2 c2 bb1 c2 g1 ~").s("sawtooth").decay(0.05).sustain(0).gain(0.8)`,
    percussion:   `note("c6*16").s("white").decay(0.03).sustain(0).hpf(5000).gain(0.22)`,
    melody:       `note("c4 eb4 c4 bb3").s("square").decay(0.1).sustain(0).gain(0.28)`,
    atmosphere:   `note("[c2,g2]").s("sawtooth").slow(4).decay(1).sustain(0).gain(0.18)`,
    fx:           `note("~ ~ ~ c6").s("white").decay(0.12).sustain(0).hpf(4000).gain(0.32)`,
  },

  drum_and_bass: {
    foundation:   `stack(note("b0 ~ ~ b0 ~ b0 ~ ~").s("sine").penv("3 0").decay(0.09).sustain(0), note("~ ~ g2 ~ ~ ~ g2 ~").s("white").decay(0.08).sustain(0).lpf(3000)).fast(2).gain(0.8)`,
    bassline:     `note("c1 ~ ~ eb1 ~ c1 g1 ~").s("sine").decay(0.12).sustain(0).gain(0.82)`,
    percussion:   `note("c6 c6 c6 c6").s("white").fast(2).decay(0.04).sustain(0).hpf(5000).gain(0.24)`,
    melody:       `note("c4 ~ eb4 ~ g4 ~ bb4 ~").s("triangle").decay(0.15).sustain(0).gain(0.28)`,
    atmosphere:   `note("[c2,g2,bb2]").s("sine").slow(2).decay(2).sustain(0).gain(0.2)`,
    fx:           `note("~ ~ ~ ~ ~ ~ ~ c1").s("square").decay(0.08).sustain(0).distort(0.7).gain(0.38)`,
  },

  ambient: {
    foundation:   `note("b0 ~ ~ ~").s("sine").penv("3 0").decay(0.09).sustain(0).slow(2).gain(0.7)`,
    bassline:     `note("c1 ~ ~ ~").s("sine").slow(4).decay(4).sustain(0).gain(0.72)`,
    percussion:   `note("c6*2").s("white").slow(2).decay(0.18).sustain(0).hpf(4000).gain(0.2)`,
    melody:       `note("c4 g4 bb4 g4").s("triangle").slow(4).decay(1.5).sustain(0).gain(0.22)`,
    atmosphere:   `note("[c3,g3,bb3,d4]").s("sine").slow(8).decay(6).sustain(0).gain(0.35)`,
    fx:           `note("~ ~ ~ ~").s("sine").gain(0.0)`,
  },

  breakbeat: {
    foundation:   `stack(note("b0 ~ ~ b0").s("sine").penv("3 0").decay(0.09).sustain(0), note("~ ~ c6 ~").s("white").decay(0.03).sustain(0).hpf(5000), note("~ g2 ~ g2").s("white").decay(0.08).sustain(0).lpf(3000)).gain(0.8)`,
    bassline:     `note("c2 eb2 ~ g2 ~ c2 ~ bb1").s("sawtooth").decay(0.1).sustain(0).gain(0.78)`,
    percussion:   `note("c6 ~ c6 ~ c6 c6 ~ c6").s("white").decay(0.04).sustain(0).hpf(5000).gain(0.26)`,
    melody:       `note("c4 eb4 g4 bb4").s("square").decay(0.2).sustain(0).slow(2).gain(0.28)`,
    atmosphere:   `note("[c3,g3]").s("triangle").slow(4).decay(2).sustain(0).gain(0.2)`,
    fx:           `note("~ ~ c1 ~").s("square").decay(0.08).sustain(0).distort(0.7).gain(0.33)`,
  },

  minimal: {
    foundation:   `stack(note("c1 ~ ~ ~").s("sine").penv("4 0").decay(0.12).sustain(0), note("~ ~ g2 ~").s("white").decay(0.08).sustain(0).lpf(3000)).gain(0.78)`,
    bassline:     `note("c2 ~ ~ c2").s("sine").decay(0.18).sustain(0).gain(0.72)`,
    percussion:   `note("c6 ~ c6 ~").s("white").decay(0.03).sustain(0).hpf(5000).gain(0.22)`,
    melody:       `note("c4 ~ ~ g4").s("triangle").decay(0.35).sustain(0).slow(2).gain(0.22)`,
    atmosphere:   `note("[c3,g3]").s("sine").slow(8).decay(4).sustain(0).gain(0.18)`,
    fx:           `note("~ ~ ~ ~").s("sine").gain(0.0)`,
  },

  industrial: {
    foundation:   `stack(note("c1*4").s("square").decay(0.08).sustain(0).distort(0.7), note("~ c2 ~ c2").s("square").decay(0.06).sustain(0).distort(0.9)).gain(0.85)`,
    bassline:     `note("c1 ~ c1 ~").s("square").decay(0.06).sustain(0).gain(0.8)`,
    percussion:   `note("c1*8").s("square").decay(0.04).sustain(0).distort(0.8).hpf(200).gain(0.3)`,
    melody:       `note("c3 ~ eb3 ~").s("square").decay(0.12).sustain(0).gain(0.28)`,
    atmosphere:   `note("[c1,g1]").s("sawtooth").slow(4).decay(2).sustain(0).gain(0.22)`,
    fx:           `note("~ c1 ~ c1").s("square").decay(0.1).sustain(0).distort(0.9).gain(0.38)`,
  },

  lo_fi: {
    foundation:   `stack(note("b0 ~ ~ b0").s("sine").penv("3 0").decay(0.09).sustain(0), note("~ ~ g2 ~").s("white").decay(0.08).sustain(0).lpf(3000)).gain(0.75)`,
    bassline:     `note("c2 eb2 ~ g2").s("triangle").decay(0.2).sustain(0).gain(0.72)`,
    percussion:   `note("c6*8").s("white").decay(0.05).sustain(0).hpf(5500).gain(0.22)`,
    melody:       `note("c4 eb4 g4 bb4").s("triangle").decay(0.5).sustain(0).slow(2).gain(0.25)`,
    atmosphere:   `note("[c3,eb3,g3,bb3]").s("sine").slow(4).decay(3).sustain(0).gain(0.2)`,
    fx:           `note("~ ~ c6 ~").s("white").decay(0.08).sustain(0).hpf(4500).gain(0.25)`,
  },

  trance: {
    foundation:   `stack(note("c1*4").s("sine").penv("4 0").decay(0.12).sustain(0), note("~ ~ g2 ~").s("white").decay(0.08).sustain(0).lpf(3000)).gain(0.82)`,
    bassline:     `note("c2 ~ g2 ~").s("sawtooth").decay(0.1).sustain(0).gain(0.78)`,
    percussion:   `note("c6*8").s("white").decay(0.03).sustain(0).hpf(5000).gain(0.25)`,
    melody:       `note("c4 eb4 g4 bb4 c5 bb4 g4 eb4").s("sawtooth").decay(0.12).sustain(0).gain(0.3)`,
    atmosphere:   `note("[c3,g3,bb3,d4]").s("sine").slow(4).decay(4).sustain(0).gain(0.32)`,
    fx:           `note("~ ~ ~ g2").s("white").decay(0.06).sustain(0).lpf(4000).gain(0.35)`,
  },
};
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: 55 passed (no tests cover soundLibrary genre strings directly — runtime verification in Task 7)

- [ ] **Step 3: Commit**

```bash
git add src/library/soundLibrary.js
git commit -m "feat: replace all sample deps with pure synthesis in genre presets"
```

---

## Task 5: Remove dirt-samples and re-export setcpm from strudel.js

**Files:**
- Modify: `src/strudel.js`

The `prebake: () => samples('github:tidalcycles/dirt-samples')` call loaded external samples over the network. With all presets now synthesized, this dependency is eliminated. The `setcpm` export enables instant tempo hot-patching in app.js.

**Important:** `setcpm` may not be a named export of `@strudel/web`. It is typically a global function Strudel injects at `initStrudel()` time (available as `window.setcpm` in browser context). The implementation must check one of two paths:

- Path A (preferred): `import { setcpm } from '@strudel/web'` — check if this compiles without error.
- Path B (fallback): export a wrapper `export const setcpm = (cpm) => window.setcpm(cpm)` — use if path A fails at build time.

- [ ] **Step 1: Replace the full file**

```js
import { initStrudel, evaluate as _evaluate, hush } from '@strudel/web';

let initialized = false;

export async function init() {
  await initStrudel({});
  initialized = true;
}

export async function play(code) {
  if (!initialized) throw new Error('Strudel not initialized');
  await _evaluate(code, true);
}

export function stop() {
  hush();
}

export function setcpm(cpm) {
  if (typeof window !== 'undefined' && typeof window.setcpm === 'function') {
    window.setcpm(cpm);
  }
}
```

This is Path B — wraps the Strudel global safely. If `@strudel/web` exports `setcpm` as a named export, replace the wrapper with a direct re-export.

- [ ] **Step 2: Run dev server to verify Strudel still initializes**

```bash
npm run dev
```

Open `http://localhost:5173` — status should show "Ready" after a moment. The genre buttons should still load and play (using synthesis now, not samples). If "Engine failed" appears, check the browser console for the error.

- [ ] **Step 3: Commit**

```bash
git add src/strudel.js
git commit -m "feat: remove dirt-samples prebake; export setcpm wrapper"
```

---

## Task 6: Intercept tempo slider in app.js

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Add setcpm to the strudel.js import**

In `app.js`, change line 1:
```js
import { init, play, stop } from './src/strudel.js';
```
To:
```js
import { init, play, stop, setcpm } from './src/strudel.js';
```

- [ ] **Step 2: Intercept the tempo key in the slider callback**

Find the `renderGlobalControls` call (around line 87–90 in app.js):
```js
renderGlobalControls(globalState, (key, value) => {
  globalState[key] = value;
  debouncedRebuild();
});
```

Replace with:
```js
renderGlobalControls(globalState, (key, value) => {
  globalState[key] = value;
  if (key === 'tempo') { setcpm(value * 60); return; }
  debouncedRebuild();
});
```

`value` is CPS (cycles per second, range 0.2–3.0). Multiplying by 60 converts to CPM before passing to `setcpm`. The `return` skips the full string rebuild — no `evaluate()` call for tempo changes.

- [ ] **Step 3: Verify in browser**

With `npm run dev` running and a genre loaded, move the Tempo slider rapidly. Audio tempo should update instantly with no stuttering or silence gap. Other sliders (Volume, Filter, Intensity) should still work.

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "feat: hot-patch tempo via setcpm — bypass string rebuild"
```

---

## Task 7: Expand intensity to drive master reverb in pillars.js

**Files:**
- Modify: `src/pillars.js`

- [ ] **Step 1: Update the master chain in rebuildStack**

In `src/pillars.js`, find line 22:
```js
  const filterHz = Math.round(masterFilter * 18000 + 200);
  return `${inner}.cps(${tempo}).gain(${masterVolume}).lpf(${filterHz}).shape(${intensity})`;
```

Replace with:
```js
  const filterHz = Math.round(masterFilter * 18000 + 200);
  return `${inner}.cps(${tempo}).gain(${masterVolume}).lpf(${filterHz}).shape(${intensity}).room(${Math.round(intensity * 0.4 * 100) / 100})`;
```

- [ ] **Step 2: Verify in browser**

With `npm run dev` running and a genre loaded, move the Intensity slider to 1.0. Room reverb should be audible (0.4 room). At 0.0 intensity, reverb should be absent (0.0 room).

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: 55 passed

- [ ] **Step 4: Commit**

```bash
git add src/pillars.js
git commit -m "feat: intensity drives master room reverb via .room() modifier"
```

---

## Self-Review

**Spec coverage:**
- [x] SYNTH_DRUMS lookup table exported — Task 4
- [x] All 10 genre foundation/percussion rewritten — Task 4
- [x] Multi-voice comma patterns → stack() — Task 4
- [x] change_waveform handler — Task 2
- [x] adjust_decay handler — Task 2
- [x] adjust_lpq handler — Task 2
- [x] styles.js: acid bass/melody, dub bass, breakcore drums, ambient global/atmosphere — Task 3
- [x] dirt-samples prebake removed — Task 5
- [x] setcpm exported from strudel.js — Task 5
- [x] tempo slider bypasses rebuild — Task 6
- [x] intensity drives .room() — Task 7
- [x] Tests for all 3 new handlers — Task 1

**Placeholder scan:** None found.

**Type consistency:** `setcpm` defined in Task 5, imported in Task 6. `SYNTH_DRUMS` defined and exported in Task 4, available for future use. `OPERATION_HANDLERS` keys added in Task 2 match test expectations in Task 1.
