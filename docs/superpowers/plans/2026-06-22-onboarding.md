# Onboarding Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first-run onboarding (welcome card + 4-stop spotlight tour over the real UI) that teaches the core moves, shows once, and is replayable from a header `?` button.

**Architecture:** A single vanilla-JS module `src/onboarding.js` owns all onboarding logic and DOM. Pure functions (`shouldShowOnboarding`, `TOUR_STEPS`) are unit-tested; rendering is verified manually. `app.js` calls `maybeStartOnboarding()` after pillars mount and wires the header `?` button to `startOnboarding()`. Styles live in a new `style.css` block matching the brutalist theme.

**Tech Stack:** Vanilla ES modules, Vite, Vitest. No new dependencies.

---

## File Structure

- Create: `src/onboarding.js` — onboarding state machine + DOM rendering. One responsibility: run the intro flow.
- Create: `tests/onboarding.test.js` — unit tests for the pure pieces.
- Modify: `index.html` — add header `?` button.
- Modify: `app.js` — import + wire `maybeStartOnboarding()` and the `?` button.
- Modify: `style.css` — onboarding styles.

---

### Task 1: Pure logic — `shouldShowOnboarding` + `TOUR_STEPS`

**Files:**
- Create: `src/onboarding.js`
- Test: `tests/onboarding.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/onboarding.test.js
import { describe, it, expect } from 'vitest';
import { shouldShowOnboarding, TOUR_STEPS } from '../src/onboarding.js';

function fakeStorage(initial = {}) {
  const map = { ...initial };
  return {
    getItem: (k) => (k in map ? map[k] : null),
    setItem: (k, v) => { map[k] = String(v); },
  };
}

describe('shouldShowOnboarding', () => {
  it('returns true when the flag is unset', () => {
    expect(shouldShowOnboarding(fakeStorage())).toBe(true);
  });

  it('returns false when the flag is set', () => {
    expect(shouldShowOnboarding(fakeStorage({ sb_onboarded: '1' }))).toBe(false);
  });
});

describe('TOUR_STEPS', () => {
  it('has exactly four steps', () => {
    expect(TOUR_STEPS).toHaveLength(4);
  });

  it('every step has a non-empty selector, title, and body', () => {
    for (const step of TOUR_STEPS) {
      expect(step.selector.trim().length).toBeGreaterThan(0);
      expect(step.title.trim().length).toBeGreaterThan(0);
      expect(step.body.trim().length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/onboarding.test.js`
Expected: FAIL — cannot resolve `../src/onboarding.js`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/onboarding.js
const STORAGE_KEY = 'sb_onboarded';

export function shouldShowOnboarding(storage) {
  return !storage.getItem(STORAGE_KEY);
}

export const TOUR_STEPS = [
  {
    selector: '.pillar-card',
    title: 'Layers',
    body: 'Each column is one layer of your track — drums, bass, melody and more.',
    placement: 'right',
  },
  {
    selector: '.pillar-card .pillar-prompt',
    title: 'Describe it',
    body: 'Type a sound or a change here in plain words. The app builds it for you.',
    placement: 'top',
  },
  {
    selector: '.pillar-card .btn-mode',
    title: 'Two modes',
    body: 'GEN makes new sounds. TRX tweaks the feel with one-tap emotion chips.',
    placement: 'bottom',
  },
  {
    selector: '#play-btn',
    title: 'Play',
    body: 'Hit play to hear all your layers together.',
    placement: 'bottom',
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/onboarding.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/onboarding.js tests/onboarding.test.js
git commit -m "feat(onboarding): pure logic — shouldShowOnboarding + TOUR_STEPS"
```

---

### Task 2: Rendering — welcome card, spotlight tour, public entry points

**Files:**
- Modify: `src/onboarding.js`

No unit test (DOM rendering / positioning is untested per project convention — Strudel and UI untested). Verified manually in Task 5.

- [ ] **Step 1: Append the rendering code to `src/onboarding.js`**

Add below the existing exports:

```js
// ── DOM rendering ─────────────────────────────────────────

let teardownFn = null;

function markComplete() {
  try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* storage unavailable */ }
}

function teardown() {
  if (teardownFn) { teardownFn(); teardownFn = null; }
}

// Public: always runs the flow (used for first-run and replay). Idempotent.
export function startOnboarding() {
  teardown();
  renderWelcome();
}

// Public: runs the flow only on first visit.
export function maybeStartOnboarding() {
  if (shouldShowOnboarding(localStorage)) startOnboarding();
}

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html != null) node.innerHTML = html;
  return node;
}

function renderWelcome() {
  const root = el('div', 'ob-root');
  root.innerHTML = `
    <div class="ob-backdrop"></div>
    <div class="ob-card ob-welcome" role="dialog" aria-modal="true">
      <div class="ob-kicker">WELCOME</div>
      <h2 class="ob-title">SEMANTIC BEATS</h2>
      <p class="ob-lead">Build a track by stacking layers — no music skills needed.</p>
      <ol class="ob-moves">
        <li>Pick a layer's sound</li>
        <li>Tweak it by feel or words</li>
        <li>Play</li>
      </ol>
      <div class="ob-actions">
        <button class="ob-btn ob-skip">SKIP</button>
        <button class="ob-btn ob-primary ob-start">TAKE THE TOUR</button>
      </div>
    </div>`;
  document.body.appendChild(root);

  const finish = () => { markComplete(); cleanup(); };
  const cleanup = () => { root.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') finish(); };
  document.addEventListener('keydown', onKey);

  root.querySelector('.ob-skip').addEventListener('click', finish);
  root.querySelector('.ob-start').addEventListener('click', () => { cleanup(); renderTour(); });

  teardownFn = cleanup;
}

function renderTour() {
  const root = el('div', 'ob-root');
  root.innerHTML = `
    <div class="ob-spot"></div>
    <div class="ob-tooltip" role="dialog" aria-modal="true">
      <div class="ob-step-count"></div>
      <div class="ob-step-title"></div>
      <div class="ob-step-body"></div>
      <div class="ob-actions">
        <button class="ob-btn ob-back">BACK</button>
        <button class="ob-btn ob-primary ob-adv"></button>
        <button class="ob-btn ob-skip">SKIP</button>
      </div>
    </div>`;
  document.body.appendChild(root);

  const spot = root.querySelector('.ob-spot');
  const tip = root.querySelector('.ob-tooltip');
  let index = 0;

  const finish = () => { markComplete(); cleanup(); };
  const cleanup = () => {
    root.remove();
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', reposition);
  };
  const onKey = (e) => { if (e.key === 'Escape') finish(); };

  function currentTarget() {
    return document.querySelector(TOUR_STEPS[index].selector);
  }

  function show() {
    // Skip steps whose target is missing; end gracefully if none remain.
    let target = currentTarget();
    while (!target && index < TOUR_STEPS.length - 1) {
      index += 1;
      target = currentTarget();
    }
    if (!target) { finish(); return; }

    const step = TOUR_STEPS[index];
    root.querySelector('.ob-step-count').textContent =
      `${String(index + 1).padStart(2, '0')} / ${String(TOUR_STEPS.length).padStart(2, '0')}`;
    root.querySelector('.ob-step-title').textContent = step.title;
    root.querySelector('.ob-step-body').textContent = step.body;
    root.querySelector('.ob-back').style.visibility = index === 0 ? 'hidden' : 'visible';
    root.querySelector('.ob-adv').textContent = index === TOUR_STEPS.length - 1 ? 'DONE' : 'NEXT';
    reposition();
  }

  function reposition() {
    const target = currentTarget();
    if (!target) return;
    const r = target.getBoundingClientRect();
    const pad = 6;
    spot.style.left = `${r.left - pad}px`;
    spot.style.top = `${r.top - pad}px`;
    spot.style.width = `${r.width + pad * 2}px`;
    spot.style.height = `${r.height + pad * 2}px`;

    // Place tooltip per placement, then clamp into the viewport.
    const gap = 14;
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    const place = TOUR_STEPS[index].placement;
    let left, top;
    if (place === 'right')      { left = r.right + gap;            top = r.top; }
    else if (place === 'top')   { left = r.left;                   top = r.top - th - gap; }
    else /* bottom */           { left = r.left;                   top = r.bottom + gap; }
    const margin = 8;
    left = Math.max(margin, Math.min(left, window.innerWidth - tw - margin));
    top = Math.max(margin, Math.min(top, window.innerHeight - th - margin));
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }

  root.querySelector('.ob-skip').addEventListener('click', finish);
  root.querySelector('.ob-back').addEventListener('click', () => {
    if (index > 0) { index -= 1; show(); }
  });
  root.querySelector('.ob-adv').addEventListener('click', () => {
    if (index >= TOUR_STEPS.length - 1) { finish(); return; }
    index += 1;
    show();
  });
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', reposition);

  teardownFn = cleanup;
  show();
}
```

- [ ] **Step 2: Verify the build still compiles**

Run: `npm run build`
Expected: `✓ built` with no errors.

- [ ] **Step 3: Verify existing tests still pass**

Run: `npx vitest run tests/onboarding.test.js`
Expected: PASS (4 tests — unchanged; new code is untested rendering).

- [ ] **Step 4: Commit**

```bash
git add src/onboarding.js
git commit -m "feat(onboarding): welcome card + spotlight tour rendering"
```

---

### Task 3: Onboarding styles

**Files:**
- Modify: `style.css`

- [ ] **Step 1: Append the onboarding style block to the end of `style.css`**

```css
/* ════════════════════════════════════════════════════════════
   ONBOARDING — welcome card + spotlight tour
   ════════════════════════════════════════════════════════════ */
.ob-root { position: fixed; inset: 0; z-index: 10000; }

.ob-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  animation: msg-in 0.2s ease-out;
}

.ob-card {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(440px, 90vw);
  background: var(--surface);
  border: 1px solid var(--accent);
  box-shadow: var(--glow);
  padding: 1.6rem 1.5rem;
  animation: preview-in 0.28s cubic-bezier(0.2, 0.9, 0.3, 1);
}

.ob-kicker {
  font-family: var(--mono);
  font-size: 0.7rem;
  letter-spacing: 0.2em;
  color: var(--accent);
  margin-bottom: 0.4rem;
}

.ob-title {
  font-family: 'Bebas Neue', Impact, sans-serif;
  font-size: 2.4rem;
  letter-spacing: 0.06em;
  color: var(--text);
  margin-bottom: 0.6rem;
  text-shadow: 0 0 14px rgba(232, 48, 42, 0.4);
}

.ob-lead { color: var(--muted); font-size: 0.9rem; margin-bottom: 1rem; line-height: 1.5; }

.ob-moves { list-style: none; counter-reset: move; margin-bottom: 1.4rem; }
.ob-moves li {
  counter-increment: move;
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  padding: 0.35rem 0;
  font-size: 0.92rem;
  color: var(--text);
}
.ob-moves li::before {
  content: counter(move, decimal-leading-zero);
  font-family: var(--mono);
  font-size: 0.75rem;
  color: var(--accent);
}

.ob-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }

.ob-btn {
  background: transparent;
  color: var(--muted);
  border: 1px solid var(--border);
  padding: 0.4rem 0.9rem;
  font-family: 'Bebas Neue', Impact, sans-serif;
  font-size: 0.85rem;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, box-shadow 0.15s, transform 0.06s;
}
.ob-btn:hover { color: var(--accent); border-color: var(--accent); box-shadow: var(--glow-soft); }
.ob-btn:active { transform: scale(0.94); }
.ob-primary { background: var(--accent); color: #000; border-color: var(--accent); }
.ob-primary:hover { color: #000; box-shadow: var(--glow); }

/* ── Spotlight tour ── */
.ob-spot {
  position: absolute;
  border: 1px solid var(--accent);
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.8), var(--glow);
  pointer-events: none;
  transition: all 0.25s ease;
}

.ob-tooltip {
  position: absolute;
  width: min(300px, 80vw);
  background: var(--surface);
  border: 1px solid var(--accent);
  box-shadow: var(--glow);
  padding: 0.9rem 1rem;
  animation: msg-in 0.2s ease-out;
}
.ob-step-count {
  font-family: var(--mono);
  font-size: 0.7rem;
  letter-spacing: 0.15em;
  color: var(--muted);
  margin-bottom: 0.4rem;
}
.ob-step-title {
  font-family: 'Bebas Neue', Impact, sans-serif;
  font-size: 1.3rem;
  letter-spacing: 0.06em;
  color: var(--accent);
  margin-bottom: 0.3rem;
}
.ob-step-body { font-size: 0.85rem; color: var(--text); line-height: 1.5; margin-bottom: 0.9rem; }

/* ── Header replay button ── */
#help-btn {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--muted);
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 0;
  font-family: var(--mono);
  font-size: 0.9rem;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, box-shadow 0.15s, transform 0.06s;
}
#help-btn:hover { color: var(--accent); border-color: var(--accent); box-shadow: var(--glow-soft); }
#help-btn:active { transform: scale(0.92); }
```

- [ ] **Step 2: Verify the build still compiles**

Run: `npm run build`
Expected: `✓ built` with no errors.

- [ ] **Step 3: Commit**

```bash
git add style.css
git commit -m "style(onboarding): welcome card, spotlight, replay button"
```

---

### Task 4: Header `?` button markup

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add the `?` button to the header**

Find this block:

```html
    <div class="header-right">
      <span id="status">Loading...</span>
      <button id="play-btn">▶ Play</button>
    </div>
```

Replace with:

```html
    <div class="header-right">
      <span id="status">Loading...</span>
      <button id="help-btn" title="Show intro">?</button>
      <button id="play-btn">▶ Play</button>
    </div>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat(onboarding): add header replay button markup"
```

---

### Task 5: Wire onboarding into `app.js`

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Add the import**

Find the existing onboarding-adjacent imports near the top of `app.js` (the block importing from `./src/ui.js`). Immediately after that import block, add:

```js
import { maybeStartOnboarding, startOnboarding } from './src/onboarding.js';
```

- [ ] **Step 2: Wire the header `?` button and the first-run trigger**

Find the end of the pillar mount loop (the `for (const pillar of pillars) { ... }` block that ends with `}` just before the `// ── Init ──` comment). Immediately after that loop's closing `}` and before the `// ── Init ──` comment, add:

```js
// ── Onboarding ────────────────────────────────────────────
const helpBtn = document.getElementById('help-btn');
if (helpBtn) helpBtn.addEventListener('click', () => startOnboarding());
maybeStartOnboarding();
```

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: `✓ built` with no errors.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: all tests pass (156 = 152 prior + 4 onboarding).

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, open the printed URL in a fresh browser profile (or clear `localStorage` first: DevTools console → `localStorage.removeItem('sb_onboarded')`, then reload).

Verify:
- Welcome card appears centered over a dimmed app on load.
- `TAKE THE TOUR` → spotlight highlights, in order: a pillar column → its prompt input → its GEN/TRX button → the header Play button. Tooltip shows `01 / 04` … `04 / 04`; last step button reads `DONE`.
- `BACK` hidden on step 1, works on later steps. `SKIP` and `ESC` close anytime.
- Reload → onboarding does NOT reappear (flag persisted).
- Click header `?` → onboarding replays despite the flag.
- Resize the window mid-tour → spotlight + tooltip track the target.

- [ ] **Step 6: Commit**

```bash
git add app.js
git commit -m "feat(onboarding): wire first-run trigger + replay button"
```

---

## Self-Review Notes

- **Spec coverage:** module + pure fns (Task 1), welcome card + tour + entry points (Task 2), styling (Task 3), header `?` (Tasks 3 CSS + 4 markup + 5 wiring), first-run/replay/persistence (Task 5), tests (Task 1), edge cases — missing target skip + resize reposition + ESC + idempotent `startOnboarding` (Task 2). All covered.
- **Type consistency:** `STORAGE_KEY`, `shouldShowOnboarding`, `TOUR_STEPS`, `startOnboarding`, `maybeStartOnboarding`, `teardownFn` used consistently across tasks. Step shape `{ selector, title, body, placement }` matches the renderer's reads.
- **Placeholders:** none — all code is complete.
