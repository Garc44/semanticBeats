# Studio Console Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor musicAgent's 4-pillar system with renamed channels, a clean compile chain, per-track effect knobs, and LLM cohesion awareness across channels.

**Architecture:** Each pillar object now carries `knobs`, `selectedId`, and `lastMods`. A new `compiler.js` owns the full compile chain: wrap base pattern code → apply LLM structural mods → append per-track knob layer. `llm.js` gains cohesion context (other channels' active IDs) and a richer system prompt. `ui.js` renders per-track knob sliders from live pillar state.

**Tech Stack:** Vanilla JS, Vite, Vitest, Strudel (`@strudel/web`), Ollama (`llama3:latest` at `localhost:11434`)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/library/soundLibrary.js` | Modify | Rename pillar keys, redistribute patterns, update GENRE_PRESETS |
| `src/pillars.js` | Modify | Rename pillars, add knobs/selectedId/lastMods to makePillars, remove assembleCode, fix rebuildStack |
| `src/compiler.js` | **Create** | Full compile chain: pattern → LLM mods → knob layer |
| `src/llm.js` | Modify | New signature, cohesion block, track roles, updated schema/validation |
| `src/ui.js` | Modify | TRACK_KNOBS constant, per-track slider rendering, onKnobChange |
| `app.js` | Modify | Knob handler, cohesion state, persist plan on pillar, import compiler |
| `src/patchEngine.js` | **Delete** | Replaced by compiler.js |
| `src/operations.js` | **Delete** | Replaced by compiler.js |
| `src/validate.js` | No change | Key-agnostic — works with any pillar name |
| `CLAUDE.md` | Modify | Update architecture docs |
| `tests/library.test.js` | Modify | Update pillar name constants |
| `tests/compiler.test.js` | **Create** | Tests for compileTrack |
| `tests/llm.test.js` | Modify | New signature, cohesion context, updated validation |
| `tests/patchEngine.test.js` | **Delete** | Module deleted |
| `tests/validate.test.js` | Verify | Confirm no pillar-specific references |

---

## Task 1: Update `soundLibrary.js` and its tests

**Files:**
- Modify: `src/library/soundLibrary.js`
- Modify: `tests/library.test.js`

- [ ] **Step 1: Replace soundLibrary.js content**

Replace the entire file with:

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
  ],
  bass_percussion: [
    { id: "rumble_hypnotic",      name: "Hypnotic Rumble",       tags: ["bass", "drone", "hypnotic", "minimal"],    code: `stack(note("c1 ~ c1 ~").s("moog").sustain(0).gain("0.1 1 1 1"), note("[c2,g2,bb2]").s("bass").slow(4).sustain(0).gain(0.2))` },
    { id: "rumble_acid",          name: "Acid Rumble Line",      tags: ["bass", "drone", "acid", "303"],            code: `stack(note("c1 eb1 g1 ~").s("bass").lpq(8).sustain(0).gain("0.1 1 1 1"), note("[c2,eb2]").s("bass").slow(4).sustain(0).gain(0.15))` },
    { id: "rumble_industrial",    name: "Industrial Rumble",     tags: ["bass", "drone", "industrial", "harsh"],    code: `stack(note("c1 ~ ~ c1").s("bass").sustain(0).gain("0.1 1 1 1"), note("c2").s("bass").slow(8).sustain(0).gain(0.1))` },
    { id: "rumble_dub",           name: "Deep Dub Chug",         tags: ["bass", "drone", "dub", "deep", "sub"],     code: `stack(note("c1 ~ ~ c1").s("bass").sustain(0).gain(0.9), note("[f2,c3]").s("moog").lpf(350).lpq(3).slow(6).gain(0.14))` },
    { id: "rumble_hardgroove",    name: "Rolling 16th Bass",     tags: ["bass", "rolling", "groove", "driving"],    code: `stack(note("~ c1 c1 ~ c1 c1 ~ c1").s("bass").lpf(160).sustain(0).gain(0.85), note("c1").s("bass").lpf(110).slow(4).gain(0.2))` },
    { id: "rumble_schranz",       name: "Schranz Noise Bass",    tags: ["bass", "drone", "schranz", "heavy"],       code: `stack(note("c1*4").s("fm").lpf(140).gain(0.8), note("c1*8").s("white").hp(120).lpf(300).gain(0.15))` },
    { id: "perc_minimal_hats",    name: "Minimal Hi-Hats",       tags: ["hats", "percussion", "subtle"],            code: `s("hh*8").bank("RolandTR909")` },
    { id: "perc_industrial_fast", name: "Rapid Industrial Hats", tags: ["hats", "percussion", "fast"],              code: `s("hh*16").bank("RolandTR909")` },
    { id: "perc_dub_openhat",     name: "Classic Open Hi-Hat",   tags: ["hats", "open", "offbeat"],                 code: `s("~ oh").bank("RolandTR808")` },
    { id: "perc_hardgroove_ride", name: "Sizzling Rave Ride",    tags: ["percussion", "ride", "groove"],            code: `s("~ hh*4").bank("RolandTR909")` },
    { id: "perc_schranz_shaker",  name: "Rapid Shaker Engine",   tags: ["percussion", "shaker", "fast"],            code: `stack(s("cp*4").bank("RolandTR909").gain(0.35), s("~ hh*16").bank("RolandTR909").gain(0.1))` },
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

export const GENRE_PRESETS = {
  techno: {
    drums:           "kick_sine_44",
    bass_percussion: "rumble_hypnotic",
    melody:          "synthfx_hypnotic",
    transitions:     "synthfx_dub",
  },
  hardgroove: {
    drums:           "kick_hardgroove",
    bass_percussion: "perc_hardgroove_ride",
    melody:          "synthfx_hardgroove",
    transitions:     "synthfx_dub",
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

- [ ] **Step 2: Update pillar name constants in `tests/library.test.js`**

Replace the `PILLAR_NAMES` constant and update all `getPatternById` / `getGenreCode` calls that reference old IDs:

```js
import { describe, it, expect } from 'vitest';
import { soundLibrary, GENRE_PRESETS, GENRE_NAMES, getPatternById, getGenreCode } from '../src/library/soundLibrary.js';

const PILLAR_NAMES = ['drums', 'bass_percussion', 'melody', 'transitions'];

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
    const p = getPatternById('drums', 'kick_sine_44');
    expect(p).not.toBeNull();
    expect(p.id).toBe('kick_sine_44');
  });

  it('returns pattern object with all required fields', () => {
    const p = getPatternById('bass_percussion', 'rumble_acid');
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

- [ ] **Step 3: Run library tests**

```bash
npx vitest run tests/library.test.js
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/library/soundLibrary.js tests/library.test.js
git commit -m "feat: rename pillars, redistribute patterns to drums/bass_percussion/melody/transitions"
```

---

## Task 2: Write `compiler.js` tests and implement

**Files:**
- Create: `tests/compiler.test.js`
- Create: `src/compiler.js`

- [ ] **Step 1: Write failing tests**

Create `tests/compiler.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { compileTrack } from '../src/compiler.js';

function makePillar(name, knobOverrides = {}, muted = false) {
  const defaults = {
    drums:           { gain: 0.8, drive: 0.0, decay: 0.12 },
    bass_percussion: { gain: 0.7, cutoff: 1.0, stutter: 0.0 },
    melody:          { gain: 0.5, cutoff: 0.6, resonance: 0.1, space: 0.2 },
    transitions:     { gain: 0.4, hpf: 0.0, size: 0.5 },
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

describe('compileTrack — bass_percussion', () => {
  it('appends gain, lpf, degradeBy from knobs', () => {
    const pillar = makePillar('bass_percussion', { gain: 0.7, cutoff: 0.5, stutter: 0.5 });
    const result = compileTrack({ selectedId: 'rumble_hypnotic', modifications: {} }, 'bass_percussion', pillar);
    expect(result).toContain('.gain(0.7)');
    expect(result).toContain('.lpf(600)');
    expect(result).toContain('.degradeBy(0.2)');
  });

  it('clamps lpf to minimum 80Hz when cutoff is 0', () => {
    const pillar = makePillar('bass_percussion', { cutoff: 0.0 });
    const result = compileTrack({ selectedId: 'rumble_hypnotic', modifications: {} }, 'bass_percussion', pillar);
    expect(result).toContain('.lpf(80)');
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
  it('returns empty string when pattern not found and catalog is empty', () => {
    const pillar = makePillar('drums');
    // nonexistent pillar → catalog is [] → catalog[0] is undefined → returns ''
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

Expected: FAIL — `Cannot find module '../src/compiler.js'`

- [ ] **Step 3: Implement `src/compiler.js`**

Create `src/compiler.js`:

```js
import { soundLibrary } from './library/soundLibrary.js';

export function compileTrack(plan, pillarName, pillar) {
  const catalog = soundLibrary[pillarName] ?? [];
  const pattern = catalog.find(p => p.id === plan?.selectedId) ?? catalog[0];
  if (!pattern) return '';

  const mods = plan?.modifications ?? {};
  let code = `(${pattern.code})`;

  if (mods.slowdown > 1)              code += `.slow(${mods.slowdown})`;
  if (mods.speed && mods.speed !== 1.0) code += `.fast(${mods.speed})`;

  const effectiveGain = pillar.muted ? 0 : pillar.knobs.gain;
  code = applyKnobs(code, pillarName, pillar.knobs, effectiveGain);

  return code;
}

function applyKnobs(code, pillarName, knobs, effectiveGain) {
  switch (pillarName) {
    case 'drums':
      return `${code}.gain(${effectiveGain}).distort(${round(knobs.drive * 0.4)}).decay(${knobs.decay})`;
    case 'bass_percussion':
      return `${code}.gain(${effectiveGain}).lpf(${Math.max(80, round(knobs.cutoff * 1200))}).degradeBy(${round(knobs.stutter * 0.4)})`;
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

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/compiler.test.js
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/compiler.js tests/compiler.test.js
git commit -m "feat: add compiler.js — compile chain replaces patchEngine"
```

---

## Task 3: Update `pillars.js`

**Files:**
- Modify: `src/pillars.js`

No new test file needed — compiler tests cover compileTrack; rebuildStack is covered by integration in app.

- [ ] **Step 1: Replace `pillars.js` content**

```js
import { soundLibrary } from './library/soundLibrary.js';

export const PILLAR_NAMES = ['drums', 'bass_percussion', 'melody', 'transitions'];

const KNOB_DEFAULTS = {
  drums:           { gain: 0.8, drive: 0.0, decay: 0.12 },
  bass_percussion: { gain: 0.7, cutoff: 1.0, stutter: 0.0 },
  melody:          { gain: 0.5, cutoff: 0.6, resonance: 0.1, space: 0.2 },
  transitions:     { gain: 0.4, hpf: 0.0, size: 0.5 },
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
  const { soloedPillar, tempo, masterVolume, masterFilter, intensity } = globalState;

  // Muted tracks compile to gain(0) — only filter by solo and empty code
  const active = pillars.filter(p => {
    if (soloedPillar) return p.name === soloedPillar && p.code.trim();
    return p.code.trim();
  });

  if (!active.length) return null;

  const inner = active.length === 1
    ? active[0].code
    : `stack(\n${active.map(p => p.code).join(',\n')}\n)`;

  const filterHz = Math.round(masterFilter * 18000 + 200);
  return `${inner}.cps(${tempo}).gain(${masterVolume}).lpf(${filterHz}).shape(${intensity}).room(${Math.round(intensity * 0.4 * 100) / 100})`;
}
```

Note: `assembleCode` is removed — it is replaced by `compileTrack` from `compiler.js`.

- [ ] **Step 2: Verify existing tests still pass**

```bash
npm test
```

Expected: library and compiler tests pass; patchEngine tests will still pass (file not yet deleted). llm and validate tests may reference old pillar names — that's OK, those are fixed in their own tasks.

- [ ] **Step 3: Commit**

```bash
git add src/pillars.js
git commit -m "feat: update pillars — rename channels, add knobs state, remove assembleCode"
```

---

## Task 4: Update `llm.js` and its tests

**Files:**
- Modify: `src/llm.js`
- Modify: `tests/llm.test.js`

- [ ] **Step 1: Write updated failing tests**

Replace `tests/llm.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateTransformationPlan } from '../src/llm.js';

function mockPlan(overrides = {}) {
  return {
    selectedId: 'kick_sine_44',
    explanation: 'Solid 4/4 kick for the foundation.',
    modifications: { speed: 1.0, slowdown: 1 },
    ...overrides,
  };
}

function mockFetch(plan) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ message: { content: JSON.stringify(plan) } }),
  });
}

describe('generateTransformationPlan', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns plan with selectedId on valid response', async () => {
    mockFetch(mockPlan());
    const result = await generateTransformationPlan('drums', 'make a kick', {});
    expect(result).not.toBeNull();
    expect(result.selectedId).toBe('kick_sine_44');
    expect(typeof result.explanation).toBe('string');
  });

  it('returns modifications object with speed and slowdown', async () => {
    mockFetch(mockPlan({ modifications: { speed: 1.5, slowdown: 2 } }));
    const result = await generateTransformationPlan('drums', 'slower kick', {});
    expect(result.modifications.speed).toBe(1.5);
    expect(result.modifications.slowdown).toBe(2);
  });

  it('includes track role in system prompt', async () => {
    mockFetch(mockPlan());
    await generateTransformationPlan('drums', 'make a kick', {});
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.messages[0].content).toContain('rhythmic foundation');
  });

  it('includes pillar catalog in system prompt', async () => {
    mockFetch(mockPlan({ selectedId: 'rumble_hypnotic' }));
    await generateTransformationPlan('bass_percussion', 'deep bass', {});
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.messages[0].content).toContain('rumble_hypnotic');
  });

  it('includes other channels in system prompt as cohesion context', async () => {
    mockFetch(mockPlan());
    const currentTracksState = { drums: 'kick_sine_44', bass_percussion: 'rumble_acid', transitions: null };
    await generateTransformationPlan('melody', 'add synth', currentTracksState);
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.messages[0].content).toContain('kick_sine_44');
    expect(body.messages[0].content).toContain('rumble_acid');
    expect(body.messages[0].content).not.toContain('melody'); // own channel excluded
  });

  it('returns null when fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    const result = await generateTransformationPlan('drums', 'kick', {});
    expect(result).toBeNull();
  });

  it('returns null when selectedId not in catalog', async () => {
    mockFetch(mockPlan({ selectedId: 'nonexistent_id' }));
    const result = await generateTransformationPlan('drums', 'kick', {});
    expect(result).toBeNull();
  });

  it('returns null when selectedId missing', async () => {
    mockFetch({ explanation: 'oops', modifications: {} });
    const result = await generateTransformationPlan('drums', 'kick', {});
    expect(result).toBeNull();
  });

  it('returns null when speed out of range [0.25, 4.0]', async () => {
    mockFetch(mockPlan({ modifications: { speed: 10.0, slowdown: 1 } }));
    const result = await generateTransformationPlan('drums', 'kick', {});
    expect(result).toBeNull();
  });

  it('returns null when speed is below 0.25', async () => {
    mockFetch(mockPlan({ modifications: { speed: 0.1, slowdown: 1 } }));
    const result = await generateTransformationPlan('drums', 'kick', {});
    expect(result).toBeNull();
  });

  it('returns null when slowdown is not an integer', async () => {
    mockFetch(mockPlan({ modifications: { speed: 1.0, slowdown: 1.5 } }));
    const result = await generateTransformationPlan('drums', 'kick', {});
    expect(result).toBeNull();
  });

  it('returns null when slowdown is less than 1', async () => {
    mockFetch(mockPlan({ modifications: { speed: 1.0, slowdown: 0 } }));
    const result = await generateTransformationPlan('drums', 'kick', {});
    expect(result).toBeNull();
  });

  it('strips markdown fences from LLM output', async () => {
    const wrapped = '```json\n' + JSON.stringify(mockPlan()) + '\n```';
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: wrapped } }),
    });
    const result = await generateTransformationPlan('drums', 'kick', {});
    expect(result).not.toBeNull();
    expect(result.selectedId).toBe('kick_sine_44');
  });

  it('never throws — returns null on JSON parse error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: 'not json at all' } }),
    });
    await expect(generateTransformationPlan('drums', 'kick', {})).resolves.toBeNull();
  });
});

describe('autoFixCode', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns fixed code string on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: 's("bd*4")' } }),
    });
    const { autoFixCode } = await import('../src/llm.js');
    const result = await autoFixCode('broken code', 'SyntaxError');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('throws on HTTP error', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const { autoFixCode } = await import('../src/llm.js');
    await expect(autoFixCode('broken', 'error')).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/llm.test.js
```

Expected: FAIL — signature mismatch, missing track role / cohesion logic, gain still validated.

- [ ] **Step 3: Implement updated `src/llm.js`**

Replace the entire file:

```js
import { soundLibrary } from './library/soundLibrary.js';

const TRACK_ROLES = {
  drums:           'rhythmic foundation — kicks, claps, hats',
  bass_percussion: 'low-end movement — bass lines, sub, perc hits',
  melody:          'harmonic content — synths, arps, leads',
  transitions:     'atmosphere and tension — sweeps, fx, build/drop triggers',
};

export async function generateTransformationPlan(pillarName, userPrompt, currentTracksState = {}) {
  try {
    const catalog = soundLibrary[pillarName] ?? [];
    const catalogSummary = catalog.map(p => ({ id: p.id, name: p.name, tags: p.tags }));

    const otherTracks = Object.entries(currentTracksState)
      .filter(([name]) => name !== pillarName)
      .map(([name, id]) => `- ${name}: ${id || '(empty)'}`)
      .join('\n');

    const systemPrompt = `You are an AI DJ selector for a techno live-coding system.
You are selecting a ${TRACK_ROLES[pillarName] ?? pillarName} pattern.

Other active channels:
${otherTracks || '(none)'}
Choose a pattern that fits musically with these.

Catalog:
${JSON.stringify(catalogSummary, null, 2)}

Return ONLY valid JSON. No prose. No markdown.
Schema: {"selectedId":"string","explanation":"string","modifications":{"speed":1.0,"slowdown":1}}
- selectedId: MUST be one of the IDs listed above
- explanation: one sentence
- speed: float 0.25–4.0 (default 1.0)
- slowdown: integer >= 1 (default 1)`;

    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3:latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const raw = data.message?.content ?? '';
    const cleaned = raw.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim();
    const plan = JSON.parse(cleaned);

    if (typeof plan.selectedId !== 'string' || !plan.selectedId) return null;
    if (!catalog.find(p => p.id === plan.selectedId)) return null;

    const mods = plan.modifications ?? {};
    if (mods.speed !== undefined && (typeof mods.speed !== 'number' || mods.speed < 0.25 || mods.speed > 4.0)) return null;
    if (mods.slowdown !== undefined && (!Number.isInteger(mods.slowdown) || mods.slowdown < 1)) return null;

    return { selectedId: plan.selectedId, explanation: plan.explanation ?? '', modifications: mods };
  } catch {
    return null;
  }
}

export async function autoFixCode(brokenCode, errorMsg) {
  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3:latest',
      messages: [
        { role: 'system', content: 'Fix the Strudel code. Return only the corrected code, no markdown.' },
        { role: 'user', content: `Error: ${errorMsg}\n\nCode:\n${brokenCode}` },
      ],
      stream: false,
    }),
  });
  if (!response.ok) throw new Error(`autoFixCode HTTP ${response.status}`);
  const data = await response.json();
  const raw = data.message?.content ?? '';
  return raw.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim();
}
```

- [ ] **Step 4: Run llm tests**

```bash
npx vitest run tests/llm.test.js
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/llm.js tests/llm.test.js
git commit -m "feat: update llm — new signature, cohesion context, track roles, drop gain validation"
```

---

## Task 5: Delete `patchEngine.js`, `operations.js`, and their tests

**Files:**
- Delete: `src/patchEngine.js`
- Delete: `src/operations.js`
- Delete: `tests/patchEngine.test.js`

- [ ] **Step 1: Delete the files**

```bash
rm src/patchEngine.js src/operations.js tests/patchEngine.test.js
```

- [ ] **Step 2: Run full test suite to confirm no broken imports**

```bash
npm test
```

Expected: all remaining tests pass (library, compiler, llm, validate).

- [ ] **Step 3: Commit**

```bash
git add -u
git commit -m "chore: delete patchEngine and operations — replaced by compiler.js"
```

---

## Task 6: Update `ui.js` — per-track knob sliders

**Files:**
- Modify: `src/ui.js`

No new test file — ui.js is DOM-manipulation only; not testable with Vitest (no integration tests per project convention).

- [ ] **Step 1: Add `TRACK_KNOBS` constant at top of `src/ui.js`**

Insert after existing imports (there are none — insert at the top of the file):

```js
const TRACK_KNOBS = {
  drums: [
    { key: 'gain',  label: 'Volume',     min: 0,    max: 1,   step: 0.01 },
    { key: 'drive', label: 'Saturation', min: 0,    max: 1,   step: 0.01 },
    { key: 'decay', label: 'Decay',      min: 0.01, max: 0.5, step: 0.01 },
  ],
  bass_percussion: [
    { key: 'gain',    label: 'Volume',  min: 0, max: 1, step: 0.01 },
    { key: 'cutoff',  label: 'Cutoff',  min: 0, max: 1, step: 0.01 },
    { key: 'stutter', label: 'Stutter', min: 0, max: 1, step: 0.01 },
  ],
  melody: [
    { key: 'gain',      label: 'Volume',    min: 0, max: 1, step: 0.01 },
    { key: 'cutoff',    label: 'Cutoff',    min: 0, max: 1, step: 0.01 },
    { key: 'resonance', label: 'Resonance', min: 0, max: 1, step: 0.01 },
    { key: 'space',     label: 'Space',     min: 0, max: 1, step: 0.01 },
  ],
  transitions: [
    { key: 'gain', label: 'Volume', min: 0, max: 1, step: 0.01 },
    { key: 'hpf',  label: 'HPF',    min: 0, max: 1, step: 0.01 },
    { key: 'size', label: 'Size',   min: 0, max: 1, step: 0.01 },
  ],
};
```

- [ ] **Step 2: Update `renderPillar` signature and add knob section**

The current signature is:
```js
export function renderPillar(pillar, { onSend, onMute, onSolo, onCodeEdit })
```

Change to:
```js
export function renderPillar(pillar, { onSend, onMute, onSolo, onCodeEdit, onKnobChange })
```

Then add a knob section between the header and `codeEl`. Insert this block after `card.appendChild(header)`:

```js
const knobSpecs = TRACK_KNOBS[pillar.name] ?? [];
if (knobSpecs.length) {
  const knobSection = document.createElement('div');
  knobSection.className = 'pillar-knobs';

  for (const spec of knobSpecs) {
    const group = document.createElement('div');
    group.className = 'knob-group';

    const label = document.createElement('label');
    const valueSpan = document.createElement('span');
    valueSpan.className = 'knob-value';

    // CRITICAL: read live pillar state — pillar.knobs is always initialized by makePillars
    // renderPillar is called on re-renders; do NOT use a hardcoded default here or knobs reset
    const currentVal = pillar.knobs[spec.key];
    valueSpan.textContent = currentVal.toFixed(2);
    label.textContent = spec.label + ' ';
    label.appendChild(valueSpan);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = spec.min;
    input.max = spec.max;
    input.step = spec.step;
    input.value = currentVal;
    input.dataset.key = spec.key;
    input.addEventListener('input', () => {
      const val = parseFloat(input.value);
      valueSpan.textContent = val.toFixed(2);
      onKnobChange(spec.key, val);
    });

    group.appendChild(label);
    group.appendChild(input);
    knobSection.appendChild(group);
  }

  card.appendChild(knobSection);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/ui.js
git commit -m "feat: add per-track knob sliders to renderPillar"
```

---

## Task 7: Update `app.js` — wiring

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Update imports**

Replace:
```js
import { PILLAR_NAMES, makePillars, rebuildStack, assembleCode } from './src/pillars.js';
```

With:
```js
import { PILLAR_NAMES, makePillars, rebuildStack } from './src/pillars.js';
import { compileTrack } from './src/compiler.js';
```

- [ ] **Step 2: Update `handlePillarSend` — new LLM signature + cohesion context + persist plan**

Replace the existing `handlePillarSend` function:

```js
async function handlePillarSend(pillarName, prompt) {
  const pillar = pillars.find(p => p.name === pillarName);
  addPillarMessage(pillarName, 'user', prompt);
  setStatus('Selecting...');

  const currentTracksState = Object.fromEntries(
    pillars.map(p => [p.name, p.selectedId ?? null])
  );

  const plan = await generateTransformationPlan(pillarName, prompt, currentTracksState);

  if (!plan) {
    addPillarMessage(pillarName, 'error', 'Could not select pattern. Try rephrasing.');
    setStatus('Error');
    return;
  }

  const newCode = compileTrack(plan, pillarName, pillar);
  if (!newCode) {
    addPillarMessage(pillarName, 'error', 'Pattern assembly failed.');
    setStatus('Error');
    return;
  }

  const prevCode = pillar.code;
  const prevSelectedId = pillar.selectedId;
  const prevLastMods = pillar.lastMods;

  addPillarPreviewMessage(
    pillarName,
    newCode,
    async () => {
      pillar.selectedId = plan.selectedId;
      pillar.lastMods = plan.modifications ?? {};
      pillar.code = newCode;
      updatePillarCode(pillarName, newCode);
      await rebuildAndPlay();
      if (!globalState.isPlaying) {
        const stack = rebuildStack(pillars, globalState);
        if (stack) {
          await play(stack);
          globalState.isPlaying = true;
          playBtn.textContent = '■ Stop';
        }
      }
      setStatus('Applied');
    },
    () => {
      pillar.code = prevCode;
      pillar.selectedId = prevSelectedId;
      pillar.lastMods = prevLastMods;
      setStatus('Ready');
    }
  );

  setStatus('Preview ready');
}
```

- [ ] **Step 3: Update `renderPillar` call — add `onKnobChange`**

Replace the existing `renderPillar` call block inside the `for (const pillar of pillars)` loop:

```js
for (const pillar of pillars) {
  const card = renderPillar(pillar, {
    onSend: (prompt) => handlePillarSend(pillar.name, prompt),
    onMute: () => handleMute(pillar.name),
    onSolo: () => handleSolo(pillar.name),
    onCodeEdit: (newCode) => {
      if (newCode === pillar.code) return;
      pillar.code = newCode;
      rebuildAndPlay();
    },
    onKnobChange: (key, value) => {
      pillar.knobs[key] = value;
      if (pillar.selectedId) {
        pillar.code = compileTrack(
          { selectedId: pillar.selectedId, modifications: pillar.lastMods ?? {} },
          pillar.name,
          pillar
        );
        updatePillarCode(pillar.name, pillar.code);
      }
      debouncedRebuild();
    },
  });
  pillarsRow.appendChild(card);
}
```

- [ ] **Step 4: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "feat: wire per-track knobs, cohesion context, and compile chain into app.js"
```

---

## Task 8: Update `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the Architecture section**

In `CLAUDE.md`, update the pipeline comment and module descriptions to reflect:
- Pillar names: `drums`, `bass_percussion`, `melody`, `transitions`
- `src/compiler.js` added (owns full compile chain)
- `src/patchEngine.js` and `src/operations.js` deleted
- `generateTransformationPlan` new signature: `(pillarName, userPrompt, currentTracksState)`
- `compileTrack(plan, pillarName, pillar)` replaces `assembleCode`
- LLM plan shape no longer has `gain` in modifications
- `rebuildStack` no longer filters muted tracks (muted = `.gain(0)` in compiled code)

Update the plan shape docs:
```
// LLM output shape
{ selectedId: "string", explanation: "string", modifications: { speed: 1.0, slowdown: 1 } }
// speed: float 0.25–4.0; slowdown: integer >= 1
```

Update the test count:
- `tests/compiler.test.js` — `compileTrack` (14 cases)
- `tests/library.test.js` — `soundLibrary`, `GENRE_PRESETS`, `getPatternById`, `getGenreCode`
- `tests/llm.test.js` — `generateTransformationPlan` (13 cases), `autoFixCode` (2 cases)
- `tests/validate.test.js` — `validateCode`, `validatePlan` (unchanged)
- `tests/patchEngine.test.js` — **deleted**

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for studio console architecture"
```

---

## Task 9: Final verification

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: all tests pass, zero failures.

- [ ] **Step 2: Start dev server and verify manually**

```bash
npm run dev
```

Open `http://localhost:5173`. Verify:
1. Four pillar cards render: DRUMS, BASS PERCUSSION, MELODY, TRANSITIONS
2. Each card shows its track-specific knob sliders
3. Moving a knob slider does not reset to default on re-render (mute/solo a track, knob stays)
4. Genre buttons (TECHNO, HARDGROOVE) load patterns into the correct pillars
5. Sending a prompt to a pillar calls the LLM and shows a preview card
6. Applying the preview recompiles with current knob values

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: studio console refactor complete"
```
