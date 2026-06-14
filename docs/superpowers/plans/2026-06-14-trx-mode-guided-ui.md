# TRX Mode — Guided UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add static suggestion chips to Transformation Mode so non-technical users can apply effects with one click.

**Architecture:** All changes confined to `src/ui.js`. Add a `TRX_CHIPS` constant mapping each pillar to `{ label, prompt }` pairs. `renderPillar` builds a hidden `.pillar-chips` div; `updatePillarMode` shows/hides it. Chip click fires `onSend(chip.prompt)` directly — no LLM changes needed.

**Tech Stack:** Vanilla JS DOM, no framework. UI is not unit-tested per project convention — verify manually in browser via `npm run dev`.

---

### Task 1: Add TRX_CHIPS constant and chip row to renderPillar

**Files:**
- Modify: `src/ui.js`

**Context:** `renderPillar` in `src/ui.js:79` builds the pillar card DOM. Currently: header → codeEl → chatEl → inputRow. We insert a `.pillar-chips` div between chatEl and inputRow, hidden by default (`display:none`). `onSend` is already available in scope (destructured from callbacks at line 79).

- [ ] **Step 1: Add TRX_CHIPS constant after the PILLAR_ICONS block (after line 8)**

Open `src/ui.js`. After the closing `};` of `PILLAR_ICONS` (line 8), insert:

```js
const TRX_CHIPS = {
  drums:           [{ label: '+ reverb',   prompt: 'add reverb'            },
                   { label: '+ glitchy',   prompt: 'make it glitchy'       },
                   { label: '+ darker',    prompt: 'make it darker'        },
                   { label: '+ widen',     prompt: 'widen the stereo'      },
                   { label: '+ crush',     prompt: 'add bit crush'         }],
  bass_percussion: [{ label: '+ darker',   prompt: 'make it darker'        },
                   { label: '+ reverb',    prompt: 'add reverb'            },
                   { label: '+ stutter',   prompt: 'add stutter'           },
                   { label: '+ distort',   prompt: 'add distortion'        },
                   { label: '+ slow down', prompt: 'slow it down'          }],
  melody:          [{ label: '+ reverb',   prompt: 'add reverb'            },
                   { label: '+ echo',      prompt: 'add echo'              },
                   { label: '+ filter',    prompt: 'darken the filter'     },
                   { label: '+ widen',     prompt: 'widen the stereo'      },
                   { label: '+ vowel',     prompt: 'add vowel filter'      }],
  transitions:     [{ label: '+ reverb',   prompt: 'add reverb'            },
                   { label: '+ faster',    prompt: 'speed it up'           },
                   { label: '+ reverse',   prompt: 'reverse the pattern'   },
                   { label: '+ filter',    prompt: 'add high pass filter'  },
                   { label: '+ echo',      prompt: 'add echo'              }],
};
```

- [ ] **Step 2: Build the chip row in renderPillar**

In `renderPillar` (around line 174), after `chatEl.appendChild(vizCanvas);` and before `card.appendChild(header);`, insert:

```js
  const chipsEl = document.createElement('div');
  chipsEl.className = 'pillar-chips';
  chipsEl.style.display = 'none';

  for (const chip of TRX_CHIPS[pillar.name] ?? []) {
    const btn = document.createElement('button');
    btn.className = 'chip-btn';
    btn.textContent = chip.label;
    btn.addEventListener('click', () => {
      btn.disabled = true;
      onSend(chip.prompt).finally(() => { btn.disabled = false; });
    });
    chipsEl.appendChild(btn);
  }
```

- [ ] **Step 3: Append chipsEl to card (between chatEl and inputRow)**

Replace the existing card.appendChild block (lines 176–179):

```js
  card.appendChild(header);
  card.appendChild(codeEl);
  card.appendChild(chatEl);
  card.appendChild(chipsEl);
  card.appendChild(inputRow);
```

- [ ] **Step 4: Commit**

```bash
git add src/ui.js
git commit -m "feat(ui): add TRX_CHIPS constant and chip row to renderPillar"
```

---

### Task 2: Wire chip row visibility into updatePillarMode

**Files:**
- Modify: `src/ui.js`

**Context:** `updatePillarMode` in `src/ui.js:229` already updates the button label and prompt placeholder when mode toggles. We add show/hide of `.pillar-chips` here.

- [ ] **Step 1: Update updatePillarMode to show/hide chips**

Find `updatePillarMode` (around line 229). The current function body ends after setting `prompt.placeholder`. Add chip row toggling so the full function reads:

```js
export function updatePillarMode(name, mode) {
  const card = document.querySelector(`.pillar-card[data-pillar="${name}"]`);
  if (!card) return;
  const btn = card.querySelector('.btn-mode');
  if (!btn) return;
  btn.textContent = mode === 'transformation' ? 'TRX' : 'GEN';
  btn.classList.toggle('active', mode === 'transformation');
  const prompt = card.querySelector('.pillar-prompt');
  if (prompt) {
    prompt.placeholder = mode === 'transformation'
      ? 'add reverb, make it glitchy...'
      : 'describe changes...';
  }
  const chips = card.querySelector('.pillar-chips');
  if (chips) {
    chips.style.display = mode === 'transformation' ? 'flex' : 'none';
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui.js
git commit -m "feat(ui): show chip row in TRX mode, hide in GEN mode"
```

---

### Task 3: Style the chip row

**Files:**
- Modify: `index.html` or whichever CSS file styles pillar cards (check for `<style>` tag in `index.html` or a separate `.css` file)

**Context:** Chips need minimal styling to be usable — flex row, gap, pill shape, red accent on hover. Find where `.pillar-card`, `.pillar-input-row` etc. are styled and add alongside them.

- [ ] **Step 1: Find the CSS location**

```bash
grep -n "pillar-input-row\|pillar-chat\|pillar-card" /Users/marcgusev/Desktop/musicAgent/index.html | head -20
find /Users/marcgusev/Desktop/musicAgent/src -name "*.css" | head -5
```

- [ ] **Step 2: Add chip styles**

Add to the CSS file (or `<style>` block) alongside existing pillar styles:

```css
.pillar-chips {
  display: none;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 10px;
  border-top: 1px solid #1a1a1a;
}

.chip-btn {
  background: #1a1a1a;
  border: 1px solid #333;
  color: #888;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-family: monospace;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.chip-btn:hover {
  border-color: #E8302A;
  color: #E8302A;
}

.chip-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
```

- [ ] **Step 3: Commit**

```bash
git add index.html   # or the CSS file path found in Step 1
git commit -m "feat(ui): style TRX chip buttons"
```

---

### Task 4: Manual verification

**Context:** UI is not unit-tested. Verify in browser.

- [ ] **Step 1: Start dev server**

```bash
npm run dev
# Open http://localhost:5173
```

Also start Ollama if not running:
```bash
OLLAMA_ORIGINS="*" ollama serve
```

- [ ] **Step 2: Verify GEN mode (default)**

- Load the app. All pillars should show `GEN` button.
- Confirm no chip row visible on any pillar card.

- [ ] **Step 3: Switch a pillar to TRX mode**

- Click the `GEN` button on the Drums pillar — it should toggle to `TRX` (red/active).
- Confirm chip row appears: `+ reverb`, `+ glitchy`, `+ darker`, `+ widen`, `+ crush`.
- Confirm input placeholder changes to `"add reverb, make it glitchy..."`.

- [ ] **Step 4: Click a chip**

- Click `+ reverb` on Drums.
- Confirm button briefly disables then re-enables.
- Confirm chat area shows LLM response applying reverb.
- Confirm code display updates with the new transform.

- [ ] **Step 5: Toggle back to GEN**

- Click `TRX` button — should toggle back to `GEN`.
- Confirm chip row disappears.
- Confirm input placeholder reverts to `"describe changes..."`.

- [ ] **Step 6: Commit if any fixes were needed**

```bash
git add -p
git commit -m "fix(ui): <describe what needed fixing>"
```
