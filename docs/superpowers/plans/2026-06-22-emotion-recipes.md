# Emotion Recipes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace TRX-mode tech-label chips with emotion chips that apply curated per-pillar effect recipes, so a zero-experience user picks a feeling instead of an audio effect.

**Architecture:** A new `emotionsLibrary.js` holds per-pillar emotion→recipe maps. Clicking an emotion chip bypasses the LLM entirely and applies the recipe via a new `applyEmotionRecipe` helper (replace semantics), then reuses the existing `addPillarPreviewMessage` apply/revert flow. UI drives chips from the library.

**Tech Stack:** Vanilla ES modules, Vite, Vitest. No framework.

---

## Design constraints (read before coding)

- The 5 live pillars are `drums, bass, percussion, melody, transitions` (`PILLAR_NAMES` in `src/pillars.js`).
- Each recipe's effect ids must exist in `TRANSFORMS` (`src/library/transformationsLibrary.js`) and be allowed by `PILLAR_TRANSFORMS[pillar]`.
- Numeric values must be within the effect's `min`/`max`. Note `crush` is inverted (lower = stronger) but still within 1–16.
- A pillar object (`makePillars`) has a `transforms` object (`{}` by default). The compile path reads `pillar.transforms`.

---

## Task 1: emotionsLibrary data + getEmotionsForPillar

**Files:**
- Create: `src/library/emotionsLibrary.js`
- Create (test): `tests/emotions.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/emotions.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { EMOTION_RECIPES, getEmotionsForPillar } from '../src/library/emotionsLibrary.js';
import { TRANSFORMS, PILLAR_TRANSFORMS } from '../src/library/transformationsLibrary.js';

const PILLARS = ['drums', 'bass', 'percussion', 'melody', 'transitions'];

describe('EMOTION_RECIPES integrity', () => {
  it('only defines recipes for real pillars', () => {
    for (const name of Object.keys(EMOTION_RECIPES)) {
      expect(PILLARS).toContain(name);
    }
  });

  it('every recipe has id, label, transforms', () => {
    for (const recipes of Object.values(EMOTION_RECIPES)) {
      for (const r of recipes) {
        expect(typeof r.id).toBe('string');
        expect(typeof r.label).toBe('string');
        expect(r.transforms && typeof r.transforms).toBe('object');
        expect(Object.keys(r.transforms).length).toBeGreaterThan(0);
      }
    }
  });

  it('recipe ids are unique within a pillar', () => {
    for (const recipes of Object.values(EMOTION_RECIPES)) {
      const ids = recipes.map(r => r.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('every effect id exists in TRANSFORMS', () => {
    for (const recipes of Object.values(EMOTION_RECIPES)) {
      for (const r of recipes) {
        for (const fx of Object.keys(r.transforms)) {
          expect(TRANSFORMS[fx], `${r.id}: ${fx}`).toBeTruthy();
        }
      }
    }
  });

  it('every effect is allowed by the pillar', () => {
    for (const [pillar, recipes] of Object.entries(EMOTION_RECIPES)) {
      const allowed = PILLAR_TRANSFORMS[pillar] ?? [];
      for (const r of recipes) {
        for (const fx of Object.keys(r.transforms)) {
          expect(allowed, `${pillar}/${r.id}: ${fx}`).toContain(fx);
        }
      }
    }
  });

  it('every numeric value is within the effect min/max', () => {
    for (const recipes of Object.values(EMOTION_RECIPES)) {
      for (const r of recipes) {
        for (const [fx, val] of Object.entries(r.transforms)) {
          const t = TRANSFORMS[fx];
          if (t.type === 'numeric') {
            expect(val, `${r.id}: ${fx}`).toBeGreaterThanOrEqual(t.min);
            expect(val, `${r.id}: ${fx}`).toBeLessThanOrEqual(t.max);
          }
          if (t.type === 'boolean') expect(val).toBe(true);
        }
      }
    }
  });
});

describe('getEmotionsForPillar', () => {
  it('returns an array of recipes for a known pillar', () => {
    const list = getEmotionsForPillar('drums');
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });

  it('returns [] for an unknown pillar', () => {
    expect(getEmotionsForPillar('nope')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/emotions.test.js`
Expected: FAIL — cannot resolve `../src/library/emotionsLibrary.js`.

- [ ] **Step 3: Create the library**

Create `src/library/emotionsLibrary.js`:

```js
// Per-pillar emotion recipes. Each recipe is a curated, fixed combination of effects
// at tuned values. Clicking an emotion chip REPLACES the pillar's transforms with this
// recipe (see applyEmotionRecipe). All effect ids are constrained to the pillar's
// PILLAR_TRANSFORMS; all numeric values fall within the effect's TRANSFORMS min/max.
// Note: crush is inverted (lower = stronger), still within 1–16.

export const EMOTION_RECIPES = {
  drums: [
    { id: 'dark',       label: 'Dark',       description: 'heavy, ominous, underwater',  transforms: { lopass: 600, shape: 0.3 } },
    { id: 'gritty',     label: 'Gritty',     description: 'dirty, aggressive overdrive', transforms: { distort: 0.5, crush: 6, shape: 0.4 } },
    { id: 'industrial', label: 'Industrial', description: 'brutal, metallic machine',    transforms: { distort: 0.8, crush: 4, shape: 0.6 } },
    { id: 'dreamy',     label: 'Dreamy',     description: 'soft, floating, ambient',     transforms: { reverb: 0.5, lopass: 1200 } },
    { id: 'vintage',    label: 'Vintage',    description: 'dusty, lo-fi, old tape',      transforms: { crush: 8, hipass: 800 } },
  ],
  bass: [
    { id: 'dark',       label: 'Dark',       description: 'heavy, ominous, underwater',  transforms: { lopass: 500, slow_down: 2, shape: 0.3 } },
    { id: 'gritty',     label: 'Gritty',     description: 'dirty, aggressive overdrive', transforms: { distort: 0.5, crush: 6, shape: 0.4 } },
    { id: 'industrial', label: 'Industrial', description: 'brutal, metallic machine',    transforms: { distort: 0.8, robot_glitch: 8, shape: 0.6 } },
    { id: 'liquid',     label: 'Liquid',     description: 'squelchy, modular, acid',     transforms: { lopass: 800, lopass_q: 15 } },
    { id: 'bouncy',     label: 'Bouncy',     description: 'syncopated, playful groove',  transforms: { press: true, palindrome: true } },
    { id: 'broken',     label: 'Broken',     description: 'glitchy, fragmented',         transforms: { robot_glitch: 12, reverse: true } },
  ],
  percussion: [
    { id: 'frantic',    label: 'Frantic',    description: 'fast, busy, panicked',        transforms: { degrade: 0.3, ply: 3, iter: 4 } },
    { id: 'broken',     label: 'Broken',     description: 'glitchy, fragmented',         transforms: { degrade: 0.5, robot_glitch: 12, reverse: true } },
    { id: 'hypnotic',   label: 'Hypnotic',   description: 'trancey, looping, evolving',  transforms: { iter: 4, ply: 2 } },
    { id: 'gritty',     label: 'Gritty',     description: 'dirty, aggressive overdrive', transforms: { distort: 0.5, crush: 6 } },
    { id: 'spacey',     label: 'Spacey',     description: 'wide, distant, cosmic',       transforms: { reverb: 0.7, jux_rev: true } },
  ],
  melody: [
    { id: 'dreamy',     label: 'Dreamy',     description: 'soft, floating, ambient',     transforms: { reverb: 0.6, echo: 0.4, lopass: 2000 } },
    { id: 'spacey',     label: 'Spacey',     description: 'wide, distant, cosmic hall',  transforms: { reverb: 0.8, room_size: 7, jux_rev: true, echo: 0.4 } },
    { id: 'hypnotic',   label: 'Hypnotic',   description: 'trancey, looping, evolving',  transforms: { psy_swirl: 2, echo: 0.4, slow_down: 2 } },
    { id: 'liquid',     label: 'Liquid',     description: 'squelchy, modular, acid',     transforms: { lopass: 800, lopass_q: 18, psy_swirl: 1.5 } },
    { id: 'airy',       label: 'Airy',       description: 'weightless, thin, bright',    transforms: { hipass: 3000, dj_filter: 0.8, reverb: 0.3 } },
    { id: 'frantic',    label: 'Frantic',    description: 'fast, busy, panicked',        transforms: { speed_up: 2, degrade: 0.3 } },
  ],
  transitions: [
    { id: 'dreamy',     label: 'Dreamy',     description: 'soft, floating, ambient',     transforms: { reverb: 0.6, echo: 0.4, lopass: 2000 } },
    { id: 'spacey',     label: 'Spacey',     description: 'wide, distant, cosmic hall',  transforms: { reverb: 0.8, room_size: 7, echo: 0.4 } },
    { id: 'airy',       label: 'Airy',       description: 'weightless, thin, bright',    transforms: { hipass: 3000, dj_filter: 0.8, reverb: 0.3 } },
    { id: 'hypnotic',   label: 'Hypnotic',   description: 'trancey, looping, evolving',  transforms: { iter: 4, echo: 0.4 } },
    { id: 'frantic',    label: 'Frantic',    description: 'fast, busy, panicked',        transforms: { speed_up: 2, iter: 4 } },
  ],
};

export function getEmotionsForPillar(name) {
  return EMOTION_RECIPES[name] ?? [];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/emotions.test.js`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/library/emotionsLibrary.js tests/emotions.test.js
git commit -m "feat(emotions): per-pillar emotion recipe library"
```

---

## Task 2: applyEmotionRecipe helper

**Files:**
- Modify: `src/library/transformationsLibrary.js` (add export beside `mergeLlmTransformPatch`)
- Modify (test): `tests/transformations.test.js`

- [ ] **Step 1: Write the failing test**

Add to `tests/transformations.test.js`:

```js
import { applyEmotionRecipe } from '../src/library/transformationsLibrary.js';

describe('applyEmotionRecipe', () => {
  it('replaces existing transforms with the recipe (clears prior effects)', () => {
    const pillar = { name: 'drums', transforms: { reverb: 0.9, echo: 0.5 } };
    applyEmotionRecipe(pillar, { id: 'dark', transforms: { lopass: 600, shape: 0.3 } });
    expect(pillar.transforms).toEqual({ lopass: 600, shape: 0.3 });
  });

  it('copies the recipe (mutating pillar.transforms does not touch the recipe)', () => {
    const recipe = { id: 'dark', transforms: { lopass: 600 } };
    const pillar = { name: 'drums', transforms: {} };
    applyEmotionRecipe(pillar, recipe);
    pillar.transforms.lopass = 999;
    expect(recipe.transforms.lopass).toBe(600);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/transformations.test.js`
Expected: FAIL — `applyEmotionRecipe` is not exported.

- [ ] **Step 3: Add the helper**

In `src/library/transformationsLibrary.js`, add directly after `mergeLlmTransformPatch`:

```js
// Apply a curated emotion recipe. Unlike mergeLlmTransformPatch (which merges a partial
// patch), this REPLACES the pillar's transform state with the recipe — each emotion is a
// clean, known sound. The recipe is copied so later mutations don't leak back into it.
export function applyEmotionRecipe(pillar, recipe) {
  pillar.transforms = { ...recipe.transforms };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/transformations.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/library/transformationsLibrary.js tests/transformations.test.js
git commit -m "feat(emotions): applyEmotionRecipe replace helper"
```

---

## Task 3: handleEmotion in app.js

**Files:**
- Modify: `app.js` (add import, add `handleEmotion`, wire `onEmotion` in `renderPillar` call)

No unit test — UI/app wiring is not unit-tested in this repo (see CLAUDE.md). Verified manually in Task 5.

- [ ] **Step 1: Add imports**

At the top of `app.js`, add the emotions import (place beside the other `src/library` imports):

```js
import { getEmotionsForPillar } from './src/library/emotionsLibrary.js';
import { applyEmotionRecipe } from './src/library/transformationsLibrary.js';
```

(Note: `applyEmotionRecipe` may be added to an existing `transformationsLibrary.js` import line if one already imports `generateTransformPatch`/`mergeLlmTransformPatch` — keep it DRY, merge into the existing named import rather than duplicating the line.)

- [ ] **Step 2: Add the handler**

Add this function in `app.js` next to `handlePillarSend` (after it, before the viz section):

```js
// ── Emotion Recipe (TRX chips) ────────────────────────────
// Deterministic, offline: an emotion chip applies a curated recipe directly, bypassing
// the LLM/parseDirectCommand path. Replace semantics + the existing preview/revert flow.
async function handleEmotion(pillarName, recipeId) {
  const pillar = pillars.find(p => p.name === pillarName);
  const recipe = getEmotionsForPillar(pillarName).find(r => r.id === recipeId);
  if (!recipe) {
    addPillarMessage(pillarName, 'error', 'Unknown emotion.');
    setStatus('Error');
    return;
  }
  addPillarMessage(pillarName, 'user', recipe.label);
  setStatus('Thinking...');

  const prevTransforms = { ...pillar.transforms };
  applyEmotionRecipe(pillar, recipe);
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
}
```

- [ ] **Step 3: Wire the callback**

In the `renderPillar(pillar, { ... })` call (around `app.js:242`), add the `onEmotion` callback alongside the existing ones:

```js
    onEmotion: (recipeId) => handleEmotion(pillar.name, recipeId),
```

- [ ] **Step 4: Verify it loads**

Run: `npm run dev` and confirm no console import errors. (Full behavior verified in Task 5.)

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "feat(emotions): handleEmotion applies recipe via preview flow"
```

---

## Task 4: Emotion chips in ui.js

**Files:**
- Modify: `src/ui.js` (remove `TRX_CHIPS`, drive chips from library, add `onEmotion` param)

- [ ] **Step 1: Replace the TRX_CHIPS constant with an import**

Remove the entire `const TRX_CHIPS = { ... };` block (`src/ui.js:10-36`) and add at the top of the file with the other imports:

```js
import { getEmotionsForPillar } from './library/emotionsLibrary.js';
```

- [ ] **Step 2: Add onEmotion to the renderPillar signature**

Change (around `src/ui.js:107`):

```js
export function renderPillar(pillar, { onSend, onMute, onSolo, onCodeEdit, onVizToggle, onModeToggle }) {
```

to:

```js
export function renderPillar(pillar, { onSend, onMute, onSolo, onCodeEdit, onVizToggle, onModeToggle, onEmotion }) {
```

- [ ] **Step 3: Drive the chip row from emotions**

Replace the chip-building loop (around `src/ui.js:208-216`) — currently:

```js
  for (const chip of TRX_CHIPS[pillar.name] ?? []) {
    const btn = document.createElement('button');
    btn.className = 'chip-btn';
    btn.textContent = chip.label;
    btn.addEventListener('click', () => {
      btn.disabled = true;
      onSend(chip.prompt).finally(() => { btn.disabled = false; });
    });
    chipsEl.appendChild(btn);
  }
```

with:

```js
  for (const recipe of getEmotionsForPillar(pillar.name)) {
    const btn = document.createElement('button');
    btn.className = 'chip-btn';
    btn.textContent = recipe.label;
    if (recipe.description) btn.title = recipe.description;
    btn.addEventListener('click', () => {
      btn.disabled = true;
      Promise.resolve(onEmotion(recipe.id)).finally(() => { btn.disabled = false; });
    });
    chipsEl.appendChild(btn);
  }
```

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: PASS — all existing tests plus the new emotion tests. (No test imports `TRX_CHIPS`; ui.js is not unit-tested.)

- [ ] **Step 5: Commit**

```bash
git add src/ui.js
git commit -m "feat(emotions): emotion chips replace tech-label TRX chips"
```

---

## Task 5: Manual verification

**Files:** none (manual).

- [ ] **Step 1: Run the app**

Run: `npm run dev`, open http://localhost:5173.

- [ ] **Step 2: Verify chips**

For each pillar: toggle to TRX mode. Confirm the chip row shows emotion labels (e.g. drums → Dark, Gritty, Industrial, Dreamy, Vintage), each with a hover tooltip describing the feel. Confirm GEN mode hides the row.

- [ ] **Step 3: Verify apply/revert**

Generate a pattern on a pillar, switch to TRX, click an emotion chip. Confirm: a preview card appears, Apply changes the sound and shows "Applied", and the compiled code reflects the recipe's effects. Click another emotion → confirm it REPLACES (prior effects gone, not stacked). Dismiss a preview → confirm transforms revert.

- [ ] **Step 4: Verify power-user path still works**

In TRX mode, type "add reverb" in the text box → confirm the deterministic `parseDirectCommand` path still applies it.

---

## Task 6: Docs

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md**

In the Architecture section, add an `emotionsLibrary.js` bullet:

```md
**`src/library/emotionsLibrary.js`** — Per-pillar emotion recipes for TRX chips. Exports `EMOTION_RECIPES` (pillar → `[{ id, label, description, transforms }]`) and `getEmotionsForPillar(name)`. Each recipe's effects are constrained to the pillar's `PILLAR_TRANSFORMS`; clicking a chip applies the recipe via `applyEmotionRecipe` (replace semantics), bypassing the LLM.
```

In the `transformationsLibrary.js` notes, mention `applyEmotionRecipe(pillar, recipe)` replaces `pillar.transforms` (vs `mergeLlmTransformPatch` which merges).

Update the Tests section: add `tests/emotions.test.js` to the file list and update the total test count (was 85 + new emotion cases + 2 transformations cases).

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document emotionsLibrary + applyEmotionRecipe"
```

---

## Self-review notes

- **Spec coverage:** data model (T1), apply path (T2–T3), UI (T4), tests (T1–T2), error handling (T3 guards), docs (T6), manual verify (T5). All spec sections covered.
- **Type consistency:** recipe shape `{ id, label, description, transforms }` used identically across emotionsLibrary, tests, app.js, ui.js. `getEmotionsForPillar` / `applyEmotionRecipe` names consistent throughout.
- **Pillar correction:** 5 pillars (`drums, bass, percussion, melody, transitions`) — matches `PILLAR_NAMES`, corrected from spec's earlier `bass_percussion`.
