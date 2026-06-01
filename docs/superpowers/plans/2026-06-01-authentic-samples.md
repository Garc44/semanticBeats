# Authentic Samples Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all synthesized oscillator patterns with authentic hardware drum machine samples (tidal-drum-machines) and vintage instrument samples (dirt-samples).

**Architecture:** `strudel.js` prebakes two sample packs on init. `soundLibrary.js` swaps 24 oscillator patterns for sample-based equivalents — drums drop `note()`/`penv()` and use `.bank()` notation, pitched pillars keep `note()`/`stack()` and swap the synth name only.

**Tech Stack:** `@strudel/web` (`samples` function), tidal-drum-machines JSON, dirt-samples GitHub pack, Vite dev server

**Spec:** `docs/superpowers/specs/2026-06-01-authentic-samples-design.md`

---

## File Map

| File | Change |
|------|--------|
| `src/strudel.js` | Add `samples` to import, replace `initStrudel({})` with prebake block |
| `src/library/soundLibrary.js` | Rewrite all 24 patterns across kick / groove / rumble_bass / synth_fx |

No new files. No test changes (patterns are data; `library.test.js` tests `expandStyle` logic, not pattern strings).

---

## Task 1: Update `strudel.js` — prebake sample packs

**Files:**
- Modify: `src/strudel.js`

- [ ] **Step 1: Replace the import line**

Open `src/strudel.js`. Change line 1 from:

```js
import { initStrudel, evaluate as _evaluate, hush } from '@strudel/web';
```

to:

```js
import { initStrudel, samples, evaluate as _evaluate, hush } from '@strudel/web';
```

- [ ] **Step 2: Replace the `init()` body**

Replace the entire `init()` function:

```js
export async function init() {
  await initStrudel({});
  initialized = true;
}
```

with:

```js
export async function init() {
  try {
    await initStrudel({
      prebake: () => Promise.all([
        samples('https://raw.githubusercontent.com/felixroos/dough-samples/main/tidal-drum-machines.json'),
        samples('github:tidalcycles/dirt-samples')
      ])
    });
    initialized = true;
    console.log("Strudel sample packs baked successfully.");
  } catch (error) {
    console.error("Failed to preload Strudel sample packs:", error);
    throw error;
  }
}
```

- [ ] **Step 3: Verify the full file looks correct**

`src/strudel.js` should now be:

```js
import { initStrudel, samples, evaluate as _evaluate, hush } from '@strudel/web';

let initialized = false;

export async function init() {
  try {
    await initStrudel({
      prebake: () => Promise.all([
        samples('https://raw.githubusercontent.com/felixroos/dough-samples/main/tidal-drum-machines.json'),
        samples('github:tidalcycles/dirt-samples')
      ])
    });
    initialized = true;
    console.log("Strudel sample packs baked successfully.");
  } catch (error) {
    console.error("Failed to preload Strudel sample packs:", error);
    throw error;
  }
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
  } else {
    console.warn('setcpm: window.setcpm not available');
  }
}
```

- [ ] **Step 4: Run tests to confirm nothing broken**

```bash
npm test
```

Expected: all 40 tests pass. (strudel.js is not tested directly — this verifies nothing else regressed.)

- [ ] **Step 5: Commit**

```bash
git add src/strudel.js
git commit -m "feat: prebake tidal-drum-machines and dirt-samples on init"
```

---

## Task 2: Rewrite `kick` pillar patterns

**Files:**
- Modify: `src/library/soundLibrary.js` — `kick` array only

**Rules:**
- Drop `note()` — drums don't need pitch
- Drop `penv()` — transient baked into sample
- Drop `.sustain(0)` — not applicable to one-shot samples
- Keep `.decay()`, `.gain()`, `.distort()`, `.lpf()`
- Syntax: `s("bd:N*4").bank("MachineName")`
- techno/acid/hardgroove/schranz → `RolandTR909`
- dub_techno → `RolandTR808`

- [ ] **Step 1: Replace the `kick` array**

In `src/library/soundLibrary.js`, replace the entire `kick` array:

```js
kick: [
  { id: "kick_sine_44",    name: "Sine Kick 4/4",    tags: ["kick", "pounding", "heavy", "hypnotic", "techno"],      code: `s("bd:0*4").bank("RolandTR909").decay(0.12).gain(0.82)` },
  { id: "kick_square_44",  name: "Square Kick 4/4",  tags: ["kick", "industrial", "harsh", "distort", "aggressive"], code: `s("bd:2*4").bank("RolandTR909").decay(0.08).distort(0.7).gain(0.9)` },
  { id: "kick_acid_44",    name: "Acid Kick 4/4",    tags: ["kick", "acid", "punch", "heavy", "303"],                code: `s("bd:1*4").bank("RolandTR909").decay(0.1).gain(0.85)` },
  { id: "kick_dub_deep",   name: "Deep Dub Kick",    tags: ["kick", "dub", "deep", "sub", "soft", "minimal", "warm"],code: `s("bd:0*4").bank("RolandTR808").decay(0.18).lpf(180).gain(0.88)` },
  { id: "kick_hardgroove", name: "Hardgroove 909",   tags: ["kick", "driving", "hardgroove", "punchy", "rave", "909"],code: `s("bd:3*4").bank("RolandTR909").decay(0.1).gain(0.92)` },
  { id: "kick_schranz",    name: "Schranz Dist Kick",tags: ["kick", "hardcore", "schranz", "distorted", "extreme"],  code: `s("bd:2*4").bank("RolandTR909").decay(0.11).distort(0.95).lpf(850).gain(0.75)` }
],
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all 40 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/library/soundLibrary.js
git commit -m "feat: rewrite kick pillar to use TR-909/808 samples"
```

---

## Task 3: Rewrite `groove` pillar patterns

**Files:**
- Modify: `src/library/soundLibrary.js` — `groove` array only

**Rules:**
- Drop `note()` — hat/snare samples don't need pitch
- Drop `.hp()` / `.hpq()` — those shaped white noise; real samples don't need it
- Drop `.sustain(0)` — not applicable
- Keep `.decay()`, `.gain()`
- Rhythm moves into `s()` mini-notation
- Tokens: `hh` = closed hat, `oh` = open hat, `sd` = snare, `cp` = clap
- techno/acid/industrial/hardgroove/schranz → `RolandTR909`
- dub_techno open hat → `RolandTR808`

- [ ] **Step 1: Replace the `groove` array**

In `src/library/soundLibrary.js`, replace the entire `groove` array:

```js
groove: [
  { id: "perc_minimal_hats",    name: "Minimal Hi-Hats",      tags: ["hats", "groove", "subtle", "minimal", "hypnotic"],    code: `s("hh*8").bank("RolandTR909").decay(0.03).gain(0.25)` },
  { id: "perc_acid_backbeat",   name: "Acid Backbeat",         tags: ["snare", "acid", "backbeat", "groove"],                code: `s("~ sd ~ sd").bank("RolandTR909").decay(0.05).gain(0.3)` },
  { id: "perc_industrial_fast", name: "Industrial Rapid Hats", tags: ["hats", "industrial", "harsh", "aggressive", "fast"], code: `s("hh*16").bank("RolandTR909").decay(0.02).gain(0.2)` },
  { id: "perc_dub_openhat",     name: "Classic Open Hi-Hat",   tags: ["hats", "groove", "open", "dub", "offbeat", "909"],    code: `s("~ oh").bank("RolandTR808").decay(0.14).gain(0.24)` },
  { id: "perc_hardgroove_ride", name: "Sizzling Rave Ride",    tags: ["hats", "groove", "ride", "cymbal", "hardgroove"],     code: `s("~ hh*4").bank("RolandTR909").decay(0.22).gain(0.15)` },
  { id: "perc_schranz_shaker",  name: "Driving Rapid Shaker",  tags: ["percussion", "groove", "shaker", "schranz", "fast"], code: `s("cp*4").bank("RolandTR909").decay(0.02).gain(0.35).stack(s("~ hh*16").bank("RolandTR909").decay(0.01).gain(0.1))` }
],
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all 40 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/library/soundLibrary.js
git commit -m "feat: rewrite groove pillar to use TR-909/808 hat and snare samples"
```

---

## Task 4: Rewrite `rumble_bass` pillar patterns

**Files:**
- Modify: `src/library/soundLibrary.js` — `rumble_bass` array only

**Rules:**
- Keep `note()`, `stack()`, `.slow()`, `.lpf()`, `.lpq()`, `.decay()`, `.gain()`, `.distort()`
- Swap synth names only:
  - `s("sawtooth")` → `s("moog")` in techno/dub context, `s("bass")` elsewhere
  - `s("sine")` → `s("bass")` (sub roundness)
  - `s("square")` → `s("fm")` (schranz)
  - `s("white")` noise texture in schranz → keep as `s("white")` (synth texture, not instrument)
- No `.bank()` needed — dirt-samples uses plain folder names

- [ ] **Step 1: Replace the `rumble_bass` array**

In `src/library/soundLibrary.js`, replace the entire `rumble_bass` array:

```js
rumble_bass: [
  { id: "rumble_hypnotic",    name: "Hypnotic Rumble",    tags: ["bass", "drone", "hypnotic", "minimal", "pad", "sidechain"], code: `stack(
  note("c1 ~ c1 ~").s("moog").decay(0.08).sustain(0).gain("0.1 1 1 1"),
  note("[c2,g2,bb2]").s("bass").slow(4).decay(3).sustain(0).gain(0.2)
)` },
  { id: "rumble_acid",        name: "Acid Rumble",        tags: ["bass", "drone", "acid", "303", "filter", "resonant"],      code: `stack(
  note("c1 eb1 g1 ~").s("bass").lpf(800).lpq(8).decay(0.15).sustain(0).gain("0.1 1 1 1"),
  note("[c2,eb2]").s("bass").slow(4).decay(2).sustain(0).gain(0.15)
)` },
  { id: "rumble_industrial",  name: "Industrial Rumble",  tags: ["bass", "drone", "industrial", "harsh", "distort"],         code: `stack(
  note("c1 ~ ~ c1").s("bass").distort(0.4).decay(0.1).sustain(0).gain("0.1 1 1 1"),
  note("c2").s("bass").slow(8).decay(4).sustain(0).gain(0.1)
)` },
  { id: "rumble_dub",         name: "Deep Dub Chug",      tags: ["bass", "drone", "dub", "deep", "sub", "warm", "spacey"],   code: `stack(
  note("c1 ~ ~ c1").s("bass").decay(0.25).sustain(0).gain(0.9),
  note("[f2,c3]").s("moog").lpf(350).lpq(3).slow(6).decay(2.5).gain(0.14)
)` },
  { id: "rumble_hardgroove",  name: "Rolling 16th Bass",  tags: ["bass", "drone", "rolling", "groove", "driving", "16th"],   code: `stack(
  note("~ c1 c1 ~ c1 c1 ~ c1").s("bass").lpf(160).decay(0.07).sustain(0).gain(0.85),
  note("c1").s("bass").lpf(110).slow(4).decay(2).gain(0.2)
)` },
  { id: "rumble_schranz",     name: "Schranz Noise Wall", tags: ["bass", "drone", "schranz", "distort", "heavy", "noisy"],   code: `stack(
  note("c1*4").s("fm").distort(0.6).decay(0.09).lpf(140).gain(0.8),
  note("c1*8").s("white").hp(120).lpf(300).gain(0.15)
)` }
],
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all 40 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/library/soundLibrary.js
git commit -m "feat: rewrite rumble_bass pillar to use moog/bass/fm dirt-samples"
```

---

## Task 5: Rewrite `synth_fx` pillar patterns

**Files:**
- Modify: `src/library/soundLibrary.js` — `synth_fx` array only

**Rules:**
- Keep `note()`, `stack()`, `.slow()`, `.fast()`, `.lpf()`, `.lpq()`, `.decay()`, `.gain()`, `.distort()`
- Drop `.hp()` / `.hpq()` on pitched samples — the sample has its own natural character
- Swap synth names only:
  - `s("triangle")` → `s("arpy")`
  - `s("sawtooth")` → `s("juno")`
  - `s("square")` → `s("fm")`
  - `s("white")` pad texture → `s("pad")` (dub context)
- No `.bank()` needed — dirt-samples uses plain folder names

- [ ] **Step 1: Replace the `synth_fx` array**

In `src/library/soundLibrary.js`, replace the entire `synth_fx` array:

```js
synth_fx: [
  { id: "synthfx_hypnotic",   name: "Hypnotic Synth FX",   tags: ["melody", "fx", "hypnotic", "minor", "accent", "subtle"],       code: `stack(
  note("c3 eb3 g3 bb3").s("arpy").decay(0.3).sustain(0).slow(2).gain(0.3),
  note("~ ~ ~ c1").s("fm").decay(0.08).sustain(0).distort(0.7).gain(0.35)
)` },
  { id: "synthfx_acid",       name: "Acid Synth FX",       tags: ["melody", "fx", "acid", "303", "filter", "squelch", "burst"],   code: `stack(
  note("c3 ~ eb3 ~ g3 ~ bb3 ~").s("bass").lpf(1200).lpq(4).decay(0.2).sustain(0).gain(0.35),
  note("c2*2").s("fm").decay(0.08).sustain(0).distort(0.7).gain(0.3)
)` },
  { id: "synthfx_industrial", name: "Industrial Synth FX", tags: ["melody", "fx", "industrial", "harsh", "distort", "slam"],      code: `stack(
  note("c3 c3 eb3 c3").s("fm").distort(0.5).decay(0.15).sustain(0).gain(0.25),
  note("~ ~ ~ c1").s("fm").decay(0.08).sustain(0).distort(0.9).gain(0.4)
)` },
  { id: "synthfx_dub",        name: "Dub Echo Chord Stab", tags: ["melody", "fx", "dub", "chord", "stab", "echo", "spacey"],      code: `stack(
  note("[c3,eb3,g3,bb3]*2").s("juno").lpf(650).lpq(4).decay(0.08).sustain(0).slow(2).gain(0.4),
  note("c6").s("pad").slow(4).decay(1.8).gain(0.1)
)` },
  { id: "synthfx_hardgroove", name: "Peak Time Rave Hook", tags: ["melody", "fx", "rave", "hardgroove", "energetic", "hook"],     code: `stack(
  note("c4 g3 c4 eb4").s("juno").decay(0.11).sustain(0).fast(2).gain(0.18),
  note("~ ~ c3 ~").s("arpy").decay(0.05).gain(0.3)
)` },
  { id: "synthfx_schranz",     name: "Talking Glitch Engine",tags: ["melody", "fx", "schranz", "glitch", "vocal", "talking"],     code: `stack(
  note("c3*8").s("fm").distort(0.7).decay(0.05).lpf(2000).gain(0.2),
  note("~ c2 ~ c2").s("bass").lpq(10).lpf("800 1400").decay(0.08).gain(0.25)
)` }
],
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all 40 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/library/soundLibrary.js
git commit -m "feat: rewrite synth_fx pillar to use arpy/juno/fm/pad dirt-samples"
```

---

## Task 6: Manual smoke test

**Files:** none — verification only

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Open `http://localhost:5173` in browser.

- [ ] **Step 2: Verify sample packs load**

Open browser DevTools console. After clicking Play, confirm:
- `"Strudel sample packs baked successfully."` logged
- No 404s or "sample not found" errors

- [ ] **Step 3: Test each genre preset**

Use the genre selector in the UI to cycle through all 4 presets. For each, click Play and verify:

| Genre | Expected sound |
|-------|---------------|
| `techno` | Punchy TR-909 kick, tight 909 hats, moog bass |
| `dub_techno` | Round TR-808 kick, 808 open hat on offbeat, deep bass |
| `hardgroove` | Hard 909 kick (bd:3), riding 909 hats, driving bass |
| `schranz` | Distorted 909 kick, fast 909 hats + claps, fm bass wall |

- [ ] **Step 4: Verify pitch-shifting works on bass/synth pillars**

In the UI, trigger an LLM transformation that modifies the `rumble_bass` or `synth_fx` pillar. Confirm the new note values play at correct pitches (moog/bass/juno tracks the notes, not stuck on root).

- [ ] **Step 5: Confirm no regressions in play/stop/mute/solo**

- Toggle Play/Stop several times — no hangs
- Mute individual pillars — silence confirmed
- Solo a pillar — only that pillar plays
