# Emotion Recipes — Design

**Date:** 2026-06-22
**Status:** Approved (design); pending implementation plan

## Problem

TRX-mode chips use technical effect labels (`+ reverb`, `+ crush`). A zero-experience
user does not know what these audio effects do. Goal: let amateurs apply musically
intentional transforms by picking an **emotion** instead of an effect.

## Solution Overview

Each emotion maps to a curated **recipe** — a fixed combination of effects at tuned
values — defined **per pillar**. Clicking an emotion chip **replaces** the pillar's
current transform state with that recipe, then runs the existing preview/apply/revert
flow. Recipes are explicit, so they bypass the LLM and `parseDirectCommand` entirely:
instant, deterministic, offline.

Design decisions (locked):
- **Recipe depth:** emotion = multi-effect recipe at tuned values (not 1:1 rename).
- **Scope:** per-pillar recipes (same emotion sounds different per pillar).
- **Coverage:** curated subset per pillar (~4-6 emotions each), not all 12 everywhere.
- **Click behavior:** replace (clears prior effects, sets clean known sound).
- **UI:** emotion chips replace the tech-label chip row. Text box + `parseDirectCommand`
  stay for power users.

## Pillars

The 5 live pillars (`PILLAR_NAMES` in `src/pillars.js`): `drums`, `bass`, `percussion`,
`melody`, `transitions`. Each recipe's effects MUST be a subset of
`PILLAR_TRANSFORMS[pillar]` and each numeric value within the effect's `min`/`max` in
`TRANSFORMS`.

## Emotion Vocabulary (12)

| Emotion | Feel | Effect direction |
|---|---|---|
| Dreamy | soft, floating, ambient | reverb + echo + gentle lopass |
| Dark | heavy, ominous, underwater | deep lopass + slow_down + shape |
| Gritty | dirty, aggressive overdrive | distort + crush + shape |
| Spacey | wide, distant, cosmic hall | big reverb + room_size + jux_rev + echo |
| Frantic | fast, busy, panicked stutter | speed_up + ply/iter + degrade |
| Hypnotic | trancey, looping, evolving | iter + psy_swirl + echo |
| Vintage | dusty, lo-fi, old tape/radio | light crush + hipass + echo |
| Airy | weightless, thin, bright breath | high hipass + dj_filter(high) + light reverb |
| Liquid | squelchy, modular, acid synth | lopass_q + lopass + watery psy_swirl |
| Broken | glitchy, fragmented, malfunctioning | high degrade + robot_glitch + reverse |
| Bouncy | syncopated, playful groove | press + palindrome / vowel + ply |
| Industrial | brutal, metallic, heavy machine | hard distort + chunky robot_glitch + thick shape |

## Per-Pillar Distribution (proposed; finalize values in implementation)

Constrained to each pillar's allowed effects.

- **drums** (`shape, crush, distort, reverb, lopass, hipass, reverse`):
  Dark, Gritty, Industrial, Dreamy, Vintage
- **bass** (`lopass, lopass_q, reverb, room_size, echo, speed_up, slow_down,
  shape, distort, crush, press, reverse, palindrome, robot_glitch`):
  Dark, Gritty, Industrial, Liquid, Bouncy, Broken
- **percussion** (`crush, distort, reverb, degrade, iter, ply, reverse, jux_rev, lopass,
  robot_glitch, dj_filter`):
  Frantic, Broken, Hypnotic, Gritty, Spacey
- **melody** (`lopass, lopass_q, hipass, reverb, room_size, echo, vowel, jux_rev,
  speed_up, slow_down, shape, degrade, psy_swirl, robot_glitch, dj_filter`):
  Dreamy, Spacey, Hypnotic, Liquid, Airy, Frantic
- **transitions** (`lopass, hipass, reverb, room_size, echo, speed_up, slow_down, iter,
  reverse, dj_filter`):
  Dreamy, Spacey, Airy, Hypnotic, Frantic

All 12 emotions appear on at least one pillar. Effects an emotion "wants" that a pillar
disallows are dropped (e.g. Hypnotic on melody uses psy_swirl+echo since melody has no
`iter`; on transitions/percussion uses iter since they have no `psy_swirl`).

## Components

### 1. `src/library/emotionsLibrary.js` (new)

```js
export const EMOTION_RECIPES = {
  drums:           [ { id:'dark',  label:'Dark',  transforms:{ lopass:600, shape:0.3 } }, ... ],
  bass_percussion: [ ... ],
  melody:          [ ... ],
  transitions:     [ ... ],
};

export function getEmotionsForPillar(name) {
  return EMOTION_RECIPES[name] ?? [];
}
```

Recipe shape: `{ id, label, transforms: { [effectId]: value } }`.
- `id` — kebab/lowercase stable key (e.g. `dark`).
- `label` — display text (e.g. `Dark`).
- `transforms` — explicit effect→value map (effect ids from `TRANSFORMS`).
- Optional `description` — feel text for chip tooltip.

### 2. `src/library/transformationsLibrary.js` (add helper)

```js
export function applyEmotionRecipe(pillar, recipe) {
  pillar.transforms = { ...recipe.transforms };  // replace semantics
}
```

Sits beside `mergeLlmTransformPatch`. Replaces — clears prior effects.

### 3. `app.js` (new handler)

`handleEmotion(pillarName, recipeId)`:
1. `recipe = getEmotionsForPillar(pillarName).find(r => r.id === recipeId)`
2. if no recipe → status error, return early (mirrors null-patch guard)
3. `prevTransforms = { ...pillar.transforms }`
4. `applyEmotionRecipe(pillar, recipe)`
5. `newCode = compileTrack({ selectedId, modifications: lastMods }, pillarName, pillar)`
6. if `!newCode` → restore `prevTransforms`, status error, return
7. `addPillarPreviewMessage(...)` — apply sets `pillar.code`, plays; dismiss restores
   `prevTransforms` — identical mechanics to the existing TRX path.

Wire in `renderPillar` call: `onEmotion: (id) => handleEmotion(pillar.name, id)`.

### 4. `src/ui.js`

- Delete `TRX_CHIPS` constant.
- Drive chip row from `getEmotionsForPillar(pillar.name)`.
- Chip `textContent` = `recipe.label`; `title` = `recipe.description` (tooltip).
- Chip click → `onEmotion(recipe.id)` (not `onSend(text)`).
- `renderPillar` signature gains `onEmotion`.
- TRX/GEN toggle and chip show/hide-in-TRX-mode: unchanged.

## Data Flow

```
emotion chip click
  → onEmotion(recipeId)
  → handleEmotion: lookup recipe → applyEmotionRecipe (replace) → compileTrack
  → addPillarPreviewMessage (apply → play | dismiss → restore prevTransforms)
```

No LLM, no `parseDirectCommand`. Text box still routes through the existing
`handlePillarSend` → `parseDirectCommand`/LLM path for power users.

## Error Handling

- Unknown `recipeId` → status error, early return.
- `compileTrack` returns `''` → restore `prevTransforms`, status error, early return.
- Recipe validity (effect ids, pillar legality, value ranges) enforced by tests, not at
  runtime.

## Testing

New `tests/emotions.test.js`:
- every recipe effect id exists in `TRANSFORMS`
- every recipe's effects ⊆ `PILLAR_TRANSFORMS[pillar]`
- every numeric value within the effect's `min`/`max`
- `getEmotionsForPillar` returns an array; unknown pillar → `[]`
- `applyEmotionRecipe` replaces (clears prior transforms, sets recipe's)

CLAUDE.md: add `emotionsLibrary.js` to module list, `applyEmotionRecipe` to
transformations notes, update test count/file list.

## Out of Scope (YAGNI)

- Intensity slider scaling recipe strength.
- Emotion routing through the LLM.
- Stacking/toggling recipes.
- Keeping the old tech-label chips.
