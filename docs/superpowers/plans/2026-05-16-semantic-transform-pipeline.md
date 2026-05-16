# Semantic Transform Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two-call classify→generateCode LLM pipeline with a single `generateTransformationPlan()` call that returns structured JSON, then apply changes deterministically via `patchEngine.js`.

**Architecture:** LLM becomes a semantic planner returning `{ mode, operations }` JSON only. A new `patchEngine.js` deterministically applies a closed vocabulary of operations to existing code. A `validate.js` layer guards before `play()`. Two modes: `transform` (modify existing code) and `generate` (LLM provides a minimal seed, engine applies operations on top).

**Tech Stack:** Vanilla JS ES modules, Vitest, Ollama (`llama3:latest`), Strudel

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/operations.js` | CREATE | `ALLOWED_OPERATIONS` array + `OPERATION_HANDLERS` map |
| `src/validate.js` | CREATE | `validateCode(code)` → `{valid, errors}` |
| `src/patchEngine.js` | CREATE | `applyTransformation(code, plan)`, `generateSeed(plan)` |
| `src/llm.js` | MODIFY | Remove `classifyIntent`, `generateCode`. Add `generateTransformationPlan`. Keep `autoFixCode`. |
| `app.js` | MODIFY | Wire new single-call pipeline with validate step |
| `tests/validate.test.js` | CREATE | Tests for validate.js |
| `tests/patchEngine.test.js` | CREATE | Tests for patchEngine.js |
| `tests/llm.test.js` | MODIFY | Replace classifyIntent/generateCode tests with generateTransformationPlan tests |

---

## Task 1: Create `src/operations.js`

**Files:**
- Create: `src/operations.js`

- [ ] **Step 1: Write `src/operations.js`**

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
];

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function round2(v) {
  return Math.round(v * 100) / 100;
}

// Finds `.method(N)` and adjusts N by delta. Appends with default+delta if absent.
function adjustMethod(code, method, delta, { min, max, defaultVal }) {
  const regex = new RegExp(`\\.${method}\\(([\\d.]+)\\)`);
  const match = code.match(regex);
  if (match) {
    const next = clamp(parseFloat(match[1]) + delta, min, max);
    return code.replace(regex, `.${method}(${round2(next)})`);
  }
  return code.trimEnd() + `\n  .${method}(${round2(clamp(defaultVal + delta, min, max))})`;
}

function appendIfMissing(code, method, value) {
  if (code.includes(`.${method}(`)) return code;
  return code.trimEnd() + `\n  .${method}(${value})`;
}

function removeLastEffect(code) {
  return code.replace(/\n?\s*\.[a-zA-Z]+\([^)]*\)\s*$/, '').trimEnd();
}

function setMethodPattern(code, method, pattern) {
  const regex = new RegExp(`\\.${method}\\([^)]*\\)`);
  if (code.match(regex)) return code.replace(regex, `.${method}(${pattern})`);
  return code.trimEnd() + `\n  .${method}(${pattern})`;
}

export const OPERATION_HANDLERS = {
  increase_reverb:        (code, amt) => adjustMethod(code, 'room',      amt,         { min: 0,   max: 0.9,  defaultVal: 0 }),
  reduce_reverb:          (code, amt) => adjustMethod(code, 'room',      -amt,        { min: 0,   max: 0.9,  defaultVal: 0.5 }),
  increase_resonance:     (code, amt) => adjustMethod(code, 'resonance', amt * 10,    { min: 0,   max: 20,   defaultVal: 0 }),
  decrease_cutoff:        (code, amt) => adjustMethod(code, 'lpf',       -amt * 2000, { min: 200, max: 4000, defaultVal: 4000 }),
  add_delay:              (code, amt) => appendIfMissing(code, 'delay',  round2(amt).toString()),
  add_distortion:         (code, amt) => appendIfMissing(code, 'distort', round2(amt).toString()),
  increase_density:       (code, amt) => adjustMethod(code, 'fast',      amt * 2,     { min: 0.5, max: 8,   defaultVal: 1 }),
  simplify_pattern:       (code, _)   => removeLastEffect(code),
  increase_filter_motion: (code, _)   => setMethodPattern(code, 'lpf', '"<400 800 200 600>"'),
};
```

- [ ] **Step 2: Commit**

```bash
git add src/operations.js
git commit -m "feat: add operations vocabulary and handlers"
```

---

## Task 2: Create `src/validate.js` (TDD)

**Files:**
- Create: `tests/validate.test.js`
- Create: `src/validate.js`

- [ ] **Step 1: Write failing tests in `tests/validate.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { validateCode } from '../src/validate.js';

describe('validateCode', () => {
  it('passes valid Strudel code', () => {
    expect(validateCode('s("bd ~ sn ~")')).toEqual({ valid: true, errors: [] });
  });

  it('fails on empty string', () => {
    const r = validateCode('');
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('Code is empty');
  });

  it('fails on null', () => {
    expect(validateCode(null).valid).toBe(false);
  });

  it('fails on markdown fences', () => {
    const r = validateCode('```js\ns("bd")\n```');
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('Code contains markdown fences');
  });

  it('fails on unbalanced open parens', () => {
    const r = validateCode('s("bd"');
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('Unbalanced parentheses');
  });

  it('fails on unbalanced close parens', () => {
    const r = validateCode('s("bd"))');
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('Unbalanced parentheses');
  });

  it('fails on unknown Strudel function', () => {
    const r = validateCode('s("bd").fakeEffect(0.5)');
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/Unknown function: fakeEffect/);
  });

  it('passes code with known effects chained', () => {
    expect(validateCode('s("bd ~ sn ~").room(0.3).gain(0.8).lpf(1000)')).toEqual({ valid: true, errors: [] });
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL (module not found)**

```bash
npx vitest run tests/validate.test.js
```

Expected: `Error: Cannot find module '../src/validate.js'`

- [ ] **Step 3: Write `src/validate.js`**

```js
export const ALLOWED_STRUDEL_FUNCTIONS = new Set([
  'sound', 's', 'note', 'n', 'stack', 'cat', 'seq',
  'lpf', 'hpf', 'delay', 'room', 'size', 'gain', 'pan',
  'fast', 'slow', 'speed', 'crush', 'shape', 'distort',
  'resonance', 'cutoff', 'vowel',
  'jux', 'rev', 'iter', 'every', 'sometimes', 'rarely', 'often',
  'degradeBy', 'degrade', 'segment', 'struct', 'mask', 'euclid',
  'palindrome', 'ply', 'press', 'zoom', 'linger', 'stretch',
]);

export function validateCode(code) {
  const errors = [];

  if (!code || !code.trim()) {
    errors.push('Code is empty');
    return { valid: false, errors };
  }

  if (/```/.test(code)) {
    errors.push('Code contains markdown fences');
  }

  let depth = 0;
  let unbalanced = false;
  for (const ch of code) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (depth < 0) { unbalanced = true; break; }
  }
  if (unbalanced || depth !== 0) {
    errors.push('Unbalanced parentheses');
  }

  const methodCalls = [...code.matchAll(/\.([a-zA-Z]+)\s*\(/g)].map((m) => m[1]);
  for (const fn of methodCalls) {
    if (!ALLOWED_STRUDEL_FUNCTIONS.has(fn)) {
      errors.push(`Unknown function: ${fn}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
```

- [ ] **Step 4: Run tests — expect all PASS**

```bash
npx vitest run tests/validate.test.js
```

Expected: `8 tests passed`

- [ ] **Step 5: Commit**

```bash
git add src/validate.js tests/validate.test.js
git commit -m "feat: add validate.js with paren/fence/allowlist checks"
```

---

## Task 3: Create `src/patchEngine.js` (TDD)

**Files:**
- Create: `tests/patchEngine.test.js`
- Create: `src/patchEngine.js`

- [ ] **Step 1: Write failing tests in `tests/patchEngine.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { applyTransformation, generateSeed } from '../src/patchEngine.js';

const base = 's("bd ~ sn ~")';

describe('applyTransformation', () => {
  it('adds room when not present', () => {
    const plan = { operations: [{ type: 'increase_reverb', amount: 0.4 }] };
    expect(applyTransformation(base, plan)).toContain('.room(');
  });

  it('increases existing room value', () => {
    const code = 's("bd ~ sn ~").room(0.3)';
    const plan = { operations: [{ type: 'increase_reverb', amount: 0.2 }] };
    expect(applyTransformation(code, plan)).toContain('.room(0.5)');
  });

  it('caps room at 0.9', () => {
    const code = 's("bd ~ sn ~").room(0.8)';
    const plan = { operations: [{ type: 'increase_reverb', amount: 0.5 }] };
    expect(applyTransformation(code, plan)).toContain('.room(0.9)');
  });

  it('reduces room value', () => {
    const code = 's("bd ~ sn ~").room(0.6)';
    const plan = { operations: [{ type: 'reduce_reverb', amount: 0.2 }] };
    expect(applyTransformation(code, plan)).toContain('.room(0.4)');
  });

  it('appends delay when absent', () => {
    const plan = { operations: [{ type: 'add_delay', amount: 0.3 }] };
    expect(applyTransformation(base, plan)).toContain('.delay(0.3)');
  });

  it('does not duplicate delay when already present', () => {
    const code = 's("bd").delay(0.3)';
    const plan = { operations: [{ type: 'add_delay', amount: 0.4 }] };
    const result = applyTransformation(code, plan);
    expect(result.match(/\.delay\(/g)).toHaveLength(1);
  });

  it('applies increase_filter_motion as pattern', () => {
    const plan = { operations: [{ type: 'increase_filter_motion', amount: 0.5 }] };
    expect(applyTransformation(base, plan)).toContain('.lpf(');
  });

  it('skips unknown operations without throwing', () => {
    const plan = { operations: [{ type: 'invented_op', amount: 0.3 }] };
    expect(applyTransformation(base, plan)).toBe(base);
  });

  it('applies multiple operations in order', () => {
    const plan = {
      operations: [
        { type: 'increase_reverb', amount: 0.3 },
        { type: 'add_delay', amount: 0.2 },
      ],
    };
    const result = applyTransformation(base, plan);
    expect(result).toContain('.room(');
    expect(result).toContain('.delay(');
  });

  it('returns original code with empty operations', () => {
    const plan = { operations: [] };
    expect(applyTransformation(base, plan)).toBe(base);
  });
});

describe('generateSeed', () => {
  it('uses provided seedCode', () => {
    const plan = { seedCode: 's("bd ~ sn ~")', operations: [] };
    expect(generateSeed(plan)).toBe('s("bd ~ sn ~")');
  });

  it('applies operations to seedCode', () => {
    const plan = {
      seedCode: 's("bd ~ sn ~")',
      operations: [{ type: 'increase_reverb', amount: 0.4 }],
    };
    expect(generateSeed(plan)).toContain('.room(');
  });

  it('falls back to default seed when seedCode missing', () => {
    const result = generateSeed({ operations: [] });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run tests/patchEngine.test.js
```

Expected: `Error: Cannot find module '../src/patchEngine.js'`

- [ ] **Step 3: Write `src/patchEngine.js`**

```js
import { ALLOWED_OPERATIONS, OPERATION_HANDLERS } from './operations.js';

const DEFAULT_SEED = 's("bd ~ sn ~")';

export function applyTransformation(code, plan) {
  const { operations = [] } = plan;
  return operations
    .filter((op) => ALLOWED_OPERATIONS.includes(op.type))
    .reduce((acc, op) => applyOperation(acc, op), code);
}

export function generateSeed(plan) {
  const { seedCode = DEFAULT_SEED, operations = [] } = plan;
  return applyTransformation(seedCode, { operations });
}

function applyOperation(code, { type, amount = 0.3 }) {
  const handler = OPERATION_HANDLERS[type];
  if (!handler) return code;
  return handler(code, amount);
}
```

- [ ] **Step 4: Run tests — expect all PASS**

```bash
npx vitest run tests/patchEngine.test.js
```

Expected: `12 tests passed`

- [ ] **Step 5: Commit**

```bash
git add src/patchEngine.js tests/patchEngine.test.js
git commit -m "feat: add patchEngine with deterministic operation application"
```

---

## Task 4: Refactor `src/llm.js` (TDD)

**Files:**
- Modify: `tests/llm.test.js`
- Modify: `src/llm.js`

- [ ] **Step 1: Replace classifyIntent/generateCode tests in `tests/llm.test.js`**

Replace the `describe('classifyIntent', ...)` and `describe('generateCode', ...)` blocks. Keep `describe('autoFixCode', ...)` unchanged. Add:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateTransformationPlan, autoFixCode } from '../src/llm.js';

describe('generateTransformationPlan', () => {
  beforeEach(() => vi.restoreAllMocks());

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

  it('returns generate plan when code is empty', async () => {
    const plan = { mode: 'generate', seedCode: 's("bd ~ sn ~")', operations: [] };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: JSON.stringify(plan) } }),
    });
    const result = await generateTransformationPlan('', 'make a beat');
    expect(result.mode).toBe('generate');
    expect(typeof result.seedCode).toBe('string');
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

  it('returns null when transform mode lacks operations array', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: '{"mode":"transform","target":"bass"}' } }),
    });
    expect(await generateTransformationPlan('s("bd")', 'test')).toBeNull();
  });

  it('returns null when generate mode lacks seedCode string', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: '{"mode":"generate","operations":[]}' } }),
    });
    expect(await generateTransformationPlan('', 'test')).toBeNull();
  });

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
});

// Keep describe('autoFixCode', ...) block unchanged below
```

- [ ] **Step 2: Run tests — expect FAIL (generateTransformationPlan not exported)**

```bash
npx vitest run tests/llm.test.js
```

Expected: `SyntaxError` or import error on `generateTransformationPlan`

- [ ] **Step 3: Rewrite `src/llm.js`**

```js
import { ALLOWED_OPERATIONS } from './operations.js';

const TRANSFORM_SYSTEM_PROMPT = `You are a music transformation planner for Strudel live-coding.
Return ONLY valid JSON. No prose. No markdown. No explanation.

ALLOWED_OPERATIONS: ${ALLOWED_OPERATIONS.join(', ')}

If currentCode is empty or "none" → mode = "generate".
If currentCode exists → mode = "transform".

Transform mode schema:
{"mode":"transform","target":"bass|drums|melody|all","operations":[{"type":"<op>","amount":0.1}],"preserve":["rhythm"]}

Generate mode schema:
{"mode":"generate","seedCode":"s(\\"bd ~ sn ~\\")","operations":[]}

Rules:
- Only use operations from ALLOWED_OPERATIONS
- amount must be 0.1 to 1.0
- No extra keys, no comments, no markdown`;

export async function generateTransformationPlan(currentCode, userPrompt) {
  try {
    const codeContext = currentCode?.trim() ? currentCode : 'none';
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3:latest',
        messages: [
          { role: 'system', content: TRANSFORM_SYSTEM_PROMPT },
          { role: 'user', content: `Current code:\n${codeContext}\n\nRequest: ${userPrompt}` },
        ],
        stream: false,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const raw = data.message?.content ?? '';
    const cleaned = raw.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim();
    const plan = JSON.parse(cleaned);

    if (!plan.mode || !['transform', 'generate'].includes(plan.mode)) return null;
    if (plan.mode === 'transform' && !Array.isArray(plan.operations)) return null;
    if (plan.mode === 'generate' && typeof plan.seedCode !== 'string') return null;

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
        {
          role: 'user',
          content: `Code:\n${brokenCode}\n\nError: ${errorMessage}`,
        },
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

- [ ] **Step 4: Run all tests — expect all PASS**

```bash
npx vitest run tests/llm.test.js
```

Expected: `11 tests passed`

- [ ] **Step 5: Commit**

```bash
git add src/llm.js tests/llm.test.js
git commit -m "feat: replace classifyIntent+generateCode with generateTransformationPlan"
```

---

## Task 5: Rewire `app.js`

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Replace the import line and `handleSend` in `app.js`**

Change the import at the top:

```js
import { init, play, stop } from './src/strudel.js';
import { generateTransformationPlan, autoFixCode } from './src/llm.js';
import { applyTransformation, generateSeed } from './src/patchEngine.js';
import { validateCode } from './src/validate.js';
import {
  setStatus,
  updateCodePanel,
  addUserMessage,
  addErrorMessage,
  addPreviewMessage,
} from './src/ui.js';
```

Replace the `handleSend` function (lines 77–133 in original):

```js
async function handleSend() {
  const prompt = promptInput.value.trim();
  if (!prompt) return;
  promptInput.value = '';

  addUserMessage(prompt);
  setStatus('Planning...');
  sendBtn.disabled = true;

  try {
    const plan = await generateTransformationPlan(currentCode, prompt);

    if (!plan) {
      addErrorMessage('Could not plan transformation. Try rephrasing.');
      setStatus('Error');
      return;
    }

    const newCode =
      plan.mode === 'transform'
        ? applyTransformation(currentCode, plan)
        : generateSeed(plan);

    const validation = validateCode(newCode);
    if (!validation.valid) {
      addErrorMessage(`Validation failed: ${validation.errors.join(', ')}`);
      setStatus('Error');
      return;
    }

    addPreviewMessage(
      newCode,
      async () => {
        try {
          if (isPlaying) await play(newCode);
          currentCode = newCode;
          updateCodePanel(newCode);
          conversationHistory.push({ role: 'user', content: `Current code:\n${currentCode}\n\nRequest: ${prompt}` });
          conversationHistory.push({ role: 'assistant', content: newCode });
          setStatus('Applied');
        } catch (e) {
          setStatus('Fixing...');
          try {
            const fixedCode = await autoFixCode(newCode, e.message);
            if (isPlaying) await play(fixedCode);
            currentCode = fixedCode;
            updateCodePanel(fixedCode);
            conversationHistory.push({ role: 'user', content: `Current code:\n${newCode}\n\nRequest: ${prompt}` });
            conversationHistory.push({ role: 'assistant', content: fixedCode });
            setStatus('Applied (auto-fixed)');
          } catch (fixErr) {
            addErrorMessage(fixErr.message);
            updateCodePanel(currentCode);
            setStatus('Error — reverted');
          }
        }
      },
      () => setStatus('Ready')
    );

    setStatus('Preview ready');
  } catch (e) {
    const msg = e.message.includes('fetch')
      ? 'Ollama unreachable. Start with: OLLAMA_ORIGINS="*" ollama serve'
      : e.message;
    addErrorMessage(msg);
    setStatus('Error');
  } finally {
    sendBtn.disabled = false;
  }
}
```

- [ ] **Step 2: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass (validate, patchEngine, llm)

- [ ] **Step 3: Smoke-test in browser**

```bash
npm run dev
```

Open `http://localhost:5173`. Verify:
1. Default code displays in panel
2. Play button works
3. Typing a prompt ("add reverb", "make it darker") and clicking Send shows a preview card
4. Apply updates the code panel
5. Dismiss leaves code unchanged
6. Typing "make me a beat" with empty code panel shows a generate-mode preview

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "feat: wire patchEngine+validate into single-call LLM pipeline"
```

---

## Spec Coverage Check

| Requirement | Task |
|-------------|------|
| Remove full code generation | Task 4 (remove generateCode) |
| Strict JSON plans only | Task 4 (generateTransformationPlan prompt) |
| ALLOWED_OPERATIONS vocab | Task 1 |
| classifyIntent refactored | Task 4 (removed, replaced) |
| patchEngine.js created | Task 3 |
| applyTransformation API | Task 3 |
| Validation layer before play() | Task 2 + Task 5 |
| validateCode checks (parens, fences, allowlist, empty) | Task 2 |
| generateCode replaced by generateTransformationPlan | Task 4 |
| autoFixCode kept as fallback | Task 4 (preserved) |
| Two modes: transform / generate | Task 3 + Task 4 |
| Flat src/ structure preserved | All tasks |
| preview/apply UX preserved | Task 5 |
| live hot-patching intact | Task 5 (play() unchanged) |
