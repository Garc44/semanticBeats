# Studio Console Refactor — Design Spec
**Date:** 2026-06-08

## Summary

Refactor musicAgent from a single-prompt canvas into a 4-channel multi-track studio console. Each channel is a named pillar with its own pattern library, per-track effect knobs, and an LLM agent that selects patterns with awareness of what the other channels are playing.

Architectural guardrails are preserved: LLM outputs only IDs + structural modifiers, all pattern code lives in the hardcoded library, failures return null.

---

## 1. Pillar Rename

| Old Name     | New Name         | Role                                          |
|--------------|------------------|-----------------------------------------------|
| `kick`       | `drums`          | Rhythmic foundation — kicks, claps, hats      |
| `rumble_bass`| `bass_percussion`| Low-end movement — bass lines, sub, perc hits |
| `groove`     | `melody`         | Harmonic content — synths, arps, leads        |
| `synth_fx`   | `transitions`    | Atmosphere and tension — sweeps, fx, build/drop |

All pillar name references update across: `pillars.js`, `soundLibrary.js`, `llm.js`, `app.js`, `ui.js`.

---

## 2. Data Model — Pillar Object

Each pillar object gains `knobs`, `selectedId`, and `lastMods` fields:

```js
// drums
{ name: 'drums', code: '', muted: false, history: [], selectedId: null, lastMods: {},
  knobs: { gain: 0.8, drive: 0.0, decay: 0.12 } }

// bass_percussion
{ name: 'bass_percussion', code: '', muted: false, history: [], selectedId: null, lastMods: {},
  knobs: { gain: 0.7, cutoff: 1.0, stutter: 0.0 } }

// melody
{ name: 'melody', code: '', muted: false, history: [], selectedId: null, lastMods: {},
  knobs: { gain: 0.5, cutoff: 0.6, resonance: 0.1, space: 0.2 } }

// transitions
{ name: 'transitions', code: '', muted: false, history: [], selectedId: null, lastMods: {},
  knobs: { gain: 0.4, hpf: 0.0, size: 0.5 } }
```

`selectedId` and `lastMods` are stored after each LLM apply so knob changes can recompile without re-calling the LLM.

---

## 3. Sound Library (`src/library/soundLibrary.js`)

Keys rename to match new pillar names. Pattern content redistributed so each pillar's library matches its role. Gain, decay, and distort calls are stripped from individual pattern code — these are now owned exclusively by the knob compiler layer.

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
    { id: "synthfx_hypnotic",   name: "Hypnotic Synth Arp",      tags: ["melody", "minor", "subtle"],           code: `stack(note("c3 eb3 g3 bb3").s("arpy").sustain(0).slow(2).gain(0.3), note("~ ~ ~ c1").s("fm").sustain(0).gain(0.35))` },
    { id: "synthfx_acid",       name: "Acid Synth Squelch",      tags: ["melody", "acid", "303", "resonance"],  code: `stack(note("c3 ~ eb3 ~ g3 ~ bb3 ~").s("bass").sustain(0).gain(0.35), note("c2*2").s("fm").sustain(0).gain(0.30))` },
    { id: "synthfx_industrial", name: "Industrial Melodic Line", tags: ["melody", "industrial", "harsh"],       code: `stack(note("c3 c3 eb3 c3").s("fm").sustain(0).gain(0.25), note("~ ~ ~ c1").s("fm").sustain(0).gain(0.4))` },
    { id: "synthfx_hardgroove", name: "Peak Time Rave Hook",     tags: ["melody", "rave", "energetic"],         code: `stack(note("c4 g3 c4 eb4").s("juno").sustain(0).fast(2).gain(0.18), note("~ ~ c3 ~").s("arpy").gain(0.3))` },
  ],

  transitions: [
    { id: "synthfx_dub",     name: "Dub Echo Pad Stab",   tags: ["atmosphere", "dub", "chord", "spacey"],  code: `stack(note("[c3,eb3,g3,bb3]*2").s("juno").sustain(0).slow(2).gain(0.4), note("c6").s("pad").slow(4).gain(0.1))` },
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
```

---

## 4. Compiler (`src/compiler.js`) — replaces `patchEngine.js` + `operations.js`

`patchEngine.js` and `operations.js` are deleted. New `compiler.js` owns the full compile chain.

**Compile chain per track:**
```
pattern.code → wrap in parens → +LLM mods (slow/fast) → +knob layer → final code string
```

```js
export function compileTrack(plan, pillarName, pillar) {
  const catalog = soundLibrary[pillarName] ?? [];
  const pattern = catalog.find(p => p.id === plan.selectedId) ?? catalog[0];
  if (!pattern) return '';

  const mods = plan.modifications ?? {};
  let code = `(${pattern.code})`;

  // Inner layer — LLM structural mods
  // .slow() for rhythmic slowdown; .fast() for rhythmic speed-up (NOT .speed() which warps pitch)
  if (mods.slowdown > 1)     code += `.slow(${mods.slowdown})`;
  if (mods.speed && mods.speed !== 1.0) code += `.fast(${mods.speed})`;

  // Outer layer — per-track knob state
  // Muted tracks compile to gain(0) rather than being filtered from the stack
  const effectiveGain = pillar.muted ? 0 : pillar.knobs.gain;
  code += applyKnobs(code, pillarName, pillar.knobs, effectiveGain);

  return code;
}

function applyKnobs(code, pillarName, knobs, effectiveGain) {
  switch (pillarName) {
    case 'drums':
      return `(${code}).gain(${effectiveGain}).distort(${knobs.drive * 0.4}).decay(${knobs.decay})`;
    case 'bass_percussion':
      return `(${code}).gain(${effectiveGain}).lpf(${Math.max(80, knobs.cutoff * 1200)}).degradeBy(${knobs.stutter * 0.4})`;
    case 'melody':
      return `(${code}).gain(${effectiveGain}).lpf(${Math.max(150, knobs.cutoff * 4000)}).lpq(${knobs.resonance * 15}).room(${knobs.space * 0.85}).delay(${knobs.space * 0.5})`;
    case 'transitions':
      return `(${code}).gain(${effectiveGain}).hpf(${knobs.hpf * 2500}).room(0.7).size(${knobs.size})`;
    default:
      return `(${code}).gain(${effectiveGain})`;
  }
}
```

**Key invariants:**
- Always wrap base code in `(...)` before appending modifiers — prevents operator precedence errors in Strudel runtime when pattern code contains inner `stack()` calls
- Use `.fast()` not `.speed()` for rhythmic tempo changes; `.speed()` warps sample pitch
- Muted state collapses to `.gain(0)` — `rebuildStack` does not filter muted tracks

`assembleCode` in `pillars.js` is deleted and replaced by `compileTrack` from `compiler.js`.

---

## 5. LLM (`src/llm.js`)

### Signature
```js
generateTransformationPlan(pillarName, userPrompt, currentTracksState)
// currentTracksState: { drums: "kick_sine_44", bass_percussion: null, ... }
```

### Track role context
```js
const TRACK_ROLES = {
  drums:           'rhythmic foundation — kicks, claps, hats',
  bass_percussion: 'low-end movement — bass lines, sub, perc hits',
  melody:          'harmonic content — synths, arps, leads',
  transitions:     'atmosphere and tension — sweeps, fx, build/drop triggers',
};
```

### System prompt includes:
1. Track role line: `"You are selecting a ${TRACK_ROLES[pillarName]} pattern."`
2. Catalog snapshot (id, name, tags only)
3. Cohesion block — other channels' active IDs:
```js
const otherTracks = Object.entries(currentTracksState)
  .filter(([name]) => name !== pillarName)
  .map(([name, id]) => `- ${name}: ${id || '(empty)'}`)
  .join('\n');
// injected: "Other active channels:\n{otherTracks}\nChoose a pattern that fits musically."
```

### Target schema
```json
{ "selectedId": "string", "explanation": "string", "modifications": { "speed": 1.0, "slowdown": 1 } }
```

### Validation — return `null` on any of:
- JSON malformed or not an object
- `selectedId` not a string or not found in `soundLibrary[pillarName]`
- `modifications.speed` not a float or outside `[0.25, 4.0]`
- `modifications.slowdown` not an integer or `< 1`

`gain` removed from schema and validation entirely. Never throws — all error paths return `null`.

---

## 6. UI (`src/ui.js`)

### Per-track knob sliders

`renderPillar` receives the full pillar object and an `onKnobChange` callback:

```js
renderPillar(pillar, { onSend, onMute, onSolo, onCodeEdit, onKnobChange })
```

Knob definitions are hardcoded in `ui.js`:

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

Sliders render between the pillar header and the code display.

**Critical render rule:** sliders must read live pillar state first, fall back to default only if uninitialized. `renderPillar` is called on re-renders (mute/solo toggle, LLM apply) — reading defaults would reset user-adjusted knobs.

```js
// CORRECT
input.value = pillar.knobs[key] ?? spec.default

// WRONG — resets on every re-render
input.value = spec.default
```

All other `ui.js` exports (mute/solo, chat messages, preview card, code display) are unchanged.

---

## 7. App Wiring (`app.js`)

### Knob change handler

```js
onKnobChange: (key, value) => {
  pillar.knobs[key] = value;
  if (pillar.selectedId) {
    pillar.code = compileTrack(
      { selectedId: pillar.selectedId, modifications: pillar.lastMods ?? {} },
      pillar.name,
      pillar
    );
  }
  debouncedRebuild();
}
```

### Cohesion context built per send

```js
async function handlePillarSend(pillarName, prompt) {
  const currentTracksState = Object.fromEntries(
    pillars.map(p => [p.name, p.selectedId ?? null])
  );
  const plan = await generateTransformationPlan(pillarName, prompt, currentTracksState);
  // ...
}
```

### After apply, persist plan on pillar

```js
pillar.selectedId = plan.selectedId;
pillar.lastMods = plan.modifications ?? {};
pillar.code = compileTrack(plan, pillar.name, pillar);
```

### `rebuildStack` change

Muted tracks now compile to `.gain(0)` — `rebuildStack` stacks all tracks with non-empty code, no mute filter. Solo filter remains: only the soloed track's code enters the stack.

---

## 8. Files Changed

| File | Action |
|------|--------|
| `src/library/soundLibrary.js` | Rename keys, redistribute content, update GENRE_PRESETS |
| `src/pillars.js` | Rename pillars, add knobs/selectedId/lastMods to makePillars, remove assembleCode, update rebuildStack |
| `src/compiler.js` | **New file** — owns full compile chain |
| `src/patchEngine.js` | **Deleted** |
| `src/operations.js` | **Deleted** |
| `src/llm.js` | New signature, cohesion context, track roles, updated schema/validation |
| `src/ui.js` | Add TRACK_KNOBS, per-track slider rendering, onKnobChange wiring |
| `app.js` | knob handler, cohesion state, persist plan on pillar, import compiler |
| `src/validate.js` | Update pillar name references |
| `CLAUDE.md` | Update architecture docs |

---

## 9. Invariants Preserved

- LLM outputs only `selectedId` + structural modifiers — never raw code
- All pattern code lives in hardcoded `soundLibrary.js`
- `generateTransformationPlan` returns `null` on all failures, never throws
- `compileTrack` returns `''` on missing pattern (safe — rebuildStack skips empty)
