# Style Library Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Insert a deterministic style library between the LLM and patchEngine so musical knowledge lives in code, not in LLM output.

**Architecture:** LLM outputs `{mode, style, target, intensity}` for transform mode (no operations). `expandStyle()` in `src/library/styles.js` converts style+target+intensity → scaled operations array. Generate mode bypasses the library entirely (unchanged). patchEngine receives operations same as before.

**Tech Stack:** Vanilla JS ES modules, Vitest for tests.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/library/styles.js` | Create | STYLE_LIBRARY constant + `expandStyle()` function |
| `tests/library.test.js` | Create | Tests for `expandStyle()` |
| `src/llm.js` | Modify | New system prompt (style/intensity schema), new plan validation |
| `tests/llm.test.js` | Modify | Update transform plan shape in existing test cases |
| `app.js` | Modify | Wire `expandStyle()` into transform path |

---

## Task 1: Write failing library tests

**Files:**
- Create: `tests/library.test.js`

- [ ] **Step 1: Write the test file**

```js
import { describe, it, expect } from 'vitest';
import { expandStyle } from '../src/library/styles.js';

describe('expandStyle', () => {
  it('returns operations array for known style and target', () => {
    const ops = expandStyle('acid', 'bass', 1.0);
    expect(Array.isArray(ops)).toBe(true);
    expect(ops.length).toBeGreaterThan(0);
    ops.forEach(op => {
      expect(typeof op.type).toBe('string');
      expect(typeof op.amount).toBe('number');
    });
  });

  it('falls back to global when target not found in style', () => {
    const opsWithTarget = expandStyle('groove', 'nonexistent_target', 1.0);
    const opsGlobal = expandStyle('groove', 'global', 1.0);
    expect(opsWithTarget).toEqual(opsGlobal);
  });

  it('falls back to minimal style when style not found', () => {
    const opsUnknown = expandStyle('unknown_style', 'global', 1.0);
    const opsMinimal = expandStyle('minimal', 'global', 1.0);
    expect(opsUnknown).toEqual(opsMinimal);
  });

  it('scales amounts linearly by intensity', () => {
    const opsFull = expandStyle('groove', 'drums', 1.0);
    const opsHalf = expandStyle('groove', 'drums', 0.5);
    expect(opsHalf.length).toBe(opsFull.length);
    opsHalf.forEach((op, i) => {
      expect(op.amount).toBeCloseTo(opsFull[i].amount * 0.5, 5);
    });
  });

  it('uses default intensity 0.5 when not provided', () => {
    const opsDefault = expandStyle('acid', 'bass');
    const opsExplicit = expandStyle('acid', 'bass', 0.5);
    expect(opsDefault).toEqual(opsExplicit);
  });

  it('only returns operation types from ALLOWED_OPERATIONS', () => {
    const ALLOWED = [
      'increase_resonance', 'decrease_cutoff', 'add_delay', 'add_distortion',
      'increase_density', 'simplify_pattern', 'increase_reverb', 'reduce_reverb',
      'increase_filter_motion',
    ];
    ['acid', 'groove', 'minimal', 'dub', 'breakcore'].forEach(style => {
      const ops = expandStyle(style, 'global', 1.0);
      ops.forEach(op => {
        expect(ALLOWED).toContain(op.type);
      });
    });
  });
});
```

- [ ] **Step 2: Run to verify fails (styles.js doesn't exist yet)**

```bash
npx vitest run tests/library.test.js
```

Expected: FAIL — `Cannot find module '../src/library/styles.js'`

---

## Task 2: Implement `src/library/styles.js`

**Files:**
- Create: `src/library/styles.js`

- [ ] **Step 1: Write the implementation**

```js
export const STYLE_LIBRARY = {
  acid: {
    global: [
      { type: 'increase_resonance', amount: 0.8 },
      { type: 'decrease_cutoff', amount: 0.5 },
    ],
    bass: [
      { type: 'increase_resonance', amount: 0.8 },
      { type: 'decrease_cutoff', amount: 0.5 },
      { type: 'add_distortion', amount: 0.4 },
      { type: 'increase_filter_motion', amount: 0.5 },
    ],
    melody: [
      { type: 'increase_filter_motion', amount: 0.6 },
      { type: 'increase_resonance', amount: 0.5 },
    ],
  },

  groove: {
    global: [
      { type: 'increase_density', amount: 0.3 },
      { type: 'add_delay', amount: 0.2 },
    ],
    drums: [
      { type: 'increase_density', amount: 0.3 },
      { type: 'add_delay', amount: 0.25 },
    ],
    bass: [
      { type: 'add_delay', amount: 0.3 },
      { type: 'increase_reverb', amount: 0.2 },
    ],
  },

  minimal: {
    global: [
      { type: 'simplify_pattern', amount: 1 },
      { type: 'reduce_reverb', amount: 0.4 },
    ],
    all: [
      { type: 'simplify_pattern', amount: 1 },
      { type: 'reduce_reverb', amount: 0.4 },
    ],
  },

  dub: {
    global: [
      { type: 'add_delay', amount: 0.6 },
      { type: 'increase_reverb', amount: 0.5 },
    ],
    bass: [
      { type: 'add_delay', amount: 0.7 },
      { type: 'increase_reverb', amount: 0.6 },
    ],
    drums: [
      { type: 'add_delay', amount: 0.5 },
      { type: 'reduce_reverb', amount: 0.2 },
    ],
  },

  breakcore: {
    global: [
      { type: 'increase_density', amount: 0.8 },
      { type: 'add_distortion', amount: 0.5 },
    ],
    drums: [
      { type: 'increase_density', amount: 0.9 },
      { type: 'add_distortion', amount: 0.4 },
    ],
    all: [
      { type: 'increase_density', amount: 0.8 },
      { type: 'add_distortion', amount: 0.6 },
    ],
  },
};

const DEFAULT_STYLE = 'minimal';
const DEFAULT_INTENSITY = 0.5;

export function expandStyle(style, target, intensity = DEFAULT_INTENSITY) {
  const styleEntry = STYLE_LIBRARY[style] ?? STYLE_LIBRARY[DEFAULT_STYLE];
  const ops = styleEntry[target] ?? styleEntry.global ?? [];
  return ops.map(op => ({ type: op.type, amount: op.amount * intensity }));
}
```

- [ ] **Step 2: Run library tests**

```bash
npx vitest run tests/library.test.js
```

Expected: All 6 PASS

- [ ] **Step 3: Commit**

```bash
git add src/library/styles.js tests/library.test.js
git commit -m "feat: add style library with expandStyle and tests"
```

---

## Task 3: Update `src/llm.js` — new prompt and new plan shape validation

**Files:**
- Modify: `src/llm.js`

New transform plan shape: `{mode, style, target, intensity}` — no `operations`.  
Generate plan shape: unchanged — `{mode, seedCode}`.

- [ ] **Step 1: Replace TRANSFORM_SYSTEM_PROMPT constant**

Replace the entire `TRANSFORM_SYSTEM_PROMPT` string with:

```js
const STYLES = ['acid', 'groove', 'minimal', 'dub', 'breakcore'];

const TRANSFORM_SYSTEM_PROMPT = `You are a music style selector for Strudel live-coding.
Return ONLY valid JSON. No prose. No markdown. No explanation.

AVAILABLE STYLES: ${STYLES.join(', ')}

If currentCode is empty or "none" → mode = "generate".
If currentCode exists → mode = "transform".

Transform mode schema:
{"mode":"transform","style":"acid|groove|minimal|dub|breakcore","target":"bass|drums|melody|all","intensity":0.7}

Generate mode schema:
{"mode":"generate","seedCode":"s(\\"bd ~ sn ~\\")"}

Rules:
- style must be one of AVAILABLE STYLES
- target must be one of: bass, drums, melody, all
- intensity must be 0.1 to 1.0
- No extra keys, no comments, no markdown`;
```

- [ ] **Step 2: Update plan validation in `generateTransformationPlan`**

Replace these lines:

```js
if (!plan.mode || !['transform', 'generate'].includes(plan.mode)) return null;
if (plan.mode === 'transform' && !Array.isArray(plan.operations)) return null;
if (plan.mode === 'generate' && typeof plan.seedCode !== 'string') return null;
```

With:

```js
if (!plan.mode || !['transform', 'generate'].includes(plan.mode)) return null;
if (plan.mode === 'transform' && typeof plan.style !== 'string') return null;
if (plan.mode === 'transform' && typeof plan.intensity !== 'number') return null;
if (plan.mode === 'generate' && typeof plan.seedCode !== 'string') return null;
```

- [ ] **Step 3: Run existing llm tests (some will fail — expected)**

```bash
npx vitest run tests/llm.test.js
```

Expected: test "returns transform plan for existing code" FAILS (old plan shape),  
test "returns null when transform mode lacks operations array" FAILS (validation changed).  
Other tests still PASS.

---

## Task 4: Update `tests/llm.test.js` — match new plan shape

**Files:**
- Modify: `tests/llm.test.js`

- [ ] **Step 1: Update "returns transform plan for existing code" test**

Replace:

```js
it('returns transform plan for existing code', async () => {
  const plan = {
    mode: 'transform',
    target: 'all',
    operations: [{ type: 'increase_reverb', amount: 0.3 }],
    preserve: ['rhythm'],
  };
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ message: { content: JSON.stringify(plan) } }),
  });
  expect(await generateTransformationPlan('s("bd sd")', 'add reverb')).toEqual(plan);
});
```

With:

```js
it('returns transform plan for existing code', async () => {
  const plan = {
    mode: 'transform',
    style: 'acid',
    target: 'bass',
    intensity: 0.7,
  };
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ message: { content: JSON.stringify(plan) } }),
  });
  expect(await generateTransformationPlan('s("bd sd")', 'make it acid')).toEqual(plan);
});
```

- [ ] **Step 2: Update "returns null when transform mode lacks operations array" test**

Replace:

```js
it('returns null when transform mode lacks operations array', async () => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ message: { content: '{"mode":"transform","target":"bass"}' } }),
  });
  expect(await generateTransformationPlan('s("bd")', 'test')).toBeNull();
});
```

With:

```js
it('returns null when transform mode lacks style string', async () => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ message: { content: '{"mode":"transform","target":"bass","intensity":0.5}' } }),
  });
  expect(await generateTransformationPlan('s("bd")', 'test')).toBeNull();
});
```

- [ ] **Step 3: Add test for missing intensity**

Add after the test above:

```js
it('returns null when transform mode lacks intensity number', async () => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ message: { content: '{"mode":"transform","style":"acid","target":"bass"}' } }),
  });
  expect(await generateTransformationPlan('s("bd")', 'test')).toBeNull();
});
```

- [ ] **Step 4: Update "strips markdown fences" test — new transform plan shape**

Replace:

```js
it('strips markdown fences from response', async () => {
  const plan = { mode: 'transform', target: 'all', operations: [], preserve: [] };
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      message: { content: '```json\n' + JSON.stringify(plan) + '\n```' },
    }),
  });
  expect(await generateTransformationPlan('s("bd")', 'test')).toEqual(plan);
});
```

With:

```js
it('strips markdown fences from response', async () => {
  const plan = { mode: 'transform', style: 'groove', target: 'all', intensity: 0.5 };
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      message: { content: '```json\n' + JSON.stringify(plan) + '\n```' },
    }),
  });
  expect(await generateTransformationPlan('s("bd")', 'test')).toEqual(plan);
});
```

- [ ] **Step 5: Run all llm tests**

```bash
npx vitest run tests/llm.test.js
```

Expected: All 10 tests PASS (9 original + 1 new)

- [ ] **Step 6: Commit**

```bash
git add src/llm.js tests/llm.test.js
git commit -m "feat: update LLM to output style/intensity instead of operations"
```

---

## Task 5: Wire `expandStyle` into `app.js`

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Add import for `expandStyle`**

Add after the existing patchEngine import:

```js
import { expandStyle } from './src/library/styles.js';
```

- [ ] **Step 2: Update transform path in `handleSend`**

Replace:

```js
const newCode =
  plan.mode === 'transform'
    ? applyTransformation(currentCode, plan)
    : generateSeed(plan);
```

With:

```js
const newCode =
  plan.mode === 'transform'
    ? applyTransformation(currentCode, {
        operations: expandStyle(plan.style, plan.target, plan.intensity),
      })
    : generateSeed(plan);
```

- [ ] **Step 3: Run full test suite to confirm no regressions**

```bash
npx vitest run
```

Expected: All tests PASS across all 4 test files

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "feat: wire expandStyle into app.js transform path"
```

---

## Task 6: Smoke test end-to-end

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Start Ollama**

```bash
OLLAMA_ORIGINS="*" ollama serve
```

- [ ] **Step 3: Test each style prompt**

With existing code in editor, send each prompt and verify Apply produces recognizable output:
- "make it more acid" → expect resonance/lpf/distortion changes
- "make it groovier" → expect density/delay changes
- "make it minimal" → expect effect removal
- "make it dub" → expect delay/reverb changes
- "make it breakcore" → expect density/distortion changes

- [ ] **Step 4: Test generate mode unchanged**

Clear code, send "make me a beat" → verify generate mode still works (seedCode path)

---

## Self-Review Against Spec

| Spec requirement | Task |
|-----------------|------|
| LLM outputs style/target/intensity, no operations | Task 3 |
| STYLE_LIBRARY as source of truth | Task 2 |
| 5 styles: acid, groove, minimal, dub, breakcore | Task 2 |
| Linear intensity scaling | Task 2 (`expandStyle`) |
| Missing style → fallback minimal | Task 2 |
| Missing target → fallback global | Task 2 |
| Missing intensity → default 0.5 | Task 2 |
| Generate mode unchanged | Task 5 (no changes to generate path) |
| patchEngine unchanged | No patchEngine changes |
| New `tests/library.test.js` | Task 1 |
| Updated existing tests | Task 4 |
| Styles enumerated in LLM prompt | Task 3 |
