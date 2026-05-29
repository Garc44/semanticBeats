# Techno Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all genre styles with a single techno style, add `lock_to_scale` and `apply_sidechain` operations, and wire harmonic state from `app.js` into the transformation pipeline.

**Architecture:** New operations are added to `operations.js` and tested via `patchEngine.js`'s existing test harness. `patchEngine.js` gains an optional `harmonicState` third argument threaded through to handlers. `app.js` stores `harmonicState` module-level, sets it on generate, and passes it on every `applyTransformation` call.

**Tech Stack:** Vanilla JS ES modules, Vite, Vitest, Strudel web API, Ollama/llama3

---

## File Map

| File | Change |
|------|--------|
| `src/operations.js` | Add `lock_to_scale`, `apply_sidechain` to `ALLOWED_OPERATIONS` and `OPERATION_HANDLERS` |
| `src/patchEngine.js` | Add `harmonicState` param to `applyTransformation` and `applyOperation` |
| `src/validate.js` | Add `quantise` and `scale` to `ALLOWED_STRUDEL_FUNCTIONS` |
| `src/library/styles.js` | Replace all styles with `techno` only; `DEFAULT_STYLE = 'techno'` |
| `src/llm.js` | Update system prompt, add generate-mode validation (root/scale/tempo/seedCode) |
| `app.js` | Add `harmonicState` module-level var; set on generate; pass to `applyTransformation`; call `setcpm(plan.tempo / 4)` on apply |
| `tests/patchEngine.test.js` | Add tests for `lock_to_scale` and `apply_sidechain` |
| `tests/library.test.js` | Replace all non-techno style tests with techno coverage |
| `tests/llm.test.js` | Update stale style refs to `techno`; add new validation tests |

---

## Task 1: New operations — `lock_to_scale` and `apply_sidechain`

**Files:**
- Modify: `src/operations.js`
- Modify: `src/validate.js`
- Modify: `tests/patchEngine.test.js`

- [ ] **Step 1: Write failing tests for `lock_to_scale` and `apply_sidechain`**

Add these describe blocks at the bottom of `tests/patchEngine.test.js` (after the existing `generateSeed` block):

```js
describe('lock_to_scale', () => {
  it('appends quantise with harmonicState', () => {
    const plan = { operations: [{ type: 'lock_to_scale', amount: 1.0 }] };
    const harmonicState = { root: 'G', scale: 'aeolian' };
    const result = applyTransformation(base, plan, harmonicState);
    expect(result).toContain('.quantise(scale("G:aeolian"))');
  });

  it('is idempotent — no duplicate quantise on second call', () => {
    const plan = { operations: [{ type: 'lock_to_scale', amount: 1.0 }] };
    const harmonicState = { root: 'G', scale: 'aeolian' };
    const once = applyTransformation(base, plan, harmonicState);
    const twice = applyTransformation(once, plan, harmonicState);
    expect((twice.match(/\.quantise\(/g) ?? []).length).toBe(1);
  });

  it('returns code unchanged when harmonicState is null', () => {
    const plan = { operations: [{ type: 'lock_to_scale', amount: 1.0 }] };
    expect(applyTransformation(base, plan, null)).toBe(base);
  });

  it('returns code unchanged when harmonicState.root is null', () => {
    const plan = { operations: [{ type: 'lock_to_scale', amount: 1.0 }] };
    expect(applyTransformation(base, plan, { root: null, scale: 'aeolian' })).toBe(base);
  });
});

describe('apply_sidechain', () => {
  it('appends gain pattern ducked at intensity 0.8', () => {
    // duckedVolume = round2(1 - 0.8 * 0.95) = round2(1 - 0.76) = 0.24
    const plan = { operations: [{ type: 'apply_sidechain', amount: 0.8 }] };
    const result = applyTransformation(base, plan);
    expect(result).toContain('.gain("0.24 1 1 1")');
  });

  it('appends gain pattern ducked at intensity 0.5', () => {
    // duckedVolume = round2(1 - 0.5 * 0.95) = round2(0.525) = 0.53
    const plan = { operations: [{ type: 'apply_sidechain', amount: 0.5 }] };
    const result = applyTransformation(base, plan);
    expect(result).toContain('.gain("0.53 1 1 1")');
  });

  it('is idempotent — no duplicate gain on second call', () => {
    const plan = { operations: [{ type: 'apply_sidechain', amount: 0.8 }] };
    const once = applyTransformation(base, plan);
    const twice = applyTransformation(once, plan);
    expect((twice.match(/\.gain\(/g) ?? []).length).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/patchEngine.test.js
```

Expected: 7 new failures — `lock_to_scale` and `apply_sidechain` handlers not defined yet.

- [ ] **Step 3: Add `quantise` and `scale` to `ALLOWED_STRUDEL_FUNCTIONS` in `src/validate.js`**

The regex in `validateCode` matches every `.method(` call, including `scale(` inside `.quantise(scale("G:aeolian"))`. Both must be allowed.

Replace the exports in `src/validate.js`:

```js
export const ALLOWED_STRUDEL_FUNCTIONS = new Set([
  'sound', 's', 'note', 'n', 'stack', 'cat', 'seq',
  'lpf', 'hpf', 'delay', 'room', 'size', 'gain', 'pan',
  'fast', 'slow', 'speed', 'crush', 'shape', 'distort',
  'resonance', 'cutoff', 'vowel', 'decay', 'sustain', 'penv', 'lpq',
  'jux', 'rev', 'iter', 'every', 'sometimes', 'rarely', 'often',
  'degradeBy', 'degrade', 'segment', 'struct', 'mask', 'euclid',
  'palindrome', 'ply', 'press', 'zoom', 'linger', 'stretch',
  'quantise', 'scale',
]);
```

- [ ] **Step 4: Add `lock_to_scale` and `apply_sidechain` to `src/operations.js`**

Add both to `ALLOWED_OPERATIONS`:

```js
export const ALLOWED_OPERATIONS = [
  'increase_resonance',
  'decrease_cutoff',
  'add_delay',
  'add_distortion',
  'increase_density',
  'simplify_pattern',
  'increase_reverb',
  'reduce_reverb',
  'increase_filter_motion',
  'change_waveform',
  'adjust_decay',
  'adjust_lpq',
  'lock_to_scale',
  'apply_sidechain',
];
```

Add both handlers to `OPERATION_HANDLERS` (append after `adjust_lpq`):

```js
  lock_to_scale: (code, _amt, context) => {
    if (!context?.root) return code;
    const stripped = code
      .replace(/\n?\s*\.scale\([^)]*\)/g, '')
      .replace(/\n?\s*\.quantise\([^)]*\)/g, '');
    return stripped.trimEnd() + `\n  .quantise(scale("${context.root}:${context.scale}"))`;
  },

  apply_sidechain: (code, amt) => {
    const duckedVolume = round2(1 - amt * 0.95);
    const stripped = code.replace(/\n?\s*\.gain\([^)]*\)/g, '');
    return stripped.trimEnd() + `\n  .gain("${duckedVolume} 1 1 1")`;
  },
```

- [ ] **Step 5: Update `patchEngine.js` to thread `harmonicState` through to handlers**

Replace the full content of `src/patchEngine.js`:

```js
import { ALLOWED_OPERATIONS, OPERATION_HANDLERS } from './operations.js';

const DEFAULT_SEED = 's("bd ~ bd ~")';

export function applyTransformation(code, plan, harmonicState = null) {
  const { operations = [] } = plan;
  if (!Array.isArray(operations)) return code;
  return operations
    .filter((op) => ALLOWED_OPERATIONS.includes(op.type))
    .reduce((acc, op) => applyOperation(acc, op, harmonicState), code);
}

export function generateSeed(plan) {
  const { seedCode = DEFAULT_SEED, operations = [] } = plan;
  return applyTransformation(seedCode, { operations });
}

function applyOperation(code, { type, amount = 0.3 }, harmonicState) {
  const handler = OPERATION_HANDLERS[type];
  if (!handler) return code;
  return handler(code, amount, harmonicState);
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx vitest run tests/patchEngine.test.js
```

Expected: all 17 tests pass (10 original + 7 new).

- [ ] **Step 7: Commit**

```bash
git add src/operations.js src/patchEngine.js src/validate.js tests/patchEngine.test.js
git commit -m "feat: add lock_to_scale and apply_sidechain operations"
```

---

## Task 2: Techno-only `STYLE_LIBRARY`

**Files:**
- Modify: `src/library/styles.js`
- Modify: `tests/library.test.js`

- [ ] **Step 1: Replace `tests/library.test.js` with techno-only coverage**

```js
import { describe, it, expect } from 'vitest';
import { expandStyle } from '../src/library/styles.js';
import { ALLOWED_OPERATIONS } from '../src/operations.js';

describe('expandStyle', () => {
  it('returns operations array for techno global target', () => {
    const ops = expandStyle('techno', 'global', 1.0);
    expect(Array.isArray(ops)).toBe(true);
    expect(ops.length).toBeGreaterThan(0);
    ops.forEach(op => {
      expect(typeof op.type).toBe('string');
      expect(typeof op.amount).toBe('number');
    });
  });

  it('returns non-empty ops for techno drums target', () => {
    const ops = expandStyle('techno', 'drums', 1.0);
    expect(ops.length).toBeGreaterThan(0);
  });

  it('returns non-empty ops for techno bass target', () => {
    const ops = expandStyle('techno', 'bass', 1.0);
    expect(ops.length).toBeGreaterThan(0);
  });

  it('returns non-empty ops for techno melody target', () => {
    const ops = expandStyle('techno', 'melody', 1.0);
    expect(ops.length).toBeGreaterThan(0);
  });

  it('falls back to techno when unknown style passed', () => {
    const opsUnknown = expandStyle('unknown_style', 'global', 1.0);
    const opsTechno = expandStyle('techno', 'global', 1.0);
    expect(opsUnknown).toEqual(opsTechno);
  });

  it('falls back to global when target not found in style', () => {
    const opsWithTarget = expandStyle('techno', 'nonexistent_target', 1.0);
    const opsGlobal = expandStyle('techno', 'global', 1.0);
    expect(opsWithTarget).toEqual(opsGlobal);
  });

  it('scales amounts linearly by intensity', () => {
    const opsFull = expandStyle('techno', 'drums', 1.0);
    const opsHalf = expandStyle('techno', 'drums', 0.5);
    expect(opsHalf.length).toBe(opsFull.length);
    opsHalf.forEach((op, i) => {
      expect(op.amount).toBeCloseTo(opsFull[i].amount * 0.5, 5);
    });
  });

  it('uses default intensity 0.5 when not provided', () => {
    const opsDefault = expandStyle('techno', 'bass');
    const opsExplicit = expandStyle('techno', 'bass', 0.5);
    expect(opsDefault).toEqual(opsExplicit);
  });

  it('only returns operation types from ALLOWED_OPERATIONS', () => {
    ['global', 'drums', 'bass', 'melody'].forEach(target => {
      const ops = expandStyle('techno', target, 1.0);
      ops.forEach(op => {
        expect(ALLOWED_OPERATIONS).toContain(op.type);
      });
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/library.test.js
```

Expected: failures — `techno` key does not exist in `STYLE_LIBRARY` yet; `unknown_style` falls back to `minimal` (not `techno`).

- [ ] **Step 3: Replace `src/library/styles.js` with techno-only library**

```js
export const STYLE_LIBRARY = {
  techno: {
    global: [
      { type: 'lock_to_scale',      amount: 1.0 },
      { type: 'increase_resonance', amount: 0.4 },
      { type: 'decrease_cutoff',    amount: 0.3 },
    ],
    drums: [
      { type: 'increase_density', amount: 0.4 },
      { type: 'add_distortion',   amount: 0.3 },
    ],
    bass: [
      { type: 'apply_sidechain',    amount: 0.8 },
      { type: 'lock_to_scale',      amount: 1.0 },
      { type: 'increase_resonance', amount: 0.5 },
      { type: 'adjust_lpq',         amount: 0.4 },
    ],
    melody: [
      { type: 'lock_to_scale',          amount: 1.0 },
      { type: 'increase_filter_motion', amount: 0.5 },
    ],
  },
};

const DEFAULT_STYLE = 'techno';
const DEFAULT_INTENSITY = 0.5;

export function expandStyle(style, target, intensity = DEFAULT_INTENSITY) {
  const styleEntry = STYLE_LIBRARY[style] ?? STYLE_LIBRARY[DEFAULT_STYLE];
  const ops = styleEntry[target] ?? styleEntry.global ?? [];
  return ops.map(op => ({ type: op.type, amount: op.amount * intensity }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/library.test.js
```

Expected: all 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/library/styles.js tests/library.test.js
git commit -m "feat: replace STYLE_LIBRARY with techno-only style"
```

---

## Task 3: `llm.js` — system prompt, plan shape, validation

**Files:**
- Modify: `src/llm.js`
- Modify: `tests/llm.test.js`

- [ ] **Step 1: Add new validation tests and update stale style refs in `tests/llm.test.js`**

Replace the full content of `tests/llm.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateTransformationPlan, autoFixCode } from '../src/llm.js';

describe('generateTransformationPlan', () => {
  beforeEach(() => vi.restoreAllMocks());

  function capturedBody() {
    return JSON.parse(global.fetch.mock.calls[0][1].body);
  }

  it('returns transform plan for existing code', async () => {
    const plan = { mode: 'transform', style: 'techno', target: 'bass', intensity: 0.7 };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: JSON.stringify(plan) } }),
    });
    expect(await generateTransformationPlan('s("bd sd")', 'make it techno')).toEqual(plan);
  });

  it('returns generate plan when code is empty', async () => {
    const plan = {
      mode: 'generate',
      style: 'techno',
      root: 'G',
      scale: 'aeolian',
      tempo: 128,
      seedCode: 's("bd ~ sn ~")',
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: JSON.stringify(plan) } }),
    });
    const result = await generateTransformationPlan('', 'make a beat');
    expect(result.mode).toBe('generate');
    expect(result.seedCode).toBe('s("bd ~ sn ~")');
    expect(result.root).toBe('G');
    expect(result.scale).toBe('aeolian');
    expect(result.tempo).toBe(128);
  });

  it('returns null on invalid JSON', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: 'not json' } }),
    });
    expect(await generateTransformationPlan('s("bd")', 'test')).toBeNull();
  });

  it('returns null on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    expect(await generateTransformationPlan('s("bd")', 'test')).toBeNull();
  });

  it('returns null on fetch error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network'));
    expect(await generateTransformationPlan('s("bd")', 'test')).toBeNull();
  });

  it('returns null when mode field is missing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: '{"target":"bass"}' } }),
    });
    expect(await generateTransformationPlan('s("bd")', 'test')).toBeNull();
  });

  it('returns null when transform style is not techno', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { content: '{"mode":"transform","style":"groove","target":"bass","intensity":0.5}' },
      }),
    });
    expect(await generateTransformationPlan('s("bd")', 'test')).toBeNull();
  });

  it('returns null when transform target is not a valid stem', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { content: '{"mode":"transform","style":"techno","target":"synthesizer","intensity":0.5}' },
      }),
    });
    expect(await generateTransformationPlan('s("bd")', 'test')).toBeNull();
  });

  it('returns null when transform mode lacks intensity number', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { content: '{"mode":"transform","style":"techno","target":"bass"}' },
      }),
    });
    expect(await generateTransformationPlan('s("bd")', 'test')).toBeNull();
  });

  it('returns null when generate mode lacks seedCode string', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { content: '{"mode":"generate","style":"techno","root":"G","scale":"aeolian","tempo":128}' },
      }),
    });
    expect(await generateTransformationPlan('', 'test')).toBeNull();
  });

  it('returns null when generate seedCode has no parentheses', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { content: '{"mode":"generate","style":"techno","root":"G","scale":"aeolian","tempo":128,"seedCode":"bd ~ sn ~"}' },
      }),
    });
    expect(await generateTransformationPlan('', 'test')).toBeNull();
  });

  it('returns null when generate root is invalid', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { content: '{"mode":"generate","style":"techno","root":"Z","scale":"aeolian","tempo":128,"seedCode":"s(\\"bd~\\")"}' },
      }),
    });
    expect(await generateTransformationPlan('', 'test')).toBeNull();
  });

  it('returns null when generate scale is not in allowed list', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { content: '{"mode":"generate","style":"techno","root":"G","scale":"major","tempo":128,"seedCode":"s(\\"bd~\\")"}' },
      }),
    });
    expect(await generateTransformationPlan('', 'test')).toBeNull();
  });

  it('returns null when generate tempo is out of range', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { content: '{"mode":"generate","style":"techno","root":"G","scale":"aeolian","tempo":200,"seedCode":"s(\\"bd~\\")"}' },
      }),
    });
    expect(await generateTransformationPlan('', 'test')).toBeNull();
  });

  it('strips markdown fences from response', async () => {
    const plan = { mode: 'transform', style: 'techno', target: 'all', intensity: 0.5 };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { content: '```json\n' + JSON.stringify(plan) + '\n```' },
      }),
    });
    expect(await generateTransformationPlan('s("bd")', 'test')).toEqual(plan);
  });

  it('includes pillarName in system message content', async () => {
    const plan = { mode: 'transform', style: 'techno', target: 'bass', intensity: 0.7 };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: JSON.stringify(plan) } }),
    });
    await generateTransformationPlan('s("bd")', 'make it techno', [], 0.5, 'bassline');
    const body = capturedBody();
    expect(body.messages[0].content).toContain('bassline');
  });

  it('includes intensityHint in system message content', async () => {
    const plan = { mode: 'transform', style: 'techno', target: 'bass', intensity: 0.8 };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: JSON.stringify(plan) } }),
    });
    await generateTransformationPlan('s("bd")', 'make it techno', [], 0.8, 'melody');
    const body = capturedBody();
    expect(body.messages[0].content).toContain('0.8');
  });

  it('passes history as middle messages in fetch body', async () => {
    const plan = { mode: 'transform', style: 'techno', target: 'all', intensity: 0.5 };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: JSON.stringify(plan) } }),
    });
    const history = [
      { role: 'user', content: 'Previous request' },
      { role: 'assistant', content: '{"mode":"transform","style":"techno","target":"all","intensity":0.3}' },
    ];
    await generateTransformationPlan('s("bd")', 'now groovy', history, 0.5, 'foundation');
    const body = capturedBody();
    expect(body.messages).toHaveLength(4); // system + 2 history + user
    expect(body.messages[1]).toEqual(history[0]);
    expect(body.messages[2]).toEqual(history[1]);
  });
});

describe('autoFixCode', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns cleaned code on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: 's("bd sd")' } }),
    });
    const result = await autoFixCode('s("bd sd"', 'Unexpected end of input');
    expect(result).toBe('s("bd sd")');
  });

  it('strips markdown fences from fixed code', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { content: '```javascript\ns("bd sd")\n```' },
      }),
    });
    const result = await autoFixCode('s("bd sd"', 'error');
    expect(result).toBe('s("bd sd")');
  });

  it('throws on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(autoFixCode('bad code', 'error')).rejects.toThrow('Ollama HTTP 500');
  });
});
```

- [ ] **Step 2: Run tests to verify failures**

```bash
npx vitest run tests/llm.test.js
```

Expected: ~5 failures — new validation tests fail because `llm.js` hasn't been updated yet; `style: 'groove'` test passes through (since STYLE_LIBRARY now only has `techno`, so STYLES is `['techno']` and `groove` fails the existing check — this one may already pass).

- [ ] **Step 3: Replace `src/llm.js` with updated system prompt and validation**

```js
import { STYLE_LIBRARY } from './library/styles.js';

const STYLES = Object.keys(STYLE_LIBRARY);
const ALLOWED_SCALES = ['phrygian', 'aeolian', 'dorian', 'minorPentatonic'];

function makeSystemPrompt(pillarName, intensityHint) {
  return `You are editing the ${pillarName} layer of a Strudel live-coding techno track.
Return ONLY valid JSON. No prose. No markdown. No explanation.

If currentCode is empty or "none" → mode = "generate".
If currentCode exists → mode = "transform".

Transform mode schema:
{"mode":"transform","style":"techno","target":"bass|drums|melody|all","intensity":${intensityHint}}

Generate mode schema:
{"mode":"generate","style":"techno","root":"A|B|C|D|E|F|G","scale":"phrygian|aeolian|dorian|minorPentatonic","tempo":128,"seedCode":"s(\\"bd ~ bd ~\\")"}

Rules:
- style must be "techno"
- transform target must be one of: bass, drums, melody, all
- transform intensity must be a number between 0.1 and 1.0
- generate root must be a single uppercase letter A through G
- generate scale must be one of: phrygian, aeolian, dorian, minorPentatonic
- generate tempo must be an integer between 100 and 160
- generate seedCode must be a valid Strudel expression containing parentheses
- No extra keys, no comments, no markdown`;
}

export async function generateTransformationPlan(
  currentCode,
  prompt,
  history = [],
  intensityHint = 0.5,
  pillarName = 'pattern'
) {
  try {
    const codeContext = currentCode?.trim() ? currentCode : 'none';
    const systemMsg = { role: 'system', content: makeSystemPrompt(pillarName, intensityHint) };
    const userMsg = { role: 'user', content: `Current code:\n${codeContext}\n\nRequest: ${prompt}` };

    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3:latest',
        messages: [systemMsg, ...history, userMsg],
        stream: false,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const raw = data.message?.content ?? '';
    const cleaned = raw.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim();
    const plan = JSON.parse(cleaned);

    if (!plan.mode || !['transform', 'generate'].includes(plan.mode)) return null;

    if (plan.mode === 'transform') {
      if (typeof plan.style !== 'string') return null;
      if (!STYLES.includes(plan.style)) return null;
      if (typeof plan.intensity !== 'number') return null;
      if (plan.intensity < 0.1 || plan.intensity > 1.0) return null;
      if (!['bass', 'drums', 'melody', 'all'].includes(plan.target)) return null;
    }

    if (plan.mode === 'generate') {
      if (typeof plan.seedCode !== 'string') return null;
      if (!plan.seedCode.includes('(') || !plan.seedCode.includes(')')) return null;
      if (typeof plan.root !== 'string' || !/^[A-G]$/.test(plan.root)) return null;
      if (!ALLOWED_SCALES.includes(plan.scale)) return null;
      if (
        typeof plan.tempo !== 'number' ||
        !Number.isInteger(plan.tempo) ||
        plan.tempo < 100 ||
        plan.tempo > 160
      ) return null;
    }

    return plan;
  } catch {
    return null;
  }
}

export async function autoFixCode(brokenCode, errorMessage) {
  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3:latest',
      messages: [
        {
          role: 'system',
          content: 'Fix the Strudel JS syntax error. Return only corrected code. No markdown. No explanation.',
        },
        { role: 'user', content: `Code:\n${brokenCode}\n\nError: ${errorMessage}` },
      ],
      stream: false,
    }),
  });

  if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);

  const data = await response.json();
  const raw = data.message?.content ?? '';
  return raw.replace(/```[\w]*\n?/g, '').trim();
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/llm.test.js
```

Expected: all tests pass.

- [ ] **Step 5: Run full test suite to verify no regressions**

```bash
npm test
```

Expected: all tests pass across all 4 files.

- [ ] **Step 6: Commit**

```bash
git add src/llm.js tests/llm.test.js
git commit -m "feat: update llm.js for techno-only style with harmonic plan validation"
```

---

## Task 4: `app.js` — harmonic state and tempo wiring

**Files:**
- Modify: `app.js`

No new tests — `app.js` wires modules together and is not unit-tested in this codebase.

- [ ] **Step 1: Add `harmonicState` module-level variable**

After the `const pillars = makePillars();` line (line 19), add:

```js
let harmonicState = { root: null, scale: null };
```

- [ ] **Step 2: Set `harmonicState` when generate plan is received**

In `handlePillarSend`, after the `if (!plan)` guard block and before the generate/transform branch, add:

```js
if (plan.mode === 'generate') {
  harmonicState = { root: plan.root, scale: plan.scale };
}
```

The full updated section (lines ~108–128 in original) becomes:

```js
  if (!plan) {
    addPillarMessage(pillarName, 'error', 'Could not plan transformation. Try rephrasing.');
    setStatus('Error');
    return;
  }

  if (plan.mode === 'generate' && pillar.code.trim()) {
    addPillarMessage(pillarName, 'error', 'Generate mode returned for existing code. Try a more specific request.');
    setStatus('Error');
    return;
  }

  if (plan.mode === 'generate') {
    harmonicState = { root: plan.root, scale: plan.scale };
  }

  let newCode;
  if (plan.mode === 'transform') {
    newCode = applyTransformation(pillar.code, {
      operations: expandStyle(plan.style, plan.target, plan.intensity),
    }, harmonicState);
  } else {
    newCode = generateSeed(plan);
  }
```

- [ ] **Step 3: Call `setcpm(plan.tempo / 4)` inside the onApply callback**

In the `addPillarPreviewMessage` onApply callback, add the `setcpm` call after `updatePillarCode` and before `rebuildAndPlay`. The full callback becomes:

```js
    async () => {
      pillar.code = newCode;
      updatePillarCode(pillarName, newCode);
      pillar.history.push(
        { role: 'user', content: `Current code:\n${prevCode}\n\nRequest: ${prompt}` },
        { role: 'assistant', content: newCode }
      );
      if (plan.mode === 'generate' && typeof plan.tempo === 'number') {
        setcpm(plan.tempo / 4);
      }
      await rebuildAndPlay();
      setStatus('Applied');
    },
```

- [ ] **Step 4: Run full test suite to verify nothing broken**

```bash
npm test
```

Expected: all tests pass (app.js is not unit-tested; structural correctness verified by the test suite passing).

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "feat: wire harmonicState and LLM tempo into app.js pipeline"
```

---

## Final Verification

- [ ] **Run full test suite one last time**

```bash
npm test
```

Expected output:
```
Test Files  4 passed (4)
Tests      XX passed (XX)
```

- [ ] **Verify Strudel output format manually** (requires Ollama running)

Start dev server: `npm run dev`

1. With empty pillar, type "make a dark techno bassline" → verify preview shows `.quantise(scale(...))` appended
2. Apply → verify `.gain("... 1 1 1")` on bass pillar
3. With code present, type "add more resonance" → verify transform applies with existing harmonicState

- [ ] **Final commit if any fixups needed**

```bash
git add -p
git commit -m "fix: <describe>"
```
