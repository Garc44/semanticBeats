# 6-Pillar Modular Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the single-input Strudel app into a 6-pillar layout where each pillar (foundation, bassline, percussion, melody, atmosphere, fx) has its own isolated LLM context and code sandbox, combined into a single Strudel engine via `stack()`, with global sliders for tempo, masterVolume, masterFilter, and intensity.

**Architecture:** Flat pillar state array + `globalState` object in `app.js`. A pure `rebuildStack(pillars, globalState)` function in `src/pillars.js` assembles the final Strudel code string. Each pillar has its own `history[]` array passed to `generateTransformationPlan` as multi-turn context.

**Tech Stack:** Vanilla JS ES modules, Vite, Strudel (`@strudel/web`), Ollama (`llama3:latest`), Vitest

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/pillars.js` | **Create** | `PILLAR_NAMES`, `makePillars()`, `rebuildStack(pillars, globalState)` |
| `src/llm.js` | **Modify** | Add `history`, `intensityHint`, `pillarName` params; remove compose mode |
| `src/patchEngine.js` | **Modify** | Delete `buildVoiceCode`, `stackCode`, `VOICE_SOUNDS` |
| `src/ui.js` | **Rewrite** | Pillar card DOM, global controls DOM, per-pillar chat helpers |
| `app.js` | **Rewrite** | Wire 6-pillar state, slider handlers, play/stop, handlePillarSend |
| `index.html` | **Modify** | Minimal shell; pillars and controls rendered by JS |
| `style.css` | **Modify** | Add pillar grid + slider row; remove old 2-panel layout |
| `tests/pillars.test.js` | **Create** | `rebuildStack` unit tests |
| `tests/patchEngine.test.js` | **Modify** | Remove `buildVoiceCode` and `stackCode` test suites |
| `tests/llm.test.js` | **Modify** | Remove compose tests; add history/intensityHint/pillarName tests |

---

## Task 1: Remove compose functions from patchEngine

**Files:**
- Modify: `src/patchEngine.js`
- Modify: `tests/patchEngine.test.js`

- [ ] **Step 1: Delete the dead code from `src/patchEngine.js`**

Replace the entire file with:

```js
import { ALLOWED_OPERATIONS, OPERATION_HANDLERS } from './operations.js';

const DEFAULT_SEED = 's("bd ~ sn ~")';

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

function applyOperation(code, { type, amount = 0.3 }) {
  const handler = OPERATION_HANDLERS[type];
  if (!handler) return code;
  return handler(code, amount);
}
```

- [ ] **Step 2: Remove `buildVoiceCode` and `stackCode` test suites from `tests/patchEngine.test.js`**

Remove the import of those functions and delete the two `describe` blocks. The import line becomes:

```js
import { applyTransformation, generateSeed } from '../src/patchEngine.js';
```

Keep the `applyTransformation` and `generateSeed` describe blocks unchanged.

- [ ] **Step 3: Run patchEngine tests**

```bash
npx vitest run tests/patchEngine.test.js
```

Expected: All remaining tests pass (10 tests: 8 applyTransformation + 3 generateSeed — wait, actually count from the file: 10 applyTransformation tests + 3 generateSeed tests = 13 tests total, removing 10 buildVoiceCode+stackCode tests → 13 tests remain).

- [ ] **Step 4: Commit**

```bash
git add src/patchEngine.js tests/patchEngine.test.js
git commit -m "refactor: remove compose voice functions from patchEngine"
```

---

## Task 2: Create `src/pillars.js` with `rebuildStack`

**Files:**
- Create: `src/pillars.js`
- Create: `tests/pillars.test.js`

- [ ] **Step 1: Write failing tests in `tests/pillars.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { rebuildStack, makePillars, PILLAR_NAMES } from '../src/pillars.js';

const makeGlobal = (overrides = {}) => ({
  tempo: 1.0,
  masterVolume: 0.8,
  masterFilter: 1.0,
  intensity: 0.5,
  soloedPillar: null,
  ...overrides,
});

describe('PILLAR_NAMES', () => {
  it('has exactly 6 pillars in correct order', () => {
    expect(PILLAR_NAMES).toEqual(['foundation', 'bassline', 'percussion', 'melody', 'atmosphere', 'fx']);
  });
});

describe('makePillars', () => {
  it('returns 6 pillar objects', () => {
    const p = makePillars();
    expect(p).toHaveLength(6);
  });

  it('each pillar has name, code, muted, history', () => {
    const p = makePillars();
    for (const pillar of p) {
      expect(pillar).toHaveProperty('name');
      expect(pillar).toHaveProperty('code', '');
      expect(pillar).toHaveProperty('muted', false);
      expect(pillar).toHaveProperty('history');
      expect(Array.isArray(pillar.history)).toBe(true);
    }
  });
});

describe('rebuildStack', () => {
  it('returns null when all pillars are empty', () => {
    expect(rebuildStack(makePillars(), makeGlobal())).toBeNull();
  });

  it('returns null when all non-empty pillars are muted', () => {
    const pillars = makePillars();
    pillars[0].code = 's("bd")';
    pillars[0].muted = true;
    expect(rebuildStack(pillars, makeGlobal())).toBeNull();
  });

  it('single active pillar returns code without stack() wrapper', () => {
    const pillars = makePillars();
    pillars[0].code = 's("bd ~ sn ~")';
    const result = rebuildStack(pillars, makeGlobal());
    expect(result).not.toContain('stack(');
    expect(result).toContain('s("bd ~ sn ~")');
  });

  it('multiple active pillars wrapped in stack()', () => {
    const pillars = makePillars();
    pillars[0].code = 's("bd")';
    pillars[1].code = 's("hh*8")';
    const result = rebuildStack(pillars, makeGlobal());
    expect(result).toMatch(/^stack\(/);
    expect(result).toContain('s("bd")');
    expect(result).toContain('s("hh*8")');
  });

  it('muted pillar excluded from stack', () => {
    const pillars = makePillars();
    pillars[0].code = 's("bd")';
    pillars[1].code = 's("hh*8")';
    pillars[1].muted = true;
    const result = rebuildStack(pillars, makeGlobal());
    expect(result).not.toContain('stack(');
    expect(result).not.toContain('hh*8');
  });

  it('soloedPillar includes only that pillar', () => {
    const pillars = makePillars();
    pillars[0].code = 's("bd")';
    pillars[1].code = 's("hh*8")';
    const result = rebuildStack(pillars, makeGlobal({ soloedPillar: 'foundation' }));
    expect(result).not.toContain('stack(');
    expect(result).toContain('s("bd")');
    expect(result).not.toContain('hh*8');
  });

  it('soloed pillar with empty code returns null', () => {
    const pillars = makePillars();
    pillars[1].code = 's("hh*8")';
    const result = rebuildStack(pillars, makeGlobal({ soloedPillar: 'foundation' }));
    expect(result).toBeNull();
  });

  it('appends global effects chain', () => {
    const pillars = makePillars();
    pillars[0].code = 's("bd")';
    const result = rebuildStack(pillars, makeGlobal({ tempo: 1.5, masterVolume: 0.6, masterFilter: 0.5, intensity: 0.3 }));
    expect(result).toContain('.cps(1.5)');
    expect(result).toContain('.gain(0.6)');
    expect(result).toContain('.lpf(');
    expect(result).toContain('.shape(0.3)');
  });

  it('masterFilter 1.0 maps to ~18200 Hz lpf', () => {
    const pillars = makePillars();
    pillars[0].code = 's("bd")';
    const result = rebuildStack(pillars, makeGlobal({ masterFilter: 1.0 }));
    expect(result).toContain('.lpf(18200)');
  });

  it('masterFilter 0 maps to 200 Hz lpf', () => {
    const pillars = makePillars();
    pillars[0].code = 's("bd")';
    const result = rebuildStack(pillars, makeGlobal({ masterFilter: 0 }));
    expect(result).toContain('.lpf(200)');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run tests/pillars.test.js
```

Expected: FAIL — `Cannot find module '../src/pillars.js'`

- [ ] **Step 3: Implement `src/pillars.js`**

```js
export const PILLAR_NAMES = ['foundation', 'bassline', 'percussion', 'melody', 'atmosphere', 'fx'];

export function makePillars() {
  return PILLAR_NAMES.map(name => ({ name, code: '', muted: false, history: [] }));
}

export function rebuildStack(pillars, globalState) {
  const { soloedPillar, tempo, masterVolume, masterFilter, intensity } = globalState;
  const active = pillars.filter(p => {
    if (soloedPillar) return p.name === soloedPillar && p.code.trim();
    return !p.muted && p.code.trim();
  });
  if (!active.length) return null;
  const inner = active.length === 1
    ? active[0].code
    : `stack(\n${active.map(p => p.code).join(',\n')}\n)`;
  const filterHz = Math.round(masterFilter * 18000 + 200);
  return `${inner}.cps(${tempo}).gain(${masterVolume}).lpf(${filterHz}).shape(${intensity})`;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run tests/pillars.test.js
```

Expected: All 13 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/pillars.js tests/pillars.test.js
git commit -m "feat: add pillars module with rebuildStack"
```

---

## Task 3: Update `src/llm.js` — remove compose, add pillar params

**Files:**
- Modify: `src/llm.js`
- Modify: `tests/llm.test.js`

- [ ] **Step 1: Write new tests for the new params (add to `tests/llm.test.js`)**

First, at the top of the `describe('generateTransformationPlan', ...)` block, add a helper so tests can inspect the fetch body:

```js
function capturedBody() {
  return JSON.parse(global.fetch.mock.calls[0][1].body);
}
```

Then add these three new tests inside the `generateTransformationPlan` describe block:

```js
it('includes pillarName in system message content', async () => {
  const plan = { mode: 'transform', style: 'acid', target: 'bass', intensity: 0.7 };
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ message: { content: JSON.stringify(plan) } }),
  });
  await generateTransformationPlan('s("bd")', 'make it acid', [], 0.5, 'bassline');
  const body = capturedBody();
  expect(body.messages[0].content).toContain('bassline');
});

it('includes intensityHint in system message content', async () => {
  const plan = { mode: 'transform', style: 'acid', target: 'bass', intensity: 0.8 };
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ message: { content: JSON.stringify(plan) } }),
  });
  await generateTransformationPlan('s("bd")', 'make it acid', [], 0.8, 'melody');
  const body = capturedBody();
  expect(body.messages[0].content).toContain('0.8');
});

it('passes history as middle messages in fetch body', async () => {
  const plan = { mode: 'transform', style: 'groove', target: 'all', intensity: 0.5 };
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ message: { content: JSON.stringify(plan) } }),
  });
  const history = [
    { role: 'user', content: 'Previous request' },
    { role: 'assistant', content: '{"mode":"transform","style":"minimal","target":"all","intensity":0.3}' },
  ];
  await generateTransformationPlan('s("bd")', 'now groovy', history, 0.5, 'foundation');
  const body = capturedBody();
  expect(body.messages).toHaveLength(4); // system + 2 history + user
  expect(body.messages[1]).toEqual(history[0]);
  expect(body.messages[2]).toEqual(history[1]);
});
```

Also **remove** the following test cases that test compose mode (they will be invalid after the refactor):
- `'returns compose plan for additive request with existing code'`
- `'returns null for compose mode with empty currentCode'`
- `'returns null for compose mode with invalid voiceType'`
- `'returns null for compose mode with missing notes'`
- `'returns null for compose mode with whitespace-only notes'`
- `'returns null for compose mode with invalid style'`
- `'returns null for compose mode with out-of-range intensity'`
- `'returns null for compose mode with missing intensity'`

- [ ] **Step 2: Run updated llm tests to confirm the new tests fail and compose tests are gone**

```bash
npx vitest run tests/llm.test.js
```

Expected: The 3 new tests FAIL (function signature not yet updated), 8 compose tests removed, existing tests still pass.

- [ ] **Step 3: Rewrite `src/llm.js`**

```js
import { STYLE_LIBRARY } from './library/styles.js';

const STYLES = Object.keys(STYLE_LIBRARY);

function makeSystemPrompt(pillarName, intensityHint) {
  return `You are editing the ${pillarName} layer of a Strudel live-coding track.
Return ONLY valid JSON. No prose. No markdown. No explanation.

AVAILABLE STYLES: ${STYLES.join(', ')}

If currentCode is empty or "none" → mode = "generate".
If currentCode exists → mode = "transform".

Transform mode schema:
{"mode":"transform","style":"acid|groove|minimal|dub|breakcore","target":"bass|drums|melody|all","intensity":${intensityHint}}

Generate mode schema:
{"mode":"generate","seedCode":"s(\\"bd ~ sn ~\\")"}

Rules:
- style must be one of AVAILABLE STYLES
- target must be one of: bass, drums, melody, all
- intensity must be ${intensityHint}
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

- [ ] **Step 4: Run all llm tests**

```bash
npx vitest run tests/llm.test.js
```

Expected: All tests pass (original 9 non-compose tests + 3 new param tests = 12 tests).

- [ ] **Step 5: Commit**

```bash
git add src/llm.js tests/llm.test.js
git commit -m "feat: add pillar context and history to LLM, remove compose mode"
```

---

## Task 4: Rewrite `src/ui.js`

**Files:**
- Rewrite: `src/ui.js`

No unit tests for UI — DOM rendering is tested manually in Task 8.

- [ ] **Step 1: Replace `src/ui.js` entirely**

```js
const statusEl = () => document.getElementById('status');

export function setStatus(text) {
  statusEl().textContent = text;
}

export function renderGlobalControls(globalState, onChange) {
  const container = document.getElementById('global-controls');
  container.innerHTML = '';

  const sliders = [
    { key: 'tempo',        label: 'Tempo',         min: 0.2,  max: 3.0,  step: 0.05, value: globalState.tempo },
    { key: 'masterVolume', label: 'Volume',         min: 0,    max: 1,    step: 0.05, value: globalState.masterVolume },
    { key: 'masterFilter', label: 'Filter',         min: 0,    max: 1,    step: 0.01, value: globalState.masterFilter },
    { key: 'intensity',    label: 'Intensity',      min: 0,    max: 1,    step: 0.05, value: globalState.intensity },
  ];

  for (const s of sliders) {
    const group = document.createElement('div');
    group.className = 'slider-group';

    const label = document.createElement('label');
    const valueSpan = document.createElement('span');
    valueSpan.className = 'slider-value';
    valueSpan.textContent = s.value.toFixed(2);
    label.textContent = s.label + ' ';
    label.appendChild(valueSpan);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = s.min;
    input.max = s.max;
    input.step = s.step;
    input.value = s.value;
    input.dataset.key = s.key;
    input.addEventListener('input', () => {
      const val = parseFloat(input.value);
      valueSpan.textContent = val.toFixed(2);
      onChange(s.key, val);
    });

    group.appendChild(label);
    group.appendChild(input);
    container.appendChild(group);
  }
}

export function renderPillar(pillar, { onSend, onMute, onSolo, onCodeEdit }) {
  const card = document.createElement('div');
  card.className = 'pillar-card';
  card.dataset.pillar = pillar.name;

  const header = document.createElement('div');
  header.className = 'pillar-header';

  const nameEl = document.createElement('span');
  nameEl.className = 'pillar-name';
  nameEl.textContent = pillar.name.toUpperCase();

  const controls = document.createElement('div');
  controls.className = 'pillar-controls';

  const muteBtn = document.createElement('button');
  muteBtn.className = 'btn-mute';
  muteBtn.textContent = 'M';
  muteBtn.title = 'Mute';
  muteBtn.addEventListener('click', onMute);

  const soloBtn = document.createElement('button');
  soloBtn.className = 'btn-solo';
  soloBtn.textContent = 'S';
  soloBtn.title = 'Solo';
  soloBtn.addEventListener('click', onSolo);

  controls.appendChild(muteBtn);
  controls.appendChild(soloBtn);
  header.appendChild(nameEl);
  header.appendChild(controls);

  const codeEl = document.createElement('div');
  codeEl.className = 'pillar-code';
  codeEl.contentEditable = 'true';
  codeEl.spellcheck = false;
  codeEl.textContent = pillar.code;
  codeEl.addEventListener('blur', () => onCodeEdit(codeEl.textContent.trim()));

  const chatEl = document.createElement('div');
  chatEl.className = 'pillar-chat';

  const inputRow = document.createElement('div');
  inputRow.className = 'pillar-input-row';

  const promptInput = document.createElement('input');
  promptInput.type = 'text';
  promptInput.className = 'pillar-prompt';
  promptInput.placeholder = 'describe changes...';
  promptInput.autocomplete = 'off';

  const sendBtn = document.createElement('button');
  sendBtn.className = 'btn-send';
  sendBtn.textContent = '→';

  const doSend = () => {
    const text = promptInput.value.trim();
    if (!text) return;
    promptInput.value = '';
    sendBtn.disabled = true;
    onSend(text).finally(() => { sendBtn.disabled = false; });
  };

  sendBtn.addEventListener('click', doSend);
  promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
  });

  inputRow.appendChild(promptInput);
  inputRow.appendChild(sendBtn);

  card.appendChild(header);
  card.appendChild(codeEl);
  card.appendChild(chatEl);
  card.appendChild(inputRow);

  return card;
}

export function updatePillarCode(name, code) {
  const card = document.querySelector(`.pillar-card[data-pillar="${name}"]`);
  if (!card) return;
  const codeEl = card.querySelector('.pillar-code');
  codeEl.textContent = code;
}

export function setPillarMuted(name, muted) {
  const card = document.querySelector(`.pillar-card[data-pillar="${name}"]`);
  if (!card) return;
  card.classList.toggle('pillar--muted', muted);
  card.querySelector('.btn-mute').classList.toggle('active', muted);
}

export function setPillarSoloed(soloedName, allNames) {
  for (const name of allNames) {
    const card = document.querySelector(`.pillar-card[data-pillar="${name}"]`);
    if (!card) continue;
    const isSoloed = name === soloedName;
    card.classList.toggle('pillar--soloed', isSoloed);
    card.classList.toggle('pillar--dimmed', soloedName !== null && !isSoloed);
    card.querySelector('.btn-solo').classList.toggle('active', isSoloed);
  }
}

export function addPillarMessage(name, type, text) {
  const card = document.querySelector(`.pillar-card[data-pillar="${name}"]`);
  if (!card) return;
  const chatEl = card.querySelector('.pillar-chat');
  const el = document.createElement('div');
  el.className = `msg msg-${type}`;
  el.textContent = type === 'error' ? `Error: ${text}` : text;
  chatEl.appendChild(el);
  chatEl.scrollTop = chatEl.scrollHeight;
}

export function addPillarPreviewMessage(name, code, onApply, onDismiss) {
  const card = document.querySelector(`.pillar-card[data-pillar="${name}"]`);
  if (!card) return;
  const chatEl = card.querySelector('.pillar-chat');

  const wrapper = document.createElement('div');
  wrapper.className = 'msg msg-preview';

  const label = document.createElement('div');
  label.className = 'preview-label';
  label.textContent = 'Preview:';

  const pre = document.createElement('pre');
  pre.className = 'preview-code';
  pre.textContent = code;

  const actions = document.createElement('div');
  actions.className = 'preview-actions';

  const applyBtn = document.createElement('button');
  applyBtn.textContent = 'Apply';
  applyBtn.className = 'btn-apply';

  const dismissBtn = document.createElement('button');
  dismissBtn.textContent = '✕';
  dismissBtn.className = 'btn-dismiss';

  applyBtn.addEventListener('click', async () => {
    applyBtn.disabled = true;
    dismissBtn.disabled = true;
    try {
      await onApply();
      wrapper.remove();
    } catch {
      applyBtn.disabled = false;
      dismissBtn.disabled = false;
    }
  });

  dismissBtn.addEventListener('click', () => {
    onDismiss();
    wrapper.remove();
  });

  actions.appendChild(applyBtn);
  actions.appendChild(dismissBtn);
  wrapper.appendChild(label);
  wrapper.appendChild(pre);
  wrapper.appendChild(actions);
  chatEl.appendChild(wrapper);
  chatEl.scrollTop = chatEl.scrollHeight;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui.js
git commit -m "feat: rewrite ui.js for 6-pillar card rendering"
```

---

## Task 5: Update `index.html`

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Replace `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Strudel AI</title>
  <link rel="stylesheet" href="/style.css" />
</head>
<body>
  <header>
    <span class="logo">Strudel <span class="accent">AI</span></span>
    <div class="header-right">
      <span id="status">Loading...</span>
      <button id="play-btn">▶ Play</button>
    </div>
  </header>

  <div id="global-controls"></div>
  <main id="pillars-row"></main>

  <script type="module" src="/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "refactor: replace 2-panel layout with pillar grid shell"
```

---

## Task 6: Update `style.css`

**Files:**
- Modify: `style.css`

- [ ] **Step 1: Replace `style.css` entirely**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #0b0e14;
  --surface: #161b22;
  --border: #30363d;
  --accent: #00d2ff;
  --text: #e0e0e0;
  --muted: #8b949e;
  --error: #ff6b6b;
  --user-bubble: #1c2a3a;
  --preview-bg: #0d1117;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Header ── */
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.logo { font-size: 1.3rem; font-weight: bold; }
.accent { color: var(--accent); }

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

#status { color: var(--muted); font-size: 0.85rem; }

/* ── Global Controls ── */
#global-controls {
  display: flex;
  gap: 2rem;
  padding: 0.6rem 1.5rem;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  flex-shrink: 0;
  align-items: center;
}

.slider-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 120px;
}

.slider-group label {
  font-size: 0.75rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.slider-value {
  color: var(--accent);
  font-family: 'Fira Code', 'Courier New', monospace;
}

.slider-group input[type="range"] {
  width: 100%;
  accent-color: var(--accent);
  cursor: pointer;
}

/* ── Pillars Row ── */
#pillars-row {
  flex: 1;
  display: flex;
  overflow-x: auto;
  overflow-y: hidden;
  gap: 0;
}

/* ── Pillar Card ── */
.pillar-card {
  min-width: 280px;
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border);
  overflow: hidden;
  transition: opacity 0.2s;
}

.pillar-card:last-child { border-right: none; }

.pillar--muted { opacity: 0.45; }
.pillar--dimmed { opacity: 0.35; }
.pillar--soloed { outline: 1px solid var(--accent); }

.pillar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  flex-shrink: 0;
}

.pillar-name {
  font-size: 0.75rem;
  font-weight: bold;
  letter-spacing: 0.08em;
  color: var(--accent);
}

.pillar-controls { display: flex; gap: 0.35rem; }

.btn-mute,
.btn-solo {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--muted);
  padding: 0.2rem 0.45rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.btn-mute.active { background: var(--error); color: #fff; border-color: var(--error); }
.btn-solo.active { background: var(--accent); color: #000; border-color: var(--accent); }

/* ── Pillar Code ── */
.pillar-code {
  height: 120px;
  padding: 0.6rem;
  font-family: 'Fira Code', 'Courier New', monospace;
  font-size: 0.82rem;
  color: #79c0ff;
  white-space: pre;
  overflow: auto;
  outline: none;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  flex-shrink: 0;
}

.pillar--muted .pillar-code { text-decoration: line-through; }
.pillar-code:focus { background: var(--preview-bg); }

/* ── Pillar Chat ── */
.pillar-chat {
  flex: 1;
  overflow-y: auto;
  padding: 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* ── Pillar Input ── */
.pillar-input-row {
  display: flex;
  gap: 0.4rem;
  padding: 0.5rem 0.6rem;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.pillar-prompt {
  flex: 1;
  background: var(--preview-bg);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 0.45rem 0.7rem;
  border-radius: 6px;
  font-size: 0.85rem;
  min-width: 0;
}

.pillar-prompt:focus { outline: none; border-color: var(--accent); }

.btn-send {
  padding: 0.45rem 0.7rem;
  flex-shrink: 0;
  background: var(--accent);
  color: #000;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  font-size: 0.9rem;
}

/* ── Messages ── */
.msg {
  padding: 0.5rem 0.7rem;
  border-radius: 6px;
  font-size: 0.82rem;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}

.msg-user {
  background: var(--user-bubble);
  align-self: flex-end;
  color: var(--text);
}

.msg-error {
  background: #2a1010;
  border: 1px solid var(--error);
  color: var(--error);
  align-self: flex-start;
}

.msg-preview {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.6rem;
  align-self: flex-start;
  width: 100%;
}

.preview-label {
  font-size: 0.72rem;
  color: var(--muted);
  margin-bottom: 0.3rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.preview-code {
  background: var(--preview-bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0.5rem;
  font-family: 'Fira Code', 'Courier New', monospace;
  font-size: 0.78rem;
  color: #79c0ff;
  overflow-x: auto;
  white-space: pre;
  margin-bottom: 0.5rem;
}

.preview-actions { display: flex; gap: 0.4rem; }

/* ── Buttons (global) ── */
button {
  cursor: pointer;
  transition: opacity 0.15s;
}

button:hover { opacity: 0.8; }
button:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-apply { background: #238636; color: #fff; border: none; padding: 0.4rem 0.8rem; border-radius: 5px; font-weight: bold; font-size: 0.82rem; }
.btn-dismiss { background: transparent; color: var(--muted); border: 1px solid var(--border); padding: 0.4rem 0.6rem; border-radius: 5px; font-size: 0.82rem; }

#play-btn {
  background: var(--accent);
  color: #000;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: bold;
  font-size: 0.9rem;
}
```

- [ ] **Step 2: Commit**

```bash
git add style.css
git commit -m "feat: add 6-pillar grid layout styles"
```

---

## Task 7: Rewrite `app.js`

**Files:**
- Rewrite: `app.js`

- [ ] **Step 1: Replace `app.js` entirely**

```js
import { init, play, stop } from './src/strudel.js';
import { generateTransformationPlan, autoFixCode } from './src/llm.js';
import { applyTransformation, generateSeed } from './src/patchEngine.js';
import { expandStyle } from './src/library/styles.js';
import { validateCode } from './src/validate.js';
import { PILLAR_NAMES, makePillars, rebuildStack } from './src/pillars.js';
import {
  setStatus,
  renderGlobalControls,
  renderPillar,
  updatePillarCode,
  setPillarMuted,
  setPillarSoloed,
  addPillarMessage,
  addPillarPreviewMessage,
} from './src/ui.js';

const pillars = makePillars();

const globalState = {
  tempo: 1.0,
  masterVolume: 0.8,
  masterFilter: 1.0,
  intensity: 0.5,
  isPlaying: false,
  soloedPillar: null,
};

// ── Playback ──────────────────────────────────────────────

const playBtn = document.getElementById('play-btn');

async function rebuildAndPlay() {
  const stack = rebuildStack(pillars, globalState);
  if (!stack) {
    if (globalState.isPlaying) { stop(); setStatus('Nothing active'); }
    return;
  }
  if (!globalState.isPlaying) return;
  try {
    await play(stack);
  } catch (e) {
    setStatus('Fixing...');
    try {
      const fixed = await autoFixCode(stack, e.message);
      await play(fixed);
      setStatus('Playing (auto-fixed)');
    } catch {
      stop();
      globalState.isPlaying = false;
      playBtn.textContent = '▶ Play';
      setStatus('Error — stopped');
    }
  }
}

playBtn.addEventListener('click', async () => {
  if (!globalState.isPlaying) {
    const stack = rebuildStack(pillars, globalState);
    if (!stack) { setStatus('No active pillars'); return; }
    try {
      await play(stack);
      globalState.isPlaying = true;
      playBtn.textContent = '■ Stop';
      setStatus('Playing');
    } catch (e) {
      setStatus('Play error');
    }
  } else {
    stop();
    globalState.isPlaying = false;
    playBtn.textContent = '▶ Play';
    setStatus('Stopped');
  }
});

// ── Global Sliders ────────────────────────────────────────

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

const debouncedRebuild = debounce(rebuildAndPlay, 50);

renderGlobalControls(globalState, (key, value) => {
  globalState[key] = value;
  debouncedRebuild();
});

// ── Per-Pillar Send ───────────────────────────────────────

async function handlePillarSend(pillarName, prompt) {
  const pillar = pillars.find(p => p.name === pillarName);
  addPillarMessage(pillarName, 'user', prompt);
  setStatus('Planning...');

  const plan = await generateTransformationPlan(
    pillar.code,
    prompt,
    pillar.history,
    globalState.intensity,
    pillarName
  );

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

  let newCode;
  if (plan.mode === 'transform') {
    newCode = applyTransformation(pillar.code, {
      operations: expandStyle(plan.style, plan.target, plan.intensity),
    });
  } else {
    newCode = generateSeed(plan);
  }

  const validation = validateCode(newCode);
  if (!validation.valid) {
    addPillarMessage(pillarName, 'error', `Validation failed: ${validation.errors.join(', ')}`);
    setStatus('Error');
    return;
  }

  const prevCode = pillar.code;
  addPillarPreviewMessage(
    pillarName,
    newCode,
    async () => {
      pillar.code = newCode;
      updatePillarCode(pillarName, newCode);
      pillar.history.push(
        { role: 'user', content: `Current code:\n${prevCode}\n\nRequest: ${prompt}` },
        { role: 'assistant', content: newCode }
      );
      await rebuildAndPlay();
      setStatus('Applied');
    },
    () => setStatus('Ready')
  );

  setStatus('Preview ready');
}

// ── Mute / Solo ───────────────────────────────────────────

function handleMute(pillarName) {
  const pillar = pillars.find(p => p.name === pillarName);
  pillar.muted = !pillar.muted;
  setPillarMuted(pillarName, pillar.muted);
  rebuildAndPlay();
}

function handleSolo(pillarName) {
  globalState.soloedPillar = globalState.soloedPillar === pillarName ? null : pillarName;
  setPillarSoloed(globalState.soloedPillar, PILLAR_NAMES);
  rebuildAndPlay();
}

// ── Mount Pillars ─────────────────────────────────────────

const pillarsRow = document.getElementById('pillars-row');

for (const pillar of pillars) {
  const card = renderPillar(pillar, {
    onSend: (prompt) => handlePillarSend(pillar.name, prompt),
    onMute: () => handleMute(pillar.name),
    onSolo: () => handleSolo(pillar.name),
    onCodeEdit: (newCode) => {
      if (newCode === pillar.code) return;
      pillar.code = newCode;
      rebuildAndPlay();
    },
  });
  pillarsRow.appendChild(card);
}

// ── Init ──────────────────────────────────────────────────

(async () => {
  setStatus('Loading...');
  try {
    await init();
    setStatus('Ready');
  } catch (e) {
    setStatus('Engine failed');
    console.error(e);
  }
})();
```

- [ ] **Step 2: Run full test suite**

```bash
npm test
```

Expected: All tests pass (pillars: 13, patchEngine: 13, llm: 12, validate: 8, library: 6 = 52 tests).

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: rewrite app.js for 6-pillar architecture"
```

---

## Task 8: Smoke Test in Browser

**No code changes — manual verification only.**

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Open `http://localhost:5173`.

- [ ] **Step 2: Verify layout**

- [ ] Header with logo, status, Play button visible
- [ ] Global controls row shows 4 sliders (Tempo, Volume, Filter, Intensity) with live values
- [ ] 6 pillar cards visible: FOUNDATION, BASSLINE, PERCUSSION, MELODY, ATMOSPHERE, FX
- [ ] Each card has code area, chat area, text input, M and S buttons

- [ ] **Step 3: Verify global sliders**

- [ ] Drag Tempo slider — value label updates live
- [ ] Drag other sliders — value labels update live

- [ ] **Step 4: Verify pillar prompt (with Ollama running)**

Start Ollama: `OLLAMA_ORIGINS="*" ollama serve`

- [ ] Type "give me a basic kick" in FOUNDATION input, press Enter
- [ ] Preview message appears in FOUNDATION's chat
- [ ] Click Apply — code appears in FOUNDATION's code panel
- [ ] Click ▶ Play — audio plays

- [ ] **Step 5: Verify second pillar stacks**

- [ ] Type "add a hi-hat pattern" in PERCUSSION input, press Enter, Apply
- [ ] ▶ Play — both foundation and percussion play together

- [ ] **Step 6: Verify mute/solo**

- [ ] Click M on FOUNDATION — card dims, strikethrough on code, foundation audio stops (if playing)
- [ ] Click M again — card restores
- [ ] Click S on PERCUSSION — other cards dim, only percussion plays
- [ ] Click S again — solo released

- [ ] **Step 7: Verify global effects chain**

- [ ] With audio playing, drag Tempo — BPM changes in real time
- [ ] Drag Filter to 0 — sound goes dark (low-pass closes)
- [ ] Drag Volume to 0 — silence

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "chore: 6-pillar architecture complete"
```
