# 4-Pillar Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse 6 pillars into 4 by renaming `foundation`→`kick`, `percussion`→`groove`, and replacing `bassline`+`atmosphere` with `rumble_bass` and `melody`+`fx` with `synth_fx` (baked `stack()` patterns).

**Architecture:** `PILLAR_NAMES` in `pillars.js` drives everything dynamically — `app.js`, `llm.js`, and `rebuildStack` require no changes. New merged pillar catalogs live in `soundLibrary.js`. The `styles.js` dead-code file is deleted.

**Tech Stack:** Vanilla JS, Vite, Vitest, Strudel

---

### Task 1: Make pillars tests fail with new names

**Files:**
- Modify: `tests/pillars.test.js`

- [ ] **Step 1: Update test expectations to new pillar names**

Replace the entire file content:

```js
import { describe, it, expect } from 'vitest';
import { rebuildStack, makePillars, PILLAR_NAMES, assembleCode } from '../src/pillars.js';
import { soundLibrary } from '../src/library/soundLibrary.js';

const makeGlobal = (overrides = {}) => ({
  tempo: 1.0,
  masterVolume: 0.8,
  masterFilter: 1.0,
  intensity: 0.5,
  soloedPillar: null,
  ...overrides,
});

describe('PILLAR_NAMES', () => {
  it('has exactly 4 pillars in correct order', () => {
    expect(PILLAR_NAMES).toEqual(['kick', 'rumble_bass', 'groove', 'synth_fx']);
  });
});

describe('makePillars', () => {
  it('returns 4 pillar objects', () => {
    const p = makePillars();
    expect(p).toHaveLength(4);
  });

  it('each pillar has name, code, muted, history', () => {
    const p = makePillars();
    for (const pillar of p) {
      expect(pillar).toHaveProperty('name');
      expect(pillar).toHaveProperty('code', '');
      expect(pillar).toHaveProperty('muted', false);
      expect(pillar).toHaveProperty('history');
      expect(Array.isArray(pillar.history)).toBe(true);
    }
  });
});

describe('rebuildStack', () => {
  it('returns null when all pillars are empty', () => {
    expect(rebuildStack(makePillars(), makeGlobal())).toBeNull();
  });

  it('returns null when all non-empty pillars are muted', () => {
    const pillars = makePillars();
    pillars[0].code = 's("bd")';
    pillars[0].muted = true;
    expect(rebuildStack(pillars, makeGlobal())).toBeNull();
  });

  it('single active pillar returns code without stack() wrapper', () => {
    const pillars = makePillars();
    pillars[0].code = 's("bd ~ sn ~")';
    const result = rebuildStack(pillars, makeGlobal());
    expect(result).not.toContain('stack(');
    expect(result).toContain('s("bd ~ sn ~")');
  });

  it('multiple active pillars wrapped in stack()', () => {
    const pillars = makePillars();
    pillars[0].code = 's("bd")';
    pillars[1].code = 's("hh*8")';
    const result = rebuildStack(pillars, makeGlobal());
    expect(result).toMatch(/^stack\(/);
    expect(result).toContain('s("bd")');
    expect(result).toContain('s("hh*8")');
  });

  it('muted pillar excluded from stack', () => {
    const pillars = makePillars();
    pillars[0].code = 's("bd")';
    pillars[1].code = 's("hh*8")';
    pillars[1].muted = true;
    const result = rebuildStack(pillars, makeGlobal());
    expect(result).not.toContain('stack(');
    expect(result).not.toContain('hh*8');
  });

  it('soloedPillar includes only that pillar', () => {
    const pillars = makePillars();
    pillars[0].code = 's("bd")';
    pillars[1].code = 's("hh*8")';
    const result = rebuildStack(pillars, makeGlobal({ soloedPillar: 'kick' }));
    expect(result).not.toContain('stack(');
    expect(result).toContain('s("bd")');
    expect(result).not.toContain('hh*8');
  });

  it('soloed pillar with empty code returns null', () => {
    const pillars = makePillars();
    pillars[1].code = 's("hh*8")';
    const result = rebuildStack(pillars, makeGlobal({ soloedPillar: 'kick' }));
    expect(result).toBeNull();
  });

  it('appends global effects chain', () => {
    const pillars = makePillars();
    pillars[0].code = 's("bd")';
    const result = rebuildStack(pillars, makeGlobal({ tempo: 1.5, masterVolume: 0.6, masterFilter: 0.5, intensity: 0.3 }));
    expect(result).toContain('.cps(1.5)');
    expect(result).toContain('.gain(0.6)');
    expect(result).toContain('.lpf(');
    expect(result).toContain('.shape(0.3)');
  });

  it('masterFilter 1.0 maps to ~18200 Hz lpf', () => {
    const pillars = makePillars();
    pillars[0].code = 's("bd")';
    const result = rebuildStack(pillars, makeGlobal({ masterFilter: 1.0 }));
    expect(result).toContain('.lpf(18200)');
  });

  it('masterFilter 0 maps to 200 Hz lpf', () => {
    const pillars = makePillars();
    pillars[0].code = 's("bd")';
    const result = rebuildStack(pillars, makeGlobal({ masterFilter: 0 }));
    expect(result).toContain('.lpf(200)');
  });
});

describe('assembleCode', () => {
  const basePlan = { selectedId: 'kick_sine_44', modifications: {} };

  it('returns base pattern code for default modifications', () => {
    const result = assembleCode(basePlan, 'kick');
    expect(result).toBe(soundLibrary.kick.find(p => p.id === 'kick_sine_44').code);
  });

  it('appends .gain() when gain != 1.0', () => {
    const plan = { selectedId: 'kick_sine_44', modifications: { gain: 0.5 } };
    expect(assembleCode(plan, 'kick')).toContain('.gain(0.5)');
  });

  it('does not append .gain() when gain is 1.0', () => {
    const plan = { selectedId: 'kick_sine_44', modifications: { gain: 1.0 } };
    const base = soundLibrary.kick.find(p => p.id === 'kick_sine_44').code;
    expect(assembleCode(plan, 'kick')).toBe(base);
  });

  it('appends .speed() when speed != 1.0', () => {
    const plan = { selectedId: 'kick_sine_44', modifications: { speed: 1.5 } };
    expect(assembleCode(plan, 'kick')).toContain('.speed(1.5)');
  });

  it('appends .slow() when slowdown > 1', () => {
    const plan = { selectedId: 'kick_sine_44', modifications: { slowdown: 2 } };
    expect(assembleCode(plan, 'kick')).toContain('.slow(2)');
  });

  it('does not append .slow() when slowdown is 1', () => {
    const plan = { selectedId: 'kick_sine_44', modifications: { slowdown: 1 } };
    const base = soundLibrary.kick.find(p => p.id === 'kick_sine_44').code;
    expect(assembleCode(plan, 'kick')).toBe(base);
  });

  it('appends multiple modifiers in order: slow, speed, gain', () => {
    const plan = { selectedId: 'kick_sine_44', modifications: { gain: 0.8, speed: 1.2, slowdown: 2 } };
    const result = assembleCode(plan, 'kick');
    const slowIdx = result.indexOf('.slow(');
    const speedIdx = result.indexOf('.speed(');
    const gainIdx = result.indexOf('.gain(0.8)');
    expect(slowIdx).toBeLessThan(speedIdx);
    expect(speedIdx).toBeLessThan(gainIdx);
  });

  it('falls back to first catalog entry when selectedId not found', () => {
    const plan = { selectedId: 'nonexistent_id', modifications: {} };
    const fallback = soundLibrary.kick[0].code;
    expect(assembleCode(plan, 'kick')).toBe(fallback);
  });

  it('returns empty string when pillar has no entries', () => {
    const plan = { selectedId: 'any', modifications: {} };
    expect(assembleCode(plan, 'unknown_pillar')).toBe('');
  });

  it('works for rumble_bass pillar', () => {
    const plan = { selectedId: 'rumble_acid', modifications: {} };
    const result = assembleCode(plan, 'rumble_bass');
    expect(result).toBe(soundLibrary.rumble_bass.find(p => p.id === 'rumble_acid').code);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test
```

Expected: `PILLAR_NAMES` test fails — received `['foundation', 'bassline', 'percussion', 'melody', 'atmosphere', 'fx']`, expected `['kick', 'rumble_bass', 'groove', 'synth_fx']`. Several other tests also fail.

---

### Task 2: Update PILLAR_NAMES in pillars.js → pillars tests pass

**Files:**
- Modify: `src/pillars.js:3`

- [ ] **Step 1: Update PILLAR_NAMES array**

In `src/pillars.js`, change line 3:

```js
export const PILLAR_NAMES = ['kick', 'rumble_bass', 'groove', 'synth_fx'];
```

- [ ] **Step 2: Run pillars tests — verify partial pass**

```bash
npx vitest run tests/pillars.test.js
```

Expected: PILLAR_NAMES, makePillars, and rebuildStack tests pass (13 tests). The `assembleCode` tests will still fail — they reference `soundLibrary.kick` which does not exist until Task 4. That is expected at this stage.

- [ ] **Step 3: Commit**

```bash
git add tests/pillars.test.js src/pillars.js
git commit -m "refactor: rename PILLAR_NAMES to 4-pillar structure"
```

---

### Task 3: Make library tests fail with new names

**Files:**
- Modify: `tests/library.test.js`

- [ ] **Step 1: Update library test file**

Replace the entire file content:

```js
import { describe, it, expect } from 'vitest';
import { soundLibrary, GENRE_PRESETS, GENRE_NAMES, getPatternById, getGenreCode } from '../src/library/soundLibrary.js';

const PILLAR_NAMES = ['kick', 'rumble_bass', 'groove', 'synth_fx'];

describe('soundLibrary', () => {
  it('exports all 4 pillars', () => {
    for (const pillar of PILLAR_NAMES) {
      expect(Array.isArray(soundLibrary[pillar])).toBe(true);
    }
  });

  it('each pillar has at least 2 patterns', () => {
    for (const pillar of PILLAR_NAMES) {
      expect(soundLibrary[pillar].length).toBeGreaterThanOrEqual(2);
    }
  });

  it('each pattern has id, name, tags, code', () => {
    for (const pillar of PILLAR_NAMES) {
      for (const p of soundLibrary[pillar]) {
        expect(typeof p.id).toBe('string');
        expect(p.id.length).toBeGreaterThan(0);
        expect(typeof p.name).toBe('string');
        expect(Array.isArray(p.tags)).toBe(true);
        expect(p.tags.length).toBeGreaterThan(0);
        expect(typeof p.code).toBe('string');
        expect(p.code.length).toBeGreaterThan(0);
      }
    }
  });

  it('all IDs are unique within each pillar', () => {
    for (const pillar of PILLAR_NAMES) {
      const ids = soundLibrary[pillar].map(p => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('all code strings have balanced parentheses', () => {
    for (const pillar of PILLAR_NAMES) {
      for (const p of soundLibrary[pillar]) {
        let depth = 0;
        for (const ch of p.code) {
          if (ch === '(') depth++;
          else if (ch === ')') depth--;
        }
        expect(depth).toBe(0);
      }
    }
  });

  it('all tags arrays contain only strings', () => {
    for (const pillar of PILLAR_NAMES) {
      for (const p of soundLibrary[pillar]) {
        for (const tag of p.tags) {
          expect(typeof tag).toBe('string');
        }
      }
    }
  });
});

describe('GENRE_PRESETS', () => {
  it('has at least one genre', () => {
    expect(Object.keys(GENRE_PRESETS).length).toBeGreaterThan(0);
  });

  it('techno preset exists', () => {
    expect(GENRE_PRESETS.techno).toBeDefined();
  });

  it('each genre preset has all 4 pillars', () => {
    for (const [, preset] of Object.entries(GENRE_PRESETS)) {
      for (const pillar of PILLAR_NAMES) {
        expect(typeof preset[pillar]).toBe('string');
      }
    }
  });

  it('all preset IDs reference existing soundLibrary entries', () => {
    for (const [, preset] of Object.entries(GENRE_PRESETS)) {
      for (const [pillar, id] of Object.entries(preset)) {
        const found = soundLibrary[pillar]?.find(p => p.id === id);
        expect(found).toBeDefined();
      }
    }
  });
});

describe('GENRE_NAMES', () => {
  it('matches keys of GENRE_PRESETS', () => {
    expect(GENRE_NAMES).toEqual(Object.keys(GENRE_PRESETS));
  });

  it('includes techno', () => {
    expect(GENRE_NAMES).toContain('techno');
  });
});

describe('getPatternById', () => {
  it('returns pattern for valid id', () => {
    const p = getPatternById('kick', 'kick_sine_44');
    expect(p).not.toBeNull();
    expect(p.id).toBe('kick_sine_44');
  });

  it('returns pattern object with all required fields', () => {
    const p = getPatternById('rumble_bass', 'rumble_acid');
    expect(p).toHaveProperty('id');
    expect(p).toHaveProperty('name');
    expect(p).toHaveProperty('tags');
    expect(p).toHaveProperty('code');
  });

  it('returns null for unknown id', () => {
    expect(getPatternById('kick', 'nonexistent_id')).toBeNull();
  });

  it('returns null for unknown pillar', () => {
    expect(getPatternById('unknown_pillar', 'kick_sine_44')).toBeNull();
  });
});

describe('getGenreCode', () => {
  it('returns code strings for all 4 pillars for techno genre', () => {
    const result = getGenreCode('techno');
    expect(result).not.toBeNull();
    for (const pillar of PILLAR_NAMES) {
      expect(typeof result[pillar]).toBe('string');
      expect(result[pillar].length).toBeGreaterThan(0);
    }
  });

  it('returns null for unknown genre', () => {
    expect(getGenreCode('unknown_genre')).toBeNull();
  });

  it('returned code strings match base pattern code', () => {
    const result = getGenreCode('techno');
    const preset = GENRE_PRESETS.techno;
    for (const pillar of PILLAR_NAMES) {
      const expected = getPatternById(pillar, preset[pillar])?.code;
      expect(result[pillar]).toBe(expected);
    }
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run tests/library.test.js
```

Expected: `'exports all 4 pillars'` fails — `soundLibrary.kick` is undefined. Several other tests also fail.

---

### Task 4: Rewrite soundLibrary.js with 4-pillar structure → all tests pass

**Files:**
- Modify: `src/library/soundLibrary.js`

- [ ] **Step 1: Replace soundLibrary.js with new 4-pillar catalog**

```js
export const soundLibrary = {
  kick: [
    { id: "kick_sine_44",    name: "Sine Kick 4/4",    tags: ["kick", "pounding", "heavy", "hypnotic", "techno"],      code: `note("c1*4").s("sine").penv("4 0").decay(0.12).sustain(0).gain(0.82)` },
    { id: "kick_square_44",  name: "Square Kick 4/4",  tags: ["kick", "industrial", "harsh", "distort", "aggressive"], code: `note("c1*4").s("square").decay(0.08).sustain(0).distort(0.7).gain(0.9)` },
    { id: "kick_acid_44",    name: "Acid Kick 4/4",    tags: ["kick", "acid", "punch", "heavy", "303"],                code: `note("c1*4").s("sine").penv("5 0").decay(0.1).sustain(0).gain(0.85)` },
  ],
  rumble_bass: [
    { id: "rumble_hypnotic",    name: "Hypnotic Rumble",    tags: ["bass", "drone", "hypnotic", "minimal", "pad", "sidechain"], code: `stack(\n  note("c1 ~ c1 ~").s("sawtooth").decay(0.08).sustain(0).gain("0.1 1 1 1"),\n  note("[c2,g2,bb2]").s("sine").slow(4).decay(3).sustain(0).gain(0.2)\n)` },
    { id: "rumble_acid",        name: "Acid Rumble",        tags: ["bass", "drone", "acid", "303", "filter", "resonant"],      code: `stack(\n  note("c1 eb1 g1 ~").s("sawtooth").lpf(800).lpq(8).decay(0.15).sustain(0).gain("0.1 1 1 1"),\n  note("[c2,eb2]").s("sine").slow(4).decay(2).sustain(0).gain(0.15)\n)` },
    { id: "rumble_industrial",  name: "Industrial Rumble",  tags: ["bass", "drone", "industrial", "harsh", "distort"],         code: `stack(\n  note("c1 ~ ~ c1").s("sawtooth").distort(0.4).decay(0.1).sustain(0).gain("0.1 1 1 1"),\n  note("c2").s("sine").slow(8).decay(4).sustain(0).gain(0.1)\n)` },
  ],
  groove: [
    { id: "perc_minimal_hats",    name: "Minimal Hi-Hats",      tags: ["hats", "groove", "subtle", "minimal", "hypnotic"],    code: `note("c6*8").s("white").decay(0.03).sustain(0).hp(450).hpq(0.3).gain(0.25)` },
    { id: "perc_acid_backbeat",   name: "Acid Backbeat",         tags: ["snare", "acid", "backbeat", "groove"],                code: `note("~ c6 ~ c6").s("white").decay(0.05).sustain(0).hp(450).hpq(0.3).gain(0.3)` },
    { id: "perc_industrial_fast", name: "Industrial Rapid Hats", tags: ["hats", "industrial", "harsh", "aggressive", "fast"], code: `note("c6*16").s("white").decay(0.02).sustain(0).hp(450).hpq(0.3).gain(0.2)` },
  ],
  synth_fx: [
    { id: "synthfx_hypnotic",   name: "Hypnotic Synth FX",   tags: ["melody", "fx", "hypnotic", "minor", "accent", "subtle"],       code: `stack(\n  note("c3 eb3 g3 bb3").s("triangle").decay(0.3).sustain(0).slow(2).hp(450).hpq(0.3).gain(0.3),\n  note("~ ~ ~ c1").s("square").decay(0.08).sustain(0).distort(0.7).gain(0.35)\n)` },
    { id: "synthfx_acid",       name: "Acid Synth FX",       tags: ["melody", "fx", "acid", "303", "filter", "squelch", "burst"],   code: `stack(\n  note("c3 ~ eb3 ~ g3 ~ bb3 ~").s("sawtooth").lpf(1200).lpq(4).decay(0.2).sustain(0).hp(450).hpq(0.3).gain(0.35),\n  note("c2*2").s("square").decay(0.08).sustain(0).distort(0.7).gain(0.3)\n)` },
    { id: "synthfx_industrial", name: "Industrial Synth FX", tags: ["melody", "fx", "industrial", "harsh", "distort", "slam"],      code: `stack(\n  note("c3 c3 eb3 c3").s("square").distort(0.5).decay(0.15).sustain(0).hp(450).hpq(0.3).gain(0.25),\n  note("~ ~ ~ c1").s("square").decay(0.08).sustain(0).distort(0.9).gain(0.4)\n)` },
  ],
};

export const GENRE_PRESETS = {
  techno: {
    kick:        "kick_sine_44",
    rumble_bass: "rumble_hypnotic",
    groove:      "perc_minimal_hats",
    synth_fx:    "synthfx_hypnotic",
  },
};

export const GENRE_NAMES = Object.keys(GENRE_PRESETS);

export function getPatternById(pillarName, id) {
  return soundLibrary[pillarName]?.find(p => p.id === id) ?? null;
}

export function getGenreCode(genreName) {
  const preset = GENRE_PRESETS[genreName];
  if (!preset) return null;
  return Object.fromEntries(
    Object.entries(preset).map(([pillar, id]) => [pillar, getPatternById(pillar, id)?.code ?? ''])
  );
}
```

- [ ] **Step 2: Run all tests — verify they all pass**

```bash
npm test
```

Expected: all 40 tests pass across all 4 test files.

- [ ] **Step 3: Commit**

```bash
git add tests/library.test.js src/library/soundLibrary.js
git commit -m "refactor: restructure soundLibrary to 4 pillars with baked rumble_bass and synth_fx patterns"
```

---

### Task 5: Delete styles.js and fix UI display

**Files:**
- Delete: `src/library/styles.js`
- Modify: `src/ui.js:58`

- [ ] **Step 1: Delete dead-code styles.js**

```bash
git rm src/library/styles.js
```

- [ ] **Step 2: Fix pillar name display in ui.js**

In `src/ui.js`, change line 58 from:

```js
nameEl.textContent = pillar.name.toUpperCase();
```

to:

```js
nameEl.textContent = pillar.name.replace(/_/g, ' ').toUpperCase();
```

- [ ] **Step 3: Run full test suite — verify still passing**

```bash
npm test
```

Expected: all 40 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/ui.js
git commit -m "refactor: delete unused styles.js, fix pillar name display for underscores"
```
