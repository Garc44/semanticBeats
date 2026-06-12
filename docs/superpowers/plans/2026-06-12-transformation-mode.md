# Transformation Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Transformation Mode — a per-pillar LLM-driven effect layer where prompts like "make it underwater" mutate a state object that compiles into Strudel method chains, giving cumulative UX with one-shot backend.

**Architecture:** Each pillar gains a `transforms` flat object (LLM-owned, separate from knobs). `generateTransformPatch` asks the LLM to return `{ transformId: value }` pairs. `mergeLlmTransformPatch` validates and merges them. `compileTrack` appends the transform layer after the knob layer in a fixed musical signal chain order.

**Tech Stack:** Vanilla JS ES modules, Vitest, Strudel (@strudel/web), Ollama llama3.2:3b

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/library/transformationsLibrary.js` | **Create** | TRANSFORMS registry, PILLAR_TRANSFORMS manifest, `getTransformsForPillar`, `mergeLlmTransformPatch` |
| `tests/transformations.test.js` | **Create** | Tests for above |
| `src/pillars.js` | **Modify** | Add `transforms: {}` to pillar shape |
| `tests/pillars.test.js` | **Modify** | Add transforms field assertion |
| `src/compiler.js` | **Modify** | Add `DETERMINISTIC_AUDIO_CHAIN`, `applyTransforms`, call after `applyKnobs` |
| `tests/compiler.test.js` | **Modify** | Add transform compilation tests, update `makePillar` helper |
| `src/llm.js` | **Modify** | Add `generateTransformPatch` export |
| `tests/llm.test.js` | **Modify** | Add `generateTransformPatch` tests |
| `app.js` | **Modify** | Add `pillar.mode` field, route `handlePillarSend` by mode |
| `src/ui.js` | **Modify** | Add mode toggle button + `onModeToggle` callback to `renderPillar` |

---

## Task 1: transformationsLibrary.js

**Files:**
- Create: `src/library/transformationsLibrary.js`
- Create: `tests/transformations.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/transformations.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  TRANSFORMS,
  PILLAR_TRANSFORMS,
  getTransformsForPillar,
  mergeLlmTransformPatch,
} from '../src/library/transformationsLibrary.js';

describe('TRANSFORMS registry', () => {
  it('every entry has required fields', () => {
    for (const [id, t] of Object.entries(TRANSFORMS)) {
      expect(typeof t.method, id).toBe('string');
      expect(['numeric', 'boolean', 'enum'], id).toContain(t.type);
      expect(typeof t.description, id).toBe('string');
      if (t.type === 'numeric') {
        expect(typeof t.min, id).toBe('number');
        expect(typeof t.max, id).toBe('number');
        expect(t.min, id).toBeLessThan(t.max);
      }
      if (t.type === 'boolean') {
        expect(typeof t.compiled, id).toBe('string');
      }
      if (t.type === 'enum') {
        expect(Array.isArray(t.values), id).toBe(true);
        expect(t.values.length, id).toBeGreaterThan(0);
      }
    }
  });
});

describe('PILLAR_TRANSFORMS manifest', () => {
  const PILLAR_NAMES = ['drums', 'bass', 'percussion', 'melody', 'transitions'];

  it('has an entry for each pillar', () => {
    for (const name of PILLAR_NAMES) {
      expect(PILLAR_TRANSFORMS[name], name).toBeDefined();
      expect(Array.isArray(PILLAR_TRANSFORMS[name]), name).toBe(true);
    }
  });

  it('every referenced id exists in TRANSFORMS', () => {
    for (const [pillar, ids] of Object.entries(PILLAR_TRANSFORMS)) {
      for (const id of ids) {
        expect(TRANSFORMS[id], `${pillar}:${id}`).toBeDefined();
      }
    }
  });
});

describe('getTransformsForPillar', () => {
  it('returns only transforms in PILLAR_TRANSFORMS for that pillar', () => {
    const drumIds = PILLAR_TRANSFORMS['drums'];
    const result = getTransformsForPillar('drums');
    expect(result.map(t => t.id)).toEqual(drumIds);
  });

  it('each result entry includes id + all TRANSFORMS fields', () => {
    const result = getTransformsForPillar('melody');
    for (const t of result) {
      expect(typeof t.id).toBe('string');
      expect(typeof t.method).toBe('string');
      expect(typeof t.type).toBe('string');
    }
  });

  it('returns empty array for unknown pillar', () => {
    expect(getTransformsForPillar('unknown')).toEqual([]);
  });
});

describe('mergeLlmTransformPatch', () => {
  it('adds valid numeric transform to pillar.transforms', () => {
    const pillar = { name: 'drums', transforms: {} };
    mergeLlmTransformPatch(pillar, { crush: 4 });
    expect(pillar.transforms.crush).toBe(4);
  });

  it('adds valid boolean transform', () => {
    const pillar = { name: 'drums', transforms: {} };
    mergeLlmTransformPatch(pillar, { reverse: true });
    expect(pillar.transforms.reverse).toBe(true);
  });

  it('silently ignores transform not in PILLAR_TRANSFORMS for pillar', () => {
    const pillar = { name: 'drums', transforms: {} };
    mergeLlmTransformPatch(pillar, { vowel: 'o' }); // vowel not in drums
    expect(pillar.transforms.vowel).toBeUndefined();
  });

  it('deletes transform when value is null', () => {
    const pillar = { name: 'drums', transforms: { crush: 4 } };
    mergeLlmTransformPatch(pillar, { crush: null });
    expect(pillar.transforms.crush).toBeUndefined();
  });

  it('deletes transform when value is false (boolean false slip guard)', () => {
    const pillar = { name: 'drums', transforms: { reverse: true } };
    mergeLlmTransformPatch(pillar, { reverse: false });
    expect(pillar.transforms.reverse).toBeUndefined();
  });

  it('preserves existing transforms not present in patch', () => {
    const pillar = { name: 'drums', transforms: { reverb: 0.5, crush: 4 } };
    mergeLlmTransformPatch(pillar, { reverb: 0.8 });
    expect(pillar.transforms.crush).toBe(4);
    expect(pillar.transforms.reverb).toBe(0.8);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run tests/transformations.test.js
```

Expected: FAIL — `transformationsLibrary.js` not found.

- [ ] **Step 3: Create `src/library/transformationsLibrary.js`**

```js
export const TRANSFORMS = {
  // — Filtering —
  lopass:     { method: 'lpf',       type: 'numeric', min: 100,  max: 18000, default: null, description: 'low-pass filter cutoff Hz — lower = darker/muddier' },
  hipass:     { method: 'hpf',       type: 'numeric', min: 0,    max: 8000,  default: null, description: 'high-pass filter cutoff Hz — higher = thinner/airier' },
  lopass_q:   { method: 'lpq',       type: 'numeric', min: 0,    max: 40,    default: null, description: 'low-pass resonance — higher = more nasal/aggressive peak' },
  degrade:    { method: 'degradeBy', type: 'numeric', min: 0,    max: 0.9,   default: null, description: 'randomly drop events — higher = more sparse/glitchy' },

  // — Space —
  reverb:     { method: 'room',      type: 'numeric', min: 0,    max: 1,     default: null, description: 'reverb amount — higher = wetter/more spatial' },
  room_size:  { method: 'size',      type: 'numeric', min: 0.1,  max: 10,    default: null, description: 'reverb decay size — higher = larger acoustic space' },
  echo:       { method: 'delay',     type: 'numeric', min: 0,    max: 1,     default: null, description: 'delay/echo feedback amount' },

  // — Distortion / Texture —
  crush:      { method: 'crush',     type: 'numeric', min: 1,    max: 16,    default: null, description: 'bit crush depth — lower = more destroyed/lo-fi' },
  shape:      { method: 'shape',     type: 'numeric', min: 0,    max: 0.9,   default: null, description: 'waveshaper saturation — adds harmonic warmth/drive' },
  distort:    { method: 'distort',   type: 'numeric', min: 0,    max: 1,     default: null, description: 'hard clipping distortion' },
  vowel:      { method: 'vowel',     type: 'enum',    values: ['a','e','i','o','u'], default: null, description: 'formant filter — vowel shape applied to sound' },

  // — Rhythm / Timing —
  speed_up:   { method: 'fast',      type: 'numeric', min: 0.25, max: 8,     default: null, description: 'speed multiplier — doubles/quadruples rhythmic density' },
  slow_down:  { method: 'slow',      type: 'numeric', min: 2,    max: 8,     default: null, description: 'slow multiplier — halves/quarters rhythmic density' },
  iter:       { method: 'iter',      type: 'numeric', min: 2,    max: 8,     default: null, description: 'iterate pattern n times with offset — creates phasing' },
  ply:        { method: 'ply',       type: 'numeric', min: 2,    max: 4,     default: null, description: 'repeat each event n times — thickens pattern' },

  // — Structural —
  reverse:    { method: 'rev',       type: 'boolean', compiled: 'rev()',         default: false, description: 'reverse pattern direction' },
  palindrome: { method: 'palindrome',type: 'boolean', compiled: 'palindrome()',  default: false, description: 'play pattern forward then backward' },
  jux_rev:    { method: 'jux',       type: 'boolean', compiled: 'jux(rev)',      default: false, description: 'left channel normal, right reversed — wide stereo' },
  press:      { method: 'press',     type: 'boolean', compiled: 'press()',       default: false, description: 'push events to offbeat — syncopation/swing' },
};

export const PILLAR_TRANSFORMS = {
  drums:       ['crush', 'distort', 'shape', 'reverb', 'degrade', 'iter', 'ply', 'reverse', 'palindrome', 'jux_rev', 'press'],
  bass:        ['lopass', 'lopass_q', 'reverb', 'room_size', 'echo', 'degrade', 'speed_up', 'slow_down', 'shape', 'distort', 'crush'],
  percussion:  ['crush', 'distort', 'reverb', 'degrade', 'iter', 'ply', 'reverse', 'jux_rev'],
  melody:      ['lopass', 'lopass_q', 'hipass', 'reverb', 'room_size', 'echo', 'vowel', 'jux_rev', 'speed_up', 'slow_down', 'shape', 'degrade'],
  transitions: ['lopass', 'hipass', 'reverb', 'room_size', 'echo', 'speed_up', 'slow_down', 'iter', 'reverse'],
};

export function getTransformsForPillar(pillarName) {
  return (PILLAR_TRANSFORMS[pillarName] ?? []).map(id => ({ id, ...TRANSFORMS[id] }));
}

export function mergeLlmTransformPatch(pillar, llmPatch) {
  const allowed = PILLAR_TRANSFORMS[pillar.name] ?? [];
  for (const [id, value] of Object.entries(llmPatch)) {
    if (!allowed.includes(id)) {
      console.warn(`LLM attempted invalid transform "${id}" on "${pillar.name}". Ignored.`);
      continue;
    }
    if (value === null || value === false) delete pillar.transforms[id];
    else pillar.transforms[id] = value;
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run tests/transformations.test.js
```

Expected: PASS (all 12 tests).

- [ ] **Step 5: Commit**

```bash
git add src/library/transformationsLibrary.js tests/transformations.test.js
git commit -m "feat: add transformationsLibrary with TRANSFORMS registry, PILLAR_TRANSFORMS manifest, and mergeLlmTransformPatch"
```

---

## Task 2: pillars.js — add transforms field

**Files:**
- Modify: `src/pillars.js:11-22`
- Modify: `tests/pillars.test.js`

- [ ] **Step 1: Write the failing test**

Add to `tests/pillars.test.js` inside the existing `describe('makePillars', ...)` block:

```js
it('each pillar has an empty transforms object', () => {
  const pillars = makePillars();
  for (const p of pillars) {
    expect(p).toHaveProperty('transforms');
    expect(typeof p.transforms).toBe('object');
    expect(p.transforms).not.toBeNull();
    expect(Object.keys(p.transforms).length).toBe(0);
  }
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run tests/pillars.test.js
```

Expected: FAIL — `transforms` property not found.

- [ ] **Step 3: Update `makePillars` in `src/pillars.js`**

Change the returned object in `makePillars` (line ~14) to add `transforms: {}`:

```js
export function makePillars() {
  return PILLAR_NAMES.map(name => ({
    name,
    code: '',
    muted: false,
    history: [],
    selectedId: null,
    lastMods: {},
    knobs: { ...KNOB_DEFAULTS[name] },
    transforms: {},
    vizType: null,
  }));
}
```

- [ ] **Step 4: Run all tests — verify no regressions**

```bash
npx vitest run
```

Expected: All existing tests still pass + new test passes.

- [ ] **Step 5: Commit**

```bash
git add src/pillars.js tests/pillars.test.js
git commit -m "feat(pillars): add transforms field to pillar shape"
```

---

## Task 3: compiler.js — applyTransforms

**Files:**
- Modify: `src/compiler.js`
- Modify: `tests/compiler.test.js`

- [ ] **Step 1: Write the failing tests**

Add this block to `tests/compiler.test.js`. First update the `makePillar` helper to include `transforms`:

```js
function makePillar(name, knobOverrides = {}, muted = false, transforms = {}) {
  const defaults = {
    drums:       { gain: 0.8, drive: 0.0, decay: 0.12 },
    bass:        { gain: 0.7, cutoff: 1.0, stutter: 0.0 },
    percussion:  { gain: 0.6, decay: 0.12 },
    melody:      { gain: 0.5, cutoff: 0.6, resonance: 0.1, space: 0.2 },
    transitions: { gain: 0.4, hpf: 0.0, size: 0.5 },
  };
  return { name, muted, knobs: { ...defaults[name], ...knobOverrides }, selectedId: null, lastMods: {}, transforms };
}
```

Then add a new describe block:

```js
describe('compileTrack — transforms layer', () => {
  const drumPlan = { selectedId: 'kick_berghain_rumble', modifications: {} };
  const melodyPlan = { selectedId: 'melody_ostgut_synth', modifications: {} };

  it('numeric transform appended after knob layer', () => {
    const pillar = makePillar('drums', {}, false, { reverb: 0.7 });
    const code = compileTrack(drumPlan, 'drums', pillar);
    expect(code).toContain('.room(0.7)');
  });

  it('boolean transform appended using compiled form', () => {
    const pillar = makePillar('drums', {}, false, { reverse: true });
    const code = compileTrack(drumPlan, 'drums', pillar);
    expect(code).toContain('.rev()');
  });

  it('enum transform appended with quoted value', () => {
    const pillar = makePillar('melody', {}, false, { vowel: 'o' });
    const code = compileTrack(melodyPlan, 'melody', pillar);
    expect(code).toContain('.vowel("o")');
  });

  it('null transform value is skipped', () => {
    const pillar = makePillar('drums', {}, false, { reverb: null });
    const code = compileTrack(drumPlan, 'drums', pillar);
    expect(code).not.toContain('.room(');
  });

  it('boolean false transform is skipped', () => {
    const pillar = makePillar('drums', {}, false, { reverse: false });
    const code = compileTrack(drumPlan, 'drums', pillar);
    expect(code).not.toContain('.rev()');
  });

  it('empty transforms object leaves code unchanged', () => {
    const withTransforms = makePillar('drums', {}, false, {});
    const withoutTransforms = makePillar('drums', {}, false);
    const a = compileTrack(drumPlan, 'drums', withTransforms);
    const b = compileTrack(drumPlan, 'drums', withoutTransforms);
    expect(a).toBe(b);
  });

  it('deterministic order: crush before lpf before room', () => {
    const pillar = makePillar('drums', {}, false, { reverb: 0.5, crush: 4, degrade: 0.2 });
    const code = compileTrack(drumPlan, 'drums', pillar);
    const crushIdx = code.indexOf('.crush(');
    const degradeIdx = code.indexOf('.degradeBy(');
    const roomIdx = code.indexOf('.room(');
    expect(crushIdx).toBeGreaterThan(-1);
    expect(crushIdx).toBeLessThan(degradeIdx);
    expect(degradeIdx).toBeLessThan(roomIdx);
  });

  it('transforms compile after knob layer', () => {
    const pillar = makePillar('drums', { gain: 0.8 }, false, { reverb: 0.6 });
    const code = compileTrack(drumPlan, 'drums', pillar);
    const gainIdx = code.indexOf('.gain(0.8)');
    const roomIdx = code.indexOf('.room(0.6)');
    expect(gainIdx).toBeGreaterThan(-1);
    expect(gainIdx).toBeLessThan(roomIdx);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run tests/compiler.test.js
```

Expected: 8 new tests FAIL.

- [ ] **Step 3: Update `src/compiler.js`**

Replace the full file:

```js
import { soundLibrary } from './library/soundLibrary.js';
import { TRANSFORMS } from './library/transformationsLibrary.js';

const DETERMINISTIC_AUDIO_CHAIN = [
  // 1. Structural / Rhythmic
  'speed_up', 'slow_down', 'iter', 'ply', 'reverse', 'palindrome', 'jux_rev', 'press',
  // 2. Timbre / Distortion
  'crush', 'shape', 'distort', 'vowel',
  // 3. Filters & Drops
  'lopass', 'lopass_q', 'hipass', 'degrade',
  // 4. Spatial (always last)
  'reverb', 'room_size', 'echo',
];

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
  code = applyTransforms(code, pillar.transforms ?? {});

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

function applyTransforms(code, transforms) {
  for (const id of DETERMINISTIC_AUDIO_CHAIN) {
    const value = transforms[id];
    if (value === undefined || value === null || value === false) continue;
    const t = TRANSFORMS[id];
    if (!t) continue;
    if (t.type === 'numeric') code += `.${t.method}(${value})`;
    if (t.type === 'enum')    code += `.${t.method}("${value}")`;
    if (t.type === 'boolean' && value === true) code += `.${t.compiled}`;
  }
  return code;
}

function round(v) {
  return Math.round(v * 100) / 100;
}
```

- [ ] **Step 4: Run all tests — verify pass**

```bash
npx vitest run
```

Expected: All tests pass including 8 new transform tests.

- [ ] **Step 5: Commit**

```bash
git add src/compiler.js tests/compiler.test.js
git commit -m "feat(compiler): add applyTransforms with deterministic audio chain"
```

---

## Task 4: llm.js — generateTransformPatch

**Files:**
- Modify: `src/llm.js`
- Modify: `tests/llm.test.js`

- [ ] **Step 1: Write the failing tests**

Add this block to `tests/llm.test.js`:

Update the existing import at the top of `tests/llm.test.js` from:
```js
import { generateTransformationPlan } from '../src/llm.js';
```
to:
```js
import { generateTransformationPlan, generateTransformPatch } from '../src/llm.js';
```

Then add `mockPatchFetch` after the existing `mockFetch` helper:

```js
function mockPatchFetch(patch) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ message: { content: JSON.stringify(patch) } }),
  });
}

describe('generateTransformPatch', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('returns parsed patch object on valid response', async () => {
    mockPatchFetch({ reverb: 0.7, crush: 4 });
    const patch = await generateTransformPatch(
      'drums', 'make it gritty',
      { selectedId: 'kick_berghain_rumble', transforms: {} }
    );
    expect(patch).toEqual({ reverb: 0.7, crush: 4 });
  });

  it('returns null when fetch response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    const patch = await generateTransformPatch(
      'drums', 'test', { selectedId: 'kick_berghain_rumble', transforms: {} }
    );
    expect(patch).toBeNull();
  });

  it('returns null when response is an array (not object)', async () => {
    mockPatchFetch([1, 2, 3]);
    const patch = await generateTransformPatch(
      'drums', 'test', { selectedId: 'kick_berghain_rumble', transforms: {} }
    );
    expect(patch).toBeNull();
  });

  it('returns null on invalid JSON', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: 'not json at all' } }),
    });
    const patch = await generateTransformPatch(
      'drums', 'test', { selectedId: 'kick_berghain_rumble', transforms: {} }
    );
    expect(patch).toBeNull();
  });

  it('strips markdown fences before parsing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: '```json\n{"reverb": 0.5}\n```' } }),
    });
    const patch = await generateTransformPatch(
      'drums', 'test', { selectedId: 'kick_berghain_rumble', transforms: {} }
    );
    expect(patch).toEqual({ reverb: 0.5 });
  });

  it('includes currentTransforms in system prompt', async () => {
    mockPatchFetch({});
    await generateTransformPatch(
      'drums', 'test',
      { selectedId: 'kick_berghain_rumble', transforms: { crush: 4 } }
    );
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.messages[0].content).toContain('"crush": 4');
  });

  it('null patch value passes through (removal intent preserved for mergeLlmTransformPatch)', async () => {
    mockPatchFetch({ crush: null });
    const patch = await generateTransformPatch(
      'drums', 'remove the grit',
      { selectedId: 'kick_berghain_rumble', transforms: { crush: 4 } }
    );
    expect(patch).toEqual({ crush: null });
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run tests/llm.test.js
```

Expected: 7 new tests FAIL — `generateTransformPatch` not exported.

- [ ] **Step 3: Add `generateTransformPatch` to `src/llm.js`**

Add these imports at the top of `src/llm.js` (after existing imports):

```js
import { getTransformsForPillar } from './library/transformationsLibrary.js';
import { getPatternById } from './library/soundLibrary.js';
```

Then add this export at the bottom of `src/llm.js`:

```js
export async function generateTransformPatch(pillarName, userPrompt, pillar) {
  try {
    const available = getTransformsForPillar(pillarName);
    const pattern = getPatternById(pillarName, pillar.selectedId);

    const systemPrompt = `You are controlling live audio effects for a techno track's ${pillarName} channel.

Active pattern: ${pattern?.name ?? 'unknown'} — tags: ${(pattern?.tags ?? []).join(', ')}

Current active transforms:
${JSON.stringify(pillar.transforms ?? {}, null, 2)}

Available transforms for this channel:
${JSON.stringify(available.map(t => ({
  id: t.id,
  method: t.method,
  type: t.type,
  ...(t.type === 'numeric' ? { min: t.min, max: t.max } : {}),
  ...(t.type === 'enum' ? { values: t.values } : {}),
  description: t.description,
})), null, 2)}

Return ONLY valid JSON — a flat object of { transformId: value } pairs.
- Set a value within its valid range to activate/update a transform
- Set a value to null to deactivate a transform
- Omit transforms you don't want to change
- No prose. No markdown.`;

    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2:3b',
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
    const patch = JSON.parse(cleaned);

    if (typeof patch !== 'object' || Array.isArray(patch) || patch === null) return null;

    return patch;
  } catch {
    return null;
  }
}
```

> **Note:** `getPatternById` already exists in `soundLibrary.js` and is exported. Verify the import resolves before running tests.

- [ ] **Step 4: Run all tests — verify pass**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/llm.js tests/llm.test.js
git commit -m "feat(llm): add generateTransformPatch for Transformation Mode"
```

---

## Task 5: app.js — mode state and routing

**Files:**
- Modify: `app.js`

No unit tests for this task — app.js is DOM-wired orchestration. Manual verify in Task 6.

- [ ] **Step 1: Add mode field to pillar shape in `makePillars` call**

`makePillars` in `pillars.js` already adds `transforms: {}`. Mode is UI state owned by `app.js`, not pillar data — store it in a parallel map.

Add after the `const pillars = makePillars();` line at the top of `app.js`:

```js
const pillarModes = Object.fromEntries(
  PILLAR_NAMES.map(name => [name, 'generation'])
);
```

- [ ] **Step 2: Import new symbols at top of `app.js`**

Add to the existing imports block:

```js
import { generateTransformPatch } from './src/llm.js';
import { mergeLlmTransformPatch } from './src/library/transformationsLibrary.js';
```

- [ ] **Step 3: Update `handlePillarSend` to route by mode**

Replace the existing `handlePillarSend` function:

```js
async function handlePillarSend(pillarName, prompt) {
  const pillar = pillars.find(p => p.name === pillarName);
  addPillarMessage(pillarName, 'user', prompt);
  setStatus('Thinking...');

  const mode = pillarModes[pillarName];

  if (mode === 'transformation') {
    const patch = await generateTransformPatch(pillarName, prompt, pillar);
    if (!patch) {
      addPillarMessage(pillarName, 'error', 'Could not generate transform. Try rephrasing.');
      setStatus('Error');
      return;
    }
    const prevTransforms = { ...pillar.transforms };
    mergeLlmTransformPatch(pillar, patch);
    const newCode = compileTrack({ selectedId: pillar.selectedId, modifications: pillar.lastMods }, pillarName, pillar);
    if (!newCode) {
      pillar.transforms = prevTransforms;
      addPillarMessage(pillarName, 'error', 'Pattern assembly failed.');
      setStatus('Error');
      return;
    }
    addPillarPreviewMessage(
      pillarName,
      newCode,
      async () => {
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
        pillar.transforms = prevTransforms;
        setStatus('Ready');
      }
    );
    setStatus('Preview ready');
    return;
  }

  // generation mode (existing flow)
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

- [ ] **Step 4: Wire `onModeToggle` in the pillars loop**

In the `for (const pillar of pillars)` loop, add `onModeToggle` to the callbacks:

```js
const card = renderPillar(pillar, {
  onSend: (prompt) => handlePillarSend(pillar.name, prompt),
  onMute: () => handleMute(pillar.name),
  onSolo: () => handleSolo(pillar.name),
  onVizToggle: () => handleVizToggle(pillar.name),
  onModeToggle: () => {
    pillarModes[pillar.name] = pillarModes[pillar.name] === 'generation' ? 'transformation' : 'generation';
    updatePillarMode(pillar.name, pillarModes[pillar.name]);
  },
  onCodeEdit: (newCode) => {
    if (newCode === pillar.code) return;
    pillar.code = newCode;
    rebuildAndPlay();
  },
});
```

- [ ] **Step 5: Add `updatePillarMode` import**

Add `updatePillarMode` to the ui.js imports at the top of `app.js`:

```js
import {
  setStatus,
  renderGlobalControls,
  renderPillar,
  updatePillarCode,
  setPillarMuted,
  setPillarSoloed,
  addPillarMessage,
  addPillarPreviewMessage,
  updatePillarViz,
  updatePillarMode,          // ← add
} from './src/ui.js';
```

- [ ] **Step 6: Commit**

```bash
git add app.js
git commit -m "feat(app): add Transformation Mode routing and pillarModes state"
```

---

## Task 6: ui.js — mode toggle button

**Files:**
- Modify: `src/ui.js`

- [ ] **Step 1: Update `renderPillar` signature to accept `onModeToggle`**

Change line 79:

```js
export function renderPillar(pillar, { onSend, onMute, onSolo, onCodeEdit, onVizToggle, onModeToggle }) {
```

- [ ] **Step 2: Add the mode toggle button to the controls area**

After the `vizBtn` block (around line 115), add:

```js
const modeBtn = document.createElement('button');
modeBtn.className = 'btn-mode';
modeBtn.textContent = 'GEN';
modeBtn.title = 'Toggle Generation / Transformation mode';
modeBtn.addEventListener('click', onModeToggle);
```

Add `modeBtn` to controls before closing:

```js
controls.appendChild(muteBtn);
controls.appendChild(soloBtn);
controls.appendChild(vizBtn);
controls.appendChild(modeBtn);   // ← add
```

- [ ] **Step 3: Add `updatePillarMode` export to `src/ui.js`**

Add after the existing `updatePillarViz` function:

```js
export function updatePillarMode(name, mode) {
  const card = document.querySelector(`.pillar-card[data-pillar="${name}"]`);
  if (!card) return;
  const btn = card.querySelector('.btn-mode');
  if (!btn) return;
  btn.textContent = mode === 'transformation' ? 'TRX' : 'GEN';
  btn.classList.toggle('active', mode === 'transformation');
  const prompt = card.querySelector('.pillar-prompt');
  if (prompt) {
    prompt.placeholder = mode === 'transformation'
      ? 'add reverb, make it glitchy...'
      : 'describe changes...';
  }
}
```

- [ ] **Step 4: Add CSS for `.btn-mode` to `style.css`**

Find the existing `.btn-viz` rule and add `.btn-mode` alongside it. Check the existing button styles first:

```bash
grep -n "btn-viz\|btn-mute\|btn-solo" style.css | head -10
```

Then add `.btn-mode` to whichever rule covers the control buttons, giving it a neutral default and an `.active` state that uses the existing accent color.

Typical addition (adjust to match existing patterns):

```css
.btn-mode {
  font-size: 10px;
  padding: 2px 5px;
  opacity: 0.6;
}
.btn-mode.active {
  opacity: 1;
  color: #E8302A;
  border-color: #E8302A;
}
```

- [ ] **Step 5: Run all tests — no regressions**

```bash
npx vitest run
```

Expected: All tests pass (ui.js not tested, but nothing broken).

- [ ] **Step 6: Manual smoke test**

```bash
npm run dev
```

1. Open http://localhost:5173
2. Verify each pillar card shows a `GEN` button in the controls row
3. Click `GEN` on a pillar — button should change to `TRX` and prompt placeholder should change to "add reverb, make it glitchy..."
4. Click again — back to `GEN`
5. In `GEN` mode: type a prompt, send — should work as before (pattern selection)
6. In `TRX` mode with a pattern already loaded: type "add reverb", send — LLM should return a patch, preview card should appear
7. Apply the preview — pillar code should now include `.room(...)` at the end

- [ ] **Step 7: Commit**

```bash
git add src/ui.js style.css
git commit -m "feat(ui): add mode toggle button (GEN/TRX) per pillar with updatePillarMode"
```
