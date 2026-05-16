# Compose Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `compose` LLM mode that stacks a new synth voice onto existing Strudel code when the user says "add a melody/bass/chords/percussion".

**Architecture:** LLM detects additive intent and outputs structured data (`voiceType`, `notes`, `style`, `intensity`). `patchEngine.js` builds the voice's Strudel code and stacks it onto existing code using `stack()`. `app.js` routes compose mode through the same validate → preview → play → autoFix → revert path as transform mode.

**Tech Stack:** Vanilla JS ES modules, Vitest, Strudel

---

## File Map

| File | Change |
|------|--------|
| `src/patchEngine.js` | Add `buildVoiceCode(voiceType, notes, operations)` and `stackCode(existingCode, newVoiceCode)` exports |
| `src/llm.js` | Add compose mode schema to system prompt; add validation for compose mode fields |
| `app.js` | Import `buildVoiceCode`, `stackCode`; handle `plan.mode === 'compose'` in `handleSend` |
| `tests/patchEngine.test.js` | Add tests for `buildVoiceCode` and `stackCode` |
| `tests/llm.test.js` | Add tests for compose mode parsing and validation |

---

## Task 1: `buildVoiceCode` — tests + implementation

**Files:**
- Modify: `tests/patchEngine.test.js`
- Modify: `src/patchEngine.js`

`buildVoiceCode(voiceType, notes, operations)` builds a base Strudel code string for a voice type, then applies a list of operations to it (same operation handlers as transforms).

Default sounds per voiceType:
- `melody` → `note("...").sound("sine").gain(0.5)`
- `bass` → `note("...").sound("sawtooth").gain(0.5)`
- `chords` → `note("...").sound("square").gain(0.5)`
- `percussion` → `s("...").gain(0.7)`

- [ ] **Step 1: Write failing tests**

Add to `tests/patchEngine.test.js` (after the existing imports and before `describe('applyTransformation'...)`):

```js
import { applyTransformation, generateSeed, buildVoiceCode, stackCode } from '../src/patchEngine.js';
```

Replace the existing import line `import { applyTransformation, generateSeed } from '../src/patchEngine.js';` with the above.

Then add a new describe block at the bottom of the file:

```js
describe('buildVoiceCode', () => {
  it('builds melody voice with sine sound', () => {
    const result = buildVoiceCode('melody', 'c4 e4 g4 ~', []);
    expect(result).toContain('note("c4 e4 g4 ~")');
    expect(result).toContain('.sound("sine")');
    expect(result).toContain('.gain(0.5)');
  });

  it('builds bass voice with sawtooth sound', () => {
    const result = buildVoiceCode('bass', 'c2 ~ e2 ~', []);
    expect(result).toContain('note("c2 ~ e2 ~")');
    expect(result).toContain('.sound("sawtooth")');
  });

  it('builds chords voice with square sound', () => {
    const result = buildVoiceCode('chords', 'c3 g3', []);
    expect(result).toContain('note("c3 g3")');
    expect(result).toContain('.sound("square")');
  });

  it('builds percussion voice using s() not note()', () => {
    const result = buildVoiceCode('percussion', 'hh*4', []);
    expect(result).toContain('s("hh*4")');
    expect(result).not.toContain('note(');
    expect(result).toContain('.gain(0.7)');
  });

  it('applies operations to the base code', () => {
    const ops = [{ type: 'increase_reverb', amount: 0.4 }];
    const result = buildVoiceCode('melody', 'c4 e4', ops);
    expect(result).toContain('.room(');
  });

  it('unknown voiceType falls back to sine', () => {
    const result = buildVoiceCode('unknown', 'c4', []);
    expect(result).toContain('.sound("sine")');
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run tests/patchEngine.test.js
```

Expected: FAIL — `buildVoiceCode is not a function`

- [ ] **Step 3: Implement `buildVoiceCode` in `src/patchEngine.js`**

Add a `VOICE_SOUNDS` map and the new export. Full file after change:

```js
import { ALLOWED_OPERATIONS, OPERATION_HANDLERS } from './operations.js';

const DEFAULT_SEED = 's("bd ~ sn ~")';

const VOICE_SOUNDS = {
  melody: 'sine',
  bass: 'sawtooth',
  chords: 'square',
  percussion: 'bd',
};

export function applyTransformation(code, plan) {
  const { operations = [] } = plan;
  if (!Array.isArray(operations)) return code;
  return operations
    .filter((op) => ALLOWED_OPERATIONS.includes(op.type))
    .reduce((acc, op) => applyOperation(acc, op), code);
}

export function generateSeed(plan) {
  const { seedCode = DEFAULT_SEED, operations = [] } = plan;
  return applyTransformation(seedCode, { operations });
}

export function buildVoiceCode(voiceType, notes, operations = []) {
  const sound = VOICE_SOUNDS[voiceType] ?? 'sine';
  const base =
    voiceType === 'percussion'
      ? `s("${notes}").gain(0.7)`
      : `note("${notes}").sound("${sound}").gain(0.5)`;
  return applyTransformation(base, { operations });
}

function applyOperation(code, { type, amount = 0.3 }) {
  const handler = OPERATION_HANDLERS[type];
  if (!handler) return code;
  return handler(code, amount);
}
```

- [ ] **Step 4: Run to verify passing**

```bash
npx vitest run tests/patchEngine.test.js
```

Expected: all existing tests + new `buildVoiceCode` tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/patchEngine.js tests/patchEngine.test.js
git commit -m "feat: add buildVoiceCode to patchEngine"
```

---

## Task 2: `stackCode` — tests + implementation

**Files:**
- Modify: `tests/patchEngine.test.js`
- Modify: `src/patchEngine.js`

`stackCode(existingCode, newVoiceCode)` wraps both strings in `stack()`. If `existingCode` already starts with `stack(`, insert the new voice as the first argument instead of double-wrapping.

- [ ] **Step 1: Write failing tests**

Add to the bottom of `tests/patchEngine.test.js`:

```js
describe('stackCode', () => {
  it('wraps plain code in stack()', () => {
    const result = stackCode('s("bd ~ sn ~")', 'note("c4 e4").sound("sine").gain(0.5)');
    expect(result).toMatch(/^stack\(/);
    expect(result).toContain('note("c4 e4").sound("sine").gain(0.5)');
    expect(result).toContain('s("bd ~ sn ~")');
  });

  it('inserts new voice as first arg when existing code already uses stack()', () => {
    const existing = 'stack(\n  s("bd ~ sn ~"),\n  s("hh*8")\n)';
    const result = stackCode(existing, 'note("c4").sound("sine").gain(0.5)');
    expect(result).toMatch(/^stack\(/);
    const firstArg = result.slice(result.indexOf('stack(') + 6, result.indexOf(','));
    expect(firstArg.trim()).toBe('note("c4").sound("sine").gain(0.5)');
  });

  it('new voice appears before existing voice', () => {
    const result = stackCode('s("bd ~ sn ~")', 'note("c4").sound("sine").gain(0.5)');
    const newVoiceIdx = result.indexOf('note("c4")');
    const existingIdx = result.indexOf('s("bd ~ sn ~")');
    expect(newVoiceIdx).toBeLessThan(existingIdx);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run tests/patchEngine.test.js
```

Expected: FAIL — `stackCode is not a function`

- [ ] **Step 3: Implement `stackCode` in `src/patchEngine.js`**

Add the export after `buildVoiceCode`:

```js
export function stackCode(existingCode, newVoiceCode) {
  const trimmed = existingCode.trim();
  if (trimmed.startsWith('stack(')) {
    return trimmed.replace(/^stack\(\s*/, `stack(\n  ${newVoiceCode},\n  `);
  }
  return `stack(\n  ${newVoiceCode},\n  ${trimmed}\n)`;
}
```

- [ ] **Step 4: Run to verify passing**

```bash
npx vitest run tests/patchEngine.test.js
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/patchEngine.js tests/patchEngine.test.js
git commit -m "feat: add stackCode to patchEngine"
```

---

## Task 3: LLM compose mode — tests + implementation

**Files:**
- Modify: `src/llm.js`
- Modify: `tests/llm.test.js`

Add `compose` mode to the system prompt and validation. LLM should output:
```json
{"mode":"compose","voiceType":"melody|bass|chords|percussion","notes":"c4 e4 g4 ~","style":"acid","intensity":0.7}
```

- [ ] **Step 1: Write failing tests**

Add to the bottom of `tests/llm.test.js` (inside the `describe('generateTransformationPlan'...` block, before its closing `}`):

```js
  it('returns compose plan for additive request with existing code', async () => {
    const plan = { mode: 'compose', voiceType: 'melody', notes: 'c4 e4 g4 ~', style: 'acid', intensity: 0.7 };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: JSON.stringify(plan) } }),
    });
    expect(await generateTransformationPlan('s("bd ~ sn ~")', 'add a melody')).toEqual(plan);
  });

  it('returns null for compose mode with empty currentCode', async () => {
    const plan = { mode: 'compose', voiceType: 'melody', notes: 'c4 e4 g4 ~', style: 'acid', intensity: 0.7 };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: JSON.stringify(plan) } }),
    });
    expect(await generateTransformationPlan('', 'add a melody')).toBeNull();
  });

  it('returns null for compose mode with invalid voiceType', async () => {
    const plan = { mode: 'compose', voiceType: 'trumpet', notes: 'c4 e4', style: 'acid', intensity: 0.7 };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: JSON.stringify(plan) } }),
    });
    expect(await generateTransformationPlan('s("bd")', 'add a trumpet')).toBeNull();
  });

  it('returns null for compose mode with missing notes', async () => {
    const plan = { mode: 'compose', voiceType: 'melody', notes: '', style: 'acid', intensity: 0.7 };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: JSON.stringify(plan) } }),
    });
    expect(await generateTransformationPlan('s("bd")', 'add a melody')).toBeNull();
  });

  it('returns null for compose mode with invalid style', async () => {
    const plan = { mode: 'compose', voiceType: 'melody', notes: 'c4 e4', style: 'jazz', intensity: 0.7 };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: JSON.stringify(plan) } }),
    });
    expect(await generateTransformationPlan('s("bd")', 'add a melody')).toBeNull();
  });
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run tests/llm.test.js
```

Expected: new compose tests FAIL

- [ ] **Step 3: Update `src/llm.js`**

Full file after change:

```js
import { STYLE_LIBRARY } from './library/styles.js';

const STYLES = Object.keys(STYLE_LIBRARY);
const VOICE_TYPES = ['melody', 'bass', 'chords', 'percussion'];

const TRANSFORM_SYSTEM_PROMPT = `You are a music style selector for Strudel live-coding.
Return ONLY valid JSON. No prose. No markdown. No explanation.

AVAILABLE STYLES: ${STYLES.join(', ')}

If currentCode is empty or "none" → mode = "generate".
If currentCode exists AND user wants to ADD a new layer/voice/instrument → mode = "compose".
If currentCode exists AND user wants to MODIFY existing sounds → mode = "transform".

Transform mode schema:
{"mode":"transform","style":"acid|groove|minimal|dub|breakcore","target":"bass|drums|melody|all","intensity":0.7}

Generate mode schema:
{"mode":"generate","seedCode":"s(\\"bd ~ sn ~\\")"}

Compose mode schema (use when user says add/layer/give me a/put a):
{"mode":"compose","voiceType":"melody|bass|chords|percussion","notes":"c4 e4 g4 ~","style":"acid|groove|minimal|dub|breakcore","intensity":0.7}

Rules:
- style must be one of AVAILABLE STYLES
- target must be one of: bass, drums, melody, all
- voiceType must be one of: melody, bass, chords, percussion
- intensity must be 0.1 to 1.0
- notes must be a valid Strudel mini-notation string (e.g. "c4 e4 g4 ~")
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

    if (!plan.mode || !['transform', 'generate', 'compose'].includes(plan.mode)) return null;

    if (plan.mode === 'transform') {
      if (typeof plan.style !== 'string') return null;
      if (!STYLES.includes(plan.style)) return null;
      if (typeof plan.intensity !== 'number') return null;
      if (plan.intensity < 0.1 || plan.intensity > 1.0) return null;
      if (!['bass', 'drums', 'melody', 'all'].includes(plan.target)) return null;
    }

    if (plan.mode === 'generate') {
      if (typeof plan.seedCode !== 'string') return null;
    }

    if (plan.mode === 'compose') {
      if (!codeContext || codeContext === 'none') return null;
      if (!VOICE_TYPES.includes(plan.voiceType)) return null;
      if (typeof plan.notes !== 'string' || !plan.notes.trim()) return null;
      if (!STYLES.includes(plan.style)) return null;
      if (typeof plan.intensity !== 'number') return null;
      if (plan.intensity < 0.1 || plan.intensity > 1.0) return null;
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

- [ ] **Step 4: Run to verify passing**

```bash
npx vitest run tests/llm.test.js
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/llm.js tests/llm.test.js
git commit -m "feat: add compose mode to LLM with validation"
```

---

## Task 4: Wire compose mode in `app.js`

**Files:**
- Modify: `app.js`

Update imports and `handleSend` to handle `plan.mode === 'compose'`.

- [ ] **Step 1: Update import line in `app.js`**

Replace:
```js
import { applyTransformation, generateSeed } from './src/patchEngine.js';
```
With:
```js
import { applyTransformation, generateSeed, buildVoiceCode, stackCode } from './src/patchEngine.js';
```

- [ ] **Step 2: Add compose mode branch in `handleSend`**

Replace the `newCode` assignment block (lines 104–109):
```js
    const newCode =
      plan.mode === 'transform'
        ? applyTransformation(currentCode, {
            operations: expandStyle(plan.style, plan.target, plan.intensity),
          })
        : generateSeed(plan);
```
With:
```js
    const newCode =
      plan.mode === 'transform'
        ? applyTransformation(currentCode, {
            operations: expandStyle(plan.style, plan.target, plan.intensity),
          })
        : plan.mode === 'compose'
        ? stackCode(
            currentCode,
            buildVoiceCode(
              plan.voiceType,
              plan.notes,
              expandStyle(plan.style, plan.voiceType, plan.intensity)
            )
          )
        : generateSeed(plan);
```

- [ ] **Step 3: Remove the generate-mode guard that rejects compose intent**

The existing guard (around line 98–102):
```js
    if (plan.mode === 'generate' && currentCode.trim()) {
      addErrorMessage('Generate mode returned for existing code. Try a more specific request.');
      setStatus('Error');
      return;
    }
```
Keep this guard as-is — it only fires for `generate` mode, not `compose`.

- [ ] **Step 4: Run full test suite**

```bash
npm test
```

Expected: all 40+ tests PASS (no regressions)

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "feat: wire compose mode into handleSend"
```

---

## Task 5: Manual smoke test

- [ ] **Step 1: Start Ollama and dev server**

```bash
OLLAMA_ORIGINS="*" ollama serve
# in a second terminal:
npm run dev
```

Open `http://localhost:5173` in browser.

- [ ] **Step 2: Test compose — add melody**

Default code already playing (drums). Type: `add a melody`

Expected: preview card appears with `stack(` wrapping original drums + a `note(...).sound(...)` line. Apply it. Music should now have a synth melody layered over drums.

- [ ] **Step 3: Test compose — add bass**

Type: `add a bass line`

Expected: new `note(...).sound("sawtooth")` voice stacked into existing `stack()`.

- [ ] **Step 4: Test transform still works**

Type: `make it more reverby`

Expected: existing code gets `.room(` added/modified. No new voice stacked.

- [ ] **Step 5: Test generate still works**

Clear the code panel to empty. Type: `make a beat`

Expected: generate mode fires, seed code appears in preview.
