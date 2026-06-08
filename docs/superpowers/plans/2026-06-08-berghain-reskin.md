# Berghain Reskin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin musicAgent UI to underground rave poster aesthetic — pure black, bold red (#E8302A), Bebas Neue condensed type, geometric SVG pillar icons, grain texture overlay.

**Architecture:** Pure CSS/HTML reskin. All changes confined to `style.css` (CSS variables, component styles, grain overlay) and `index.html` (Google Fonts link). No JS, no layout, no functionality changes.

**Tech Stack:** CSS custom properties, Google Fonts (Bebas Neue), inline SVG, CSS SVG noise filter

---

## Files

- Modify: `index.html` — add Google Fonts `<link>` in `<head>`
- Modify: `style.css` — full reskin per spec

No new files. No test changes (CSS/UI is not tested per project conventions).

---

### Task 1: Add Google Fonts + update CSS variables

**Files:**
- Modify: `index.html`
- Modify: `style.css`

- [ ] **Step 1: Add Bebas Neue font link to `index.html`**

In `index.html`, add before the existing `<link rel="stylesheet">` line:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" rel="stylesheet">
```

Result:
```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Strudel AI</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css" />
</head>
```

- [ ] **Step 2: Replace `:root` CSS variables in `style.css`**

Replace the existing `:root` block:

```css
:root {
  --bg: #000000;
  --surface: #0a0a0a;
  --border: #1a1a1a;
  --accent: #E8302A;
  --text: #f0f0f0;
  --muted: #555555;
  --error: #E8302A;
  --user-bubble: #100000;
  --preview-bg: #000000;
}
```

- [ ] **Step 3: Update `body` font stack**

Replace the `body` rule's `font-family`:

```css
body {
  background: var(--bg);
  color: var(--text);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
```

No change to font-family on body — Bebas Neue will be applied selectively per component.

- [ ] **Step 4: Commit**

```bash
git add index.html style.css
git commit -m "feat: add Bebas Neue font, update CSS color variables for Berghain reskin"
```

---

### Task 2: Reskin header and play button

**Files:**
- Modify: `style.css`

- [ ] **Step 1: Replace `header` rule**

```css
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  border-bottom: 2px solid var(--accent);
  flex-shrink: 0;
  background: var(--bg);
}
```

- [ ] **Step 2: Replace `.logo` rule**

```css
.logo {
  font-family: 'Bebas Neue', Impact, sans-serif;
  font-size: 1.8rem;
  letter-spacing: 0.08em;
  color: var(--text);
}
```

- [ ] **Step 3: Replace `#status` rule**

```css
#status {
  font-family: 'Bebas Neue', Impact, sans-serif;
  font-size: 0.85rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
```

- [ ] **Step 4: Replace `#play-btn` rule**

```css
#play-btn {
  background: var(--accent);
  color: #000;
  border: none;
  padding: 0.5rem 1.1rem;
  border-radius: 0;
  font-family: 'Bebas Neue', Impact, sans-serif;
  font-size: 1rem;
  letter-spacing: 0.12em;
  cursor: pointer;
}
```

- [ ] **Step 5: Start dev server and verify header looks correct**

```bash
npm run dev
```

Open http://localhost:5173. Header should show: black bg, red bottom border, "STRUDEL AI" in Bebas Neue, red PLAY button with sharp corners.

- [ ] **Step 6: Commit**

```bash
git add style.css
git commit -m "feat: reskin header — Bebas Neue logo, red border, sharp play button"
```

---

### Task 3: Reskin global controls

**Files:**
- Modify: `style.css`

- [ ] **Step 1: Replace `#global-controls` rule**

```css
#global-controls {
  display: flex;
  gap: 2rem;
  padding: 0.6rem 1.5rem;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  flex-shrink: 0;
  align-items: center;
}
```

- [ ] **Step 2: Replace `.slider-group label` rule**

```css
.slider-group label {
  font-family: 'Bebas Neue', Impact, sans-serif;
  font-size: 0.85rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  display: block;
  margin-bottom: 2px;
}
```

- [ ] **Step 3: Replace `.slider-value` rule**

```css
.slider-value {
  color: var(--text);
  font-family: 'Courier New', 'Fira Code', monospace;
}
```

- [ ] **Step 4: Replace `.slider-group input[type="range"]` rule**

```css
.slider-group input[type="range"] {
  width: 100%;
  accent-color: var(--accent);
  cursor: pointer;
}
```

- [ ] **Step 5: Replace `.btn-bpc` and `.btn-bpc.active` rules**

```css
.btn-bpc {
  flex: 1;
  padding: 0.2rem 0.4rem;
  background: var(--surface);
  color: var(--muted);
  border: 1px solid var(--border);
  border-radius: 0;
  font-family: 'Bebas Neue', Impact, sans-serif;
  font-size: 0.8rem;
  letter-spacing: 0.1em;
  cursor: pointer;
}

.btn-bpc.active {
  background: var(--accent);
  color: #000;
  border-color: var(--accent);
}
```

- [ ] **Step 6: Verify in browser**

Global controls should show: dark surface bg, Bebas Neue labels, white BPM/GAIN numbers, sharp BPC buttons with red active state.

- [ ] **Step 7: Commit**

```bash
git add style.css
git commit -m "feat: reskin global controls — Bebas Neue labels, white values, sharp BPC buttons"
```

---

### Task 4: Reskin pillar cards and headers

**Files:**
- Modify: `style.css`

- [ ] **Step 1: Replace `.pillar-card` rule**

```css
.pillar-card {
  min-width: 280px;
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: 2px solid var(--border);
  overflow: hidden;
  transition: opacity 0.2s;
}
```

- [ ] **Step 2: Replace `.pillar-header` rule**

```css
.pillar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.75rem;
  border-bottom: 2px solid var(--accent);
  background: var(--surface);
  flex-shrink: 0;
}
```

- [ ] **Step 3: Add `.pillar-title` rule (new — wraps icon + name)**

```css
.pillar-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
```

- [ ] **Step 4: Replace `.pillar-name` rule**

```css
.pillar-name {
  font-family: 'Bebas Neue', Impact, sans-serif;
  font-size: 1.6rem;
  letter-spacing: 0.12em;
  color: var(--accent);
}
```

- [ ] **Step 5: Replace `.btn-mute` and `.btn-solo` rules**

```css
.btn-mute,
.btn-solo {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--muted);
  padding: 0.2rem 0.45rem;
  border-radius: 0;
  font-family: 'Bebas Neue', Impact, sans-serif;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  font-weight: normal;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.btn-mute.active { background: var(--accent); color: #000; border-color: var(--accent); }
.btn-solo.active { background: var(--text); color: #000; border-color: var(--text); }
```

- [ ] **Step 6: Replace `.pillar-code` rule**

```css
.pillar-code {
  height: 120px;
  padding: 0.6rem;
  font-family: 'Fira Code', 'Courier New', monospace;
  font-size: 0.82rem;
  color: var(--text);
  white-space: pre;
  overflow: auto;
  outline: none;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  flex-shrink: 0;
}

.pillar--muted .pillar-code { text-decoration: line-through; opacity: 0.4; }
.pillar-code:focus { background: #050505; color: #fff; }
```

- [ ] **Step 7: Verify in browser**

Pillar headers should show: red bottom border, large Bebas Neue pillar name in red, sharp MUTE/SOLO buttons, white code text.

- [ ] **Step 8: Commit**

```bash
git add style.css
git commit -m "feat: reskin pillar cards — red header border, big Bebas Neue names, sharp buttons, white code"
```

---

### Task 5: Add SVG icons to pillar headers in HTML

**Files:**
- Modify: `index.html` — NO. Icons are injected via `ui.js` and `app.js`, not hardcoded in index.html.

> **Note:** Pillar cards are dynamically built in JS (`src/ui.js` and `src/pillars.js`). The static `index.html` only has `<main id="pillars-row"></main>`. Icons must be added in the JS that builds pillar header HTML.

- [ ] **Step 1: Find where pillar header HTML is built**

Read `src/ui.js` and search for where `.pillar-header` or `.pillar-name` is constructed.

```bash
grep -n "pillar-header\|pillar-name\|innerHTML\|createElement" src/ui.js src/app.js
```

- [ ] **Step 2: Identify the icon SVG strings per pillar**

Define these SVG strings (red stroke `#E8302A`, 16×16):

```js
// PILLAR_NAMES = ['drums', 'bass', 'percussion', 'melody', 'transitions']
const PILLAR_ICONS = {
  drums:       `<svg width="16" height="16" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="7" cy="7" r="6" stroke="#E8302A" stroke-width="1.5"/><circle cx="7" cy="7" r="2.5" fill="#E8302A"/></svg>`,
  bass:        `<svg width="16" height="16" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 10 Q3.5 2 7 7 Q10.5 12 13 4" stroke="#E8302A" stroke-width="1.5" fill="none"/></svg>`,
  percussion:  `<svg width="16" height="16" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="3" y1="2" x2="3" y2="12" stroke="#E8302A" stroke-width="1.5"/><line x1="7" y1="4" x2="7" y2="12" stroke="#E8302A" stroke-width="1.5"/><line x1="11" y1="2" x2="11" y2="12" stroke="#E8302A" stroke-width="1.5"/></svg>`,
  melody:      `<svg width="16" height="16" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="7,1 13,13 1,13" stroke="#E8302A" stroke-width="1.5" fill="none"/></svg>`,
  transitions: `<svg width="16" height="16" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="12" height="12" stroke="#E8302A" stroke-width="1.5" fill="none"/><line x1="1" y1="7" x2="13" y2="7" stroke="#E8302A" stroke-width="1"/><line x1="7" y1="1" x2="7" y2="13" stroke="#E8302A" stroke-width="1"/></svg>`,
};
```

- [ ] **Step 3: Wrap icon + name in `.pillar-title` div wherever pillar header name is rendered**

In the relevant JS file, find the element that sets the pillar name text. Wrap it so the rendered HTML becomes:

```html
<div class="pillar-title">
  <!-- SVG icon here -->
  <span class="pillar-name">DRUMS</span>
</div>
```

The exact code change depends on what you find in Step 1. Pattern to follow:

If it uses `innerHTML` template literals, change:
```js
`<span class="pillar-name">${name.toUpperCase()}</span>`
```
to:
```js
`<div class="pillar-title">${PILLAR_ICONS[name] ?? ''}<span class="pillar-name">${name.toUpperCase()}</span></div>`
```

If it uses `createElement`, create a wrapper div with class `pillar-title`, append the SVG via `innerHTML` on a temp element, then append the name span.

- [ ] **Step 4: Verify in browser**

Each pillar header should show its geometric SVG icon to the left of the name. DRUMS=circle+dot, BASS=waveform, PERCUSSION=three vertical bars, MELODY=triangle, TRANSITIONS=grid-cross.

- [ ] **Step 5: Commit**

```bash
git add src/ui.js  # or whichever file was modified
git commit -m "feat: add geometric SVG icons to pillar headers"
```

---

### Task 6: Reskin chat messages, inputs, and preview cards

**Files:**
- Modify: `style.css`

- [ ] **Step 1: Replace `.pillar-input-row` and `.pillar-prompt` rules**

```css
.pillar-input-row {
  display: flex;
  gap: 0.4rem;
  padding: 0.5rem 0.6rem;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
  background: var(--bg);
}

.pillar-prompt {
  flex: 1;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 0.45rem 0.7rem;
  border-radius: 0;
  font-size: 0.85rem;
  min-width: 0;
}

.pillar-prompt:focus { outline: none; border-color: var(--accent); }
.pillar-prompt::placeholder { color: var(--muted); }
```

- [ ] **Step 2: Replace `.btn-send` rule**

```css
.btn-send {
  padding: 0.45rem 0.75rem;
  flex-shrink: 0;
  background: var(--accent);
  color: #000;
  border: none;
  border-radius: 0;
  font-family: 'Bebas Neue', Impact, sans-serif;
  font-size: 0.9rem;
  letter-spacing: 0.1em;
  cursor: pointer;
}
```

- [ ] **Step 3: Replace message bubble rules**

```css
.msg {
  padding: 0.5rem 0.7rem;
  border-radius: 0;
  font-size: 0.82rem;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}

.msg-user {
  background: var(--user-bubble);
  border: 1px solid #2a0a0a;
  align-self: flex-end;
  color: var(--text);
}

.msg-error {
  background: #0a0000;
  border: 1px solid var(--error);
  color: var(--error);
  align-self: flex-start;
}

.msg-preview {
  background: var(--surface);
  border: 1px solid #E8302A33;
  border-radius: 0;
  padding: 0.6rem;
  align-self: flex-start;
  width: 100%;
}
```

- [ ] **Step 4: Replace preview card label, code, and button rules**

```css
.preview-label {
  font-family: 'Bebas Neue', Impact, sans-serif;
  font-size: 0.75rem;
  color: var(--muted);
  margin-bottom: 0.3rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.preview-code {
  background: var(--preview-bg);
  border: 1px solid var(--border);
  border-radius: 0;
  padding: 0.5rem;
  font-family: 'Fira Code', 'Courier New', monospace;
  font-size: 0.78rem;
  color: var(--text);
  overflow-x: auto;
  white-space: pre;
  margin-bottom: 0.5rem;
}

.preview-actions { display: flex; gap: 0.4rem; }

.btn-apply {
  background: var(--accent);
  color: #000;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 0;
  font-family: 'Bebas Neue', Impact, sans-serif;
  font-size: 0.82rem;
  letter-spacing: 0.1em;
  cursor: pointer;
}

.btn-dismiss {
  background: transparent;
  color: var(--muted);
  border: 1px solid var(--border);
  padding: 0.4rem 0.6rem;
  border-radius: 0;
  font-family: 'Bebas Neue', Impact, sans-serif;
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  cursor: pointer;
}
```

- [ ] **Step 5: Verify in browser**

Type a message in a pillar input. Send it. Trigger a preview (or fake one in dev). Messages should show: sharp corners, dark red user bubble, red-bordered error, red-tinted preview card border, white code text, red APPLY button.

- [ ] **Step 6: Commit**

```bash
git add style.css
git commit -m "feat: reskin chat messages, inputs, preview cards — sharp corners, poster palette"
```

---

### Task 7: Add grain texture overlay

**Files:**
- Modify: `style.css`

- [ ] **Step 1: Add grain overlay rule after `body` block**

```css
body::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  opacity: 0.07;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  background-size: 200px 200px;
}
```

- [ ] **Step 2: Verify in browser**

Subtle grain should be visible across the whole UI. If too heavy, reduce `opacity` toward `0.04`. If invisible, increase toward `0.1`.

- [ ] **Step 3: Commit**

```bash
git add style.css
git commit -m "feat: add CSS grain texture overlay to body"
```

---

### Task 8: Final visual QA pass

- [ ] **Step 1: Run dev server**

```bash
npm run dev
```

- [ ] **Step 2: Check each component against spec**

| Component | Expected |
|---|---|
| Header | Black bg, 2px red bottom border, Bebas Neue logo, sharp red PLAY button |
| Global controls | Dark surface, Bebas Neue labels, white BPM/GAIN values, red active BPC |
| Pillar header | Red 2px bottom border, SVG icon + large red Bebas Neue name, sharp MUTE/SOLO |
| Pillar code | White text on black bg |
| Chat input | Sharp corners, red border on focus, red GO button |
| User message | Dark red-tinted bubble, sharp corners |
| Error message | Red border, red text |
| Preview card | Translucent red border, white code text, red APPLY, sharp DISMISS |
| Body | Subtle grain overlay visible |

- [ ] **Step 3: Run tests to confirm no regressions**

```bash
npm test
```

Expected: all 85 tests pass (CSS changes cannot break JS logic).

- [ ] **Step 4: Final commit**

```bash
git add -p  # stage any remaining tweaks
git commit -m "feat: complete Berghain visual reskin"
```
