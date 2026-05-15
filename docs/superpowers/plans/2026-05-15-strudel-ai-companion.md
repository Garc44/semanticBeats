# Strudel AI Companion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the musicAgent webapp into a working split-layout chat+code app where llama3 (via Ollama) modifies a live Strudel loop through natural language.

**Architecture:** Vanilla JS modules split by responsibility (`strudel.js`, `llm.js`, `ui.js`) wired together in `app.js`. Shared state (history, currentCode, isPlaying) lives in `app.js` and is passed to modules as arguments. No framework.

**Tech Stack:** Vite, `@strudel/web` v1.3.0, Ollama `/api/chat`, llama3:latest, vanilla JS ESM

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/strudel.js` | Create | Engine init, evaluate, stop |
| `src/llm.js` | Create | Ollama fetch, system prompt, history |
| `src/ui.js` | Create | Chat render, preview/apply/dismiss, code panel sync |
| `app.js` | Rewrite | Entry point, shared state, event wiring |
| `index.html` | Rewrite | Split layout HTML |
| `style.css` | Rewrite | Dark theme, split layout styles |

---

## Task 1: Create `src/strudel.js`

**Files:**
- Create: `src/strudel.js`

- [ ] **Step 1: Create the file**

```js
import { initStrudel, evaluate as _evaluate, hush } from '@strudel/web';

let initialized = false;

export async function init() {
  await initStrudel();
  initialized = true;
}

export async function play(code) {
  if (!initialized) throw new Error('Strudel not initialized');
  await _evaluate(code, true);
}

export function stop() {
  hush();
}
```

- [ ] **Step 2: Verify module resolves**

Run: `npx vite build --mode development 2>&1 | head -20`  
Expected: no "Cannot find module" errors for `@strudel/web`

- [ ] **Step 3: Commit**

```bash
git add src/strudel.js
git commit -m "feat: add strudel engine module"
```

---

## Task 2: Create `src/llm.js`

**Files:**
- Create: `src/llm.js`

- [ ] **Step 1: Create the file**

```js
const SYSTEM_PROMPT = `You are a Strudel live-coding music assistant. Strudel uses mini-notation inside JS functions.

SOUNDS
s("bd sd hh cp")        -- drum samples (bd=kick, sd=snare, hh=hihat, cp=clap)
note("c3 e3 g3")        -- pitched notes
n("0 2 4").s("piano")   -- sample index + instrument

MINI-NOTATION
"bd sd"         sequence
"bd*4"          repeat 4x
"[bd sd]*2"     group and repeat
"bd ~ sd ~"     ~ is a rest
"<bd sd>"       alternate each cycle
"bd(3,8)"       euclidean rhythm

COMBINING
stack(a, b, c)  -- play all simultaneously
cat(a, b)       -- play in sequence, one per cycle

EFFECTS (chain with dot notation)
.room(0-1)      reverb
.gain(0-2)      volume
.pan(-1 to 1)   stereo pan
.lpf(hz)        low-pass filter
.hpf(hz)        high-pass filter
.speed(n)       sample playback speed
.slow(n)        stretch pattern n times
.fast(n)        compress pattern n times
.delay(n)       echo
.crush(n)       bitcrush

EXAMPLE
stack(
  s("bd ~ bd ~"),
  s("~ sd ~ sd").room(0.3),
  s("hh*8").gain(0.5)
)

RULES
- Output ONLY valid Strudel JS. No markdown. No explanation. No backticks.
- Always preserve sounds not mentioned in the user request.
- Modify the provided code -- do not rewrite from scratch unless explicitly asked.
- Never add comments or blank lines outside the code.`;

export async function generateCode(history, currentCode, userPrompt) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    {
      role: 'user',
      content: `Current code:\n${currentCode}\n\nRequest: ${userPrompt}`,
    },
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

  if (!response.ok) {
    throw new Error(`Ollama HTTP ${response.status}`);
  }

  const data = await response.json();
  const raw = data.message?.content ?? '';
  // Strip any accidental markdown fences
  return raw.replace(/```[\w]*\n?/g, '').trim();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/llm.js
git commit -m "feat: add LLM module with llama3 and curated Strudel system prompt"
```

---

## Task 3: Create `src/ui.js`

**Files:**
- Create: `src/ui.js`

- [ ] **Step 1: Create the file**

```js
const chatEl = () => document.getElementById('chat');
const codeEl = () => document.getElementById('code-panel');
const statusEl = () => document.getElementById('status');

export function setStatus(text) {
  statusEl().textContent = text;
}

export function updateCodePanel(code) {
  codeEl().textContent = code;
}

export function addUserMessage(text) {
  const el = document.createElement('div');
  el.className = 'msg msg-user';
  el.textContent = text;
  chatEl().appendChild(el);
  scrollChat();
}

export function addErrorMessage(text) {
  const el = document.createElement('div');
  el.className = 'msg msg-error';
  el.textContent = `Error: ${text}`;
  chatEl().appendChild(el);
  scrollChat();
}

export function addPreviewMessage(code, onApply, onDismiss) {
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
  applyBtn.addEventListener('click', () => {
    onApply();
    applyBtn.disabled = true;
    dismissBtn.disabled = true;
  });

  const dismissBtn = document.createElement('button');
  dismissBtn.textContent = '✕';
  dismissBtn.className = 'btn-dismiss';
  dismissBtn.addEventListener('click', () => {
    onDismiss();
    wrapper.remove();
  });

  actions.appendChild(applyBtn);
  actions.appendChild(dismissBtn);
  wrapper.appendChild(label);
  wrapper.appendChild(pre);
  wrapper.appendChild(actions);
  chatEl().appendChild(wrapper);
  scrollChat();
}

function scrollChat() {
  const el = chatEl();
  el.scrollTop = el.scrollHeight;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui.js
git commit -m "feat: add UI module for chat, preview, and code panel"
```

---

## Task 4: Rewrite `app.js`

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Replace the entire file**

```js
import { init, play, stop } from './src/strudel.js';
import { generateCode } from './src/llm.js';
import {
  setStatus,
  updateCodePanel,
  addUserMessage,
  addErrorMessage,
  addPreviewMessage,
} from './src/ui.js';

// Shared state
let conversationHistory = [];
let currentCode = `stack(
  s("bd ~ bd ~"),
  s("~ sd ~ sd").room(0.3),
  s("hh*8").gain(0.5)
)`;
let isPlaying = false;

const playBtn = document.getElementById('play-btn');
const promptInput = document.getElementById('prompt');
const sendBtn = document.getElementById('send-btn');
const codePanel = document.getElementById('code-panel');

// Init Strudel
(async () => {
  setStatus('Loading...');
  try {
    await init();
    setStatus('Ready');
    updateCodePanel(currentCode);
  } catch (e) {
    setStatus('Engine failed');
    console.error(e);
  }
})();

// Play / Stop
playBtn.addEventListener('click', async () => {
  if (!isPlaying) {
    try {
      await play(currentCode);
      isPlaying = true;
      playBtn.textContent = '■ Stop';
      setStatus('Playing');
    } catch (e) {
      setStatus('Play error');
      addErrorMessage(e.message);
    }
  } else {
    stop();
    isPlaying = false;
    playBtn.textContent = '▶ Play';
    setStatus('Stopped');
  }
});

// Manual code edit sync
codePanel.addEventListener('blur', async () => {
  const edited = codePanel.textContent.trim();
  if (edited === currentCode) return;
  if (isPlaying) {
    try {
      await play(edited);
      currentCode = edited;
    } catch (e) {
      addErrorMessage(e.message);
      updateCodePanel(currentCode); // revert display
    }
  } else {
    currentCode = edited;
  }
});

// Send prompt to LLM
async function handleSend() {
  const prompt = promptInput.value.trim();
  if (!prompt) return;
  promptInput.value = '';

  addUserMessage(prompt);
  setStatus('Thinking...');
  sendBtn.disabled = true;

  try {
    const newCode = await generateCode(conversationHistory, currentCode, prompt);

    // Add to history
    conversationHistory.push({ role: 'user', content: `Current code:\n${currentCode}\n\nRequest: ${prompt}` });
    conversationHistory.push({ role: 'assistant', content: newCode });

    addPreviewMessage(
      newCode,
      // onApply
      async () => {
        try {
          if (isPlaying) await play(newCode);
          currentCode = newCode;
          updateCodePanel(newCode);
          setStatus('Applied');
        } catch (e) {
          addErrorMessage(e.message);
          updateCodePanel(currentCode);
          setStatus('Error — reverted');
        }
      },
      // onDismiss
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

sendBtn.addEventListener('click', handleSend);
promptInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add app.js
git commit -m "feat: rewrite app.js with shared state and module wiring"
```

---

## Task 5: Rewrite `index.html`

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Replace the entire file**

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

  <main>
    <section class="chat-panel">
      <div id="chat"></div>
      <div class="input-row">
        <input
          type="text"
          id="prompt"
          placeholder="e.g. make the bass faster, add reverb to the snare"
          autocomplete="off"
        />
        <button id="send-btn">→</button>
      </div>
    </section>

    <section class="code-panel">
      <div id="code-panel" contenteditable="true" spellcheck="false"></div>
    </section>
  </main>

  <script type="module" src="/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: split-layout HTML with chat and code panels"
```

---

## Task 6: Rewrite `style.css`

**Files:**
- Modify: `style.css`

- [ ] **Step 1: Replace the entire file**

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

main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* ── Chat Panel ── */
.chat-panel {
  width: 40%;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border);
}

#chat {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.input-row {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem;
  border-top: 1px solid var(--border);
}

#prompt {
  flex: 1;
  background: var(--preview-bg);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 0.6rem 0.9rem;
  border-radius: 6px;
  font-size: 0.95rem;
}

#prompt:focus { outline: none; border-color: var(--accent); }

/* ── Messages ── */
.msg {
  padding: 0.6rem 0.9rem;
  border-radius: 8px;
  font-size: 0.9rem;
  max-width: 90%;
  line-height: 1.5;
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
  padding: 0.75rem;
  align-self: flex-start;
  max-width: 95%;
  width: 95%;
}

.preview-label {
  font-size: 0.75rem;
  color: var(--muted);
  margin-bottom: 0.4rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.preview-code {
  background: var(--preview-bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0.6rem;
  font-family: 'Fira Code', 'Courier New', monospace;
  font-size: 0.82rem;
  color: #79c0ff;
  overflow-x: auto;
  white-space: pre;
  margin-bottom: 0.6rem;
}

.preview-actions { display: flex; gap: 0.5rem; }

/* ── Buttons ── */
button {
  background: var(--accent);
  color: #000;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  font-size: 0.9rem;
  transition: opacity 0.15s;
}

button:hover { opacity: 0.8; }
button:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-apply { background: #238636; color: #fff; }
.btn-dismiss { background: transparent; color: var(--muted); border: 1px solid var(--border); }

#send-btn { padding: 0.5rem 0.9rem; flex-shrink: 0; }

/* ── Code Panel ── */
.code-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

#code-panel {
  flex: 1;
  padding: 1.5rem;
  font-family: 'Fira Code', 'Courier New', monospace;
  font-size: 1rem;
  color: #79c0ff;
  line-height: 1.6;
  white-space: pre;
  overflow: auto;
  outline: none;
  background: var(--bg);
}

#code-panel:focus { background: #0d1117; }
```

- [ ] **Step 2: Commit**

```bash
git add style.css
git commit -m "feat: full dark theme with split chat/code layout"
```

---

## Task 7: Start Ollama Correctly + Smoke Test

**Files:** none

- [ ] **Step 1: Start Ollama with CORS open**

In a terminal:
```bash
OLLAMA_ORIGINS="*" ollama serve
```

- [ ] **Step 2: Start Vite dev server**

In another terminal:
```bash
cd /Users/marcgusev/Desktop/musicAgent
npm run dev
```

Expected: `http://localhost:5173` in output, no build errors.

- [ ] **Step 3: Smoke test — engine loads**

Open `http://localhost:5173`.  
Expected: header shows "Ready", code panel shows the default stack pattern.

- [ ] **Step 4: Smoke test — playback**

Click **▶ Play**.  
Expected: kick/snare/hihat pattern plays, button changes to **■ Stop**, status shows "Playing".

- [ ] **Step 5: Smoke test — LLM prompt**

Type: `make the hihat twice as fast`  
Click **→** or press Enter.  
Expected: status shows "Thinking...", then "Preview ready". A preview bubble appears in chat with updated code and Apply/✕ buttons.

- [ ] **Step 6: Smoke test — apply**

Click **Apply** in the preview bubble.  
Expected: code panel updates, hihat pattern reflects `hh*16` or similar, playback updates live.

- [ ] **Step 7: Smoke test — error revert**

In the code panel, manually type garbage (e.g. `xyz broken`), click elsewhere.  
Expected: error bubble appears in chat, code panel reverts to last valid code.

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "chore: verify smoke tests pass"
```

---

## CORS Troubleshooting

If LLM calls fail with network error:
```bash
# Kill existing ollama, restart with origins
pkill ollama
OLLAMA_ORIGINS="http://localhost:5173" ollama serve
```

If `llama3:latest` not found:
```bash
ollama pull llama3
```
