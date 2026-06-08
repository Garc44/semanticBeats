# Bass/Percussion Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the `bass_percussion` pillar into independent `bass` and `percussion` pillars, and remove the unused `GENRE_PRESETS` system entirely.

**Architecture:** Five pillars replace four. All pattern data stays the same — only the grouping key changes. `rumble_*` patterns move to `bass`, `perc_*` patterns move to `percussion`. Genre preset machinery (GENRE_PRESETS, GENRE_NAMES, getGenreCode, genre bar UI) is deleted.

**Tech Stack:** Vanilla JS ES modules, Vitest

---

### Task 1: Update library.test.js

**Files:**
- Modify: `tests/library.test.js`

- [ ] **Step 1: Replace the file with updated tests**

Remove all genre-related describe blocks (`GENRE_PRESETS`, `GENRE_NAMES`, `getGenreCode`). Update `PILLAR_NAMES` to 5 pillars. Fix `getPatternById` test that used `bass_percussion`.

```js
import { describe, it, expect } from 'vitest';
import { soundLibrary, getPatternById } from '../src/library/soundLibrary.js';

const PILLAR_NAMES = ['drums', 'bass', 'percussion', 'melody', 'transitions'];

describe('soundLibrary', () => {
  it('exports all 5 pillars', () => {
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

  it('bass pillar contains only rumble_* patterns', () => {
    for (const p of soundLibrary.bass) {
      expect(p.id).toMatch(/^rumble_/);
    }
  });

  it('percussion pillar contains only perc_* patterns', () => {
    for (const p of soundLibrary.percussion) {
      expect(p.id).toMatch(/^perc_/);
    }
  });
});

describe('getPatternById', () => {
  it('returns pattern for valid id', () => {
    const p = getPatternById('drums', 'kick_sine_44');
    expect(p).not.toBeNull();
    expect(p.id).toBe('kick_sine_44');
  });

  it('returns pattern object with all required fields', () => {
    const p = getPatternById('bass', 'rumble_acid');
    expect(p).toHaveProperty('id');
    expect(p).toHaveProperty('name');
    expect(p).toHaveProperty('tags');
    expect(p).toHaveProperty('code');
  });

  it('returns null for unknown id', () => {
    expect(getPatternById('drums', 'nonexistent_id')).toBeNull();
  });

  it('returns null for unknown pillar', () => {
    expect(getPatternById('unknown_pillar', 'kick_sine_44')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/library.test.js
```

Expected: failures on `exports all 5 pillars`, `bass pillar contains only rumble_*`, `percussion pillar contains only perc_*`, and the `rumble_acid` getPatternById test.

---

### Task 2: Update soundLibrary.js

**Files:**
- Modify: `src/library/soundLibrary.js`

- [ ] **Step 1: Rewrite the file**

```js
export const soundLibrary = {
  drums: [
    { id: "kick_sine_44",       name: "Sine Kick 4/4",           tags: ["kick", "pounding", "heavy", "hypnotic"],     code: `s("bd:0*4").bank("RolandTR909")` },
    { id: "kick_square_44",     name: "Square Kick 4/4",         tags: ["kick", "industrial", "harsh", "aggressive"], code: `s("bd:2*4").bank("RolandTR909")` },
    { id: "kick_acid_44",       name: "Acid Kick 4/4",           tags: ["kick", "acid", "punch", "303"],              code: `s("bd:1*4").bank("RolandTR909")` },
    { id: "kick_dub_deep",      name: "Deep Dub Kick",           tags: ["kick", "dub", "deep", "sub", "minimal"],     code: `s("bd:0*4").bank("RolandTR808").lpf(180)` },
    { id: "kick_hardgroove",    name: "Hardgroove 909",          tags: ["kick", "driving", "hardgroove", "rave"],     code: `s("bd:3*4").bank("RolandTR909")` },
    { id: "kick_schranz",       name: "Schranz Dist Kick",       tags: ["kick", "hardcore", "schranz", "extreme"],    code: `s("bd:2*4").bank("RolandTR909").lpf(850)` },
    { id: "perc_acid_backbeat", name: "Acid Backbeat Claps",     tags: ["snare", "claps", "backbeat"],                code: `s("~ sd ~ sd").bank("RolandTR909")` },
    { id: "kick_lofi_crush",    name: "Bitcrushed Lo-Fi Kick",   tags: ["kick", "industrial", "lofi", "crush"],       code: `s("bd:1*4").bank("RolandTR909").crush(4).gain(0.9)` },
    { id: "kick_dub_space",     name: "Space Dub Kick",          tags: ["kick", "dub-techno", "echo", "deep"],        code: `s("bd:0*4").bank("RolandTR909").lpf(300).delay(0.3).delaytime(0.33)` },
  ],
  bass: [
    { id: "rumble_hypnotic",   name: "Hypnotic Rumble",      tags: ["bass", "drone", "hypnotic", "minimal"],  code: `stack(note("c1 ~ c1 ~").s("moog").sustain(0).gain("0.1 1 1 1"), )` },
    { id: "rumble_acid",       name: "Acid Rumble Line",     tags: ["bass", "drone", "acid", "303"],          code: `stack(note("c1 eb1 g1 ~").s("bass").lpq(8).sustain(0).gain("0.1 1 1 1"), note("[c2,eb2]").s("bass").slow(4).sustain(0).gain(0.15))` },
    { id: "rumble_industrial", name: "Industrial Rumble",    tags: ["bass", "drone", "industrial", "harsh"],  code: `stack(note("c1 ~ ~ c1").s("bass").sustain(0).gain("0.1 1 1 1"), note("c2").s("bass").slow(8).sustain(0).gain(0.1))` },
    { id: "rumble_dub",        name: "Deep Dub Chug",        tags: ["bass", "drone", "dub", "deep", "sub"],   code: `stack(note("c1 ~ ~ c1").s("bass").sustain(0).gain(0.9), note("[f2,c3]").s("moog").lpf(350).lpq(3).slow(6).gain(0.14))` },
    { id: "rumble_hardgroove", name: "Rolling 16th Bass",    tags: ["bass", "rolling", "groove", "driving"],  code: `stack(note("~ c1 c1 ~ c1 c1 ~ c1").s("bass").lpf(160).sustain(0).gain(0.85), note("c1").s("bass").lpf(110).slow(4).gain(0.2))` },
    { id: "rumble_schranz",    name: "Schranz Noise Bass",   tags: ["bass", "drone", "schranz", "heavy"],     code: `stack(note("c1*4").s("fm").lpf(140).gain(0.8), note("c1*8").s("white").hp(120).lpf(300).gain(0.15))` },
  ],
  percussion: [
    { id: "perc_minimal_hats",    name: "Minimal Hi-Hats",       tags: ["hats", "percussion", "subtle"],         code: `s("hh*8").bank("RolandTR909")` },
    { id: "perc_industrial_fast", name: "Rapid Industrial Hats", tags: ["hats", "percussion", "fast"],           code: `s("hh*16").bank("RolandTR909")` },
    { id: "perc_dub_openhat",     name: "Classic Open Hi-Hat",   tags: ["hats", "open", "offbeat"],              code: `s("~ oh").bank("RolandTR808")` },
    { id: "perc_hardgroove_ride", name: "Sizzling Rave Ride",    tags: ["percussion", "ride", "groove"],         code: `s("~ hh*4").bank("RolandTR909")` },
    { id: "perc_schranz_shaker",  name: "Rapid Shaker Engine",   tags: ["percussion", "shaker", "fast"],         code: `stack(s("cp*4").bank("RolandTR909").gain(0.35), s("~ hh*16").bank("RolandTR909").gain(0.1))` },
  ],
  melody: [
    { id: "synthfx_hypnotic",   name: "Hypnotic Synth Arp",      tags: ["melody", "minor", "subtle"],          code: `stack(note("c3 eb3 g3 bb3").s("arpy").sustain(0).slow(2).gain(0.3), note("~ ~ ~ c1").s("fm").sustain(0).gain(0.35))` },
    { id: "synthfx_acid",       name: "Acid Synth Squelch",      tags: ["melody", "acid", "303", "resonance"], code: `stack(note("c3 ~ eb3 ~ g3 ~ bb3 ~").s("bass").sustain(0).gain(0.35), note("c2*2").s("fm").sustain(0).gain(0.30))` },
    { id: "synthfx_industrial", name: "Industrial Melodic Line", tags: ["melody", "industrial", "harsh"],      code: `stack(note("c3 c3 eb3 c3").s("fm").sustain(0).gain(0.25), note("~ ~ ~ c1").s("fm").sustain(0).gain(0.4))` },
    { id: "synthfx_hardgroove", name: "Peak Time Rave Hook",     tags: ["melody", "rave", "energetic"],        code: `stack(note("c4 g3 c4 eb4").s("juno").sustain(0).fast(2).gain(0.18), note("~ ~ c3 ~").s("arpy").gain(0.3))` },
  ],
  transitions: [
    { id: "synthfx_dub",     name: "Dub Echo Pad Stab",   tags: ["atmosphere", "dub", "chord", "spacey"],   code: `stack(note("[c3,eb3,g3,bb3]*2").s("juno").sustain(0).slow(2).gain(0.4), note("c6").s("pad").slow(4).gain(0.1))` },
    { id: "synthfx_schranz", name: "Talking Glitch Wall", tags: ["atmosphere", "glitch", "vocal", "noisy"], code: `stack(note("c3*8").s("fm").sustain(0).gain(0.2), note("~ c2 ~ c2").s("bass").sustain(0).gain(0.25))` },
  ],
};

export function getPatternById(pillarName, id) {
  return soundLibrary[pillarName]?.find(p => p.id === id) ?? null;
}
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run tests/library.test.js
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/library/soundLibrary.js tests/library.test.js
git commit -m "feat: split bass_percussion into bass + percussion, remove genre presets"
```

---

### Task 3: Update pillars.test.js

**Files:**
- Modify: `tests/pillars.test.js`

- [ ] **Step 1: Update PILLAR_NAMES assertion and knob tests**

Replace the `bass_percussion` knob test with two tests. Update the length assertion from 4 to 5.

```js
import { describe, it, expect } from 'vitest';
import { rebuildStack, makePillars, PILLAR_NAMES } from '../src/pillars.js';

const makeGlobal = (overrides = {}) => ({
  tempo: 1.0,
  masterVolume: 0.8,
  masterFilter: 1.0,
  intensity: 0.5,
  soloedPillar: null,
  ...overrides,
});

describe('PILLAR_NAMES', () => {
  it('has exactly 5 pillars in correct order', () => {
    expect(PILLAR_NAMES).toEqual(['drums', 'bass', 'percussion', 'melody', 'transitions']);
  });
});

describe('makePillars', () => {
  it('returns 5 pillar objects', () => {
    const p = makePillars();
    expect(p).toHaveLength(5);
  });

  it('each pillar has name, code, muted, history, selectedId, lastMods, knobs', () => {
    const p = makePillars();
    for (const pillar of p) {
      expect(pillar).toHaveProperty('name');
      expect(pillar).toHaveProperty('code', '');
      expect(pillar).toHaveProperty('muted', false);
      expect(pillar).toHaveProperty('history');
      expect(Array.isArray(pillar.history)).toBe(true);
      expect(pillar).toHaveProperty('selectedId', null);
      expect(pillar).toHaveProperty('lastMods');
      expect(pillar).toHaveProperty('knobs');
      expect(typeof pillar.knobs).toBe('object');
    }
  });

  it('drums pillar has correct knob defaults', () => {
    const drums = makePillars().find(p => p.name === 'drums');
    expect(drums.knobs.gain).toBe(0.8);
    expect(drums.knobs.drive).toBe(0.0);
    expect(drums.knobs.decay).toBe(0.12);
  });

  it('bass pillar has correct knob defaults', () => {
    const bass = makePillars().find(p => p.name === 'bass');
    expect(bass.knobs.gain).toBe(0.7);
    expect(bass.knobs.cutoff).toBe(1.0);
    expect(bass.knobs.stutter).toBe(0.0);
  });

  it('percussion pillar has correct knob defaults', () => {
    const perc = makePillars().find(p => p.name === 'percussion');
    expect(perc.knobs.gain).toBe(0.6);
    expect(perc.knobs.decay).toBe(0.12);
  });

  it('melody pillar has correct knob defaults', () => {
    const m = makePillars().find(p => p.name === 'melody');
    expect(m.knobs.gain).toBe(0.5);
    expect(m.knobs.cutoff).toBe(0.6);
    expect(m.knobs.resonance).toBe(0.1);
    expect(m.knobs.space).toBe(0.2);
  });

  it('transitions pillar has correct knob defaults', () => {
    const t = makePillars().find(p => p.name === 'transitions');
    expect(t.knobs.gain).toBe(0.4);
    expect(t.knobs.hpf).toBe(0.0);
    expect(t.knobs.size).toBe(0.5);
  });

  it('knobs objects are independent (not shared references)', () => {
    const pillars = makePillars();
    pillars[0].knobs.gain = 0.1;
    const fresh = makePillars();
    expect(fresh[0].knobs.gain).toBe(0.8);
  });
});

describe('rebuildStack', () => {
  it('returns null when all pillars are empty', () => {
    expect(rebuildStack(makePillars(), makeGlobal())).toBeNull();
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

  it('muted pillar is still included in stack (mute handled via gain(0) in compiler)', () => {
    const pillars = makePillars();
    pillars[0].code = 's("bd")';
    pillars[0].muted = true;
    pillars[1].code = 's("hh*8")';
    const result = rebuildStack(pillars, makeGlobal());
    expect(result).toContain('s("bd")');
    expect(result).toContain('s("hh*8")');
  });

  it('soloedPillar includes only that pillar', () => {
    const pillars = makePillars();
    pillars[0].code = 's("bd")';
    pillars[1].code = 's("hh*8")';
    const result = rebuildStack(pillars, makeGlobal({ soloedPillar: 'drums' }));
    expect(result).not.toContain('stack(');
    expect(result).toContain('s("bd")');
    expect(result).not.toContain('hh*8');
  });

  it('soloed pillar with empty code returns null', () => {
    const pillars = makePillars();
    pillars[1].code = 's("hh*8")';
    const result = rebuildStack(pillars, makeGlobal({ soloedPillar: 'drums' }));
    expect(result).toBeNull();
  });

  it('appends global effects chain', () => {
    const pillars = makePillars();
    pillars[0].code = 's("bd")';
    const result = rebuildStack(pillars, makeGlobal({ tempo: 120, beatsPerCycle: 4, masterVolume: 0.6, masterFilter: 0.5, intensity: 0.3 }));
    expect(result).toContain('.cps(0.5)');
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/pillars.test.js
```

Expected: failures on PILLAR_NAMES assertion, `returns 5 pillar objects`, `bass pillar has correct knob defaults`, `percussion pillar has correct knob defaults`.

---

### Task 4: Update pillars.js

**Files:**
- Modify: `src/pillars.js`

- [ ] **Step 1: Update PILLAR_NAMES and KNOB_DEFAULTS**

```js
export const PILLAR_NAMES = ['drums', 'bass', 'percussion', 'melody', 'transitions'];

const KNOB_DEFAULTS = {
  drums:       { gain: 0.8, drive: 0.0, decay: 0.12 },
  bass:        { gain: 0.7, cutoff: 1.0, stutter: 0.0 },
  percussion:  { gain: 0.6, decay: 0.12 },
  melody:      { gain: 0.5, cutoff: 0.6, resonance: 0.1, space: 0.2 },
  transitions: { gain: 0.4, hpf: 0.0, size: 0.5 },
};

export function makePillars() {
  return PILLAR_NAMES.map(name => ({
    name,
    code: '',
    muted: false,
    history: [],
    selectedId: null,
    lastMods: {},
    knobs: { ...KNOB_DEFAULTS[name] },
  }));
}

export function rebuildStack(pillars, globalState) {
  const { soloedPillar, tempo, beatsPerCycle = 4, masterVolume, masterFilter, intensity } = globalState;

  const active = pillars.filter(p => {
    if (soloedPillar) return p.name === soloedPillar && p.code.trim();
    return p.code.trim();
  });

  if (!active.length) return null;

  const inner = active.length === 1
    ? active[0].code
    : `stack(\n${active.map(p => p.code).join(',\n')}\n)`;

  const filterHz = Math.round(masterFilter * 18000 + 200);
  const cps = Math.round((tempo / (60 * beatsPerCycle)) * 1000) / 1000;
  return `${inner}.cps(${cps}).gain(${masterVolume}).lpf(${filterHz}).shape(${intensity}).room(${Math.round(intensity * 0.4 * 100) / 100})`;
}
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run tests/pillars.test.js
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/pillars.js tests/pillars.test.js
git commit -m "feat: update PILLAR_NAMES and knob defaults for bass/percussion split"
```

---

### Task 5: Update compiler.test.js

**Files:**
- Modify: `tests/compiler.test.js`

- [ ] **Step 1: Replace bass_percussion block with bass and percussion blocks**

Change the `defaults` map in `makePillar` and replace the `compileTrack — bass_percussion` describe block:

```js
import { describe, it, expect } from 'vitest';
import { compileTrack } from '../src/compiler.js';

function makePillar(name, knobOverrides = {}, muted = false) {
  const defaults = {
    drums:       { gain: 0.8, drive: 0.0, decay: 0.12 },
    bass:        { gain: 0.7, cutoff: 1.0, stutter: 0.0 },
    percussion:  { gain: 0.6, decay: 0.12 },
    melody:      { gain: 0.5, cutoff: 0.6, resonance: 0.1, space: 0.2 },
    transitions: { gain: 0.4, hpf: 0.0, size: 0.5 },
  };
  return { name, muted, knobs: { ...defaults[name], ...knobOverrides }, selectedId: null, lastMods: {} };
}

describe('compileTrack — drums', () => {
  it('wraps base pattern code in parens', () => {
    const pillar = makePillar('drums');
    const result = compileTrack({ selectedId: 'kick_sine_44', modifications: {} }, 'drums', pillar);
    expect(result).toMatch(/^\(s\("bd:0\*4"\)/);
  });

  it('appends gain, distort, decay from knobs', () => {
    const pillar = makePillar('drums', { gain: 0.8, drive: 0.5, decay: 0.2 });
    const result = compileTrack({ selectedId: 'kick_sine_44', modifications: {} }, 'drums', pillar);
    expect(result).toContain('.gain(0.8)');
    expect(result).toContain('.distort(0.2)');
    expect(result).toContain('.decay(0.2)');
  });

  it('muted track compiles to gain(0)', () => {
    const pillar = makePillar('drums', { gain: 0.8 }, true);
    const result = compileTrack({ selectedId: 'kick_sine_44', modifications: {} }, 'drums', pillar);
    expect(result).toContain('.gain(0)');
    expect(result).not.toContain('.gain(0.8)');
  });

  it('applies slowdown via .slow()', () => {
    const pillar = makePillar('drums');
    const result = compileTrack({ selectedId: 'kick_sine_44', modifications: { slowdown: 2 } }, 'drums', pillar);
    expect(result).toContain('.slow(2)');
  });

  it('applies speed via .fast() not .speed()', () => {
    const pillar = makePillar('drums');
    const result = compileTrack({ selectedId: 'kick_sine_44', modifications: { speed: 2.0 } }, 'drums', pillar);
    expect(result).toContain('.fast(2)');
    expect(result).not.toContain('.speed(');
  });

  it('does not append .slow(1) when slowdown is 1', () => {
    const pillar = makePillar('drums');
    const result = compileTrack({ selectedId: 'kick_sine_44', modifications: { slowdown: 1 } }, 'drums', pillar);
    expect(result).not.toContain('.slow(');
  });

  it('does not append .fast(1) when speed is 1.0', () => {
    const pillar = makePillar('drums');
    const result = compileTrack({ selectedId: 'kick_sine_44', modifications: { speed: 1.0 } }, 'drums', pillar);
    expect(result).not.toContain('.fast(');
  });
});

describe('compileTrack — bass', () => {
  it('appends gain, lpf, degradeBy from knobs', () => {
    const pillar = makePillar('bass', { gain: 0.7, cutoff: 0.5, stutter: 0.5 });
    const result = compileTrack({ selectedId: 'rumble_hypnotic', modifications: {} }, 'bass', pillar);
    expect(result).toContain('.gain(0.7)');
    expect(result).toContain('.lpf(600)');
    expect(result).toContain('.degradeBy(0.2)');
  });

  it('clamps lpf to minimum 80Hz when cutoff is 0', () => {
    const pillar = makePillar('bass', { cutoff: 0.0 });
    const result = compileTrack({ selectedId: 'rumble_hypnotic', modifications: {} }, 'bass', pillar);
    expect(result).toContain('.lpf(80)');
  });

  it('muted bass compiles to gain(0)', () => {
    const pillar = makePillar('bass', { gain: 0.7 }, true);
    const result = compileTrack({ selectedId: 'rumble_hypnotic', modifications: {} }, 'bass', pillar);
    expect(result).toContain('.gain(0)');
    expect(result).not.toContain('.gain(0.7)');
  });
});

describe('compileTrack — percussion', () => {
  it('appends gain and decay from knobs', () => {
    const pillar = makePillar('percussion', { gain: 0.6, decay: 0.2 });
    const result = compileTrack({ selectedId: 'perc_minimal_hats', modifications: {} }, 'percussion', pillar);
    expect(result).toContain('.gain(0.6)');
    expect(result).toContain('.decay(0.2)');
  });

  it('muted percussion compiles to gain(0)', () => {
    const pillar = makePillar('percussion', { gain: 0.6 }, true);
    const result = compileTrack({ selectedId: 'perc_minimal_hats', modifications: {} }, 'percussion', pillar);
    expect(result).toContain('.gain(0)');
    expect(result).not.toContain('.gain(0.6)');
  });
});

describe('compileTrack — melody', () => {
  it('appends gain, lpf, lpq, room, delay from knobs', () => {
    const pillar = makePillar('melody', { gain: 0.5, cutoff: 0.5, resonance: 0.4, space: 0.4 });
    const result = compileTrack({ selectedId: 'synthfx_hypnotic', modifications: {} }, 'melody', pillar);
    expect(result).toContain('.gain(0.5)');
    expect(result).toContain('.lpf(2000)');
    expect(result).toContain('.lpq(6)');
    expect(result).toContain('.room(0.34)');
    expect(result).toContain('.delay(0.2)');
  });

  it('clamps lpf to minimum 150Hz when cutoff is 0', () => {
    const pillar = makePillar('melody', { cutoff: 0.0 });
    const result = compileTrack({ selectedId: 'synthfx_hypnotic', modifications: {} }, 'melody', pillar);
    expect(result).toContain('.lpf(150)');
  });
});

describe('compileTrack — transitions', () => {
  it('appends gain, hpf, room, size from knobs', () => {
    const pillar = makePillar('transitions', { gain: 0.4, hpf: 0.5, size: 0.7 });
    const result = compileTrack({ selectedId: 'synthfx_dub', modifications: {} }, 'transitions', pillar);
    expect(result).toContain('.gain(0.4)');
    expect(result).toContain('.hpf(1250)');
    expect(result).toContain('.room(0.7)');
    expect(result).toContain('.size(0.7)');
  });
});

describe('compileTrack — edge cases', () => {
  it('returns empty string when pillar catalog is empty/unknown', () => {
    const pillar = makePillar('drums');
    const result = compileTrack({ selectedId: 'kick_sine_44', modifications: {} }, 'nonexistent_pillar', pillar);
    expect(result).toBe('');
  });

  it('falls back to first catalog entry when selectedId not found', () => {
    const pillar = makePillar('drums');
    const result = compileTrack({ selectedId: 'nonexistent_id', modifications: {} }, 'drums', pillar);
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles missing modifications gracefully', () => {
    const pillar = makePillar('drums');
    const result = compileTrack({ selectedId: 'kick_sine_44' }, 'drums', pillar);
    expect(result.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/compiler.test.js
```

Expected: failures on `bass` and `percussion` describe blocks.

---

### Task 6: Update compiler.js

**Files:**
- Modify: `src/compiler.js`

- [ ] **Step 1: Replace bass_percussion case with bass and percussion**

```js
import { soundLibrary } from './library/soundLibrary.js';

export function compileTrack(plan, pillarName, pillar) {
  const catalog = soundLibrary[pillarName] ?? [];
  const pattern = catalog.find(p => p.id === plan?.selectedId) ?? catalog[0];
  if (!pattern) return '';

  const mods = plan?.modifications ?? {};
  let code = `(${pattern.code})`;

  if (mods.slowdown > 1)               code += `.slow(${mods.slowdown})`;
  if (mods.speed && mods.speed !== 1.0) code += `.fast(${mods.speed})`;

  const effectiveGain = pillar.muted ? 0 : pillar.knobs.gain;
  code = applyKnobs(code, pillarName, pillar.knobs, effectiveGain);

  return code;
}

function applyKnobs(code, pillarName, knobs, effectiveGain) {
  switch (pillarName) {
    case 'drums':
      return `${code}.gain(${effectiveGain}).distort(${round(knobs.drive * 0.4)}).decay(${knobs.decay})`;
    case 'bass':
      return `${code}.gain(${effectiveGain}).lpf(${Math.max(80, round(knobs.cutoff * 1200))}).degradeBy(${round(knobs.stutter * 0.4)})`;
    case 'percussion':
      return `${code}.gain(${effectiveGain}).decay(${knobs.decay})`;
    case 'melody':
      return `${code}.gain(${effectiveGain}).lpf(${Math.max(150, round(knobs.cutoff * 4000))}).lpq(${round(knobs.resonance * 15)}).room(${round(knobs.space * 0.85)}).delay(${round(knobs.space * 0.5)})`;
    case 'transitions':
      return `${code}.gain(${effectiveGain}).hpf(${round(knobs.hpf * 2500)}).room(0.7).size(${knobs.size})`;
    default:
      return `${code}.gain(${effectiveGain})`;
  }
}

function round(v) {
  return Math.round(v * 100) / 100;
}
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run tests/compiler.test.js
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/compiler.js tests/compiler.test.js
git commit -m "feat: add bass and percussion compiler cases, remove bass_percussion"
```

---

### Task 7: Update validate.test.js

**Files:**
- Modify: `tests/validate.test.js`

- [ ] **Step 1: Replace bass_percussion references**

Find the two tests at the bottom of the `validatePlan` describe block and replace them:

```js
  it('validates bass IDs against bass catalog', () => {
    const r = validatePlan({ selectedId: 'rumble_acid' }, 'bass');
    expect(r.valid).toBe(true);
  });

  it('fails bass ID against wrong pillar catalog', () => {
    const r = validatePlan({ selectedId: 'rumble_acid' }, 'drums');
    expect(r.valid).toBe(false);
  });
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run tests/validate.test.js
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add tests/validate.test.js
git commit -m "test: update validate tests for bass/percussion split"
```

---

### Task 8: Update llm.js

**Files:**
- Modify: `src/llm.js`

- [ ] **Step 1: Replace TRACK_ROLES entry**

Change the `TRACK_ROLES` object:

```js
const TRACK_ROLES = {
  drums:       'rhythmic foundation — kicks, claps, hats',
  bass:        'low-end movement — bass lines, sub, rumble',
  percussion:  'rhythmic texture — hi-hats, rides, shakers',
  melody:      'harmonic content — synths, arps, leads',
  transitions: 'atmosphere and tension — sweeps, fx, build/drop triggers',
};
```

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```

Expected: all pass (llm.js has no unit tests, but confirm no regressions).

- [ ] **Step 3: Commit**

```bash
git add src/llm.js
git commit -m "feat: update LLM track roles for bass/percussion split"
```

---

### Task 9: Remove genre bar from app.js and index.html

**Files:**
- Modify: `app.js`
- Modify: `index.html`

- [ ] **Step 1: Remove the soundLibrary import from app.js**

Delete this line from app.js (it's the only import from that module):
```js
import { GENRE_NAMES, getGenreCode } from './src/library/soundLibrary.js';
```

- [ ] **Step 2: Remove loadGenre and genre bar wiring from app.js**

Delete the entire `Genre Loader` section (lines ~179–197):

```js
// ── Genre Loader ──────────────────────────────────────────

function loadGenre(genreName) {
  const genre = getGenreCode(genreName);
  if (!genre) return;
  for (const pillar of pillars) {
    pillar.code = genre[pillar.name] ?? '';
    updatePillarCode(pillar.name, pillar.code);
  }
  rebuildAndPlay();
  setStatus(`Loaded: ${genreName}`);
}

const genreBar = document.getElementById('genre-bar');
for (const name of GENRE_NAMES) {
  const btn = document.createElement('button');
  btn.className = 'btn-genre';
  btn.textContent = name.replace('_', ' ');
  btn.addEventListener('click', () => loadGenre(name));
  genreBar.appendChild(btn);
}
```

- [ ] **Step 3: Remove genre-bar from index.html**

Delete this line from index.html:
```html
<div id="genre-bar"></div>
```

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add app.js index.html
git commit -m "feat: remove genre bar and loadGenre machinery"
```

---

### Task 10: Final verification

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass, no references to `bass_percussion` or genre presets remain.

- [ ] **Step 2: Grep for stale references**

```bash
grep -r "bass_percussion\|GENRE_PRESETS\|GENRE_NAMES\|getGenreCode\|loadGenre\|genre-bar" src/ app.js index.html tests/
```

Expected: no output.
