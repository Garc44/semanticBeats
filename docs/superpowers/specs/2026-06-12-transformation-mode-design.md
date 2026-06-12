# Transformation Mode Design

**Date:** 2026-06-12  
**Scope:** Full Transformation Mode feature — library, state, compiler, LLM integration, UI toggle

---

## Problem

Generation Mode: LLM selects a pattern ID from `soundLibrary`. No way to layer live effects on top of a playing pattern.

Goal: Transformation Mode where the user types prompts like "make it underwater" or "add glitch" and the LLM mutates the audio effects on the active pattern — cumulatively, like turning knobs on a mixing console.

---

## Core Architecture: State-Object Merging

**Not string appending.** LLM returns a JSON patch of `{ transformId: value }`. That patch merges into a flat `pillar.transforms` object. Compiler always recompiles from base pattern + current transforms state. No string drift, no unbounded growth.

This gives cumulative UX (reverb persists when you add glitch) with one-shot backend (no state entanglement).

LLM never writes code. It only writes transform IDs and values.

---

## Section 1: `transformationsLibrary.js`

**Location:** `src/library/transformationsLibrary.js`

### Structure: Flat registry + pillar manifest

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
```

---

## Section 2: `pillar.transforms` State

Each pillar in `makePillars()` gains a `transforms: {}` field (LLM-owned).

```js
// pillars.js
{
  name, code: '', muted: false, history: [],
  selectedId: null, lastMods: {}, knobs: { ...KNOB_DEFAULTS[name] },
  transforms: {},   // ← new
  vizType: null,
}
```

### Merge function (lives in `app.js` alongside `handlePillarSend`)

```js
import { PILLAR_TRANSFORMS } from './library/transformationsLibrary.js';

function mergeLlmTransformPatch(pillar, llmPatch) {
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

Two guards: pillar-aware key validation + `false`/`null` normalized to deletion.

---

## Section 3: Compiler Integration

`compiler.js` appends transforms layer after the knob layer in a fixed, musically-correct signal chain order.

```js
// compiler.js addition
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
```

`compileTrack` calls `applyTransforms(code, pillar.transforms ?? {})` after `applyKnobs`.

Signal chain order rationale: structural mutations affect timing grid → distortion runs on raw signal → filters shape the spectrum → reverb/delay are always last (processing the already-shaped signal).

---

## Section 4: LLM Integration

New export in `llm.js`: `generateTransformPatch(pillarName, userPrompt, pillar)`

### What the LLM receives

- `activePattern`: `{ id, name, tags }` from `getPatternById` — artistic context without raw code
- `currentTransforms`: `pillar.transforms` — LLM knows what's active so it can adjust relatively
- `available`: `getTransformsForPillar(pillarName)` — only valid transforms for this pillar

**Do not pass raw Strudel code.** Reasons:
1. Syntax creep: seeing code makes Llama 3 more likely to return code instead of JSON
2. Wasteful: raw note arrays convey no artistic context the model can reason about

### System prompt structure

```
You are controlling live audio effects for a techno track's {pillarName} channel.

Active pattern: {name} — tags: {tags}

Current active transforms:
{currentTransforms as JSON}

Available transforms for this channel:
{available as JSON — id, method, type, range/values, description}

Return ONLY valid JSON — a flat object of { transformId: value } pairs.
- Set a value within its valid range to activate/update a transform
- Set a value to null to deactivate a transform  
- Omit transforms you don't want to change
- No prose. No markdown.
```

### Response handling

Parse → run through `mergeLlmTransformPatch` → trigger `rebuildAndPlay`.

---

## Section 5: UI Toggle

Two modes per pillar input area: **Generation** (existing) / **Transformation** (new).

Mode stored in `pillar.mode` (`'generation'` | `'transformation'`), defaults to `'generation'`.

`handlePillarSend` routes to `generateTransformationPlan` or `generateTransformPatch` based on `pillar.mode`.

UI detail (not fully specced here — separate UI design pass needed).

---

## Files Changed

| File | Change |
|------|--------|
| `src/library/transformationsLibrary.js` | **New** — TRANSFORMS registry, PILLAR_TRANSFORMS manifest, helper |
| `src/pillars.js` | Add `transforms: {}` to pillar shape |
| `src/compiler.js` | Import TRANSFORMS, add `applyTransforms`, call after `applyKnobs` |
| `src/llm.js` | Add `generateTransformPatch` export |
| `src/validate.js` | No changes needed — all transform methods already in ALLOWED_STRUDEL_FUNCTIONS |
| `app.js` | Add `mergeLlmTransformPatch`, route `handlePillarSend` by mode, add mode state |
| `src/ui.js` | Mode toggle button per pillar |

---

## What's Out of Scope

- UI design for the toggle (separate pass)
- Tests for new functions (add in implementation)
- `autoFixCode` — unchanged, still handles Transformation Mode failures
