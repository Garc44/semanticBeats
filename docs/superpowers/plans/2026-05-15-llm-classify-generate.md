# LLM Classify → Generate Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace single-call LLM with a two-step classify→generate pipeline that translates vague musical intent into precise Strudel instructions, plus auto-retry on Strudel errors.

**Architecture:** `classifyIntent()` calls Ollama first to translate user input into structured JSON (interpretation + Strudel functions + what to preserve). `generateCode()` uses that JSON to build a precise prompt. `autoFixCode()` fires only when Strudel throws on apply. All three live in `src/llm.js`. `app.js` sequences the calls and handles retry.

**Tech Stack:** Vite, Vitest, Ollama (llama3), @strudel/web

---

## File Map

| File | Change |
|------|--------|
| `package.json` | Add vitest dev dependency |
| `vite.config.js` | Create — add vitest config |
| `tests/llm.test.js` | Create — unit tests for all three LLM functions |
| `src/llm.js` | Add `classifyIntent()`, `autoFixCode()`. Update `generateCode()` signature. |
| `app.js` | Update `handleSend()` sequence. Add retry logic in `onApply`. Import new functions. |

---

## Task 1: Add Vitest

**Files:**
- Modify: `package.json`
- Create: `vite.config.js`

- [ ] **Step 1: Install vitest**

```bash
npm install --save-dev vitest
```

Expected: vitest appears in `package.json` devDependencies.

- [ ] **Step 2: Add test script to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create vite.config.js**

```javascript
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
});
```

- [ ] **Step 4: Verify vitest runs**

```bash
npm test
```

Expected: "No test files found" or similar — no errors.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vite.config.js
git commit -m "chore: add vitest"
```

---

## Task 2: Add `classifyIntent()` with tests

**Files:**
- Create: `tests/llm.test.js`
- Modify: `src/llm.js`

- [ ] **Step 1: Write failing tests for classifyIntent**

Create `tests/llm.test.js`:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { classifyIntent } from '../src/llm.js';

describe('classifyIntent', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns parsed JSON on valid response', async () => {
    const mock = {
      interpretation: 'reduce high frequencies',
      strudelFunctions: ['lpf'],
      preserve: ['rhythm'],
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: JSON.stringify(mock) } }),
    });

    const result = await classifyIntent('s("bd sd")', 'make it darker');
    expect(result).toEqual(mock);
  });

  it('returns null on invalid JSON', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: 'not json' } }),
    });

    const result = await classifyIntent('s("bd sd")', 'make it darker');
    expect(result).toBeNull();
  });

  it('returns null on fetch error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network error'));

    const result = await classifyIntent('s("bd sd")', 'make it darker');
    expect(result).toBeNull();
  });

  it('returns null on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    const result = await classifyIntent('s("bd sd")', 'make it darker');
    expect(result).toBeNull();
  });

  it('strips markdown fences from response', async () => {
    const mock = {
      interpretation: 'add reverb',
      strudelFunctions: ['room'],
      preserve: ['notes'],
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { content: '```json\n' + JSON.stringify(mock) + '\n```' },
      }),
    });

    const result = await classifyIntent('s("bd sd")', 'add reverb');
    expect(result).toEqual(mock);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test
```

Expected: FAIL with "classifyIntent is not a function" or similar.

- [ ] **Step 3: Add CLASSIFY_SYSTEM_PROMPT and classifyIntent to src/llm.js**

At the top of `src/llm.js`, before the existing `SYSTEM_PROMPT`, add:

```javascript
const CLASSIFY_SYSTEM_PROMPT = `You are a music intent classifier for Strudel live-coding.
Given current code and a user request, return ONLY a JSON object. No explanation. No markdown.

JSON format:
{"interpretation":"precise description of what to change","strudelFunctions":["fn1","fn2"],"preserve":["element1"]}

Vocabulary hints:
darker/warmer → lpf, room
brighter/airier → hpf, fast
punchier/harder → gain, crush
spacious/wide → room, pan
slower/half time → slow
faster/double time → fast
quieter → gain reduce
louder → gain increase
more groove → euclidean rhythms
busier/more notes → fast, repeat`;
```

Then add the function after the existing `SYSTEM_PROMPT` constant:

```javascript
export async function classifyIntent(currentCode, userPrompt) {
  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3:latest',
        messages: [
          { role: 'system', content: CLASSIFY_SYSTEM_PROMPT },
          { role: 'user', content: `Current code:\n${currentCode}\n\nRequest: ${userPrompt}` },
        ],
        stream: false,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const raw = data.message?.content ?? '';
    const cleaned = raw.replace(/```[\w]*\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test
```

Expected: 5 tests PASS for `classifyIntent`.

- [ ] **Step 5: Commit**

```bash
git add src/llm.js tests/llm.test.js
git commit -m "feat: add classifyIntent with two-call pipeline foundation"
```

---

## Task 3: Add `autoFixCode()` with tests

**Files:**
- Modify: `tests/llm.test.js`
- Modify: `src/llm.js`

- [ ] **Step 1: Write failing tests for autoFixCode**

Append to `tests/llm.test.js`:

```javascript
import { classifyIntent, autoFixCode } from '../src/llm.js';
```

Replace the existing import line at the top of the file with that line, then add this describe block at the bottom:

```javascript
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

- [ ] **Step 2: Run tests — verify new tests fail**

```bash
npm test
```

Expected: autoFixCode tests FAIL, classifyIntent tests still PASS.

- [ ] **Step 3: Add autoFixCode to src/llm.js**

Add after `classifyIntent`:

```javascript
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

- [ ] **Step 4: Run tests — verify all pass**

```bash
npm test
```

Expected: all 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/llm.js tests/llm.test.js
git commit -m "feat: add autoFixCode for auto-retry on Strudel errors"
```

---

## Task 4: Update `generateCode()` to accept classification

**Files:**
- Modify: `tests/llm.test.js`
- Modify: `src/llm.js`

- [ ] **Step 1: Write failing tests for updated generateCode**

Update import at top of `tests/llm.test.js`:

```javascript
import { classifyIntent, autoFixCode, generateCode } from '../src/llm.js';
```

Add at the bottom of `tests/llm.test.js`:

```javascript
describe('generateCode', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('builds classification-aware prompt when classification provided', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: 's("bd sd").lpf(500)' } }),
    });

    const classification = {
      interpretation: 'reduce high frequencies',
      strudelFunctions: ['lpf'],
      preserve: ['rhythm'],
    };

    await generateCode([], 's("bd sd")', 'make it darker', classification);

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    const userMsg = body.messages.find((m) => m.role === 'user').content;
    expect(userMsg).toContain('Do exactly: reduce high frequencies');
    expect(userMsg).toContain('Use: lpf');
    expect(userMsg).toContain('Preserve: rhythm');
  });

  it('falls back to plain prompt when classification is null', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: 's("bd sd")' } }),
    });

    await generateCode([], 's("bd sd")', 'make it darker', null);

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    const userMsg = body.messages.find((m) => m.role === 'user').content;
    expect(userMsg).toBe('Current code:\ns("bd sd")\n\nRequest: make it darker');
  });

  it('falls back to plain prompt when classification omitted', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: 's("bd sd")' } }),
    });

    await generateCode([], 's("bd sd")', 'make it darker');

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    const userMsg = body.messages.find((m) => m.role === 'user').content;
    expect(userMsg).toBe('Current code:\ns("bd sd")\n\nRequest: make it darker');
  });

  it('strips markdown fences from output', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { content: '```javascript\ns("bd sd")\n```' },
      }),
    });

    const result = await generateCode([], 's("bd sd")', 'test');
    expect(result).toBe('s("bd sd")');
  });

  it('throws on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 });

    await expect(generateCode([], 's("bd sd")', 'test')).rejects.toThrow('Ollama HTTP 503');
  });
});
```

- [ ] **Step 2: Run tests — verify new tests fail**

```bash
npm test
```

Expected: generateCode tests FAIL (wrong prompt format), earlier tests still PASS.

- [ ] **Step 3: Update generateCode in src/llm.js**

Replace the existing `generateCode` function with:

```javascript
export async function generateCode(history, currentCode, userPrompt, classification = null) {
  let userContent;

  if (classification) {
    userContent = `Current code:\n${currentCode}\n\nDo exactly: ${classification.interpretation}\nUse: ${classification.strudelFunctions.join(', ')}\nPreserve: ${classification.preserve.join(', ')}\nRequest: ${userPrompt}`;
  } else {
    userContent = `Current code:\n${currentCode}\n\nRequest: ${userPrompt}`;
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: userContent },
  ];

  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3:latest',
      messages,
      stream: false,
    }),
  });

  if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);

  const data = await response.json();
  const raw = data.message?.content ?? '';
  return raw.replace(/```[\w]*\n?/g, '').trim();
}
```

- [ ] **Step 4: Run tests — verify all pass**

```bash
npm test
```

Expected: all 13 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/llm.js tests/llm.test.js
git commit -m "feat: update generateCode to accept classification for precise prompting"
```

---

## Task 5: Wire pipeline and retry into app.js

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Update import in app.js**

Replace:
```javascript
import { generateCode } from './src/llm.js';
```

With:
```javascript
import { classifyIntent, generateCode, autoFixCode } from './src/llm.js';
```

- [ ] **Step 2: Replace handleSend in app.js**

Replace the entire `handleSend` function (lines 77–122) with:

```javascript
async function handleSend() {
  const prompt = promptInput.value.trim();
  if (!prompt) return;
  promptInput.value = '';

  addUserMessage(prompt);
  setStatus('Interpreting...');
  sendBtn.disabled = true;

  try {
    const classification = await classifyIntent(currentCode, prompt);
    setStatus('Thinking...');
    const newCode = await generateCode(conversationHistory, currentCode, prompt, classification);

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
            conversationHistory.push({ role: 'user', content: `Current code:\n${currentCode}\n\nRequest: ${prompt}` });
            conversationHistory.push({ role: 'assistant', content: fixedCode });
            setStatus('Applied (auto-fixed)');
          } catch (fixErr) {
            addErrorMessage(fixErr.message);
            updateCodePanel(currentCode);
            setStatus('Error — reverted');
          }
        }
      },
      () => {
        setStatus('Ready');
      }
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

- [ ] **Step 3: Run all tests — verify still passing**

```bash
npm test
```

Expected: all 13 tests PASS.

- [ ] **Step 4: Start dev server and manually verify**

```bash
npm run dev
```

Open the local URL (usually http://localhost:5173). With Ollama running (`OLLAMA_ORIGINS="*" ollama serve`):
- Type "make it darker" — status should show "Interpreting..." then "Thinking..." then "Preview ready"
- Apply the preview — music should update
- Verify status shows "Applied"

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "feat: wire classify-generate pipeline and auto-retry into app.js"
```
