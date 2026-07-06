# Generative Strudel Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the pick-a-pattern-by-ID pipeline with a generative one: a local 7B LLM turns loose creative prompts ("glitchy lo-fi hip hop beat with Rhodes chords") into a constrained JSON IR (`LayerSpec`) per pillar, which a deterministic compiler turns into valid Strudel code — with the existing library-selection pipeline demoted to a guaranteed fallback floor.

**Architecture:** Three phases, each independently shippable. Phase 1 adds an intent layer (deterministic lexer + one LLM classification call) and retrieval scoring that improves the *existing* selection flow. Phase 2 builds the deterministic IR foundation (method cards, mini-notation validator, LayerSpec validator, IR compiler, AST validation) with zero LLM involvement. Phase 3 wires generative `LayerSpec` calls with a validate→repair→fallback loop into the app.

**Tech Stack:** Vite SPA, no framework. Vitest. Ollama `/api/chat` with JSON-Schema `format` (local `qwen2.5:7b`). New dep: `acorn` (AST parsing). Existing modules: `src/llm.js`, `src/compiler.js`, `src/validate.js`, `src/pillars.js`, `app.js`.

## Global Constraints

- LLM never outputs raw Strudel code. It outputs JSON only (`IntentSpec`, `LayerSpec`). All code emission is deterministic (compiler).
- Every LLM call goes through `callOllama` with a JSON-Schema `format` (enums + numeric ranges + `additionalProperties: false`), `temperature: 0`, `seed: 42`.
- Every LLM entry point degrades gracefully: returns `null` on any failure, never throws to the UI.
- User must never end up with silence or a crash: generative path falls back to the existing library-selection path, which falls back to an error message (today's behavior).
- Pillar names are `['drums', 'bass', 'percussion', 'melody', 'transitions']` (from `src/pillars.js`). `bass_percussion` is a legacy alias mapped to the `bass` catalog — preserve existing mappings, do not add new uses.
- Aesthetic constraints (dark minimal techno defaults) live in prompts and schema ranges: LPF 200–1200 typical, decay ≤ 0.25, minor/phrygian scales.
- ESM only, no framework, match existing code style (single quotes, no semicolon changes, comment density as-is).
- Tests: vitest, fetch mocked with `vi.fn()` + `ollamaResponse(text)` helper pattern (see `tests/llm.test.js`).
- Commit after every task. Commit messages end with the Co-Authored-By / Claude-Session trailer per harness rules.

## File Structure (end state)

| File | Status | Responsibility |
|---|---|---|
| `src/intent.js` | **new** | Intent vocabulary (genres/keys/scales/textures/mood vocab), deterministic lexer, `generateIntent` LLM call, `buildIntent` orchestrator |
| `src/promptEngine.js` | **new** | Retrieval scoring (`rankPatternsByIntent`), `buildLayerSpecSchema`, `assembleLayerPrompt` |
| `src/library/strudelDocs.js` | **new** | `METHOD_CARDS` (single source of truth for method signatures/ranges), `PILLAR_METHODS`, `SAMPLE_NAMES`, `BANKS`, `SYNTHS`, `PILLAR_KINDS`, `MIN_EVENTS` |
| `src/generate.js` | **new** | `generateLayerSpec` LLM call, `generateTrackWithRepair` orchestrator (validate → repair → fallback) |
| `src/llm.js` | modify | Export `callOllama`; `generateTransformationPlan` accepts optional `intent` (narrows catalog via retrieval) |
| `src/validate.js` | modify | Add `validateMiniNotation`, `countMiniEvents`, `validateLayerSpec`, `validateCodeAst` (acorn) |
| `src/compiler.js` | modify | Export `applyTransforms`; add `compileLayerSpec` |
| `src/pillars.js` | modify | `makePillars` gains `spec: null` field |
| `app.js` | modify | `handlePillarSend` generation mode: buildIntent → generateTrackWithRepair; `recompilePillar` helper so TRX/volume recompiles work on generated tracks |
| `package.json` | modify | Add `acorn` dependency |
| `tests/intent.test.js`, `tests/promptEngine.test.js`, `tests/strudelDocs.test.js`, `tests/generate.test.js` | **new** | Per-module tests |
| `tests/validate.test.js`, `tests/compiler.test.js`, `tests/llm.test.js` | modify | New-export tests |
| `CLAUDE.md` | modify | Document new pipeline (final task) |

---

# Phase 1 — Intent Layer (improves existing selection, zero generative risk)

### Task 0: Checkpoint commit

Working tree has uncommitted changes (`src/llm.js` modified, `STYLEGUIDE.md` untracked). User preference (memory): commit a revert point before risky work.

**Files:** none created.

- [ ] **Step 1: Run tests to confirm green baseline**

Run: `npm test`
Expected: all test files pass (85+ tests). If anything fails, STOP and report — do not start the refactor on a red baseline.

- [ ] **Step 2: Commit checkpoint**

```bash
git add -A
git commit -m "chore: checkpoint before generative pipeline refactor"
```

---

### Task 1: Intent vocabulary + deterministic lexer

**Files:**
- Create: `src/intent.js`
- Test: `tests/intent.test.js`

**Interfaces:**
- Produces (used by Tasks 2, 3, 10):
  - `GENRES: string[]`, `KEYS: string[]`, `SCALES: string[]`, `TEXTURES: string[]`
  - `GENRE_DEFAULT_BPM: Record<string, number>`
  - `moodVocabulary(): string[]` — sorted unique lowercase tags harvested from `soundLibrary`
  - `lexIntent(prompt: string): { bpm: number|null, genre: string|null, textures: string[], layerHints: string[] }` — deterministic, offline, never throws. Lexer-found values are authoritative (they override the LLM later).

- [ ] **Step 1: Write the failing test**

```js
// tests/intent.test.js
import { describe, it, expect } from 'vitest';
import { lexIntent, moodVocabulary, GENRES, KEYS, SCALES, GENRE_DEFAULT_BPM } from '../src/intent.js';

describe('lexIntent', () => {
  it('extracts explicit bpm', () => {
    expect(lexIntent('a beat at 90 bpm').bpm).toBe(90);
    expect(lexIntent('90bpm groove').bpm).toBe(90);
    expect(lexIntent('no tempo here').bpm).toBeNull();
  });

  it('maps genre keywords', () => {
    expect(lexIntent('glitchy lo-fi hip hop beat').genre).toBe('lofi_hiphop');
    expect(lexIntent('dark techno banger').genre).toBe('techno');
    expect(lexIntent('random words').genre).toBeNull();
  });

  it('collects textures', () => {
    expect(lexIntent('glitchy dusty beat').textures).toEqual(expect.arrayContaining(['glitch', 'dusty']));
    expect(lexIntent('plain beat').textures).toEqual([]);
  });

  it('maps instrument nouns to pillar hints', () => {
    expect(lexIntent('rhodes piano chords').layerHints).toContain('melody');
    expect(lexIntent('acid 303 line').layerHints).toContain('bass');
    expect(lexIntent('crunchy hats').layerHints).toContain('percussion');
  });
});

describe('vocabulary', () => {
  it('moodVocabulary is sorted, unique, lowercase, non-empty', () => {
    const vocab = moodVocabulary();
    expect(vocab.length).toBeGreaterThan(20);
    expect(vocab).toEqual([...new Set(vocab)].sort());
    expect(vocab.every(t => t === t.toLowerCase())).toBe(true);
  });

  it('every genre has a default bpm', () => {
    for (const g of GENRES) expect(GENRE_DEFAULT_BPM[g]).toBeGreaterThan(50);
  });

  it('keys and scales are Strudel-compatible', () => {
    expect(KEYS).toContain('F#');
    expect(SCALES).toContain('phrygian');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/intent.test.js`
Expected: FAIL — `Cannot find module '../src/intent.js'`

- [ ] **Step 3: Write the implementation**

```js
// src/intent.js
import { soundLibrary } from './library/soundLibrary.js';

// — Controlled vocabularies. These feed both the lexer and the LLM JSON schema, so
//   intent vocabulary and retrieval vocabulary (library tags) stay one space. —
export const GENRES = ['techno', 'house', 'lofi_hiphop', 'ambient', 'industrial', 'trance', 'dub', 'minimal'];
export const KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'A#', 'C#', 'D#', 'F#', 'G#'];
export const SCALES = ['minor', 'phrygian', 'dorian'];
export const TEXTURES = ['glitch', 'dusty', 'warm', 'metallic', 'airy', 'driving', 'hypnotic'];

export const GENRE_DEFAULT_BPM = {
  techno: 130, house: 124, lofi_hiphop: 82, ambient: 70,
  industrial: 135, trance: 138, dub: 75, minimal: 126,
};

// Harvest the library's tags — the retrieval scorer matches intent moods against these.
export function moodVocabulary() {
  const tags = new Set();
  for (const patterns of Object.values(soundLibrary))
    for (const p of patterns)
      for (const t of p.tags) tags.add(t.toLowerCase());
  return [...tags].sort();
}

const GENRE_LEXICON = {
  'lo-fi': 'lofi_hiphop', 'lofi': 'lofi_hiphop', 'lo fi': 'lofi_hiphop',
  'hip hop': 'lofi_hiphop', 'hip-hop': 'lofi_hiphop', 'hiphop': 'lofi_hiphop',
  'techno': 'techno', 'house': 'house', 'ambient': 'ambient',
  'industrial': 'industrial', 'trance': 'trance', 'dub': 'dub', 'minimal': 'minimal',
};

const TEXTURE_LEXICON = {
  'glitchy': 'glitch', 'glitch': 'glitch', 'broken': 'glitch', 'stutter': 'glitch',
  'dusty': 'dusty', 'vinyl': 'dusty', 'tape': 'dusty', 'crackle': 'dusty',
  'warm': 'warm', 'analog': 'warm', 'mellow': 'warm',
  'metallic': 'metallic', 'iron': 'metallic', 'clang': 'metallic',
  'airy': 'airy', 'light': 'airy', 'breathy': 'airy',
  'driving': 'driving', 'pumping': 'driving', 'relentless': 'driving',
  'hypnotic': 'hypnotic', 'trippy': 'hypnotic', 'rolling': 'hypnotic',
};

const INSTRUMENT_LEXICON = {
  'rhodes': 'melody', 'piano': 'melody', 'keys': 'melody', 'chord': 'melody',
  'synth': 'melody', 'lead': 'melody', 'arp': 'transitions', 'sweep': 'transitions',
  '303': 'bass', 'acid': 'bass', 'sub': 'bass', 'bass': 'bass',
  'kick': 'drums', 'drum': 'drums', 'beat': 'drums',
  'hat': 'percussion', 'hats': 'percussion', 'clap': 'percussion',
  'shaker': 'percussion', 'rim': 'percussion', 'ride': 'percussion',
};

// Deterministic pre-parse. Anything found here is LOCKED — buildIntent lets these
// values override whatever the LLM classifier says.
export function lexIntent(prompt) {
  const text = String(prompt).toLowerCase();

  const bpmMatch = text.match(/(\d{2,3})\s*bpm/);
  const bpm = bpmMatch ? parseInt(bpmMatch[1], 10) : null;

  let genre = null;
  for (const [kw, g] of Object.entries(GENRE_LEXICON)) {
    if (text.includes(kw)) { genre = g; break; }
  }

  const textures = [...new Set(
    Object.entries(TEXTURE_LEXICON).filter(([kw]) => text.includes(kw)).map(([, t]) => t)
  )];

  const layerHints = [...new Set(
    Object.entries(INSTRUMENT_LEXICON)
      .filter(([kw]) => new RegExp(`\\b${kw}\\b`).test(text))
      .map(([, pillar]) => pillar)
  )];

  return { bpm, genre, textures, layerHints };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/intent.test.js`
Expected: PASS (7 tests)

- [ ] **Step 5: Run full suite, then commit**

Run: `npm test` — expected all green.

```bash
git add src/intent.js tests/intent.test.js
git commit -m "feat(intent): vocabulary + deterministic prompt lexer"
```

---

### Task 2: LLM intent classifier + buildIntent orchestrator

**Files:**
- Modify: `src/llm.js` (export `callOllama` — one-word change on line 22)
- Modify: `src/intent.js` (append `buildIntentSchema`, `generateIntent`, `buildIntent`, `DEFAULT_INTENT`)
- Test: `tests/intent.test.js` (append)

**Interfaces:**
- Consumes: `callOllama(systemPrompt, userPrompt, { schema })` from `src/llm.js` (now exported).
- Produces (used by Tasks 3, 4, 10, 12, 13):
  - `IntentSpec` shape: `{ genre, bpm, key, scale, energy, moods: string[], textures: string[], layers: [{ pillar, character }] }` — all fields always present after `buildIntent`.
  - `generateIntent(prompt): Promise<object|null>` — raw LLM classification, `null` on any failure.
  - `buildIntent(prompt): Promise<IntentSpec>` — total function, never null: lexer → LLM → merge (lexer wins) → defaults fill gaps.

- [ ] **Step 1: Write the failing tests**

Append to `tests/intent.test.js`:

```js
import { vi, beforeEach } from 'vitest';
import { buildIntent, generateIntent } from '../src/intent.js';

function ollamaResponse(text) {
  return { ok: true, json: async () => ({ message: { content: text } }) };
}

function mockIntentFetch(intent) {
  global.fetch = vi.fn().mockResolvedValue(ollamaResponse(JSON.stringify(intent)));
}

const LLM_INTENT = {
  genre: 'techno', bpm: 130, key: 'A', scale: 'minor', energy: 'mid',
  moods: ['dark', 'hypnotic'], textures: [], layers: [{ pillar: 'drums', character: 'four on the floor' }],
};

describe('generateIntent', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns parsed intent on valid response', async () => {
    mockIntentFetch(LLM_INTENT);
    const result = await generateIntent('dark hypnotic techno');
    expect(result.genre).toBe('techno');
    expect(result.moods).toContain('dark');
  });

  it('returns null on HTTP error', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    expect(await generateIntent('anything')).toBeNull();
  });

  it('sends a JSON schema with genre enum in format', async () => {
    mockIntentFetch(LLM_INTENT);
    await generateIntent('techno');
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.format.properties.genre.enum).toContain('lofi_hiphop');
    expect(body.format.additionalProperties).toBe(false);
  });
});

describe('buildIntent', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('lexer-locked genre overrides LLM genre', async () => {
    mockIntentFetch(LLM_INTENT); // LLM says techno
    const intent = await buildIntent('lo-fi hip hop with rhodes'); // lexer says lofi
    expect(intent.genre).toBe('lofi_hiphop');
  });

  it('explicit bpm overrides everything', async () => {
    mockIntentFetch(LLM_INTENT);
    const intent = await buildIntent('techno at 90 bpm');
    expect(intent.bpm).toBe(90);
  });

  it('survives total LLM failure with lexer + defaults', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('down'));
    const intent = await buildIntent('glitchy lo-fi hip hop');
    expect(intent.genre).toBe('lofi_hiphop');
    expect(intent.bpm).toBe(82);          // genre default
    expect(intent.key).toBeTruthy();       // default fills
    expect(intent.textures).toContain('glitch');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/intent.test.js`
Expected: FAIL — `generateIntent` / `buildIntent` not exported.

- [ ] **Step 3: Export `callOllama` from llm.js**

In `src/llm.js` line 22, change:

```js
async function callOllama(systemPrompt, userPrompt, { schema = null } = {}) {
```

to:

```js
export async function callOllama(systemPrompt, userPrompt, { schema = null } = {}) {
```

- [ ] **Step 4: Append implementation to `src/intent.js`**

```js
import { callOllama } from './llm.js';
import { PILLAR_NAMES } from './pillars.js';

export const DEFAULT_INTENT = {
  genre: 'techno', bpm: null, key: 'A', scale: 'minor', energy: 'mid',
  moods: ['dark', 'minimal'], textures: [], layers: [],
};

function buildIntentSchema() {
  return {
    type: 'object',
    properties: {
      genre: { type: 'string', enum: GENRES },
      bpm: { type: 'integer', minimum: 60, maximum: 200 },
      key: { type: 'string', enum: KEYS },
      scale: { type: 'string', enum: SCALES },
      energy: { type: 'string', enum: ['low', 'mid', 'high'] },
      moods: { type: 'array', items: { type: 'string', enum: moodVocabulary() }, maxItems: 5 },
      textures: { type: 'array', items: { type: 'string', enum: TEXTURES }, maxItems: 3 },
      layers: {
        type: 'array', maxItems: 5,
        items: {
          type: 'object',
          properties: {
            pillar: { type: 'string', enum: PILLAR_NAMES },
            character: { type: 'string' },
          },
          required: ['pillar', 'character'],
          additionalProperties: false,
        },
      },
    },
    required: ['genre', 'key', 'scale', 'energy', 'moods'],
    additionalProperties: false,
  };
}

// One classification call. Small local models are good at this; keep it to
// classification only — no code, no notation, just controlled-vocabulary JSON.
export async function generateIntent(prompt) {
  try {
    const systemPrompt = `You are a music producer's assistant. Classify the user's request into a musical intent object.

Rules:
- genre/key/scale/energy/moods: pick the closest match from the allowed values.
- bpm: only set if the user implies a tempo; otherwise omit.
- layers: one entry per musical part the user asked for (drums, bass, percussion, melody, transitions). character = one short phrase describing that part.
- Output ONLY the JSON object.

Examples:
"glitchy lo-fi hip hop beat with rhodes chords" -> {"genre":"lofi_hiphop","key":"A","scale":"minor","energy":"low","moods":["warm","minimal"],"textures":["glitch","dusty"],"layers":[{"pillar":"drums","character":"loose swung boom-bap"},{"pillar":"melody","character":"warm rhodes 7th chords"}]}
"dark driving techno" -> {"genre":"techno","key":"D","scale":"phrygian","energy":"high","moods":["dark","driving"],"textures":["driving"],"layers":[{"pillar":"drums","character":"pounding four on the floor"},{"pillar":"bass","character":"rolling dark bassline"}]}`;

    const cleaned = await callOllama(systemPrompt, prompt, { schema: buildIntentSchema() });
    const intent = JSON.parse(cleaned);
    if (!intent || typeof intent !== 'object') return null;
    return intent;
  } catch {
    return null;
  }
}

// Drop null/empty values so spreading doesn't clobber earlier layers.
function compact(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) =>
    v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0)));
}

// Total function: defaults ← LLM ← lexer (rightmost wins). Never returns null.
export async function buildIntent(prompt) {
  const lexed = lexIntent(prompt);
  const llm = await generateIntent(prompt);
  const intent = { ...DEFAULT_INTENT, ...compact(llm ?? {}), ...compact({ bpm: lexed.bpm, genre: lexed.genre, textures: lexed.textures }) };
  if (!intent.bpm) intent.bpm = GENRE_DEFAULT_BPM[intent.genre] ?? 126;
  // Ensure lexer's instrument hints are represented as layers.
  const covered = new Set(intent.layers.map(l => l.pillar));
  for (const pillar of lexed.layerHints) {
    if (!covered.has(pillar)) intent.layers.push({ pillar, character: prompt });
  }
  return intent;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/intent.test.js`
Expected: PASS (13 tests)

- [ ] **Step 6: Full suite + commit**

Run: `npm test` — all green (confirms exporting `callOllama` broke nothing).

```bash
git add src/intent.js src/llm.js tests/intent.test.js
git commit -m "feat(intent): LLM classifier + buildIntent orchestrator (lexer wins)"
```

---

### Task 3: Retrieval scoring — rankPatternsByIntent

**Files:**
- Create: `src/promptEngine.js`
- Test: `tests/promptEngine.test.js`

**Interfaces:**
- Consumes: `IntentSpec` (Task 2), `soundLibrary` / `getPatternById`.
- Produces (used by Tasks 4, 10): `rankPatternsByIntent(pillarName, intent): Array<{ pattern, score }>` sorted score-desc. Handles `bass_percussion` legacy alias. Never throws, empty array for unknown pillar.

- [ ] **Step 1: Write the failing test**

```js
// tests/promptEngine.test.js
import { describe, it, expect } from 'vitest';
import { rankPatternsByIntent } from '../src/promptEngine.js';

const intent = (over = {}) => ({
  genre: 'techno', bpm: 130, key: 'A', scale: 'minor', energy: 'mid',
  moods: ['dark', 'minimal'], textures: ['hypnotic'], layers: [], ...over,
});

describe('rankPatternsByIntent', () => {
  it('returns full catalog, sorted by score descending', () => {
    const ranked = rankPatternsByIntent('drums', intent());
    expect(ranked.length).toBeGreaterThan(5);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
    }
  });

  it('genre tag match outranks single mood match', () => {
    const ranked = rankPatternsByIntent('drums', intent({ moods: [], textures: [] }));
    // every drums pattern tagged "techno" must outrank untagged ones
    const top = ranked[0].pattern;
    expect(top.tags.map(t => t.toLowerCase())).toContain('techno');
  });

  it('mood tags contribute to score', () => {
    const dark = rankPatternsByIntent('bass', intent({ genre: 'ambient', moods: ['dark'], textures: [] }));
    const scored = dark.find(r => r.pattern.tags.includes('dark'));
    expect(scored.score).toBeGreaterThan(0);
  });

  it('maps bass_percussion alias to bass catalog', () => {
    const ranked = rankPatternsByIntent('bass_percussion', intent());
    expect(ranked[0].pattern.id.startsWith('bass')).toBe(true);
  });

  it('unknown pillar returns empty array', () => {
    expect(rankPatternsByIntent('nope', intent())).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/promptEngine.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```js
// src/promptEngine.js
import { soundLibrary } from './library/soundLibrary.js';

// Lexical retrieval over the pattern library. 58 patterns — tag overlap beats
// embeddings at this scale. Genre hit counts double; mood/texture hits count once.
export function rankPatternsByIntent(pillarName, intent) {
  const catalogKey = pillarName === 'bass_percussion' ? 'bass' : pillarName;
  const catalog = soundLibrary[catalogKey] ?? [];
  const wanted = new Set(
    [...(intent.moods ?? []), ...(intent.textures ?? [])].map(s => s.toLowerCase())
  );
  const genre = (intent.genre ?? '').toLowerCase();

  return catalog
    .map(pattern => {
      let score = 0;
      for (const tag of pattern.tags) {
        const t = tag.toLowerCase();
        if (t === genre) score += 2;
        else if (wanted.has(t)) score += 1;
      }
      return { pattern, score };
    })
    .sort((a, b) => b.score - a.score);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/promptEngine.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/promptEngine.js tests/promptEngine.test.js
git commit -m "feat(retrieval): tag-overlap pattern ranking by intent"
```

---

### Task 4: Wire intent into the existing selection flow

**Files:**
- Modify: `src/llm.js` (`generateTransformationPlan` — add optional `intent` param)
- Modify: `app.js` (`handlePillarSend` generation branch, ~line 191)
- Test: `tests/llm.test.js` (append)

**Interfaces:**
- Consumes: `buildIntent` (Task 2), `rankPatternsByIntent` (Task 3).
- Produces: `generateTransformationPlan(pillarName, userPrompt, currentTracksState, intent = null)` — with intent: catalog narrowed to top-8 retrieved patterns, intent summary appended to system prompt. Without intent: behavior unchanged (all existing tests must stay green).

- [ ] **Step 1: Write the failing tests**

Append to `tests/llm.test.js` inside `describe('generateTransformationPlan')`:

```js
  const testIntent = {
    genre: 'techno', bpm: 130, key: 'A', scale: 'minor', energy: 'mid',
    moods: ['dark', 'minimal'], textures: [], layers: [],
  };

  it('with intent: narrows catalog to top-8 retrieved patterns', async () => {
    mockFetch(mockPlan());
    await generateTransformationPlan('bass', 'dark bass', {}, testIntent);
    const systemText = systemTextOf(global.fetch.mock.calls[0]);
    const idCount = (systemText.match(/"id":/g) ?? []).length;
    expect(idCount).toBeLessThanOrEqual(8);
  });

  it('with intent: includes intent summary in system prompt', async () => {
    mockFetch(mockPlan());
    await generateTransformationPlan('bass', 'dark bass', {}, testIntent);
    expect(systemTextOf(global.fetch.mock.calls[0])).toContain('"genre":"techno"');
  });

  it('with intent: schema enum only contains narrowed ids', async () => {
    mockFetch(mockPlan());
    await generateTransformationPlan('bass', 'dark bass', {}, testIntent);
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.format.properties.selectedId.enum.length).toBeLessThanOrEqual(8);
  });

  it('without intent: full catalog (back-compat)', async () => {
    mockFetch(mockPlan());
    await generateTransformationPlan('bass', 'dark bass', {});
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.format.properties.selectedId.enum.length).toBeGreaterThan(8);
  });
```

- [ ] **Step 2: Run tests to verify new ones fail**

Run: `npx vitest run tests/llm.test.js`
Expected: 4 new tests FAIL, existing ones PASS.

- [ ] **Step 3: Modify `generateTransformationPlan` in `src/llm.js`**

Add import at top of `src/llm.js`:

```js
import { rankPatternsByIntent } from './promptEngine.js';
```

Change the function head and catalog lines (currently lines 89–92):

```js
export async function generateTransformationPlan(pillarName, userPrompt, currentTracksState = {}, intent = null) {
  try {
    const fullCatalog = soundLibrary[pillarName] ?? [];
    const catalog = intent
      ? rankPatternsByIntent(pillarName, intent).slice(0, 8).map(r => r.pattern)
      : fullCatalog;
    const catalogSummary = catalog.map(p => ({ id: p.id, name: p.name, tags: p.tags }));
```

Then inside the same function, after the `Catalog (choose selectedId from these only):` block in the system prompt template, add an intent line. Replace the closing of the template's context section so the prompt includes:

```js
    const intentBlock = intent ? `\nDistilled musical intent for this request:\n${JSON.stringify(intent)}\n` : '';
```

and insert `${intentBlock}` into the template string directly after the catalog JSON block (before `Rules:`).

Also update the validation line 129 to check against the *narrowed* catalog (it already uses `catalog`, so no change needed — verify this when editing).

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/llm.test.js`
Expected: PASS (all, including the 4 new).

- [ ] **Step 5: Wire into `app.js`**

In `app.js`, add import:

```js
import { buildIntent } from './src/intent.js';
```

In `handlePillarSend`, replace the generation-mode block (currently lines 191–193):

```js
  // generation mode (existing flow)
  const currentTracksState = tracksSnapshot();

  const plan = await generateTransformationPlan(pillarName, prompt, currentTracksState);
```

with:

```js
  // generation mode: distill intent first (lexer + one classification call),
  // then let the selection LLM choose from a retrieval-narrowed catalog.
  const currentTracksState = tracksSnapshot();

  const intent = await buildIntent(prompt);
  const plan = await generateTransformationPlan(pillarName, prompt, currentTracksState, intent);
```

- [ ] **Step 6: Full suite + manual smoke test**

Run: `npm test` — all green.
Run: `npm run dev`, open http://localhost:5173 with Ollama running, type "dark hypnotic techno kick" into the drums pillar. Expected: preview card appears with a dark-tagged kick pattern. (If Ollama is not running, expected: error message, no crash.)

- [ ] **Step 7: Commit — Phase 1 complete, shippable**

```bash
git add src/llm.js app.js tests/llm.test.js
git commit -m "feat(intent): wire intent + retrieval narrowing into selection flow"
```

---

# Phase 2 — IR Foundation (deterministic, no LLM)

### Task 5: Method cards + generation vocabulary

**Files:**
- Create: `src/library/strudelDocs.js`
- Test: `tests/strudelDocs.test.js`

**Interfaces:**
- Produces (used by Tasks 6–12):
  - `METHOD_CARDS: Record<methodName, { sig, type: 'numeric'|'enum', min?, max?, values?, note, ex }>` — keys are literal Strudel method names.
  - `PILLAR_METHODS: Record<pillarName, methodName[]>` — which effects each pillar's LayerSpec may use (includes `bass_percussion` alias).
  - `PILLAR_KINDS: Record<pillarName, ('sample'|'note')[]>`
  - `SAMPLE_NAMES: string[]`, `BANKS: string[]`, `SYNTHS: string[]`, `MIN_EVENTS: Record<pillarName, number>`

- [ ] **Step 1: Write the failing test**

```js
// tests/strudelDocs.test.js
import { describe, it, expect } from 'vitest';
import { METHOD_CARDS, PILLAR_METHODS, PILLAR_KINDS, SAMPLE_NAMES, BANKS, SYNTHS, MIN_EVENTS } from '../src/library/strudelDocs.js';
import { PILLAR_NAMES } from '../src/pillars.js';

describe('METHOD_CARDS', () => {
  it('every numeric card has min < max and an example', () => {
    for (const [name, card] of Object.entries(METHOD_CARDS)) {
      expect(card.sig, name).toBeTruthy();
      expect(card.note, name).toBeTruthy();
      if (card.type === 'numeric') expect(card.min, name).toBeLessThan(card.max);
      if (card.type === 'enum') expect(card.values.length, name).toBeGreaterThan(0);
    }
  });
});

describe('PILLAR_METHODS / PILLAR_KINDS', () => {
  it('covers every pillar', () => {
    for (const p of PILLAR_NAMES) {
      expect(PILLAR_METHODS[p], p).toBeDefined();
      expect(PILLAR_KINDS[p], p).toBeDefined();
      expect(MIN_EVENTS[p], p).toBeGreaterThanOrEqual(1);
    }
  });

  it('every pillar method id exists in METHOD_CARDS', () => {
    for (const [pillar, ids] of Object.entries(PILLAR_METHODS))
      for (const id of ids) expect(METHOD_CARDS[id], `${pillar}:${id}`).toBeDefined();
  });

  it('drums and percussion are sample-only; bass/melody/transitions note-only', () => {
    expect(PILLAR_KINDS.drums).toEqual(['sample']);
    expect(PILLAR_KINDS.percussion).toEqual(['sample']);
    expect(PILLAR_KINDS.bass).toEqual(['note']);
    expect(PILLAR_KINDS.melody).toEqual(['note']);
    expect(PILLAR_KINDS.transitions).toEqual(['note']);
  });

  it('vocab includes samples/banks/synths actually used in the library', () => {
    for (const s of ['bd', 'hh', 'oh', 'cp', 'rim', 'ride', 'clubkick']) expect(SAMPLE_NAMES).toContain(s);
    expect(BANKS).toContain('RolandTR909');
    for (const s of ['sine', 'square', 'triangle', 'saw', 'sawtooth']) expect(SYNTHS).toContain(s);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/strudelDocs.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```js
// src/library/strudelDocs.js
// Single source of truth for what the generative pipeline may emit.
// Feeds: (a) LayerSpec JSON schema ranges, (b) prompt method-card injection,
// (c) AST argument-range validation, (d) the IR compiler's effect ordering.

export const METHOD_CARDS = {
  // — envelope —
  decay:     { sig: '(seconds)', type: 'numeric', min: 0.03, max: 0.4, note: 'shorter = punchier; keep under 0.2 for minimal styles', ex: '.decay(0.08)' },
  sustain:   { sig: '(level)',   type: 'numeric', min: 0,    max: 0.3, note: 'sustain level after decay', ex: '.sustain(0.05)' },
  attack:    { sig: '(seconds)', type: 'numeric', min: 0,    max: 0.1, note: 'soften the hit onset', ex: '.attack(0.02)' },
  // — timbre —
  crush:     { sig: '(bits)',    type: 'numeric', min: 2,    max: 16,  note: 'bit crush, INVERTED: lower = heavier lo-fi', ex: '.crush(6)' },
  coarse:    { sig: '(factor)',  type: 'numeric', min: 1,    max: 32,  note: 'sample-rate crush — robotic/8-bit', ex: '.coarse(8)' },
  shape:     { sig: '(amount)',  type: 'numeric', min: 0,    max: 0.7, note: 'warm saturation; 0.2 subtle, 0.6 thick', ex: '.shape(0.3)' },
  distort:   { sig: '(amount)',  type: 'numeric', min: 0,    max: 0.8, note: 'hard clipping — harsh/aggressive', ex: '.distort(0.4)' },
  vowel:     { sig: '("a".."u")',type: 'enum', values: ['a', 'e', 'i', 'o', 'u'], note: 'formant filter — vocal character', ex: '.vowel("a")' },
  // — filter —
  lpf:       { sig: '(hz)',      type: 'numeric', min: 100,  max: 5000, note: '200–800 dark, >1200 bright — stay dark', ex: '.lpf(600)' },
  lpq:       { sig: '(q)',       type: 'numeric', min: 0,    max: 30,   note: 'resonance; use WITH lpf; ~5 mild, ~20 acid scream', ex: '.lpq(8)' },
  hpf:       { sig: '(hz)',      type: 'numeric', min: 100,  max: 8000, note: 'thin/airy; hats live above 2000', ex: '.hpf(3000)' },
  // — rhythm/structure —
  degradeBy: { sig: '(prob)',    type: 'numeric', min: 0,    max: 0.7, note: 'random dropout — glitch feel', ex: '.degradeBy(0.3)' },
  ply:       { sig: '(n)',       type: 'numeric', min: 2,    max: 4,   note: 'repeat each hit — rolls/stutters', ex: '.ply(2)' },
  iter:      { sig: '(n)',       type: 'numeric', min: 2,    max: 8,   note: 'rotate pattern start each cycle — evolving', ex: '.iter(4)' },
  // — space/stereo —
  pan:       { sig: '(0..1)',    type: 'numeric', min: 0,    max: 1,   note: '0 left, 1 right', ex: '.pan(0.3)' },
  room:      { sig: '(wet)',     type: 'numeric', min: 0,    max: 1,   note: 'reverb send; 0.3–0.7 for depth', ex: '.room(0.5)' },
  size:      { sig: '(size)',    type: 'numeric', min: 0.1,  max: 10,  note: 'reverb decay length; use WITH room', ex: '.size(0.8)' },
  delay:     { sig: '(wet)',     type: 'numeric', min: 0,    max: 0.9, note: 'delay send', ex: '.delay(0.5)' },
  delaytime: { sig: '(seconds)', type: 'numeric', min: 0.05, max: 1,   note: '0.375 = dotted 8th at 120bpm', ex: '.delaytime(0.375)' },
};

export const PILLAR_METHODS = {
  drums:       ['shape', 'crush', 'distort', 'room', 'size', 'lpf', 'hpf'],
  bass:        ['lpf', 'lpq', 'decay', 'sustain', 'shape', 'distort', 'crush', 'room', 'delay'],
  percussion:  ['crush', 'distort', 'room', 'degradeBy', 'iter', 'ply', 'lpf', 'hpf', 'pan'],
  melody:      ['lpf', 'lpq', 'hpf', 'room', 'size', 'delay', 'delaytime', 'vowel', 'shape', 'degradeBy', 'decay', 'sustain', 'attack', 'pan'],
  transitions: ['lpf', 'hpf', 'room', 'size', 'delay', 'delaytime', 'decay', 'pan', 'iter'],
};
PILLAR_METHODS.bass_percussion = PILLAR_METHODS.bass; // legacy alias

export const PILLAR_KINDS = {
  drums: ['sample'], percussion: ['sample'],
  bass: ['note'], melody: ['note'], transitions: ['note'],
};
PILLAR_KINDS.bass_percussion = PILLAR_KINDS.bass;

// Minimum non-rest events per cycle so generated layers can't be silent.
export const MIN_EVENTS = { drums: 2, bass: 2, percussion: 2, melody: 2, transitions: 1 };
MIN_EVENTS.bass_percussion = MIN_EVENTS.bass;

export const SAMPLE_NAMES = ['bd', 'sd', 'cp', 'hh', 'oh', 'rim', 'click', 'ride', 'lt', 'mt', 'ht', 'clubkick'];
export const BANKS = ['RolandTR909', 'RolandTR808'];
export const SYNTHS = ['sine', 'square', 'triangle', 'saw', 'sawtooth'];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/strudelDocs.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/library/strudelDocs.js tests/strudelDocs.test.js
git commit -m "feat(docs): METHOD_CARDS + generation vocabulary (single source of truth)"
```

---

### Task 6: Mini-notation validator + event counter

**Files:**
- Modify: `src/validate.js`
- Test: `tests/validate.test.js` (append)

**Interfaces:**
- Consumes: `SAMPLE_NAMES` (Task 5).
- Produces (used by Task 7):
  - `validateMiniNotation(mini: string, kind: 'sample'|'note'): { valid, errors }`
  - `countMiniEvents(mini: string): number` — non-rest atom count (approximation: ignores `*N` multipliers and euclid expansion; documented).

- [ ] **Step 1: Write the failing tests**

Append to `tests/validate.test.js`:

```js
import { validateMiniNotation, countMiniEvents } from '../src/validate.js';

describe('validateMiniNotation', () => {
  it('accepts valid sample notation', () => {
    expect(validateMiniNotation('bd ~ [~ bd] bd*2', 'sample').valid).toBe(true);
    expect(validateMiniNotation('bd(3,8)', 'sample').valid).toBe(true);
    expect(validateMiniNotation('hh*8 <oh hh>', 'sample').valid).toBe(true);
  });

  it('accepts valid note notation including chords', () => {
    expect(validateMiniNotation('c2 [~ eb2] c2 [g1 bb1]', 'note').valid).toBe(true);
    expect(validateMiniNotation('[c2,eb2,g2] ~ ~ ~', 'note').valid).toBe(true);
    expect(validateMiniNotation('fs4 ~ cs5 ~', 'note').valid).toBe(true);
  });

  it('rejects unknown samples', () => {
    const r = validateMiniNotation('bd kaboom bd', 'sample');
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('kaboom');
  });

  it('rejects malformed notes', () => {
    expect(validateMiniNotation('c2 h9 x', 'note').valid).toBe(false);
  });

  it('rejects unbalanced brackets and empty input', () => {
    expect(validateMiniNotation('bd [bd bd', 'sample').valid).toBe(false);
    expect(validateMiniNotation('   ', 'sample').valid).toBe(false);
  });

  it('rejects code-injection characters', () => {
    expect(validateMiniNotation('bd").gain(9)//', 'sample').valid).toBe(false);
  });
});

describe('countMiniEvents', () => {
  it('counts non-rest atoms', () => {
    expect(countMiniEvents('bd ~ bd ~')).toBe(2);
    expect(countMiniEvents('~ ~ ~ ~')).toBe(0);
    expect(countMiniEvents('[c2,eb2,g2] ~')).toBe(3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/validate.test.js`
Expected: new tests FAIL (not exported), existing PASS.

- [ ] **Step 3: Append implementation to `src/validate.js`**

```js
import { SAMPLE_NAMES } from './library/strudelDocs.js';

// Everything mini-notation may contain. Anything outside this set is treated as
// injection/hallucination — the mininotation string is the ONLY free-text field
// the LLM controls, so this charset is the security boundary.
const MININOTATION_CHARSET = /^[a-zA-Z0-9\s~\[\]<>(),*/!@.|-]*$/;
const NOTE_RE = /^[a-g](?:s|b)?\d$/;

// Split notation into atoms by stripping structural syntax. `bd*4` → ['bd','4'];
// bare numbers are structural (repeat counts, euclid args) and skipped by callers.
function miniAtoms(mini) {
  return mini.replace(/[\[\]<>(),*/!@|]/g, ' ').split(/\s+/).filter(Boolean);
}

const isNumber = a => /^\d+(\.\d+)?$/.test(a);

export function validateMiniNotation(mini, kind) {
  const errors = [];
  if (!mini || !mini.trim()) return { valid: false, errors: ['Mini-notation is empty'] };
  if (!MININOTATION_CHARSET.test(mini)) errors.push('Illegal characters in mini-notation');

  const closers = { ']': '[', '>': '<', ')': '(' };
  const stack = [];
  for (const ch of mini) {
    if ('[<('.includes(ch)) stack.push(ch);
    else if (ch in closers && stack.pop() !== closers[ch]) { errors.push('Unbalanced brackets'); break; }
  }
  if (stack.length) errors.push('Unbalanced brackets');

  for (const atom of miniAtoms(mini)) {
    if (atom === '~' || isNumber(atom)) continue;
    if (kind === 'sample' && !SAMPLE_NAMES.includes(atom)) errors.push(`Unknown sample: ${atom}`);
    if (kind === 'note' && !NOTE_RE.test(atom)) errors.push(`Bad note: ${atom}`);
  }

  return { valid: errors.length === 0, errors };
}

// Approximate density check: counts non-rest atoms, ignoring *N multipliers and
// euclid expansion (both only ADD events, so this is a safe lower bound).
export function countMiniEvents(mini) {
  return miniAtoms(mini).filter(a => a !== '~' && !isNumber(a)).length;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/validate.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/validate.js tests/validate.test.js
git commit -m "feat(validate): mini-notation grammar validator + event density counter"
```

---

### Task 7: LayerSpec validator

**Files:**
- Modify: `src/validate.js` (append)
- Test: `tests/validate.test.js` (append)

**Interfaces:**
- Consumes: `validateMiniNotation`, `countMiniEvents` (Task 6); `METHOD_CARDS`, `PILLAR_METHODS`, `PILLAR_KINDS`, `MIN_EVENTS`, `BANKS`, `SYNTHS` (Task 5).
- Produces (used by Task 12): `validateLayerSpec(spec, pillarName): { valid, errors }`.
- **LayerSpec canonical shape** (all later tasks use exactly this):

```js
{
  kind: 'sample' | 'note',
  mininotation: 'bd ~ [~ bd] ~',       // sample tokens or note tokens
  sound: 'RolandTR909' | 'sine' | 'none',  // bank for samples ('none' = no bank), synth for notes
  scale: 'A:minor',                    // baked in AFTER generation (from intent) — not LLM-set
  effects: { lpf: 600, room: 0.4 },    // keys ⊂ PILLAR_METHODS[pillar]
  structure: { fast: 2, slow: 1, iter: 4, jux_rev: true }  // all optional
}
```

- [ ] **Step 1: Write the failing tests**

Append to `tests/validate.test.js`:

```js
import { validateLayerSpec } from '../src/validate.js';

const goodDrums = () => ({
  kind: 'sample', mininotation: 'bd ~ bd ~', sound: 'RolandTR909',
  effects: { shape: 0.4, lpf: 400 }, structure: {},
});
const goodBass = () => ({
  kind: 'note', mininotation: '[~ a1] [~ a1] [~ c2] [b1 ~ g1 ~]', sound: 'square',
  scale: 'A:minor', effects: { lpf: 600, decay: 0.08 }, structure: { fast: 1 },
});

describe('validateLayerSpec', () => {
  it('accepts valid sample and note specs', () => {
    expect(validateLayerSpec(goodDrums(), 'drums').valid).toBe(true);
    expect(validateLayerSpec(goodBass(), 'bass').valid).toBe(true);
  });

  it('rejects wrong kind for pillar', () => {
    expect(validateLayerSpec({ ...goodBass(), kind: 'sample', mininotation: 'bd ~' }, 'melody').valid).toBe(false);
  });

  it('rejects effects not allowed on the pillar', () => {
    const r = validateLayerSpec({ ...goodDrums(), effects: { vowel: 'a' } }, 'drums');
    expect(r.valid).toBe(false);
    expect(r.errors.join()).toContain('vowel');
  });

  it('rejects out-of-range effect values', () => {
    expect(validateLayerSpec({ ...goodDrums(), effects: { lpf: 99999 } }, 'drums').valid).toBe(false);
  });

  it('rejects unknown sound', () => {
    expect(validateLayerSpec({ ...goodDrums(), sound: 'MoogGrandmother' }, 'drums').valid).toBe(false);
  });

  it('rejects too-sparse patterns (silence guard)', () => {
    expect(validateLayerSpec({ ...goodDrums(), mininotation: 'bd ~ ~ ~' }, 'drums').valid).toBe(false); // MIN_EVENTS.drums = 2
    expect(validateLayerSpec({ ...goodDrums(), mininotation: '~ ~ ~ ~' }, 'drums').valid).toBe(false);
  });

  it('rejects invalid mininotation (delegates to validateMiniNotation)', () => {
    expect(validateLayerSpec({ ...goodDrums(), mininotation: 'bd [bd' }, 'drums').valid).toBe(false);
  });

  it('rejects null/non-object', () => {
    expect(validateLayerSpec(null, 'drums').valid).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/validate.test.js`
Expected: new tests FAIL.

- [ ] **Step 3: Append implementation to `src/validate.js`**

Extend the strudelDocs import line to:

```js
import { SAMPLE_NAMES, METHOD_CARDS, PILLAR_METHODS, PILLAR_KINDS, MIN_EVENTS, BANKS, SYNTHS } from './library/strudelDocs.js';
```

Append:

```js
const STRUCTURE_RANGES = { fast: [1, 4], slow: [1, 8], iter: [2, 8] };

export function validateLayerSpec(spec, pillarName) {
  const errors = [];
  if (!spec || typeof spec !== 'object') return { valid: false, errors: ['Spec is not an object'] };

  const kinds = PILLAR_KINDS[pillarName] ?? [];
  if (!kinds.includes(spec.kind)) errors.push(`kind "${spec.kind}" not allowed on ${pillarName} (allowed: ${kinds.join(', ')})`);

  const mini = validateMiniNotation(spec.mininotation ?? '', spec.kind);
  errors.push(...mini.errors);
  if (mini.valid && countMiniEvents(spec.mininotation) < (MIN_EVENTS[pillarName] ?? 1)) {
    errors.push(`Pattern too sparse: needs at least ${MIN_EVENTS[pillarName]} events`);
  }

  const soundVocab = spec.kind === 'sample' ? [...BANKS, 'none'] : SYNTHS;
  if (!soundVocab.includes(spec.sound)) errors.push(`Unknown sound: ${spec.sound}`);

  const allowed = PILLAR_METHODS[pillarName] ?? [];
  for (const [id, value] of Object.entries(spec.effects ?? {})) {
    const card = METHOD_CARDS[id];
    if (!card || !allowed.includes(id)) { errors.push(`Effect "${id}" not allowed on ${pillarName}`); continue; }
    if (card.type === 'numeric' && (typeof value !== 'number' || value < card.min || value > card.max)) {
      errors.push(`${id}=${value} outside [${card.min}, ${card.max}]`);
    }
    if (card.type === 'enum' && !card.values.includes(value)) errors.push(`${id}="${value}" not in ${card.values.join('/')}`);
  }

  for (const [id, value] of Object.entries(spec.structure ?? {})) {
    if (id === 'jux_rev') { if (typeof value !== 'boolean') errors.push('jux_rev must be boolean'); continue; }
    const range = STRUCTURE_RANGES[id];
    if (!range) { errors.push(`Unknown structure key: ${id}`); continue; }
    if (typeof value !== 'number' || value < range[0] || value > range[1]) errors.push(`structure.${id}=${value} outside [${range[0]}, ${range[1]}]`);
  }

  return { valid: errors.length === 0, errors };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/validate.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/validate.js tests/validate.test.js
git commit -m "feat(validate): LayerSpec validator (kind, notation, sound, effect ranges, density)"
```

---

### Task 8: IR compiler — compileLayerSpec

**Files:**
- Modify: `src/compiler.js` (export `applyTransforms`, add `compileLayerSpec`)
- Test: `tests/compiler.test.js` (append)

**Interfaces:**
- Consumes: LayerSpec shape (Task 7), `METHOD_CARDS`, `BANKS` (Task 5), existing private `applyTransforms`.
- Produces (used by Tasks 12, 13): `compileLayerSpec(spec, pillarName, pillar): string` — deterministic, effect order fixed, applies mute/gain knob and pillar TRX transforms exactly like `compileTrack`, so generated tracks behave identically in the mixer/TRX flows. Returns `''` on missing/invalid basics.

- [ ] **Step 1: Write the failing tests**

Append to `tests/compiler.test.js`:

```js
import { compileLayerSpec } from '../src/compiler.js';

const pillarState = (over = {}) => ({
  muted: false, knobs: { gain: 0.8 }, transforms: {}, ...over,
});

const drumSpec = (over = {}) => ({
  kind: 'sample', mininotation: 'bd ~ bd ~', sound: 'RolandTR909',
  effects: { shape: 0.4, lpf: 400 }, structure: {}, ...over,
});
const bassSpec = (over = {}) => ({
  kind: 'note', mininotation: '[~ a1] [~ c2]', sound: 'square', scale: 'A:minor',
  effects: { lpf: 600, decay: 0.08 }, structure: { fast: 2, jux_rev: true }, ...over,
});

describe('compileLayerSpec', () => {
  it('compiles sample spec with bank', () => {
    const code = compileLayerSpec(drumSpec(), 'drums', pillarState());
    expect(code).toContain('s("bd ~ bd ~")');
    expect(code).toContain('.bank("RolandTR909")');
    expect(code).toContain('.gain(0.8)');
  });

  it('omits bank when sound is none', () => {
    const code = compileLayerSpec(drumSpec({ sound: 'none' }), 'drums', pillarState());
    expect(code).not.toContain('.bank(');
  });

  it('compiles note spec with scale lock and synth', () => {
    const code = compileLayerSpec(bassSpec(), 'bass', pillarState());
    expect(code).toContain('note("[~ a1] [~ c2]")');
    expect(code).toContain('.scale("A:minor")');
    expect(code).toContain('.s("square")');
  });

  it('applies structure mods after effects', () => {
    const code = compileLayerSpec(bassSpec(), 'bass', pillarState());
    expect(code).toContain('.fast(2)');
    expect(code).toContain('.jux(rev)');
    expect(code.indexOf('.fast(2)')).toBeGreaterThan(code.indexOf('.lpf(600)'));
  });

  it('effect order is deterministic (envelope before filter before space)', () => {
    const code = compileLayerSpec(bassSpec({ effects: { room: 0.5, lpf: 600, decay: 0.08 } }), 'bass', pillarState());
    expect(code.indexOf('.decay(')).toBeLessThan(code.indexOf('.lpf('));
    expect(code.indexOf('.lpf(')).toBeLessThan(code.indexOf('.room('));
  });

  it('muted pillar compiles to gain(0)', () => {
    const code = compileLayerSpec(drumSpec(), 'drums', pillarState({ muted: true }));
    expect(code).toContain('.gain(0)');
  });

  it('applies pillar TRX transforms after the knob layer', () => {
    const code = compileLayerSpec(drumSpec(), 'drums', pillarState({ transforms: { reverb: 0.6 } }));
    expect(code).toContain('.room(0.6)');
    expect(code.indexOf('.room(0.6)')).toBeGreaterThan(code.indexOf('.gain('));
  });

  it('returns empty string on missing mininotation', () => {
    expect(compileLayerSpec(drumSpec({ mininotation: '' }), 'drums', pillarState())).toBe('');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/compiler.test.js`
Expected: new tests FAIL, existing 15 PASS.

- [ ] **Step 3: Implement in `src/compiler.js`**

Change `function applyTransforms(` to `export function applyTransforms(`.

Add import at top:

```js
import { METHOD_CARDS, BANKS } from './library/strudelDocs.js';
```

Append:

```js
// Fixed emission order for LayerSpec effects: envelope → timbre → filter →
// rhythm → stereo → space. Mirrors DETERMINISTIC_AUDIO_CHAIN's philosophy but
// keys are literal Strudel method names (the IR's vocabulary).
const LAYER_EFFECT_ORDER = [
  'decay', 'sustain', 'attack',
  'crush', 'coarse', 'shape', 'distort', 'vowel',
  'lpf', 'lpq', 'hpf',
  'degradeBy', 'ply',
  'pan',
  'room', 'size', 'delay', 'delaytime',
];

// Compile a generated LayerSpec to Strudel code. Same tail as compileTrack
// (knob gain incl. mute, then TRX transforms) so generated tracks behave
// identically to library tracks in the mixer and TRX flows.
export function compileLayerSpec(spec, pillarName, pillar) {
  if (!spec?.mininotation?.trim()) return '';

  let base;
  if (spec.kind === 'sample') {
    base = `s("${spec.mininotation}")`;
    if (spec.sound && spec.sound !== 'none' && BANKS.includes(spec.sound)) base += `.bank("${spec.sound}")`;
  } else {
    base = `note("${spec.mininotation}")`;
    if (spec.scale) base += `.scale("${spec.scale}")`;
    base += `.s("${spec.sound}")`;
  }

  let code = `(${base})`;

  for (const id of LAYER_EFFECT_ORDER) {
    const value = spec.effects?.[id];
    if (value === undefined || value === null) continue;
    const card = METHOD_CARDS[id];
    if (!card) continue;
    code += card.type === 'enum' ? `.${id}("${value}")` : `.${id}(${value})`;
  }

  const st = spec.structure ?? {};
  if (st.slow > 1) code += `.slow(${st.slow})`;
  if (st.fast > 1) code += `.fast(${st.fast})`;
  if (st.iter >= 2) code += `.iter(${st.iter})`;
  if (st.jux_rev) code += `.jux(rev)`;

  const effectiveGain = pillar.muted ? 0 : pillar.knobs.gain;
  code += `.gain(${effectiveGain})`;
  code = applyTransforms(code, pillar.transforms ?? {});

  return code;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/compiler.test.js`
Expected: PASS (all).

- [ ] **Step 5: Full suite + commit**

Run: `npm test` — all green.

```bash
git add src/compiler.js tests/compiler.test.js
git commit -m "feat(compiler): deterministic LayerSpec -> Strudel emission"
```

---

### Task 9: AST validation with acorn

**Files:**
- Modify: `package.json` (add dep), `src/validate.js` (append `validateCodeAst`)
- Test: `tests/validate.test.js` (append)

**Interfaces:**
- Consumes: compiled code strings (Task 8), `ALLOWED_STRUDEL_FUNCTIONS` (existing), `METHOD_CARDS` (Task 5).
- Produces (used by Task 12): `validateCodeAst(code): { valid, errors }` — real parse (replaces regex paren-count confidence), method whitelist on the AST, literal-argument range checks. Belt-and-suspenders over our own compiler.

- [ ] **Step 1: Install acorn**

```bash
npm install acorn
```

Expected: `acorn` added to `package.json` dependencies.

- [ ] **Step 2: Write the failing tests**

Append to `tests/validate.test.js`:

```js
import { validateCodeAst } from '../src/validate.js';

describe('validateCodeAst', () => {
  it('accepts valid compiled code', () => {
    const code = '(s("bd ~ bd ~").bank("RolandTR909")).shape(0.4).lpf(400).gain(0.8)';
    expect(validateCodeAst(code).valid).toBe(true);
  });

  it('accepts patterns with LFO args and stack', () => {
    const code = 'stack((note("c2 ~").s("saw")).lpf(sine.range(200, 1800)), (s("hh*8")).gain(0.5))';
    expect(validateCodeAst(code).valid).toBe(true);
  });

  it('rejects syntax errors', () => {
    expect(validateCodeAst('(s("bd").lpf(400)').valid).toBe(false);
  });

  it('rejects non-whitelisted method calls', () => {
    const r = validateCodeAst('(s("bd")).eval("alert(1)")');
    expect(r.valid).toBe(false);
    expect(r.errors.join()).toContain('eval');
  });

  it('rejects literal args outside METHOD_CARDS range', () => {
    const r = validateCodeAst('(s("bd")).lpf(99999)');
    expect(r.valid).toBe(false);
    expect(r.errors.join()).toContain('lpf');
  });

  it('rejects trailing junk after the expression', () => {
    expect(validateCodeAst('(s("bd")).gain(1); fetch("http://x")').valid).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/validate.test.js`
Expected: new tests FAIL.

- [ ] **Step 4: Append implementation to `src/validate.js`**

Add import at top:

```js
import { parseExpressionAt } from 'acorn';
```

The existing `ALLOWED_STRUDEL_FUNCTIONS` set is missing a few names the compiler/library legitimately emit — extend the set literal by adding these members: `'range', 'sz', 'delaytime', 'color', 'postgain', 'analyze', 'draw', 'spectrum', 'coarse', 'djf', 'phaser'`.

Append:

```js
// Real parse + AST walk. Catches what the regex checks can't: string-embedded
// parens, method calls smuggled into arguments, trailing statements.
export function validateCodeAst(code) {
  const errors = [];
  let ast;
  try {
    ast = parseExpressionAt(code, 0, { ecmaVersion: 2022 });
  } catch (e) {
    return { valid: false, errors: [`Parse error: ${e.message}`] };
  }
  if (code.slice(ast.end).trim() !== '') errors.push('Trailing code after expression');

  walkAst(ast, errors);
  return { valid: errors.length === 0, errors };
}

function walkAst(node, errors) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'CallExpression') {
    const callee = node.callee;
    const name = callee.type === 'MemberExpression' ? callee.property?.name : callee.name;
    if (name && !ALLOWED_STRUDEL_FUNCTIONS.has(name)) errors.push(`Unknown function: ${name}`);
    // Literal-argument range check against the method card, when one exists.
    const card = METHOD_CARDS[name];
    if (card?.type === 'numeric' && node.arguments.length === 1 && node.arguments[0].type === 'Literal') {
      const v = node.arguments[0].value;
      if (typeof v === 'number' && (v < card.min || v > card.max)) {
        errors.push(`${name}(${v}) outside [${card.min}, ${card.max}]`);
      }
    }
  }
  for (const key of Object.keys(node)) {
    const child = node[key];
    if (Array.isArray(child)) child.forEach(c => walkAst(c, errors));
    else if (child && typeof child === 'object' && typeof child.type === 'string') walkAst(child, errors);
  }
}
```

**Range-check caveat to handle while implementing:** `compileLayerSpec` output always satisfies METHOD_CARDS ranges, but *library* pattern code and the knob/TRX tail may not (e.g. `lpf(sine.range(200, 3000))` is a non-Literal arg — skipped; `hpf(5000)` in a library pattern is within card range — fine; TRX `lpf` can go to 18000 per TRANSFORMS). Therefore `validateCodeAst` is applied **only to generated-layer code** (Task 12), never to library-compiled code. Do not wire it into `compileTrack` paths.

If the two existing `validateCode` tests in `tests/validate.test.js` fail because the extended `ALLOWED_STRUDEL_FUNCTIONS` now accepts a name they expected to be rejected, update those test fixtures to use a clearly-unknown name (e.g. `explode`).

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/validate.test.js` then `npm test`
Expected: PASS (all files).

- [ ] **Step 6: Commit — Phase 2 complete**

```bash
git add package.json package-lock.json src/validate.js tests/validate.test.js
git commit -m "feat(validate): acorn AST validation with method whitelist + literal range checks"
```

---

# Phase 3 — Generative Pipeline

### Task 10: LayerSpec schema + prompt assembly

**Files:**
- Modify: `src/promptEngine.js` (append)
- Test: `tests/promptEngine.test.js` (append)

**Interfaces:**
- Consumes: `METHOD_CARDS`, `PILLAR_METHODS`, `PILLAR_KINDS`, `SAMPLE_NAMES`, `BANKS`, `SYNTHS` (Task 5), `rankPatternsByIntent` (Task 3), `IntentSpec` (Task 2).
- Produces (used by Task 11):
  - `buildLayerSpecSchema(pillarName): object` — Ollama `format` JSON Schema for LayerSpec (no `scale` property — that's baked in post-generation).
  - `assembleLayerPrompt(pillarName, intent, tracksState): string` — system prompt: role + intent + cohesion + method cards + retrieved exemplars + few-shot IR example + rules.

- [ ] **Step 1: Write the failing tests**

Append to `tests/promptEngine.test.js`:

```js
import { buildLayerSpecSchema, assembleLayerPrompt } from '../src/promptEngine.js';

describe('buildLayerSpecSchema', () => {
  it('drums schema: sample-only kind, bank sounds, drum effects', () => {
    const schema = buildLayerSpecSchema('drums');
    expect(schema.properties.kind.enum).toEqual(['sample']);
    expect(schema.properties.sound.enum).toContain('RolandTR909');
    expect(schema.properties.effects.properties.shape).toBeDefined();
    expect(schema.properties.effects.properties.vowel).toBeUndefined();
    expect(schema.additionalProperties).toBe(false);
    expect(schema.properties.effects.additionalProperties).toBe(false);
  });

  it('melody schema: note kind, synth sounds, numeric ranges from cards', () => {
    const schema = buildLayerSpecSchema('melody');
    expect(schema.properties.kind.enum).toEqual(['note']);
    expect(schema.properties.sound.enum).toContain('triangle');
    expect(schema.properties.effects.properties.lpf.maximum).toBe(5000);
  });

  it('never exposes scale to the LLM', () => {
    expect(buildLayerSpecSchema('bass').properties.scale).toBeUndefined();
  });
});

describe('assembleLayerPrompt', () => {
  const intent = {
    genre: 'techno', bpm: 130, key: 'D', scale: 'phrygian', energy: 'high',
    moods: ['dark', 'hypnotic'], textures: ['driving'],
    layers: [{ pillar: 'bass', character: 'rolling dark bassline' }],
  };

  it('includes method cards only for the pillar', () => {
    const prompt = assembleLayerPrompt('drums', intent, {});
    expect(prompt).toContain('.shape');
    expect(prompt).not.toContain('.vowel');
  });

  it('includes retrieved exemplars and intent', () => {
    const prompt = assembleLayerPrompt('bass', intent, {});
    expect(prompt).toContain('rolling dark bassline'); // layer character
    expect(prompt).toContain('mininotation');           // few-shot IR example present
    expect(prompt).toContain('techno');
  });

  it('includes other channels as cohesion context', () => {
    const prompt = assembleLayerPrompt('melody', intent, { drums: 'basic_kick' });
    expect(prompt).toContain('Basic Kick');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/promptEngine.test.js`
Expected: new tests FAIL.

- [ ] **Step 3: Append implementation to `src/promptEngine.js`**

```js
import { getPatternById } from './library/soundLibrary.js';
import { METHOD_CARDS, PILLAR_METHODS, PILLAR_KINDS, SAMPLE_NAMES, BANKS, SYNTHS } from './library/strudelDocs.js';

// Ollama `format` schema for one pillar's LayerSpec. scale is deliberately
// absent: the session key/scale comes from the IntentSpec and is baked in by
// the caller — the model cannot clash harmonically with the other layers.
export function buildLayerSpecSchema(pillarName) {
  const kinds = PILLAR_KINDS[pillarName];
  const effectProps = {};
  for (const id of PILLAR_METHODS[pillarName]) {
    const card = METHOD_CARDS[id];
    if (card.type === 'numeric') effectProps[id] = { type: 'number', minimum: card.min, maximum: card.max };
    else if (card.type === 'enum') effectProps[id] = { type: 'string', enum: card.values };
  }
  return {
    type: 'object',
    properties: {
      kind: { type: 'string', enum: kinds },
      mininotation: { type: 'string', minLength: 2, maxLength: 120 },
      sound: { type: 'string', enum: kinds[0] === 'sample' ? [...BANKS, 'none'] : SYNTHS },
      effects: { type: 'object', properties: effectProps, additionalProperties: false },
      structure: {
        type: 'object',
        properties: {
          fast: { type: 'number', minimum: 1, maximum: 4 },
          slow: { type: 'number', minimum: 1, maximum: 8 },
          iter: { type: 'integer', minimum: 2, maximum: 8 },
          jux_rev: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    },
    required: ['kind', 'mininotation', 'sound', 'effects'],
    additionalProperties: false,
  };
}

const FEW_SHOT = {
  sample: `"loose swung boom-bap kick" -> {"kind":"sample","mininotation":"bd ~ [~ bd] ~ bd ~ [bd ~] ~","sound":"RolandTR909","effects":{"shape":0.3,"lpf":500,"room":0.3},"structure":{}}`,
  note: `"rolling dark bassline" -> {"kind":"note","mininotation":"[~ d1] [~ d1] [~ f1] [cs1 ~ d1 ~]","sound":"square","effects":{"decay":0.09,"lpf":500},"structure":{}}`,
};

const PILLAR_ROLES = {
  drums: 'rhythmic foundation — kicks',
  bass: 'low-end movement — bass lines, sub, rumble',
  percussion: 'rhythmic texture — hi-hats, rides, claps, shakers',
  melody: 'harmonic content — synths, arps, leads',
  transitions: 'atmosphere and tension — sweeps, fx, arps',
};

export function assembleLayerPrompt(pillarName, intent, tracksState = {}) {
  const kind = PILLAR_KINDS[pillarName][0];
  const cards = PILLAR_METHODS[pillarName]
    .map(id => { const c = METHOD_CARDS[id]; return `- .${id}${c.sig}: ${c.note} — e.g. ${c.ex}`; })
    .join('\n');

  const exemplars = rankPatternsByIntent(pillarName, intent).slice(0, 3)
    .map(({ pattern }) => `// ${pattern.name} [${pattern.tags.join(', ')}]\n${pattern.code}`)
    .join('\n');

  const others = Object.entries(tracksState)
    .filter(([name, id]) => name !== pillarName && id)
    .map(([name, id]) => {
      const pat = getPatternById(name === 'bass_percussion' ? 'bass' : name, id);
      return `- ${name}: ${pat ? `${pat.name} [${pat.tags.join(', ')}]` : id}`;
    })
    .join('\n');

  const layerBrief = intent.layers?.find(l => l.pillar === pillarName)?.character ?? '';
  const tokenVocab = kind === 'sample'
    ? `Sample tokens (ONLY these): ${SAMPLE_NAMES.join(' ')}`
    : `Note tokens: letter a-g, optional s (sharp) or b (flat), octave digit — e.g. c2, eb2, fs4. The key/scale is applied automatically; write chromatic notes freely.`;

  return `You are a producer writing the ${PILLAR_ROLES[pillarName]} layer of a track.

Musical intent: ${JSON.stringify({ genre: intent.genre, bpm: intent.bpm, energy: intent.energy, moods: intent.moods, textures: intent.textures })}
${layerBrief ? `This layer's brief: ${layerBrief}` : ''}

Other playing channels (lock in with these):
${others || '(none)'}

Mini-notation syntax: space = step, ~ = rest, [a b] = subdivide, [a,b] = chord, a*4 = repeat, <a b> = alternate per cycle, a(3,8) = euclidean.
${tokenVocab}

Available effects for this layer:
${cards}

Reference patterns in this style (for FEEL — do not copy verbatim):
${exemplars}

Rules:
- Rests (~) are your friend: groove lives in the gaps. But at least a few events per cycle.
- 2–4 effects maximum. Surgical, not a pile.
- Keep it dark and minimal unless the intent says otherwise.
- Output ONLY the JSON object.

Example:
${FEW_SHOT[kind]}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/promptEngine.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/promptEngine.js tests/promptEngine.test.js
git commit -m "feat(promptEngine): LayerSpec schema + dynamic prompt assembly"
```

---

### Task 11: generateLayerSpec LLM call

**Files:**
- Create: `src/generate.js`
- Modify: `src/llm.js` (`callOllama` gains `numPredict` option)
- Test: `tests/generate.test.js`

**Interfaces:**
- Consumes: `callOllama` (Task 2), `buildLayerSpecSchema` / `assembleLayerPrompt` (Task 10).
- Produces (used by Task 12): `generateLayerSpec(pillarName, userPrompt, intent, tracksState, priorErrors = null): Promise<LayerSpec|null>` — bakes `spec.scale` from intent; `null` on any failure; `priorErrors` feeds the repair retry.

- [ ] **Step 1: Write the failing tests**

```js
// tests/generate.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateLayerSpec } from '../src/generate.js';

function ollamaResponse(text) {
  return { ok: true, json: async () => ({ message: { content: text } }) };
}

const intent = {
  genre: 'techno', bpm: 130, key: 'D', scale: 'phrygian', energy: 'high',
  moods: ['dark'], textures: [], layers: [],
};

const rawSpec = {
  kind: 'note', mininotation: '[~ d1] [~ f1]', sound: 'square',
  effects: { lpf: 500, decay: 0.09 }, structure: {},
};

describe('generateLayerSpec', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns spec with scale baked from intent', async () => {
    global.fetch = vi.fn().mockResolvedValue(ollamaResponse(JSON.stringify(rawSpec)));
    const spec = await generateLayerSpec('bass', 'dark bassline', intent, {});
    expect(spec.mininotation).toBe('[~ d1] [~ f1]');
    expect(spec.scale).toBe('D:phrygian');
  });

  it('sends the pillar LayerSpec schema as format', async () => {
    global.fetch = vi.fn().mockResolvedValue(ollamaResponse(JSON.stringify(rawSpec)));
    await generateLayerSpec('bass', 'dark bassline', intent, {});
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.format.properties.mininotation).toBeDefined();
    expect(body.format.properties.effects.additionalProperties).toBe(false);
  });

  it('appends prior validation errors to the user prompt on repair', async () => {
    global.fetch = vi.fn().mockResolvedValue(ollamaResponse(JSON.stringify(rawSpec)));
    await generateLayerSpec('bass', 'dark bassline', intent, {}, ['Unknown sample: kaboom']);
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.messages[1].content).toContain('Unknown sample: kaboom');
  });

  it('returns null on HTTP error and on unparseable JSON', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    expect(await generateLayerSpec('bass', 'x', intent, {})).toBeNull();
    global.fetch = vi.fn().mockResolvedValue(ollamaResponse('not json'));
    expect(await generateLayerSpec('bass', 'x', intent, {})).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/generate.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Add `numPredict` option to `callOllama` in `src/llm.js`**

Change the signature and options line:

```js
export async function callOllama(systemPrompt, userPrompt, { schema = null, numPredict = 200 } = {}) {
```

and inside `body`:

```js
    options: { temperature: 0, seed: 42, num_predict: numPredict },
```

- [ ] **Step 4: Write `src/generate.js`**

```js
// Generative layer: the LLM emits a LayerSpec (JSON IR), never code.
import { callOllama, generateTransformationPlan } from './llm.js';
import { buildLayerSpecSchema, assembleLayerPrompt } from './promptEngine.js';
import { validateLayerSpec, validateCodeAst } from './validate.js';
import { compileLayerSpec, compileTrack } from './compiler.js';

export async function generateLayerSpec(pillarName, userPrompt, intent, tracksState, priorErrors = null) {
  try {
    const systemPrompt = assembleLayerPrompt(pillarName, intent, tracksState);
    const user = priorErrors
      ? `${userPrompt}\n\nYour previous attempt failed validation:\n- ${priorErrors.join('\n- ')}\nFix exactly these issues and output the corrected JSON.`
      : userPrompt;
    const cleaned = await callOllama(systemPrompt, user, {
      schema: buildLayerSpecSchema(pillarName),
      numPredict: 400, // LayerSpec JSON is bigger than a plan/patch
    });
    const spec = JSON.parse(cleaned);
    if (!spec || typeof spec !== 'object') return null;
    spec.scale = `${intent.key}:${intent.scale}`; // session harmony — not the model's call
    return spec;
  } catch {
    return null;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/generate.test.js`
Expected: PASS (4 tests). Run `npm test` — all green (the `callOllama` signature change is backward-compatible).

- [ ] **Step 6: Commit**

```bash
git add src/generate.js src/llm.js tests/generate.test.js
git commit -m "feat(generate): schema-constrained LayerSpec generation"
```

---

### Task 12: Repair loop + fallback orchestrator

**Files:**
- Modify: `src/generate.js` (append `generateTrackWithRepair`)
- Test: `tests/generate.test.js` (append)

**Interfaces:**
- Consumes: everything from Tasks 3–11.
- Produces (used by Task 13):

```js
generateTrackWithRepair(pillarName, userPrompt, intent, pillar, tracksState)
  : Promise<{ code: string, source: 'generated', spec: LayerSpec }
           | { code: string, source: 'library', plan: Plan }
           | null>
```

Flow: up to 2 generation attempts (attempt 2 receives attempt 1's validation errors) → each attempt runs `validateLayerSpec` then `compileLayerSpec` then `validateCodeAst` → on success return generated; otherwise fall back to `generateTransformationPlan` + `compileTrack` (today's pipeline) → `null` only if that also fails.

- [ ] **Step 1: Write the failing tests**

Append to `tests/generate.test.js`:

```js
import { generateTrackWithRepair } from '../src/generate.js';

const pillarState = () => ({ muted: false, knobs: { gain: 0.8 }, transforms: {}, selectedId: null, lastMods: {} });

const goodSpec = {
  kind: 'sample', mininotation: 'bd ~ bd ~', sound: 'RolandTR909',
  effects: { shape: 0.4 }, structure: {},
};
const badSpec = { ...goodSpec, mininotation: 'bd kaboom' };
const libraryPlan = { selectedId: 'basic_kick', explanation: 'fallback', modifications: {} };

function fetchSequence(...texts) {
  const fn = vi.fn();
  for (const t of texts) fn.mockResolvedValueOnce(ollamaResponse(typeof t === 'string' ? t : JSON.stringify(t)));
  global.fetch = fn;
  return fn;
}

describe('generateTrackWithRepair', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns generated code when first attempt validates', async () => {
    fetchSequence(goodSpec);
    const result = await generateTrackWithRepair('drums', 'punchy kick', intent, pillarState(), {});
    expect(result.source).toBe('generated');
    expect(result.code).toContain('s("bd ~ bd ~")');
    expect(result.spec.kind).toBe('sample');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('retries once with validation errors, succeeds on second attempt', async () => {
    fetchSequence(badSpec, goodSpec);
    const result = await generateTrackWithRepair('drums', 'punchy kick', intent, pillarState(), {});
    expect(result.source).toBe('generated');
    expect(global.fetch).toHaveBeenCalledTimes(2);
    const secondUser = JSON.parse(global.fetch.mock.calls[1][1].body).messages[1].content;
    expect(secondUser).toContain('kaboom');
  });

  it('falls back to library selection after two failed attempts', async () => {
    fetchSequence(badSpec, badSpec, libraryPlan);
    const result = await generateTrackWithRepair('drums', 'punchy kick', intent, pillarState(), {});
    expect(result.source).toBe('library');
    expect(result.plan.selectedId).toBe('basic_kick');
    expect(result.code).toContain('bd*4');
  });

  it('returns null when generation AND fallback fail', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    expect(await generateTrackWithRepair('drums', 'kick', intent, pillarState(), {})).toBeNull();
  });
});
```

(`intent` and `ollamaResponse` are already defined at the top of this test file.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/generate.test.js`
Expected: new tests FAIL.

- [ ] **Step 3: Append implementation to `src/generate.js`**

```js
const MAX_GEN_ATTEMPTS = 2;

// Full generative pipeline with a guaranteed floor: never resolves to a state
// worse than today's selection pipeline.
export async function generateTrackWithRepair(pillarName, userPrompt, intent, pillar, tracksState) {
  let errors = null;

  for (let attempt = 0; attempt < MAX_GEN_ATTEMPTS; attempt++) {
    const spec = await generateLayerSpec(pillarName, userPrompt, intent, tracksState, errors);
    if (!spec) break; // Ollama down / unparseable — retrying won't help, go to floor

    const specCheck = validateLayerSpec(spec, pillarName);
    if (!specCheck.valid) { errors = specCheck.errors; continue; }

    const code = compileLayerSpec(spec, pillarName, pillar);
    const astCheck = validateCodeAst(code);
    if (!astCheck.valid) { errors = astCheck.errors; continue; }

    return { code, source: 'generated', spec };
  }

  // Floor: today's deterministic selection pipeline.
  const plan = await generateTransformationPlan(pillarName, userPrompt, tracksState, intent);
  if (!plan) return null;
  const code = compileTrack(plan, pillarName, pillar);
  return code ? { code, source: 'library', plan } : null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/generate.test.js` then `npm test`
Expected: PASS (all).

- [ ] **Step 5: Commit**

```bash
git add src/generate.js tests/generate.test.js
git commit -m "feat(generate): validate->repair->library-fallback orchestrator"
```

---

### Task 13: App wiring — generated tracks as first-class citizens

**Files:**
- Modify: `src/pillars.js` (`makePillars`: add `spec: null`)
- Modify: `app.js` (generation branch of `handlePillarSend`; `recompilePillar` helper; use it in TRX branch, `handleEmotion`, `handleVolume`)
- Test: `tests/pillars.test.js` (append one test)

**Interfaces:**
- Consumes: `generateTrackWithRepair` (Task 12), `compileLayerSpec` (Task 8), `buildIntent` (Task 2).
- Produces: pillar state gains `spec` (the applied LayerSpec, or `null` for library tracks). All recompile sites (volume fader, TRX patch, emotion chips) dispatch on `pillar.spec` so knob/transform changes work identically on generated and library tracks.

- [ ] **Step 1: Write the failing test**

Append to `tests/pillars.test.js`:

```js
it('pillars carry a spec field for generated tracks, default null', () => {
  for (const p of makePillars()) expect(p.spec).toBeNull();
});
```

Run: `npx vitest run tests/pillars.test.js` — expected: new test FAILS.

- [ ] **Step 2: Add `spec: null` to `makePillars` in `src/pillars.js`**

In the object literal inside `makePillars()` (after `transforms: {},`):

```js
    transforms: {},
    spec: null,
```

Run: `npx vitest run tests/pillars.test.js` — expected: PASS.

- [ ] **Step 3: Add `recompilePillar` helper to `app.js`**

Add imports at top of `app.js`:

```js
import { generateTrackWithRepair } from './src/generate.js';
import { compileLayerSpec } from './src/compiler.js';
```

(`buildIntent` import exists from Task 4.)

Add helper below `tracksSnapshot()`:

```js
// Recompile a pillar's current sound with its live knobs/transforms.
// Generated tracks recompile from their LayerSpec; library tracks from their plan.
function recompilePillar(pillar) {
  return pillar.spec
    ? compileLayerSpec(pillar.spec, pillar.name, pillar)
    : compileTrack({ selectedId: pillar.selectedId, modifications: pillar.lastMods }, pillar.name, pillar);
}
```

- [ ] **Step 4: Use `recompilePillar` at all three recompile sites**

Replace each of these three lines (TRX branch of `handlePillarSend`, `handleEmotion`, `handleVolume`):

```js
    const newCode = compileTrack({ selectedId: pillar.selectedId, modifications: pillar.lastMods }, pillarName, pillar);
```

with:

```js
    const newCode = recompilePillar(pillar);
```

Also in `detectMode`, change the no-sound guard so generated tracks aren't treated as empty:

```js
  if (!pillar.selectedId && !pillar.spec) return 'generation';
```

- [ ] **Step 5: Replace the generation branch of `handlePillarSend`**

Replace the block from `// generation mode: distill intent first...` down to the end of the function with:

```js
  // generation mode: intent -> generative LayerSpec (validated + repaired),
  // falling back to library selection, falling back to an error message.
  const currentTracksState = tracksSnapshot();

  const intent = await buildIntent(prompt);
  const result = await generateTrackWithRepair(pillarName, prompt, intent, pillar, currentTracksState);

  if (!result) {
    addPillarMessage(pillarName, 'error', 'Could not generate or select a pattern. Try rephrasing.');
    setStatus('Error');
    return;
  }

  const prevCode = pillar.code;
  const prevSelectedId = pillar.selectedId;
  const prevLastMods = pillar.lastMods;
  const prevSpec = pillar.spec;

  addPillarPreviewMessage(
    pillarName,
    result.code,
    async () => {
      if (result.source === 'generated') {
        pillar.spec = result.spec;
        pillar.selectedId = null;
        pillar.lastMods = {};
      } else {
        pillar.spec = null;
        pillar.selectedId = result.plan.selectedId;
        pillar.lastMods = result.plan.modifications ?? {};
      }
      pillar.code = result.code;
      updatePillarCode(pillarName, result.code);
      await rebuildAndPlay();
      if (!globalState.isPlaying) {
        const stack = rebuildStack(pillars, globalState);
        if (stack) {
          await play(stack);
          setPlaying(true);
        }
      }
      setStatus(result.source === 'generated' ? 'Applied (generated)' : 'Applied (library)');
      refreshAllGenChips();
    },
    () => {
      pillar.code = prevCode;
      pillar.selectedId = prevSelectedId;
      pillar.lastMods = prevLastMods;
      pillar.spec = prevSpec;
      setStatus('Ready');
    }
  );

  setStatus('Preview ready');
}
```

**Caveat while editing:** `tracksSnapshot()` reports `selectedId` per pillar; generated tracks have `selectedId: null` so they show as `(empty)` in cohesion contexts. Acceptable for this plan (cohesion degrades gracefully); do not try to fix it here.

- [ ] **Step 6: Full suite + manual end-to-end smoke test**

Run: `npm test` — all green.

Manual (requires Ollama running with `qwen2.5:7b`):
1. `npm run dev`, open http://localhost:5173.
2. Drums pillar: "glitchy lo-fi hip hop beat" → expect preview card; Apply → audio plays, status "Applied (generated)" or "Applied (library)".
3. With the generated track playing, move the drums volume fader → audio follows (proves `recompilePillar` spec path).
4. Type "make it darker" on the same pillar → TRX preview appears and applies on top of the generated track.
5. Stop Ollama, send another generation prompt → error message, no crash, old track keeps playing.

- [ ] **Step 7: Commit — Phase 3 complete**

```bash
git add src/pillars.js app.js tests/pillars.test.js
git commit -m "feat(app): wire generative pipeline; generated tracks first-class in mixer/TRX"
```

---

### Task 14: Documentation + final verification

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md**

Rewrite the pipeline diagram and module list to match reality. Specifically:
- New pipeline: `buildIntent() → generateTrackWithRepair() → [generateLayerSpec → validateLayerSpec → compileLayerSpec → validateCodeAst] with library-selection fallback → rebuildStack()`.
- Fix the stale pillar list: `PILLAR_NAMES = ['drums', 'bass', 'percussion', 'melody', 'transitions']`.
- Document new modules (`src/intent.js`, `src/promptEngine.js`, `src/generate.js`, `src/library/strudelDocs.js`) with their exports, one line each.
- Document the LayerSpec shape and the "LLM never outputs code" contract (now: LLM outputs IntentSpec + LayerSpec JSON only).
- Update the Tests section with the new test files and counts (get counts from the final `npm test` run).

- [ ] **Step 2: Final full verification**

Run: `npm test`
Expected: all test files green. Record the total test count for CLAUDE.md.

Run: `npm run build`
Expected: production build succeeds (catches any import errors vitest's node environment might mask).

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document generative pipeline architecture"
```

---

## Deferred (explicitly out of scope — YAGNI)

- Embedding-based retrieval (Ollama `/api/embed`): only if the library grows past ~200 patterns.
- Headless `queryArc` dry-run before `play()`: `@strudel/web`'s eval surface for no-audio evaluation is unverified; the density check (`countMiniEvents` + `MIN_EVENTS`) covers the silence class deterministically, and `play()` throw → revert covers the runtime-crash class (existing app behavior).
- `qwen2.5-coder:7b` for notation quality: user-side experiment via `VITE_OLLAMA_MODEL`, no code change.
- Multi-pillar one-shot generation ("build me a whole track" fanning out `Promise.all` across pillars): straightforward extension of `generateTrackWithRepair`, add only when asked.
- Richer cohesion context for generated tracks in `tracksSnapshot()` (currently reports them as empty).
