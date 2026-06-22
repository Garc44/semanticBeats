# GEN Browse Chips + Cohesion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mode-aware sound-chip browse menu to GEN mode that seeds the prompt, plus tag-based cohesion (visual chip marking + richer LLM context) so generated patterns fit the other playing tracks.

**Architecture:** A new pure module `src/library/cohesion.js` ranks/annotates a pillar's sounds by tag-overlap with patterns active in other pillars. `src/ui.js` renders GEN sound chips vs TRX emotion chips (mode-aware) and marks fitting chips; clicking a GEN chip inserts the pattern name into the prompt. `src/llm.js` enriches the cohesion context with active patterns' names + tags. `app.js` wires it: builds the cross-pillar snapshot, populates chips at mount, and refreshes all GEN chips after every apply.

**Tech Stack:** Vanilla ES modules, Vite, Vitest. No framework.

---

## File Structure

- `src/library/cohesion.js` (new) — pure ranking/annotation. No DOM. One export: `rankSoundsByCohesion`.
- `tests/cohesion.test.js` (new) — unit tests for the above.
- `src/llm.js` (modify) — enrich "Other active channels" block with name + tags.
- `tests/llm.test.js` (modify) — update the existing cohesion-context assertion to the new format.
- `src/ui.js` (modify) — mode-aware chip groups, `setGenChips`, GEN chip → insert-to-prompt.
- `style.css` (modify) — chip group display + `.chip--fits` marker.
- `app.js` (modify) — snapshot helper, mount chip population, `refreshAllGenChips` after every apply + on mode-toggle→GEN.

---

### Task 1: Cohesion ranking module

**Files:**
- Create: `src/library/cohesion.js`
- Test: `tests/cohesion.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/cohesion.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { rankSoundsByCohesion } from '../src/library/cohesion.js';
import { soundLibrary } from '../src/library/soundLibrary.js';

const ids = (ranked) => ranked.map(r => r.pattern.id);

describe('rankSoundsByCohesion', () => {
  it('no other active tracks -> all fits false, original order', () => {
    const ranked = rankSoundsByCohesion('drums', {});
    expect(ranked).toHaveLength(soundLibrary.drums.length);
    expect(ranked.every(r => r.fits === false)).toBe(true);
    expect(ids(ranked)).toEqual(soundLibrary.drums.map(p => p.id));
  });

  it('overlapping tags -> fitting sounds marked and sorted first', () => {
    // bass_acid_squelch tags include "techno"; some drum patterns share "techno".
    const ranked = rankSoundsByCohesion('drums', { bass: 'bass_acid_squelch' });
    const fitting = ranked.filter(r => r.fits);
    expect(fitting.length).toBeGreaterThan(0);
    // basic_kick has the "techno" tag -> must be marked
    expect(fitting.some(r => r.pattern.id === 'basic_kick')).toBe(true);
    // all fitting come before all non-fitting
    const firstNonFit = ranked.findIndex(r => !r.fits);
    const lastFit = ranked.map(r => r.fits).lastIndexOf(true);
    expect(lastFit).toBeLessThan(firstNonFit);
  });

  it('ignores unknown / null ids', () => {
    const ranked = rankSoundsByCohesion('drums', { bass: 'no_such_id', melody: null });
    expect(ranked.every(r => r.fits === false)).toBe(true);
  });

  it('does not count same-pillar selection as "other"', () => {
    const ranked = rankSoundsByCohesion('drums', { drums: 'basic_kick' });
    expect(ranked.every(r => r.fits === false)).toBe(true);
  });

  it('unknown pillar -> empty array', () => {
    expect(rankSoundsByCohesion('nope', { drums: 'basic_kick' })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/cohesion.test.js`
Expected: FAIL — `Failed to resolve import '../src/library/cohesion.js'`.

- [ ] **Step 3: Write the implementation**

Create `src/library/cohesion.js`:

```js
import { soundLibrary, getPatternById } from './soundLibrary.js';

// Rank a pillar's catalog by cohesion with patterns active in OTHER pillars.
// fits = the candidate shares >=1 tag with any pattern currently selected on
// another channel. Fitting sounds sort first; original library order is kept
// within each group. Pure: no DOM, tolerant of null/unknown ids.
export function rankSoundsByCohesion(pillarName, currentTracksState = {}) {
  const catalog = soundLibrary[pillarName] ?? [];
  if (!catalog.length) return [];

  const otherTags = new Set();
  for (const [name, id] of Object.entries(currentTracksState)) {
    if (name === pillarName || !id) continue;
    const pattern = getPatternById(name, id);
    if (!pattern) continue;
    for (const tag of pattern.tags) otherTags.add(tag);
  }

  return catalog
    .map((pattern, i) => ({
      pattern,
      fits: otherTags.size > 0 && pattern.tags.some(t => otherTags.has(t)),
      i,
    }))
    .sort((a, b) => (b.fits - a.fits) || (a.i - b.i))
    .map(({ pattern, fits }) => ({ pattern, fits }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/cohesion.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/library/cohesion.js tests/cohesion.test.js
git commit -m "feat(cohesion): tag-based sound ranking by cross-pillar fit

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Enrich LLM cohesion context with name + tags

**Files:**
- Modify: `src/llm.js:94-97` (the `otherTracks` block)
- Test: `tests/llm.test.js:57-65` (existing cohesion-context test)

`getPatternById` is already imported in `src/llm.js` (line 3).

- [ ] **Step 1: Update the existing test to the new format**

In `tests/llm.test.js`, replace the test currently at lines 57-65:

```js
  it('includes other channels in system prompt as cohesion context', async () => {
    mockFetch(mockPlan());
    const currentTracksState = { drums: 'basic_kick', bass: 'rumble_acid', transitions: null };
    await generateTransformationPlan('melody', 'add synth', currentTracksState);
    const systemText = systemTextOf(global.fetch.mock.calls[0]);
    expect(systemText).toContain('basic_kick');
    expect(systemText).toContain('rumble_acid');
    expect(systemText).not.toContain('melody:');
  });
```

with:

```js
  it('includes other channels (name + tags) in system prompt as cohesion context', async () => {
    mockFetch(mockPlan());
    const currentTracksState = { drums: 'basic_kick', bass: 'rumble_acid', transitions: null };
    await generateTransformationPlan('melody', 'add synth', currentTracksState);
    const systemText = systemTextOf(global.fetch.mock.calls[0]);
    // known id resolves to its display name + tags
    expect(systemText).toContain('Basic Kick');
    expect(systemText).toContain('kick');
    // unknown id falls back to the raw id
    expect(systemText).toContain('rumble_acid');
    // empty channel marked, own channel excluded
    expect(systemText).toContain('(empty)');
    expect(systemText).not.toContain('melody:');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/llm.test.js -t "cohesion context"`
Expected: FAIL — system text contains `basic_kick` (raw id), not `Basic Kick`.

- [ ] **Step 3: Implement the enrichment**

In `src/llm.js`, replace lines 94-97:

```js
    const otherTracks = Object.entries(currentTracksState)
      .filter(([name]) => name !== pillarName)
      .map(([name, id]) => `- ${name}: ${id || '(empty)'}`)
      .join('\n');
```

with:

```js
    const otherTracks = Object.entries(currentTracksState)
      .filter(([name]) => name !== pillarName)
      .map(([name, id]) => {
        if (!id) return `- ${name}: (empty)`;
        const pat = getPatternById(name, id);
        if (!pat) return `- ${name}: ${id}`;
        return `- ${name}: ${pat.name} [${pat.tags.join(', ')}]`;
      })
      .join('\n');
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/llm.test.js`
Expected: PASS (all llm tests, including the updated cohesion test).

- [ ] **Step 5: Commit**

```bash
git add src/llm.js tests/llm.test.js
git commit -m "feat(llm): enrich cohesion context with active pattern names + tags

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Mode-aware chip groups + GEN sound chips in ui.js

**Files:**
- Modify: `src/ui.js` (chip block in `renderPillar` ~lines 207-227; `updatePillarMode` ~lines 292-295; add `setGenChips` export)

UI is not unit-tested in this project (consistent with existing policy). Verification is the build + a manual dev-server check in Task 6.

- [ ] **Step 1: Replace the single emotion-chip block with two mode groups**

In `src/ui.js` `renderPillar`, replace this block (currently ~lines 207-221):

```js
  const chipsEl = document.createElement('div');
  chipsEl.className = 'pillar-chips';
  chipsEl.style.display = 'none';

  for (const recipe of getEmotionsForPillar(pillar.name)) {
    const btn = document.createElement('button');
    btn.className = 'chip-btn';
    btn.textContent = recipe.label;
    if (recipe.description) btn.title = recipe.description;
    btn.addEventListener('click', () => {
      btn.disabled = true;
      Promise.resolve(onEmotion(recipe.id)).finally(() => { btn.disabled = false; });
    });
    chipsEl.appendChild(btn);
  }
```

with:

```js
  // Mode-aware chip row: GEN shows sound chips (populated by setGenChips from
  // app.js so cohesion marks stay live), TRX shows emotion chips.
  const chipsEl = document.createElement('div');
  chipsEl.className = 'pillar-chips';

  const genChips = document.createElement('div');
  genChips.className = 'chips-gen'; // visible by default (mode starts as generation)

  const trxChips = document.createElement('div');
  trxChips.className = 'chips-trx';
  trxChips.style.display = 'none';

  for (const recipe of getEmotionsForPillar(pillar.name)) {
    const btn = document.createElement('button');
    btn.className = 'chip-btn';
    btn.textContent = recipe.label;
    if (recipe.description) btn.title = recipe.description;
    btn.addEventListener('click', () => {
      btn.disabled = true;
      Promise.resolve(onEmotion(recipe.id)).finally(() => { btn.disabled = false; });
    });
    trxChips.appendChild(btn);
  }

  chipsEl.appendChild(genChips);
  chipsEl.appendChild(trxChips);
```

- [ ] **Step 2: Toggle the right group in `updatePillarMode`**

In `src/ui.js` `updatePillarMode`, replace this block (currently ~lines 292-295):

```js
  const chips = card.querySelector('.pillar-chips');
  if (chips) {
    chips.style.display = mode === 'transformation' ? 'flex' : 'none';
  }
```

with:

```js
  const chips = card.querySelector('.pillar-chips');
  if (chips) {
    const gen = chips.querySelector('.chips-gen');
    const trx = chips.querySelector('.chips-trx');
    if (gen) gen.style.display = mode === 'transformation' ? 'none' : 'contents';
    if (trx) trx.style.display = mode === 'transformation' ? 'contents' : 'none';
  }
```

- [ ] **Step 3: Add the `setGenChips` export**

At the end of `src/ui.js`, add:

```js
// Populate a pillar's GEN sound chips from a cohesion-ranked list.
// ranked: [{ pattern, fits }] from rankSoundsByCohesion. Clicking a chip seeds
// the pillar's prompt with the pattern name (LLM still runs on send).
export function setGenChips(pillarName, ranked) {
  const card = document.querySelector(`.pillar-card[data-pillar="${pillarName}"]`);
  if (!card) return;
  const gen = card.querySelector('.chips-gen');
  if (!gen) return;
  gen.innerHTML = '';
  for (const { pattern, fits } of ranked) {
    const btn = document.createElement('button');
    btn.className = 'chip-btn' + (fits ? ' chip--fits' : '');
    btn.textContent = pattern.name;
    btn.title = pattern.tags.join(', ');
    btn.addEventListener('click', () => {
      const input = card.querySelector('.pillar-prompt');
      if (input) { input.value = pattern.name; input.focus(); }
    });
    gen.appendChild(btn);
  }
}
```

- [ ] **Step 4: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds, no syntax errors.

- [ ] **Step 5: Commit**

```bash
git add src/ui.js
git commit -m "feat(ui): mode-aware chip row + GEN sound chips (insert-to-prompt)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Chip styling (groups + fit marker)

**Files:**
- Modify: `style.css` (`.pillar-chips` ~line 348; add group + `.chip--fits` rules)

- [ ] **Step 1: Make the chip row always-on and groups flow inline**

In `style.css`, replace the `.pillar-chips` rule (currently ~lines 348-354):

```css
.pillar-chips {
  display: none;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 10px;
  border-top: 1px solid #1a1a1a;
}
```

with:

```css
.pillar-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 10px;
  border-top: 1px solid #1a1a1a;
}

/* Groups use display:contents so chips flow as direct flex items of the row,
   wrapping naturally; mode toggling swaps which group is contents vs none. */
.chips-gen { display: contents; }
.chips-trx { display: none; }
```

- [ ] **Step 2: Add the `.chip--fits` marker**

In `style.css`, immediately after the `.chip-btn:hover` rule (~line 371), add:

```css
.chip--fits {
  border-color: var(--accent-dim);
  color: #bbb;
}

.chip--fits::before {
  content: '●';
  color: var(--accent);
  font-size: 8px;
  margin-right: 4px;
  vertical-align: middle;
}
```

- [ ] **Step 3: Commit**

```bash
git add style.css
git commit -m "style: chip group layout + cohesion fit marker

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Wire chips + refresh-after-apply in app.js

**Files:**
- Modify: `app.js` (imports; add snapshot helper + `refreshAllGenChips`; mount population; refresh calls in the three apply handlers and mode toggle)

- [ ] **Step 1: Add imports**

In `app.js`, add `setGenChips` to the existing `./src/ui.js` import list (the import block at lines 9-20):

```js
  updatePillarMode,
  setGenChips,
} from './src/ui.js';
```

And add a new import near the other `src/library` imports (after line 8):

```js
import { rankSoundsByCohesion } from './src/library/cohesion.js';
```

- [ ] **Step 2: Add snapshot + refresh helpers**

In `app.js`, immediately after the `pillarModes` definition (after line 26), add:

```js
// Cross-pillar snapshot: { pillarName: selectedId | null }. Used both for the
// LLM cohesion context and for ranking GEN browse chips.
function tracksSnapshot() {
  return Object.fromEntries(pillars.map(p => [p.name, p.selectedId ?? null]));
}

// Recompute every pillar's GEN chips so cohesion marks/order reflect the
// current mix. Cheap; only GEN-mode rows are visible at any time.
function refreshAllGenChips() {
  const snap = tracksSnapshot();
  for (const p of pillars) setGenChips(p.name, rankSoundsByCohesion(p.name, snap));
}
```

- [ ] **Step 3: Reuse the snapshot helper in generation send**

In `app.js` `handlePillarSend`, replace the inline snapshot (currently lines 170-172):

```js
  const currentTracksState = Object.fromEntries(
    pillars.map(p => [p.name, p.selectedId ?? null])
  );
```

with:

```js
  const currentTracksState = tracksSnapshot();
```

- [ ] **Step 4: Refresh after the GEN apply**

In `app.js` `handlePillarSend`, in the generation-mode `addPillarPreviewMessage` apply callback, after `setStatus('Applied');` (currently ~line 209), add:

```js
      refreshAllGenChips();
```

- [ ] **Step 5: Refresh after the TRX apply**

In `app.js` `handlePillarSend`, in the transformation-mode apply callback, after `setStatus('Applied');` (currently ~line 158), add:

```js
      refreshAllGenChips();
```

- [ ] **Step 6: Refresh after the emotion apply**

In `app.js` `handleEmotion`, in the apply callback, after `setStatus('Applied');` (currently ~line 259), add:

```js
      refreshAllGenChips();
```

- [ ] **Step 7: Refresh on mode-toggle → GEN**

In `app.js`, in the `onModeToggle` callback (currently ~lines 323-326), replace:

```js
    onModeToggle: () => {
      pillarModes[pillar.name] = pillarModes[pillar.name] === 'generation' ? 'transformation' : 'generation';
      updatePillarMode(pillar.name, pillarModes[pillar.name]);
    },
```

with:

```js
    onModeToggle: () => {
      pillarModes[pillar.name] = pillarModes[pillar.name] === 'generation' ? 'transformation' : 'generation';
      updatePillarMode(pillar.name, pillarModes[pillar.name]);
      if (pillarModes[pillar.name] === 'generation') {
        setGenChips(pillar.name, rankSoundsByCohesion(pillar.name, tracksSnapshot()));
      }
    },
```

- [ ] **Step 8: Populate GEN chips at mount**

In `app.js`, after the pillar mount loop completes (after the `for (const pillar of pillars) { ... }` loop ends, ~line 348), add:

```js
// Initial GEN chip population (all channels empty -> original order).
refreshAllGenChips();
```

- [ ] **Step 9: Build + full test suite**

Run: `npm run build && npm test`
Expected: build succeeds; all tests pass (existing suite + new cohesion tests + updated llm test).

- [ ] **Step 10: Commit**

```bash
git add app.js
git commit -m "feat(app): wire GEN browse chips + refresh cohesion after every apply

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Manual verification

**Files:** none (manual dev-server check).

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Open http://localhost:5173.

- [ ] **Step 2: Verify GEN chips appear and seed the prompt**

- Each pillar in GEN mode shows a row of sound chips (pattern names).
- Click a chip → its name lands in the prompt input and the input is focused.
- Press send → normal GEN generation runs (LLM picks/compiles), preview shows.

- [ ] **Step 3: Verify mode swap**

- Toggle a pillar to TRX → sound chips hide, emotion chips show.
- Toggle back to GEN → emotion chips hide, sound chips show.

- [ ] **Step 4: Verify cohesion marking + refresh-after-apply**

- Generate + apply a pattern on `drums` (e.g. a "techno" one).
- Open another pillar (e.g. `bass`) in GEN → sounds sharing tags with the
  applied drum pattern show the red dot (`.chip--fits`) and sort to the top.
- Apply something on another channel → confirm the marks/order update across
  pillars without reloading.

- [ ] **Step 5: Done**

No commit (verification only). If any check fails, return to the relevant task.

---

## Notes

- LLM contract unchanged: `generateTransformationPlan` still returns `null` on failure; only the cohesion-context string is richer.
- Cohesion is a binary tag-overlap heuristic (no weighting) — sufficient for the marker.
- `display: contents` on chip groups keeps chips as direct flex children of `.pillar-chips`, so wrapping/gap behave exactly as the current single-row layout.
