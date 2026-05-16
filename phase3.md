# Strudel Music AI — Library Layer Refactor Plan (Next Step)

## Goal

We are improving the current system by adding a **Music Style Library layer** between the LLM and the patch engine.

This will:
- reduce hallucinations
- improve musical consistency
- make styles (acid, groove, minimal) deterministic
- move “musical knowledge” out of the LLM and into code

---

## Current Problem

Right now:

```
LLM → operations → patchEngine → Strudel
```

Issue:
- LLM invents inconsistent musical logic
- “acid”, “groove”, etc. are interpreted differently each time
- results are unstable

---

## New Architecture (Target)

```
User Input
   ↓
LLM (style selector only)
   ↓
STYLE LIBRARY (deterministic mapping)
   ↓
Operation expansion
   ↓
patchEngine (execution only)
   ↓
Strudel runtime
```

---

## Key Change in Responsibility

### LLM is ONLY allowed to output:

```json
{
  "mode": "transform",
  "style": "acid | groove | minimal | dub | breakcore",
  "target": "bass | drums | melody | all",
  "intensity": 0.0 - 1.0
}
```

❌ No operations from LLM anymore  
❌ No musical reasoning from LLM anymore  

---

## New File to Create

### `src/library/styles.js`

This file becomes the **source of musical truth**.

It defines how styles behave.

---

## Example Structure

```js
export const STYLE_LIBRARY = {
  acid: {
    bass: [
      { type: "increase_resonance", amount: 0.8 },
      { type: "add_distortion", amount: 0.4 },
      { type: "increase_filter_motion", amount: 0.5 }
    ]
  },

  groove: {
    drums: [
      { type: "increase_density", amount: 0.3 },
      { type: "add_swing", amount: 0.25 }
    ]
  },

  minimal: {
    global: [
      { type: "simplify_pattern", amount: 0.7 },
      { type: "reduce_reverb", amount: 0.4 }
    ]
  }
};
```

---

## New Transformation Flow

### Step 1 — LLM output

```json
{
  "mode": "transform",
  "style": "acid",
  "target": "bass",
  "intensity": 0.7
}
```

---

### Step 2 — Library expansion (NEW LOGIC)

```js
operations = STYLE_LIBRARY[style][target]
scaled by intensity
```

Example:
- intensity 0.7 reduces or scales amounts slightly
- missing target falls back to "global"

---

### Step 3 — Patch engine execution

Patch engine remains unchanged:
- executes operations deterministically
- no musical reasoning inside

---

## Required Code Changes

### 1. Remove operation generation from LLM

Update `generateTransformationPlan()`:

- MUST NOT return `operations`
- MUST ONLY return:
  - mode
  - style
  - target
  - intensity

---

### 2. Add `src/library/styles.js`

- define 3–5 initial styles:
  - acid
  - groove
  - minimal
  - dub (optional)
  - breakcore (optional)

Keep it small and high quality.

---

### 3. Modify app flow

In `app.js`:

Replace:

```
plan.operations → patchEngine
```

with:

```
plan → STYLE_LIBRARY → operations → patchEngine
```

---

### 4. Add fallback behavior

If:

- style not found → default to "minimal"
- target not found → fallback to "global"
- intensity missing → default 0.5

---

## Design Rules (IMPORTANT)

### 1. LLM is NOT allowed to define music rules

It only selects:
- style
- target
- intensity

---

### 2. STYLE_LIBRARY defines ALL musical meaning

This is the single source of truth for:
- acid sound
- groove behavior
- minimal structure

---

### 3. patchEngine stays dumb

It should:
- apply operations only
- never interpret style or genre

---

## Why this improves results

- consistent “acid” sound every time
- no hallucinated musical logic
- easier tuning of styles
- deterministic behavior
- better user trust in system

---

## Success Criteria

After implementation:

Test prompts like:

- “make it more acid”
- “make it groovier”
- “make it minimal”

Expected result:
- consistent transformation patterns
- no random behavior changes
- recognizable style identity

---

## Non-goals (do NOT implement yet)

- embeddings
- vector database
- agent frameworks
- multi-step LLM reasoning
- automatic style discovery

This is strictly a **deterministic control layer upgrade**.

---

## Summary

We are moving from:

> LLM decides music

to:

> LLM selects style → system defines music

This is the key step toward turning the project into a **real playable instrument instead of a generative model demo**.