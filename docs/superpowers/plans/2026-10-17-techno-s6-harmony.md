# Techno Focus, Stage S6 and Harmony Metric — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing S0–S5 evaluation harness to spec Revision 2: techno-only vocabulary and graph, fixed three-part tracks, a 4-bar content window, an extended code lexicon, a harmony metric, the new stage S6 (form + deterministic compiler), and analysis for 7 stages.

**Architecture:** Everything lives under `eval/` (headless Node, no UI). The app under `src/` is not modified. S6 is a new stage module plus two focused helpers (`eval/s6/form.js` = schema and prompt, `eval/s6/compiler.js` = form → Strudel code). Harmony is a pure function over haps (`eval/harmony.js`). The validity worker returns two hap windows: bar 0 (classification, unchanged) and bars 0–4 (content: lexicon + harmony).

**Tech Stack:** Node 22 ESM, Vitest, `@strudel/core|mini|tonal|transpiler` (headless via `eval/node-hooks`), Ollama `qwen2.5:7b`, acorn.

**Spec:** `docs/superpowers/specs/2026-10-12-creative-harness-stage-model-design.md` (Revision 2, 17.10.2026). Read §2.1, §2.3, §4, §4.1, §4.2, §5 before starting. The previous plan `docs/superpowers/plans/2026-10-12-creative-harness-evaluation.md` built S0–S5; this plan modifies that code.

**Branch:** `thesis/creative-harness-eval` (already checked out). `eval/README.md` and `eval/corpus/prompts.json` are currently untracked; Tasks 10 and 12 take ownership of them.

## Global Constraints

- Model `qwen2.5:7b`; temperature 0.7 for all stages; seed `1000 + rep`; `num_predict` 1024; 10 reps; 7 stages × 40 prompts × 10 = 2,800 runs; order rep → prompt → stage.
- Do not modify anything under `src/`. App defaults (`temperature 0`, `seed 42`, `num_predict 200`) stay.
- Vocabulary is exactly: subgenre `acid, detroit, dub, hypnotic, industrial, minimal, peak-time`; character `dark, driving, warm, gritty, spacious, glitchy, sparse, dense, metallic, deep, dissonant, evolving`; element `kick, bass, sub, hats, clap, percussion, lead, chords, arp, pad, fx`.
- Subgenre tempo: acid 132, detroit 130, dub 120, hypnotic 128, industrial 138, minimal 125, peak-time 134. Tempo bands 115–124, 125–129, 130–134, 135–150 BPM.
- Validity classification uses bar 0 (`queryArc(0, 1)`); lexicon and harmony use 4 bars (`queryArc(0, 4)`).
- Thresholds: validity 0.05, f1 0.05, f1Code 0.05, entropy 0.05, inKey 0.05, clashRate 0.05, lowCrowding 0.05, latency 500 ms. Bootstrap 10,000 resamples, fixed seed.
- Extra comparisons besides adjacent stages: S2 ↔ S6 and S5 ↔ S6.
- Every stage produces drums, bass and a melodic part.
- The S6 compiler emits code only from its own templates and whitelisted characters; nothing the model writes is copied into the code verbatim.

## Review Focus

1. **Model writes code-like junk into S6 lane strings** (e.g. `"); process.exit(1); ("`): the compiler must emit valid code containing none of it → test in Task 7.
2. **S6 form with missing fields, wrong types or wrong lane lengths** (numbers as strings, 15- or 20-char lanes, unknown enum values): compiler pads, clamps and defaults and the code stays valid → test in Task 7.
3. **Free code with unusual tempo calls** (`setcpm(x)`, `setcpm(130/4*1)`, `setcps(.5)`, no call at all): `parseBpm` returns a number, never throws, default 120 → test in Task 3.
4. **Haps without `whole`** (continuous signals) and drum-only code in harmony: skipped, metrics `NaN`, no crash → test in Task 4.
5. **Old schema-1 records** (no `harmony`, `form`, `fallbacks`) mixed into an analysis input: analysis completes, harmony `NaN` → test in Task 11.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `eval/vocabulary.js` | techno vocabulary, library tag map | 1 |
| `eval/graph/knowledgeGraph.js` | subgenre nodes, tempo bands, `SUBGENRE_BPM`, graph build | 1 |
| `eval/graph/graphRag.js` | retrieval, ranking, context texts (`graphContextText`, new `subgenreContextText`) | 1 |
| `eval/strudelHeadless.js` | `evaluatePattern`, `queryCycles`, `queryCycle` | 2 |
| `eval/evalWorker.mjs` | returns bar-0 haps and 4-bar haps | 2 |
| `eval/validity.js` | `checkValidity(code, { cycles })` → adds `hapsAll` | 2 |
| `eval/codeLexicon.js` | `parseBpm`, `tagsFromCode(code, haps, { cycles })` with new rules | 3 |
| `eval/harmony.js` (new) | `harmonyMetrics(haps)` | 4 |
| `eval/stages/common.js`, `s0.js`, `s1.js` | fixed tracks, techno task prompt, `setcpm` in spec | 5 |
| `eval/s6/form.js` (new) | form schema, example, S6 system prompt | 6 |
| `eval/s6/compiler.js` (new) | `compileForm(form)` | 6 |
| `eval/stages/s6.js` (new), `eval/stages/index.js`, `eval/config.js` | S6 stage, registry, 7-stage config | 7 |
| `eval/runner/core.js` | record schema 2 (harmony, form, fallbacks, 4-bar tags) | 8 |
| `eval/corpus/corpus.js`, `eval/corpus/prompts.json` | category `alias`, techno sample prompts | 9 |
| `eval/analysis.js`, `eval/analyze.mjs` | harmony, fallback rate, form-field entropy, extra comparisons | 10 |
| `eval/README.md` | updated docs; smoke run | 11 |

Tests live in `tests/eval/` next to the existing ones.

---

### Task 1: Techno vocabulary and subgenre graph

**Files:**
- Modify: `eval/vocabulary.js` (whole file below)
- Modify: `eval/graph/knowledgeGraph.js` (whole file below)
- Modify: `eval/graph/graphRag.js` (whole file below)
- Modify tests: `tests/eval/vocabulary.test.js`, `tests/eval/graph.test.js`, `tests/eval/codeLexicon.test.js`, `tests/eval/runner.test.js`, `tests/eval/corpus.test.js`

**Interfaces:**
- Produces:
  - `EVAL_VOCAB: { subgenre: string[], character: string[], element: string[] }` (key `genre` is renamed to `subgenre`), `ALL_TAGS`, `LIBRARY_TAG_MAP`, `PILLAR_ELEMENT`, `canonicalTags`, `normalizeLibraryTags`, `patternById`, `tagsForPatternIds` (signatures unchanged).
  - `SUBGENRES: string[]` (= `EVAL_VOCAB.subgenre`), `SUBGENRE_NODES: {label, aliases}[]`, `TEMPO_BANDS: {id, min, max}[]`, `SUBGENRE_BPM: Record<subgenre, number>`, `SUBGENRE_TEMPO: Record<subgenre, string[]>`, `bandOfBpm(bpm): {id,min,max}|null`, `DEFAULT_PATTERN_BANDS`, `buildKnowledgeGraph()`, `neighbours(graph, id)`.
  - `retrieveGraph(prompt, intent) → { seedSubgenres: string[], bands: string[], bpm: number|null }`, `rankWithGraph(pillar, retrieval, intent, k)`, `graphContextText(retrieval, pillar, ranked)`, `subgenreContextText(retrieval): string`.

Removing `techno`, `house`, `lofi`, `ambient`, `trance` from the vocabulary makes `canonicalTags` drop them, so four existing test files need their expectations updated in this task to keep the suite green.

- [ ] **Step 1: Update vocabulary tests**

In `tests/eval/vocabulary.test.js` replace the tests `canonicalTags filters, dedupes and sorts` and `tagsForPatternIds unions pillar element + library tags`, and add two tests:

```js
  it('canonicalTags filters, dedupes and sorts', () => {
    expect(canonicalTags(['techno', 'dark', 'nonsense', 'dark'])).toEqual(['dark']);
    expect(canonicalTags(['peak-time', 'acid'])).toEqual(['acid', 'peak-time']);
  });

  it('techno-only vocabulary (spec §4.1)', () => {
    expect(EVAL_VOCAB.subgenre).toEqual(['acid', 'detroit', 'dub', 'hypnotic', 'industrial', 'minimal', 'peak-time']);
    expect(EVAL_VOCAB.character).toHaveLength(12);
    expect(EVAL_VOCAB.character).not.toContain('hypnotic');
    expect(ALL_TAGS).not.toContain('techno');
    expect(ALL_TAGS).toHaveLength(30);
  });

  it('tagsForPatternIds unions pillar element + library tags', () => {
    expect(patternById('basic_kick').pillar).toBe('drums');
    expect(tagsForPatternIds(['basic_kick'])).toEqual(['kick']);
    expect(tagsForPatternIds(['basic_kick', 'unknown_id'])).toEqual(['kick']);
    expect(tagsForPatternIds([])).toEqual([]);
    expect(tagsForPatternIds(['perc_motor_city_groove'])).toEqual(expect.arrayContaining(['detroit', 'percussion']));
  });
```

Change the import line to:

```js
import { ALL_TAGS, EVAL_VOCAB, LIBRARY_TAG_MAP, canonicalTags, normalizeLibraryTags, tagsForPatternIds, patternById } from '../../eval/vocabulary.js';
```

- [ ] **Step 2: Rewrite graph tests**

Replace `tests/eval/graph.test.js` with:

```js
import { describe, it, expect } from 'vitest';
import { buildKnowledgeGraph, neighbours, SUBGENRE_NODES, SUBGENRES, TEMPO_BANDS, SUBGENRE_BPM, SUBGENRE_TEMPO, bandOfBpm } from '../../eval/graph/knowledgeGraph.js';
import { retrieveGraph, rankWithGraph, graphContextText, subgenreContextText } from '../../eval/graph/graphRag.js';
import { soundLibrary } from '../../src/library/soundLibrary.js';
import { EVAL_VOCAB } from '../../eval/vocabulary.js';

const type = id => id.split(':')[0];
const intent = (genre = 'techno') => ({ genre, moods: ['dark'], textures: [], layers: [] });

describe('knowledge graph', () => {
  const g = buildKnowledgeGraph();
  const total = Object.values(soundLibrary).flat().length;

  it('one subgenre node per vocab subgenre, 4 tempo bands, every pattern', () => {
    expect(SUBGENRES).toEqual(EVAL_VOCAB.subgenre);
    expect(g.nodes.filter(n => n.type === 'subgenre').map(n => n.label)).toEqual(EVAL_VOCAB.subgenre);
    expect(TEMPO_BANDS.map(b => b.id)).toEqual(['115-124', '125-129', '130-134', '135-150']);
    expect(g.nodes.filter(n => n.type === 'tempo')).toHaveLength(4);
    expect(g.nodes.filter(n => n.type === 'pattern')).toHaveLength(total);
  });

  it('subgenre tempo table (spec §2.3) and its band', () => {
    expect(SUBGENRE_BPM).toEqual({ acid: 132, detroit: 130, dub: 120, hypnotic: 128, industrial: 138, minimal: 125, 'peak-time': 134 });
    expect(SUBGENRE_TEMPO.dub).toEqual(['115-124']);
    expect(SUBGENRE_TEMPO.industrial).toEqual(['135-150']);
    expect(bandOfBpm(127).id).toBe('125-129');
    expect(bandOfBpm(90)).toBeNull();
  });

  it('only spec edge types exist', () => {
    const allowed = new Set(['subgenre|tempo', 'pattern|tempo', 'method|pattern']);
    for (const [a, b] of g.edges) expect(allowed.has([type(a), type(b)].sort().join('|'))).toBe(true);
  });

  it('every pattern and every subgenre has ≥1 tempo edge', () => {
    for (const n of g.nodes.filter(n => n.type === 'pattern' || n.type === 'subgenre'))
      expect(neighbours(g, n.id).some(id => type(id) === 'tempo')).toBe(true);
  });

  it('pattern–method edges come from code and initialTransforms', () => {
    expect(neighbours(g, 'pattern:kick_berghain_rumble')).toEqual(expect.arrayContaining(['method:lpf', 'method:room', 'method:shape']));
  });

  it('every subgenre has an alias equal to its own label', () => {
    for (const s of SUBGENRE_NODES) expect(s.aliases).toContain(s.label);
  });
});

describe('graphRag', () => {
  it('resolves scene aliases without a direct tag hit', () => {
    expect(retrieveGraph('a Motor City style groove', intent()).seedSubgenres).toEqual(['detroit']);
    expect(retrieveGraph('klingt nach Berghain um 6 Uhr', intent()).seedSubgenres).toEqual(['hypnotic']);
    expect(retrieveGraph('something in the vein of Basic Channel', intent()).seedSubgenres).toEqual(['dub']);
  });

  it('falls back to the intent genre only where it is a subgenre', () => {
    expect(retrieveGraph('make something', intent('minimal')).seedSubgenres).toEqual(['minimal']);
    expect(retrieveGraph('make something', intent('techno')).seedSubgenres).toEqual([]);
  });

  it('explicit bpm selects exactly its band', () => {
    const r = retrieveGraph('warehouse stomper at 140 bpm', intent());
    expect(r.bpm).toBe(140);
    expect(r.bands).toEqual(['tempo:135-150']);
  });

  it('subgenre seeds expand to their tempo band', () => {
    expect(retrieveGraph('dub techno', intent()).bands).toEqual(['tempo:115-124']);
  });

  it('rankWithGraph returns k patterns of the pillar', () => {
    const r = retrieveGraph('a Motor City style groove', intent());
    const ranked = rankWithGraph('percussion', r, intent(), 8);
    expect(ranked).toHaveLength(8);
    expect(ranked.every(p => soundLibrary.percussion.includes(p))).toBe(true);
    expect(ranked.map(p => p.id)).toContain('perc_motor_city_groove');
  });

  it('pattern context text names subgenre, band, patterns and functions', () => {
    const r = retrieveGraph('detroit', intent());
    const ranked = rankWithGraph('drums', r, intent(), 8);
    const text = graphContextText(r, 'drums', ranked);
    expect(text).toContain('detroit');
    expect(text).toMatch(/130–134 BPM/);
    expect(text).toContain(ranked[0].id);
    expect(text).toMatch(/functions: .*\w/);
  });

  it('subgenre context text for S6: tempo per seed, list of subgenres when none', () => {
    expect(subgenreContextText(retrieveGraph('acid please', intent()))).toMatch(/acid → 132 BPM/);
    const none = subgenreContextText(retrieveGraph('make it slap', intent()));
    expect(none).toContain('no subgenre recognised');
    for (const s of SUBGENRES) expect(none).toContain(s);
    expect(subgenreContextText(retrieveGraph('acid please', intent()))).toMatch(/typical Strudel functions: \w/);
  });
});
```

- [ ] **Step 3: Adjust tag expectations in three other test files**

`tests/eval/codeLexicon.test.js`:
- In `four-on-the-floor 909 kick → kick, sparse, techno` change the test name to `four-on-the-floor 909 kick → kick, sparse` and the expectation to `toEqual(['kick', 'sparse'])`.
- In `crush ≤ 8 → gritty + lofi` change the name to `crush ≤ 8 → gritty` and the expectation to `expect(tags).toEqual(expect.arrayContaining(['gritty', 'hats']));`

`tests/eval/runner.test.js`:
- `expect(s0.tags).toEqual(expect.arrayContaining(['kick', 'techno']));` → `expect(s0.tags).toEqual(expect.arrayContaining(['kick']));`
- `expect(s3.tags).toEqual(['kick', 'techno']);` → `expect(s3.tags).toEqual(['kick']);`

`tests/eval/corpus.test.js`:
- In `fixture()` change `expected: ['techno', 'kick']` to `expected: ['acid', 'kick']`.
- In `changes when an expectation changes` change `['house']` to `['dub']`.

- [ ] **Step 4: Run tests to verify they fail**

Run: `npx vitest run tests/eval/vocabulary.test.js tests/eval/graph.test.js`
Expected: FAIL (`EVAL_VOCAB.subgenre` undefined, `SUBGENRES` not exported, `subgenreContextText` not exported).

- [ ] **Step 5: Implement `eval/vocabulary.js`**

```js
import { soundLibrary } from '../src/library/soundLibrary.js';

// Shared evaluation vocabulary (spec Rev. 2 §4.1, techno only). Corpus expectations,
// ID-derived tags (S3–S5) and code-derived tags (all stages) use exactly these terms.
export const EVAL_VOCAB = {
  subgenre: ['acid', 'detroit', 'dub', 'hypnotic', 'industrial', 'minimal', 'peak-time'],
  character: ['dark', 'driving', 'warm', 'gritty', 'spacious', 'glitchy', 'sparse', 'dense', 'metallic', 'deep', 'dissonant', 'evolving'],
  element: ['kick', 'bass', 'sub', 'hats', 'clap', 'percussion', 'lead', 'chords', 'arp', 'pad', 'fx'],
};
export const ALL_TAGS = Object.values(EVAL_VOCAB).flat();
const VOCAB = new Set(ALL_TAGS);

// Every library tag → canonical tags. [] = deliberately dropped (technical, not semantic,
// or outside the techno focus: 'techno' itself says nothing about the subgenre).
export const LIBRARY_TAG_MAP = {
  'dark': ['dark'], 'minimal': ['minimal'], 'bass': ['bass'], 'techno': [], 'melody': ['lead'],
  'perc': ['percussion'], 'kick': ['kick'], '909': [], 'hihat': ['hats'], 'industrial': ['industrial'],
  'sparse': ['sparse'], 'hypnotic': ['hypnotic'], 'chromatic': ['dissonant'], 'synth': ['lead'],
  'transition': ['fx'], 'groove': [], 'acid': ['acid'], 'saw': [], 'minor': ['dark'], 'filter': [],
  'sub': ['sub'], 'sine': [], 'chord': ['chords'], 'phrygian': ['dark'], 'generative': ['evolving'],
  'tritone': ['dissonant'], 'dissonant': ['dissonant'], 'arp': ['arp'], '303': ['acid'],
  'distorted': ['gritty'], '4x4': ['kick'], '4*4': ['kick'], 'house': [], 'syncopated': [],
  'euclidean': [], 'rolling': ['hypnotic'], 'offbeat': [], 'stereo': ['spacious'], 'driving': ['driving'],
  'delay': ['spacious'], 'atmospheric': ['spacious'], 'square': [], 'clap': ['clap'], 'lo-fi': [],
  'squelch': ['acid'], 'bleep': ['lead'], 'descending': [], 'basic': [], 'foundation': ['kick'],
  'dirt': [], 'club': [], 'warm': ['warm'], 'rhythmic': [], 'two-bar': [], 'dynamic': [],
  'accented': ['driving'], 'progressive': ['evolving'], 'slinker': [], 'tribal': ['percussion'],
  'tom': ['percussion'], 'percussive': ['percussion'], 'classic': [], 'deep': ['deep'],
  'resonance': ['acid'], 'dub': ['dub'], 'metallic': ['metallic'], 'modulation': ['evolving'],
  'panning': ['spacious'], 'hats': ['hats'], 'ambient': [], 'probability': ['glitchy'],
  'ghostly': ['spacious'], 'tape-drift': [], 'pitch-modulation': ['evolving'], 'warp': ['glitchy'],
  'rimshot': ['percussion'], 'warehouse': ['industrial'], 'detroit': ['detroit'], 'toms': ['percussion'],
  'modulated': ['evolving'], 'rim': ['percussion'], 'degrading': ['glitchy'], 'sequence': ['arp'],
  'trance': [], 'shimmer': ['pad'], 'polyrhythmic': [], 'psychedelic': ['hypnotic'],
  'complex': ['dense'], 'modular': ['evolving'], 'glitch': ['glitchy'], 'overdrive': ['gritty'],
  'sh101': ['lead'], 'raw': ['gritty'], 'dyad': ['chords'], 'upper': [], 'pan': ['spacious'],
  'ascending': [], 'minor7': ['chords'], 'stutter': ['glitchy'], 'tension': ['dissonant'],
};

// The pillar itself says what kind of element a pattern is.
export const PILLAR_ELEMENT = { drums: 'kick', bass: 'bass', percussion: 'percussion', melody: 'lead', transitions: 'fx' };

export function canonicalTags(tags) {
  return [...new Set(tags)].filter(t => VOCAB.has(t)).sort();
}

export function normalizeLibraryTags(tags) {
  return canonicalTags(tags.flatMap(t => LIBRARY_TAG_MAP[t.toLowerCase()] ?? []));
}

export function patternById(id) {
  for (const [pillar, patterns] of Object.entries(soundLibrary)) {
    const pattern = patterns.find(p => p.id === id);
    if (pattern) return { pillar, pattern };
  }
  return null;
}

// Tags derived from selected ids (S3–S5, reported as f1). Unknown ids contribute nothing.
export function tagsForPatternIds(ids) {
  const tags = [];
  for (const id of ids ?? []) {
    const hit = patternById(id);
    if (!hit) continue;
    tags.push(PILLAR_ELEMENT[hit.pillar], ...normalizeLibraryTags(hit.pattern.tags));
  }
  return canonicalTags(tags);
}
```

- [ ] **Step 6: Implement `eval/graph/knowledgeGraph.js`**

```js
import { soundLibrary } from '../../src/library/soundLibrary.js';
import { METHOD_CARDS } from '../../src/library/strudelDocs.js';
import { TRANSFORMS } from '../../src/library/transformationsLibrary.js';
import { normalizeLibraryTags, EVAL_VOCAB } from '../vocabulary.js';

// Curated, deliberately small (stage S5, context for S6): Unterart ↔ Tempo ↔ Klangbaustein ↔ Strudel-Funktion.
// Aliases are node attributes — the entry points for prompts without a direct tag hit (corpus category "alias").
export const SUBGENRES = EVAL_VOCAB.subgenre;

export const SUBGENRE_NODES = [
  { label: 'acid',       aliases: ['acid', '303', 'squelch', 'squelchy'] },
  { label: 'detroit',    aliases: ['detroit', 'motor city', 'underground resistance', 'motown'] },
  { label: 'dub',        aliases: ['dub', 'dub techno', 'basic channel', 'echo chamber', 'chain reaction'] },
  { label: 'hypnotic',   aliases: ['hypnotic', 'hypnotisch', 'berghain', 'rolling', '4am', '4 uhr'] },
  { label: 'industrial', aliases: ['industrial', 'ebm', 'hard techno', 'warehouse', 'factory', 'fabrik', 'noise'] },
  { label: 'minimal',    aliases: ['minimal', 'minimalistisch', 'microhouse', 'stripped', 'minimalist'] },
  { label: 'peak-time',  aliases: ['peak-time', 'peak time', 'tresor', 'rave', 'festival', 'mainstage'] },
];

export const TEMPO_BANDS = [
  { id: '115-124', min: 115, max: 124 },
  { id: '125-129', min: 125, max: 129 },
  { id: '130-134', min: 130, max: 134 },
  { id: '135-150', min: 135, max: 150 },
];

// Spec §2.3: standard tempo per subgenre. S6's compiler uses exactly this table.
export const SUBGENRE_BPM = { acid: 132, detroit: 130, dub: 120, hypnotic: 128, industrial: 138, minimal: 125, 'peak-time': 134 };

export function bandOfBpm(bpm) {
  return TEMPO_BANDS.find(b => bpm >= b.min && bpm <= b.max) ?? null;
}

export const SUBGENRE_TEMPO = Object.fromEntries(SUBGENRES.map(s => [s, [bandOfBpm(SUBGENRE_BPM[s]).id]]));

// Library default aesthetic: driving dark techno.
export const DEFAULT_PATTERN_BANDS = ['130-134'];

const SUBGENRE_SET = new Set(SUBGENRES);
const METHOD_NAMES = new Set([...Object.keys(METHOD_CARDS), ...Object.values(TRANSFORMS).map(t => t.method)]);

function patternMethods(pattern) {
  const fromCode = [...pattern.code.matchAll(/\.([a-zA-Z]+)\s*\(/g)].map(m => m[1]);
  const fromTransforms = Object.keys(pattern.initialTransforms ?? {}).map(k => TRANSFORMS[k]?.method).filter(Boolean);
  return [...new Set([...fromCode, ...fromTransforms])].filter(m => METHOD_NAMES.has(m)).sort();
}

let cached = null;

export function buildKnowledgeGraph() {
  if (cached) return cached;
  const nodes = [];
  const edges = [];
  const methods = new Set();

  for (const s of SUBGENRE_NODES) {
    nodes.push({ id: `subgenre:${s.label}`, type: 'subgenre', label: s.label, aliases: s.aliases });
    for (const band of SUBGENRE_TEMPO[s.label]) edges.push([`subgenre:${s.label}`, `tempo:${band}`]);
  }
  for (const b of TEMPO_BANDS) nodes.push({ id: `tempo:${b.id}`, type: 'tempo', label: `${b.min}–${b.max} BPM`, min: b.min, max: b.max });

  for (const [pillar, patterns] of Object.entries(soundLibrary)) {
    for (const p of patterns) {
      const id = `pattern:${p.id}`;
      nodes.push({ id, type: 'pattern', label: p.name, pillar });
      const subs = normalizeLibraryTags(p.tags).filter(t => SUBGENRE_SET.has(t));
      const bands = subs.length ? [...new Set(subs.flatMap(s => SUBGENRE_TEMPO[s]))] : DEFAULT_PATTERN_BANDS;
      for (const band of bands) edges.push([`tempo:${band}`, id]);
      for (const m of patternMethods(p)) { methods.add(m); edges.push([id, `method:${m}`]); }
    }
  }
  for (const m of [...methods].sort()) nodes.push({ id: `method:${m}`, type: 'method', label: m });

  cached = { nodes, edges };
  return cached;
}

export function neighbours(graph, id) {
  const out = [];
  for (const [a, b] of graph.edges) {
    if (a === id) out.push(b);
    else if (b === id) out.push(a);
  }
  return out;
}
```

- [ ] **Step 7: Implement `eval/graph/graphRag.js`**

```js
import { buildKnowledgeGraph, neighbours, SUBGENRE_NODES, SUBGENRES, SUBGENRE_BPM, bandOfBpm } from './knowledgeGraph.js';
import { lexIntent } from '../../src/intent.js';
import { rankPatternsByIntent } from '../../src/promptEngine.js';

const CONTEXT_PATTERNS = 5;
const CONTEXT_FUNCTIONS = 8;
const SUBGENRE_SET = new Set(SUBGENRES);

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const mentions = (text, alias) => new RegExp(`\\b${escapeRe(alias)}\\b`, 'i').test(text);

export function retrieveGraph(prompt, intent) {
  const graph = buildKnowledgeGraph();
  let seedSubgenres = SUBGENRE_NODES.filter(s => s.aliases.some(a => mentions(prompt, a))).map(s => s.label);
  // Intent genres come from src/intent.js; only those that are techno subgenres can seed.
  if (!seedSubgenres.length && SUBGENRE_SET.has(intent?.genre)) seedSubgenres = [intent.genre];

  const bpm = lexIntent(prompt).bpm;
  const band = bpm ? bandOfBpm(bpm) : null;
  const bands = band
    ? [`tempo:${band.id}`]
    : [...new Set(seedSubgenres.flatMap(s => neighbours(graph, `subgenre:${s}`)))].sort();

  return { seedSubgenres, bands, bpm: bpm ?? null };
}

// Tag score (existing retrieval) + graph score (seed bands the pattern is linked to).
export function rankWithGraph(pillar, retrieval, intent, k = 8) {
  const graph = buildKnowledgeGraph();
  const seedBands = new Set(retrieval.bands);
  return rankPatternsByIntent(pillar, intent)
    .map(({ pattern, score }, order) => {
      const graphScore = neighbours(graph, `pattern:${pattern.id}`).filter(id => seedBands.has(id)).length;
      return { pattern, total: score + graphScore, order };
    })
    .sort((a, b) => b.total - a.total || a.order - b.order)
    .slice(0, k)
    .map(r => r.pattern);
}

const labelOf = (graph, id) => graph.nodes.find(n => n.id === id)?.label ?? id;

// S5: context for one pillar's selection.
export function graphContextText(retrieval, pillar, ranked) {
  const graph = buildKnowledgeGraph();
  const top = ranked.slice(0, CONTEXT_PATTERNS);
  const functions = [...new Set(top.flatMap(p =>
    neighbours(graph, `pattern:${p.id}`).filter(id => id.startsWith('method:')).map(id => labelOf(graph, id))))].sort();

  const lines = [];
  for (const s of retrieval.seedSubgenres) {
    lines.push(`${s} → ${neighbours(graph, `subgenre:${s}`).map(id => labelOf(graph, id)).join(', ')}`);
  }
  if (retrieval.bpm) lines.push(`requested tempo ${retrieval.bpm} BPM → ${retrieval.bands.map(id => labelOf(graph, id)).join(', ')}`);
  lines.push(`${pillar} patterns in these tempo bands: ${top.map(p => p.id).join(', ')}`);
  lines.push(`typical Strudel functions: ${functions.join(', ') || '(none)'}`);
  return lines.join('\n');
}

// S6: subgenre → tempo knowledge plus the functions most used by patterns in the seed bands.
export function subgenreContextText(retrieval) {
  const graph = buildKnowledgeGraph();
  const lines = retrieval.seedSubgenres.length
    ? retrieval.seedSubgenres.map(s => `${s} → ${SUBGENRE_BPM[s]} BPM (${neighbours(graph, `subgenre:${s}`).map(id => labelOf(graph, id)).join(', ')})`)
    : [`no subgenre recognised — choose the closest of: ${SUBGENRES.join(', ')}`];
  if (retrieval.bpm) lines.push(`requested tempo ${retrieval.bpm} BPM`);

  const bands = retrieval.bands.length ? retrieval.bands : graph.nodes.filter(n => n.type === 'tempo').map(n => n.id);
  const counts = new Map();
  for (const band of bands) {
    for (const p of neighbours(graph, band).filter(id => id.startsWith('pattern:'))) {
      for (const m of neighbours(graph, p).filter(id => id.startsWith('method:'))) {
        counts.set(labelOf(graph, m), (counts.get(labelOf(graph, m)) ?? 0) + 1);
      }
    }
  }
  const functions = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, CONTEXT_FUNCTIONS).map(([m]) => m);
  lines.push(`typical Strudel functions: ${functions.join(', ') || '(none)'}`);
  return lines.join('\n');
}
```

- [ ] **Step 8: Run the full eval suite**

Run: `npx vitest run tests/eval/`
Expected: PASS. If `stages.s5.test.js` fails on `perc_motor_city_groove` ranking, leave it: Task 5 rewrites that test. Every other file must pass.

- [ ] **Step 9: Commit**

```bash
git add eval/vocabulary.js eval/graph/knowledgeGraph.js eval/graph/graphRag.js tests/eval/vocabulary.test.js tests/eval/graph.test.js tests/eval/codeLexicon.test.js tests/eval/runner.test.js tests/eval/corpus.test.js
git commit -m "feat(eval): techno-only vocabulary and subgenre knowledge graph"
```

---

### Task 2: Two hap windows — bar 0 for validity, 4 bars for content

**Files:**
- Modify: `eval/strudelHeadless.js` (replace `queryCycle`)
- Modify: `eval/evalWorker.mjs` (whole file below)
- Modify: `eval/validity.js` (functions `fail`, `evaluateInWorker`, `checkValidity`, `checkValidityNow`)
- Test: `tests/eval/strudelHeadless.test.js`, `tests/eval/validity.test.js`

**Interfaces:**
- Produces:
  - `evaluatePattern(code): Promise<Pattern>` (throws what Strudel throws; `NO_PATTERN` as before), `queryCycles(code, cycles = 1): Promise<Hap[]>` (= `queryArc(0, cycles)`), `queryCycle(code)` (unchanged behaviour = `queryCycles(code, 1)`).
  - `checkValidity(code, { cycles = 1 } = {}) → Validity & { hapsAll: SerializedHap[] }`. `haps` is always bar 0 (classification unchanged). `hapsAll` covers `[0, cycles)`; equals `haps` when `cycles = 1`; `[]` for non-executing classes.
  - `SerializedHap = { value: object, whole: { begin: number, end: number } | null }`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/eval/strudelHeadless.test.js` (inside the file's top-level, after existing tests; add `queryCycles, evaluatePattern` to its import from `../../eval/strudelHeadless.js`):

```js
describe('multi-bar queries', () => {
  it('queryCycles spans n bars; queryCycle stays bar 0', async () => {
    expect(await queryCycles('s("bd*4")', 4)).toHaveLength(16);
    expect(await queryCycle('s("bd*4")')).toHaveLength(4);
  });

  it('alternation advances per bar', async () => {
    const haps = await queryCycles('note("<c3 e3 g3 b3>")', 4);
    expect(haps.map(h => h.value.note)).toEqual(['c3', 'e3', 'g3', 'b3']);
  });

  it('evaluatePattern returns a queryable pattern', async () => {
    const pat = await evaluatePattern('s("bd hh")');
    expect(pat.queryArc(0, 2)).toHaveLength(4);
  });
});
```

Append to `tests/eval/validity.test.js` (it already imports `checkValidity` and closes the worker in `afterAll`):

```js
describe('content window', () => {
  it('hapsAll spans the requested bars, haps stays bar 0', async () => {
    const r = await checkValidity('s("bd*4").bank("RolandTR909")', { cycles: 4 });
    expect(r.errorClass).toBeNull();
    expect(r.haps).toHaveLength(4);
    expect(r.hapsAll).toHaveLength(16);
    expect(r.hapsAll[15].whole).toEqual({ begin: 3.75, end: 4 });
  });

  it('defaults to one bar; non-executing classes have empty hapsAll', async () => {
    expect((await checkValidity('s("bd*4").bank("RolandTR909")')).hapsAll).toHaveLength(4);
    expect((await checkValidity('s("bd".fast(')).hapsAll).toEqual([]);
  });

  it('silent in bar 0 stays silent even if later bars sound', async () => {
    const r = await checkValidity('s("<~ bd>").bank("RolandTR909")', { cycles: 4 });
    expect(r.errorClass).toBe('silent');
    expect(r.hapsAll.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/eval/strudelHeadless.test.js tests/eval/validity.test.js`
Expected: FAIL (`queryCycles is not a function`, `hapsAll` undefined).

- [ ] **Step 3: Implement `eval/strudelHeadless.js`**

Replace the function `queryCycle` (from the comment `// Throws whatever Strudel throws.` to the end of the file) with:

```js
// Throws whatever Strudel throws. Returns the evaluated pattern (labelled `$:` blocks stacked).
export async function evaluatePattern(code) {
  const { core, transpiler } = await loadStrudel();
  labelled = [];
  const { pattern } = await core.evaluate(code, transpiler);
  const result = labelled.length ? core.stack(...labelled) : pattern;
  if (!result || typeof result.queryArc !== 'function') {
    const err = new Error('Expression did not evaluate to a pattern');
    err.code = 'NO_PATTERN';
    throw err;
  }
  return result;
}

// Haps of bars [0, cycles).
export async function queryCycles(code, cycles = 1) {
  return (await evaluatePattern(code)).queryArc(0, cycles);
}

// Haps of bar 0 — the validity window.
export async function queryCycle(code) {
  return queryCycles(code, 1);
}
```

- [ ] **Step 4: Implement `eval/evalWorker.mjs`**

```js
// Worker entry: evaluates Strudel code off the main thread so a hang or OOM
// can be killed by the parent. Not a security boundary (see validity.js).
import { parentPort } from 'node:worker_threads';
import { evaluatePattern } from './strudelHeadless.js';

const num = t => Number(t?.valueOf?.());

function cloneSafe(value) {
  try { structuredClone(value); return value; } catch {
    try { return JSON.parse(JSON.stringify(value)); } catch { return String(value); }
  }
}

const serialize = haps => haps.map(h => ({
  value: cloneSafe(h.value),
  whole: h.whole ? { begin: num(h.whole.begin), end: num(h.whole.end) } : null,
}));

// haps = bar 0 (validity window), hapsAll = bars [0, cycles) (content window).
parentPort.on('message', async ({ id, code, cycles = 1, ping }) => {
  if (ping !== undefined) return parentPort.postMessage({ pong: ping });
  try {
    const pattern = await evaluatePattern(code);
    const haps = pattern.queryArc(0, 1);
    const hapsAll = cycles > 1 ? pattern.queryArc(0, cycles) : haps;
    parentPort.postMessage({ id, ok: true, haps: serialize(haps), hapsAll: serialize(hapsAll) });
  } catch (err) {
    parentPort.postMessage({
      id, ok: false,
      error: { message: String(err?.message ?? err), name: err?.name ?? 'Error', code: err?.code },
    });
  }
});
```

- [ ] **Step 5: Implement the `eval/validity.js` changes**

1. In `fail`, add `hapsAll: []` next to `haps: []`:

```js
function fail(errorClass, detail, extra = {}) {
  return {
    valid: false,
    executes: EXECUTING_CLASSES.includes(errorClass),
    errorClass, detail, haps: [], hapsAll: [], unknownSounds: [], ...extra,
  };
}
```

2. `evaluateInWorker(code)` → `evaluateInWorker(code, cycles)`: change the signature, resolve with both windows, and post `cycles`:
   - `function evaluateInWorker(code, cycles) {`
   - in `settle`: `if (outcome.ok) return resolve({ haps: outcome.haps, hapsAll: outcome.hapsAll });`
   - last line: `w.postMessage({ id, code, cycles });`

3. Replace `checkValidity` and `checkValidityNow`:

```js
// Serialised: the single worker handles one request at a time.
// cycles = content window for lexicon and harmony; classification always uses bar 0.
export function checkValidity(code, { cycles = 1 } = {}) {
  const run = queue.then(() => checkValidityNow(code, cycles));
  queue = run.catch(() => {});
  return run;
}

async function checkValidityNow(code, cycles) {
  if (typeof code !== 'string' || !code.trim()) return fail('empty', 'no code');

  let ast;
  try {
    ast = parse(code, { ecmaVersion: 'latest', sourceType: 'module', allowAwaitOutsideFunction: true });
  } catch (err) {
    return fail('syntax', err.message);
  }
  const forbidden = findForbidden(ast);
  if (forbidden) return fail('forbidden', forbidden);

  let haps, hapsAll;
  try {
    ({ haps, hapsAll } = await evaluateInWorker(code, cycles));
  } catch (err) {
    if (err instanceof WorkerFailure) return fail('runtime', err.message);
    return fail(classifyThrow(err), String(err?.message ?? err));
  }

  const audible = haps.filter(h => isAudible(h.value));
  if (!audible.length) return fail('silent', 'no audible events in cycle 0..1', { haps, hapsAll });

  const unknownSounds = [...new Set(audible.map(h => h.value).filter(v => !isKnownSound(v)).map(soundLabel))];
  if (unknownSounds.length) return fail('unknown_sound', unknownSounds.join(', '), { haps, hapsAll, unknownSounds });

  return { valid: true, executes: true, errorClass: null, detail: null, haps, hapsAll, unknownSounds: [] };
}
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run tests/eval/`
Expected: PASS (all existing validity tests unchanged).

- [ ] **Step 7: Commit**

```bash
git add eval/strudelHeadless.js eval/evalWorker.mjs eval/validity.js tests/eval/strudelHeadless.test.js tests/eval/validity.test.js
git commit -m "feat(eval): 4-bar content window next to the bar-0 validity window"
```

---

### Task 3: Code lexicon — tempo, subgenres, driving, warm, multi-bar

**Files:**
- Modify: `eval/codeLexicon.js` (whole file below)
- Test: `tests/eval/codeLexicon.test.js`

**Interfaces:**
- Consumes: `queryCycles(code, n)` (Task 2), `canonicalTags` (Task 1).
- Produces: `parseBpm(code: string): number` (default 120), `tagsFromCode(code: string, haps: Hap[] | SerializedHap[], { cycles = 1 } = {}): string[]`.

Rules (spec §4.2; thresholds are fixed constants):

| Tag | Rule |
|---|---|
| kick / hats / clap / percussion / bass / sub / lead / chords / dark / spacious / gritty / acid / glitchy | unchanged |
| dense / sparse | known events **per bar** ≥ 24 / 1–6 |
| driving | kick on all four quarters **and** hats on all four eighth offbeats (0.125, 0.375, 0.625, 0.875) |
| warm | a chord onset (≥ 3 pitched notes ≥ MIDI 48) whose notes have `cutoff ≥ 1200` |
| dub | chords **and** spacious |
| industrial | gritty **and** BPM ≥ 135 |
| peak-time | 130 ≤ BPM ≤ 134 **and** dense |
| minimal | sparse **and** no chords |
| hypnotic | `cycles ≥ 4` **and** the bass (pitched < MIDI 48) plays an identical non-empty bar in ≥ 3 of 4 bars |
| detroit | chords **and** warm **and** 125 ≤ BPM ≤ 132 |

- [ ] **Step 1: Write the failing tests**

In `tests/eval/codeLexicon.test.js`:
1. Change the import of `queryCycle` to `import { queryCycle, queryCycles } from '../../eval/strudelHeadless.js';` and `import { tagsFromCode, parseBpm } from '../../eval/codeLexicon.js';`
2. Add below `tagsOf`: `const tagsOf4 = async code => tagsFromCode(code, await queryCycles(code, 4), { cycles: 4 });`
3. Update these expectations (new rule `minimal = sparse and no chords`, `dub = chords and spacious`):
   - `four-on-the-floor 909 kick → kick, sparse` → `toEqual(['kick', 'minimal', 'sparse'])`, name `… → kick, minimal, sparse`
   - `low resonant saw` → `toEqual(['acid', 'bass', 'dark', 'minimal', 'sparse', 'sub'])`
   - `triad with reverb` → `toEqual(['chords', 'dub', 'lead', 'spacious', 'sparse'])`
4. Append:

```js
describe('parseBpm', () => {
  it('reads setcpm and setcps, defaults to 120', () => {
    expect(parseBpm('setcpm(132/4)\ns("bd")')).toBe(132);
    expect(parseBpm('setcpm(30)')).toBe(120);
    expect(parseBpm('setcps(0.5)')).toBe(120);
    expect(parseBpm('setcps(.55)')).toBe(132);
    expect(parseBpm('s("bd*4")')).toBe(120);
  });

  // Review Focus 3
  it('never throws on unusual tempo calls', () => {
    expect(parseBpm('setcpm(x)')).toBe(120);
    expect(parseBpm('setcpm(130/4*1)')).toBe(120);
    expect(parseBpm('setcpm()')).toBe(120);
    expect(parseBpm('setcpm(0/4)')).toBe(120);
    expect(parseBpm(null)).toBe(120);
  });
});

describe('techno rules over 4 bars', () => {
  it('density is per bar, not per window', async () => {
    expect(await tagsOf4('s("bd*4").bank("RolandTR909")')).toEqual(['kick', 'minimal', 'sparse']);
  });

  it('driving = four-on-the-floor + offbeat hats', async () => {
    const tags = await tagsOf4('stack(s("bd*4").bank("RolandTR909"), s("[~ hh]*4").bank("RolandTR909"))');
    expect(tags).toContain('driving');
    expect(await tagsOf4('stack(s("bd*4").bank("RolandTR909"), s("hh*4").bank("RolandTR909"))')).not.toContain('driving');
  });

  it('hypnotic = same bass bar in ≥ 3 of 4 bars', async () => {
    const aaab = 'n("<[0 ~ 0 ~] [0 ~ 0 ~] [0 ~ 0 ~] [3 ~ 0 ~]>").scale("C1:minor").s("sawtooth")';
    const abcd = 'n("<[0 ~ 0 ~] [1 ~ 0 ~] [2 ~ 0 ~] [3 ~ 0 ~]>").scale("C1:minor").s("sawtooth")';
    expect(await tagsOf4(aaab)).toContain('hypnotic');
    expect(await tagsOf4(abcd)).not.toContain('hypnotic');
    expect(await tagsOf(aaab)).not.toContain('hypnotic'); // needs the 4-bar window
  });

  it('industrial = gritty + ≥ 135 BPM', async () => {
    expect(await tagsOf4('setcpm(138/4)\ns("hh*8").bank("RolandTR909").shape(0.5)')).toContain('industrial');
    expect(await tagsOf4('setcpm(128/4)\ns("hh*8").bank("RolandTR909").shape(0.5)')).not.toContain('industrial');
  });

  it('peak-time = 130–134 BPM + dense', async () => {
    expect(await tagsOf4('setcpm(132/4)\nstack(s("hh*16"), s("bd*8"), s("cp*4")).bank("RolandTR909")')).toContain('peak-time');
  });

  it('detroit = chords + warm + 125–132 BPM', async () => {
    const tags = await tagsOf4('setcpm(130/4)\nnote("[c3,eb3,g3]*2").s("sawtooth").lpf(1500)');
    expect(tags).toEqual(expect.arrayContaining(['chords', 'detroit', 'warm']));
    expect(await tagsOf4('setcpm(130/4)\nnote("[c3,eb3,g3]*2").s("sawtooth").lpf(600)')).not.toContain('detroit');
  });

  it('works with serialized 4-bar haps from checkValidity', async () => {
    const code = 'stack(s("bd*4").bank("RolandTR909"), s("[~ hh]*4").bank("RolandTR909"))';
    const res = await checkValidity(code, { cycles: 4 });
    expect(tagsFromCode(code, res.hapsAll, { cycles: 4 })).toEqual(await tagsOf4(code));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/eval/codeLexicon.test.js`
Expected: FAIL (`parseBpm` not exported, new tags missing).

- [ ] **Step 3: Implement `eval/codeLexicon.js`**

```js
import { noteToMidi } from '@strudel/core';
import { canonicalTags } from './vocabulary.js';
import { isKnownSound, BUILTIN_SYNTHS } from './knownSounds.js';

// Deterministic code → tag lexicon (thesis: methodological contribution; spec Rev. 2 §4.2).
// Thresholds are fixed constants — change them only before the corpus is frozen.
const KICK = new Set(['bd', 'kick', 'clubkick']);
const HATS = new Set(['hh', 'oh', 'hat', 'hihat', 'rd', 'ride', 'cr', 'crash']);
const CLAP = new Set(['cp', 'clap']);
const PERC = new Set(['rim', 'rs', 'sd', 'snare', 'lt', 'mt', 'ht', 'tom', 'click', 'perc', 'cb', 'shaker']);
const SYNTHS = new Set(BUILTIN_SYNTHS);
const ACID_SOURCES = new Set(['saw', 'sawtooth', 'square']);
const QUARTERS = [0, 0.25, 0.5, 0.75];
const OFFBEATS = [0.125, 0.375, 0.625, 0.875];

const DENSE_MIN_EVENTS_PER_BAR = 24;
const SPARSE_MAX_EVENTS_PER_BAR = 6;
const DARK_CUTOFF_HZ = 800;
const WARM_CUTOFF_HZ = 1200;
const BASS_MAX_MIDI = 48;
const DEFAULT_BPM = 120;            // Strudel default: 0.5 cycles/s, one cycle = one 4/4 bar
const HYPNOTIC_MIN_REPEATS = 3;

const baseName = s => (s === undefined || s === null ? undefined : String(s).split(':')[0]);
const num = t => Number(t?.valueOf?.() ?? t);
const step = x => Math.round(x * 16) / 16;                 // snap to the 16th grid (float noise)
const posInBar = x => step(((x % 1) + 1) % 1);

function midiOf(value) {
  if (typeof value.note === 'number') return value.note;
  if (typeof value.note === 'string') {
    try { return noteToMidi(value.note); } catch { return null; }
  }
  return null;
}

// BPM from setcpm(x) (cycles per minute, 1 cycle = 4 beats) or setcps(x).
// Accepts a number or "a/b" / "a*b"; anything else → default.
export function parseBpm(code) {
  const m = String(code ?? '').match(/set(cpm|cps)\(\s*([^)]*)\)/i);
  if (!m) return DEFAULT_BPM;
  const arith = m[2].trim().match(/^(\d*\.?\d+)\s*(?:([*/])\s*(\d*\.?\d+))?$/);
  if (!arith) return DEFAULT_BPM;
  let value = Number(arith[1]);
  if (arith[2] === '/') value /= Number(arith[3]);
  if (arith[2] === '*') value *= Number(arith[3]);
  const bpm = m[1].toLowerCase() === 'cpm' ? value * 4 : value * 240;
  return Number.isFinite(bpm) && bpm >= 40 && bpm <= 300 ? Math.round(bpm) : DEFAULT_BPM;
}

// Works with real Hap objects and with serialized haps ({ value, whole: { begin, end } }).
export function tagsFromCode(code, haps = [], { cycles = 1 } = {}) {
  const tags = new Set();
  const chordOnsets = new Map();          // onset → { count, warm }
  const kickPositions = new Set();
  const hatPositions = new Set();
  const bassBars = new Map();             // bar index → ["pos:midi", …]
  let knownEvents = 0;

  for (const hap of haps) {
    const v = hap.value;
    if (!v || typeof v !== 'object') continue;
    if (!isKnownSound(v)) continue;
    const sound = baseName(v.s);
    const onset = hap.whole ? num(hap.whole.begin) : null;
    knownEvents++;

    if (sound && KICK.has(sound)) { tags.add('kick'); if (onset !== null) kickPositions.add(posInBar(onset)); }
    if (sound && HATS.has(sound)) { tags.add('hats'); if (onset !== null) hatPositions.add(posInBar(onset)); }
    if (sound && CLAP.has(sound)) tags.add('clap');
    if (sound && PERC.has(sound)) tags.add('percussion');

    const midi = midiOf(v);
    if (midi !== null && (sound === undefined || SYNTHS.has(sound))) {
      if (midi < BASS_MAX_MIDI) {
        tags.add('bass');
        if (onset !== null) {
          const bar = Math.floor(onset + 1e-9);
          bassBars.set(bar, [...(bassBars.get(bar) ?? []), `${posInBar(onset)}:${Math.round(midi)}`]);
        }
      }
      if (midi < 36) tags.add('sub');
      if (midi >= BASS_MAX_MIDI) {
        tags.add('lead');
        if (onset !== null) {
          const key = step(onset);
          const entry = chordOnsets.get(key) ?? { count: 0, warm: false };
          entry.count++;
          if (typeof v.cutoff === 'number' && v.cutoff >= WARM_CUTOFF_HZ) entry.warm = true;
          chordOnsets.set(key, entry);
        }
      }
    }

    if (typeof v.cutoff === 'number' && v.cutoff < DARK_CUTOFF_HZ) tags.add('dark');
    if ((v.room ?? 0) >= 0.4 || (v.delay ?? 0) >= 0.4) tags.add('spacious');
    const crushed = typeof v.crush === 'number' && v.crush <= 8;
    if ((v.shape ?? 0) >= 0.3 || (v.distort ?? 0) >= 0.2 || crushed || (v.coarse ?? 0) >= 4) tags.add('gritty');
    if ((v.resonance ?? 0) >= 10 && ACID_SOURCES.has(sound)) tags.add('acid');
  }

  const bars = Math.max(1, cycles);
  const perBar = knownEvents / bars;
  if (perBar >= DENSE_MIN_EVENTS_PER_BAR) tags.add('dense');
  if (knownEvents > 0 && perBar <= SPARSE_MAX_EVENTS_PER_BAR) tags.add('sparse');

  const chordEntries = [...chordOnsets.values()].filter(e => e.count >= 3);
  const chords = chordEntries.length > 0;
  if (chords) tags.add('chords');
  if (chordEntries.some(e => e.warm)) tags.add('warm');

  const src = String(code ?? '');
  if (/\.degradeBy\(|\.sometimes|\.rarely|[\w~\]]\?/.test(src)) tags.add('glitchy');
  if (/scale\(\s*["'][^"']*:(minor|phrygian|locrian|aeolian)/i.test(src)) tags.add('dark');

  const fourOnFloor = QUARTERS.every(p => kickPositions.has(p));
  if (fourOnFloor && OFFBEATS.every(p => hatPositions.has(p))) tags.add('driving');

  const bpm = parseBpm(src);
  if (chords && tags.has('spacious')) tags.add('dub');
  if (tags.has('gritty') && bpm >= 135) tags.add('industrial');
  if (bpm >= 130 && bpm <= 134 && tags.has('dense')) tags.add('peak-time');
  if (tags.has('sparse') && !chords) tags.add('minimal');
  if (chords && tags.has('warm') && bpm >= 125 && bpm <= 132) tags.add('detroit');

  if (cycles >= 4) {
    const signatures = new Map();
    for (const events of bassBars.values()) {
      const sig = [...events].sort().join('|');
      signatures.set(sig, (signatures.get(sig) ?? 0) + 1);
    }
    if ([...signatures.values()].some(n => n >= HYPNOTIC_MIN_REPEATS)) tags.add('hypnotic');
  }

  return canonicalTags([...tags]);
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/eval/`
Expected: PASS. If the `peak-time` test reports fewer than 24 events per bar, check that `.bank()` applies to the whole `stack` (it does in Strudel ≥ 1.0); the expectation is 28 events per bar.

- [ ] **Step 5: Commit**

```bash
git add eval/codeLexicon.js tests/eval/codeLexicon.test.js
git commit -m "feat(eval): code lexicon reads tempo, techno subgenres, driving and warm over 4 bars"
```

---

### Task 4: Harmony metric

**Files:**
- Create: `eval/harmony.js`
- Test: `tests/eval/harmony.test.js`

**Interfaces:**
- Consumes: `queryCycles` (Task 2) in tests; `BUILTIN_SYNTHS` from `eval/knownSounds.js`.
- Produces: `harmonyMetrics(haps: Hap[] | SerializedHap[]) → { pitched: number, inKey: number, clashRate: number, lowCrowding: number }` (NaN where undefined), `DIATONIC_SETS: number[][]`.

Definitions (spec §4):
- Pitched event = has `value.note` (number or note name) **and** (`value.s` undefined **or** a built-in synth) **and** a `whole`.
- `inKey` = max over the 12 diatonic pitch-class sets (major scale on each root) of the share of pitched events inside the set. `NaN` if `pitched < 2`.
- Simultaneous pair = two different pitched events whose `[begin, end)` intervals overlap.
- `clashRate` = share of simultaneous pairs with interval class 1 or 6. `NaN` if no pairs.
- `lowCrowding` = share of simultaneous pairs whose lower note is < MIDI 48 and whose distance is < 12 semitones. `NaN` if no pairs.

- [ ] **Step 1: Write the failing tests**

`tests/eval/harmony.test.js`:

```js
import { describe, it, expect, afterAll } from 'vitest';
import { harmonyMetrics, DIATONIC_SETS } from '../../eval/harmony.js';
import { queryCycles } from '../../eval/strudelHeadless.js';
import { checkValidity, closeValidityWorker } from '../../eval/validity.js';

const of = async (code, cycles = 1) => harmonyMetrics(await queryCycles(code, cycles));
afterAll(() => closeValidityWorker());

describe('harmonyMetrics', () => {
  it('12 diatonic sets of 7 pitch classes', () => {
    expect(DIATONIC_SETS).toHaveLength(12);
    expect(DIATONIC_SETS[0]).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });

  it('scale melody: fully in key, no simultaneous pairs', async () => {
    const h = await of('n("0 2 4 5").scale("C3:minor").s("sine")');
    expect(h).toMatchObject({ pitched: 4, inKey: 1 });
    expect(h.clashRate).toBeNaN();
    expect(h.lowCrowding).toBeNaN();
  });

  it('chromatic run: 7 of 12 in the best key', async () => {
    expect((await of('note("c3 db3 d3 eb3 e3 f3 gb3 g3 ab3 a3 bb3 b3").s("sine")')).inKey).toBeCloseTo(7 / 12, 10);
  });

  it('semitone and tritone clash, triad does not', async () => {
    expect((await of('note("[c3,db3]").s("sine")')).clashRate).toBe(1);
    expect((await of('note("[c3,gb3]").s("sine")')).clashRate).toBe(1);
    expect((await of('note("[c3,e3,g3]").s("sine")')).clashRate).toBe(0);
  });

  it('low crowding only below C3 and within an octave', async () => {
    expect((await of('note("[c1,e1]").s("sine")')).lowCrowding).toBe(1);
    expect((await of('note("[c1,c3]").s("sine")')).lowCrowding).toBe(0);
    expect((await of('note("[c3,e3]").s("sine")')).lowCrowding).toBe(0);
  });

  it('two layers in different keys clash over 4 bars', async () => {
    const h = await of('stack(n("0 ~ 0 ~").scale("D1:phrygian").s("sawtooth"), n("[0,2,4]").scale("G#3:minor").s("square"))', 4);
    expect(h.inKey).toBeLessThan(1);
    expect(h.clashRate).toBeGreaterThan(0);
  });

  // Review Focus 4
  it('drums only and haps without whole → NaN, no crash', async () => {
    const drums = await of('s("bd*4").bank("RolandTR909")');
    expect(drums.pitched).toBe(0);
    expect(drums.inKey).toBeNaN();
    expect(harmonyMetrics([{ value: { note: 48, s: 'sine' }, whole: null }, { value: null, whole: null }])).toMatchObject({ pitched: 0 });
    expect(harmonyMetrics([]).inKey).toBeNaN();
  });

  it('works with serialized haps from checkValidity', async () => {
    const code = 'note("[c3,db3] [c3,e3]").s("sine")';
    const res = await checkValidity(code, { cycles: 4 });
    expect(harmonyMetrics(res.hapsAll)).toEqual(await of(code, 4));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/eval/harmony.test.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `eval/harmony.js`**

```js
import { noteToMidi } from '@strudel/core';
import { BUILTIN_SYNTHS } from './knownSounds.js';

// Harmonic coherence (spec Rev. 2 §4): theory-based, track-agnostic, so it applies to
// free code (S0–S2) exactly like to compiled tracks (S3–S6).
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
// Each diatonic pitch-class set covers its major key and all its modes (minor, dorian, phrygian, …).
export const DIATONIC_SETS = Array.from({ length: 12 }, (_, root) => MAJOR.map(s => (s + root) % 12));
const CLASH_INTERVAL_CLASSES = new Set([1, 6]);
const LOW_MIDI = 48;
const SYNTHS = new Set(BUILTIN_SYNTHS);

const num = t => Number(t?.valueOf?.() ?? t);
const pc = midi => ((Math.round(midi) % 12) + 12) % 12;

function midiOf(value) {
  if (typeof value.note === 'number') return value.note;
  if (typeof value.note === 'string') {
    try { return noteToMidi(value.note); } catch { return null; }
  }
  return null;
}

function pitchedEvents(haps) {
  const out = [];
  for (const h of haps ?? []) {
    const v = h?.value;
    if (!v || typeof v !== 'object' || !h.whole) continue;
    if (v.s !== undefined && !SYNTHS.has(String(v.s).split(':')[0])) continue;
    const midi = midiOf(v);
    if (midi === null || !Number.isFinite(midi)) continue;
    out.push({ midi, begin: num(h.whole.begin), end: num(h.whole.end) });
  }
  return out;
}

export function harmonyMetrics(haps) {
  const events = pitchedEvents(haps);
  const pitched = events.length;

  let inKey = NaN;
  if (pitched >= 2) {
    inKey = Math.max(...DIATONIC_SETS.map(set => {
      const s = new Set(set);
      return events.filter(e => s.has(pc(e.midi))).length / pitched;
    }));
  }

  let pairs = 0, clashes = 0, crowded = 0;
  for (let i = 0; i < pitched; i++) {
    for (let j = i + 1; j < pitched; j++) {
      const a = events[i], b = events[j];
      if (!(a.begin < b.end && b.begin < a.end)) continue;
      pairs++;
      const dist = Math.abs(Math.round(a.midi) - Math.round(b.midi));
      const ic = Math.min(dist % 12, 12 - (dist % 12));
      if (CLASH_INTERVAL_CLASSES.has(ic)) clashes++;
      if (Math.min(a.midi, b.midi) < LOW_MIDI && dist < 12) crowded++;
    }
  }

  return {
    pitched,
    inKey,
    clashRate: pairs ? clashes / pairs : NaN,
    lowCrowding: pairs ? crowded / pairs : NaN,
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/eval/harmony.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add eval/harmony.js tests/eval/harmony.test.js
git commit -m "feat(eval): harmonic coherence metric (in-key share, clash rate, low crowding)"
```

---

### Task 5: Three fixed parts and techno task prompt for S0–S5

**Files:**
- Modify: `eval/stages/common.js` (top of file: `DEFAULT_TRACK_PILLARS` / `trackPillars`)
- Modify: `eval/stages/s0.js` (`S0_SYSTEM`)
- Modify: `eval/stages/s1.js` (`CORE_FUNCTIONS`)
- Test: `tests/eval/stages.free.test.js`, `tests/eval/stages.s3.test.js`, `tests/eval/stages.s4.test.js`, `tests/eval/stages.s5.test.js`

**Interfaces:**
- Produces: `TRACK_PILLARS = ['drums', 'bass', 'melody']`, `trackPillars(): string[]` (ignores intent, returns `TRACK_PILLARS`), `S0_SYSTEM` (spec §2.2 text), `CORE_FUNCTIONS` incl. `setcpm`.

- [ ] **Step 1: Update tests**

`tests/eval/stages.free.test.js`:
- In `S0 baseline › one unconstrained call, code out` add after the `messages[0]` assertion:
```js
    expect(S0_SYSTEM).toContain('three parts: drums (kick and hi-hats), a bassline, and a melodic part (stab or lead)');
    expect(S0_SYSTEM).toContain('techno loop');
```
- In `spec block lists …` add `expect(block).toContain('setcpm');`
- Replace the test `examples block holds the top-3 library patterns per intent pillar, with code` with:
```js
  it('examples block holds the top-3 library patterns for drums, bass and melody, with code', () => {
    const block = buildExamplesBlock({ genre: 'techno', moods: ['dark'], textures: [], layers: [{ pillar: 'drums' }] });
    for (const pillar of ['drums', 'bass', 'melody']) expect((block.match(new RegExp(`^\\[${pillar}\\]`, 'gm')) ?? []).length).toBe(3);
    expect(block).not.toMatch(/^\[percussion\]/m);
    expect(block).toMatch(/^\[drums\] \w+ \(tags: .+\): s\(/m);
  });
```

`tests/eval/stages.s3.test.js`:
- Replace `trackPillars keeps PILLAR_NAMES order and defaults to drums+bass` with:
```js
  it('trackPillars is always drums, bass, melody (spec §2.1)', () => {
    expect(trackPillars({ layers: [{ pillar: 'percussion' }] })).toEqual(['drums', 'bass', 'melody']);
    expect(trackPillars(null)).toEqual(['drums', 'bass', 'melody']);
    expect(TRACK_PILLARS).toEqual(['drums', 'bass', 'melody']);
  });
```
  and add `TRACK_PILLARS` to the import from `../../eval/stages/common.js`.
- In `builds a stack with one selected pattern per intent pillar`: rename to `builds a stack with one selected pattern per part`; `toHaveLength(2)` → `toHaveLength(3)`; add `expect(soundLibrary.melody.map(p => p.id)).toContain(r.selectedIds[2]);`; `calls: 3, promptTokens: 30, evalTokens: 15` → `calls: 4, promptTokens: 40, evalTokens: 20`; `outputs).toHaveLength(3)` → `toHaveLength(4)`.
- In `a failed pillar plan drops that layer but keeps the track`: `toHaveLength(1)` → `toHaveLength(2)`; `expect(r.code.startsWith('stack(')).toBe(false);` → `expect(r.code.startsWith('stack(')).toBe(true);`

`tests/eval/stages.s4.test.js`: `expect(planBodies).toHaveLength(2);` → `3`; `expect(r.selectedIds).toHaveLength(2);` → `3`.

`tests/eval/stages.s5.test.js`: replace the first test with:
```js
  it('keeps reasoning, injects graph context and graph-ranked catalog for all three parts', async () => {
    mockOllama(b => (isIntentCall(b) ? intentJson(['drums']) : firstChoicePlan(b, { reasoning: 'r' })));
    const r = await S5.run('a Motor City style groove', { temperature: 0.7, seed: 1 });
    expect(S5).toMatchObject({ id: 'S5', tagSource: 'ids' });
    const plans = bodies().filter(isPlanCall);
    expect(plans).toHaveLength(3);
    for (const plan of plans) {
      expect(Object.keys(plan.format.properties)[0]).toBe('reasoning');
      expect(plan.messages[0].content).toContain('Knowledge graph context');
      expect(plan.messages[0].content).toContain('detroit');
      expect(plan.format.properties.selectedId.enum).toHaveLength(8);
    }
    expect(r.selectedIds).toHaveLength(3);
  });
```
  Leave the registry test as is (Task 7 changes it).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/eval/stages.free.test.js tests/eval/stages.s3.test.js tests/eval/stages.s4.test.js tests/eval/stages.s5.test.js`
Expected: FAIL (old prompt text, `TRACK_PILLARS` not exported, 2 instead of 3 parts).

- [ ] **Step 3: Implement**

`eval/stages/common.js` — replace the block from `// Underspecified prompts …` through the end of `trackPillars` with:

```js
// Spec Rev. 2 §2.1: every stage produces drums, bass and a melodic part,
// so harmony is measurable and stages are comparable.
export const TRACK_PILLARS = ['drums', 'bass', 'melody'];

export function trackPillars() {
  return TRACK_PILLARS;
}
```

and change the import line `import { PILLAR_NAMES, makePillars } from '../../src/pillars.js';` to `import { makePillars } from '../../src/pillars.js';`

`eval/stages/s0.js` — replace `S0_SYSTEM`:

```js
export const S0_SYSTEM = `You are a live-coding assistant for Strudel (strudel.cc), a JavaScript pattern language for music.
Write a techno loop in Strudel for the user's request with three parts: drums (kick and hi-hats), a bassline, and a melodic part (stab or lead).
Output ONLY the Strudel code — no prose, no markdown fences, no comments.`;
```

and update its comment line above to: `// S0 — baseline: raw prompt, direct code output. The system prompt states the task (three techno parts) and the output format.`

`eval/stages/s1.js` — `CORE_FUNCTIONS`:

```js
export const CORE_FUNCTIONS = ['s', 'note', 'n', 'stack', 'cat', 'seq', 'bank', 'scale', 'fast', 'slow', 'gain', 'setcpm'];
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/eval/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add eval/stages/common.js eval/stages/s0.js eval/stages/s1.js tests/eval/stages.free.test.js tests/eval/stages.s3.test.js tests/eval/stages.s4.test.js tests/eval/stages.s5.test.js
git commit -m "feat(eval): fixed drums/bass/melody parts and techno task prompt for S0–S5"
```

---

### Task 6: S6 form and compiler

**Files:**
- Create: `eval/s6/form.js`, `eval/s6/compiler.js`
- Test: `tests/eval/s6.compiler.test.js`

**Interfaces:**
- Consumes: `SUBGENRES`, `SUBGENRE_BPM` (Task 1); `checkValidity` (Task 2) and `harmonyMetrics` (Task 4) in tests.
- Produces:
  - `form.js`: `KEYS`, `SCALES`, `EFFECTS`, `BASS_SOUNDS`, `STAB_SOUNDS`, `LANE_FIELDS = ['bassA','bassB','hat','openhat','clap','stab']`, `FORM_SCHEMA` (JSON schema, `reasoning` first), `FORM_EXAMPLE`, `S6_SYSTEM: string`.
  - `compiler.js`: `compileForm(form: object) → { code: string, fallbacks: string[], subgenre, key, scale, bpm, effect }`. Never throws; any input yields valid Strudel code.

- [ ] **Step 1: Write the failing tests**

`tests/eval/s6.compiler.test.js`:

```js
import { describe, it, expect, afterAll } from 'vitest';
import { compileForm } from '../../eval/s6/compiler.js';
import { FORM_SCHEMA, FORM_EXAMPLE, S6_SYSTEM, LANE_FIELDS } from '../../eval/s6/form.js';
import { checkValidity, closeValidityWorker } from '../../eval/validity.js';
import { harmonyMetrics } from '../../eval/harmony.js';

afterAll(() => closeValidityWorker());

const form = (o = {}) => ({ ...FORM_EXAMPLE, ...o });
const check = async code => checkValidity(code, { cycles: 4 });

describe('S6 form', () => {
  it('schema: reasoning first, every field required, 16-char lanes', () => {
    expect(Object.keys(FORM_SCHEMA.properties)[0]).toBe('reasoning');
    expect(FORM_SCHEMA.required).toEqual(Object.keys(FORM_SCHEMA.properties));
    for (const f of LANE_FIELDS) expect(FORM_SCHEMA.properties[f]).toMatchObject({ type: 'string', minLength: 16, maxLength: 16 });
    expect(FORM_SCHEMA.properties.subgenre.enum).toEqual(['acid', 'detroit', 'dub', 'hypnotic', 'industrial', 'minimal', 'peak-time']);
  });

  it('system prompt explains lanes, A-A-A-B and contains the example', () => {
    expect(S6_SYSTEM).toContain('A A A B');
    expect(S6_SYSTEM).toContain(JSON.stringify(FORM_EXAMPLE));
    expect(S6_SYSTEM).toContain('Do not copy the example');
  });
});

describe('compileForm', () => {
  it('example form → valid code, fixed kick, subgenre tempo, A-A-A-B bass', async () => {
    const out = compileForm(form());
    expect(out).toMatchObject({ subgenre: 'hypnotic', fallbacks: [] });
    expect(out.code).toContain('s("bd*4").bank("RolandTR909")');
    expect(out.code).toContain(`setcpm(${out.bpm}/4)`);
    expect(out.code).toMatch(/n\("<\[[^\]]+\] \[[^\]]+\] \[[^\]]+\] \[[^\]]+\]>"\)\.scale\("F1:minor"\)/);
    expect((await check(out.code)).errorClass).toBeNull();
  });

  it('tempo comes from the subgenre table', () => {
    expect(compileForm(form({ subgenre: 'dub' })).bpm).toBe(120);
    expect(compileForm(form({ subgenre: 'industrial' })).bpm).toBe(138);
  });

  it('every pitched note is in key over 4 bars', async () => {
    for (const key of ['C', 'F#', 'A#']) for (const scale of ['minor', 'phrygian', 'dorian']) {
      const res = await check(compileForm(form({ key, scale, bassA: '0.1.2.3.4.5.6.7.', bassB: '7654321076543210', stab: '0...3...5...6...' })).code);
      expect(res.errorClass).toBeNull();
      expect(harmonyMetrics(res.hapsAll).inKey).toBe(1);
    }
  });

  it('each effect compiles and is visible in the code', async () => {
    const codes = Object.fromEntries(['filter_sweep', 'delay_throw', 'reverb_wash', 'none'].map(effect => [effect, compileForm(form({ effect, effectAmount: 7 })).code]));
    expect(codes.filter_sweep).toContain('sine.range(');
    expect(codes.delay_throw).toContain('.delaytime(');
    expect(codes.reverb_wash).toContain('.size(');
    for (const code of Object.values(codes)) expect((await check(code)).errorClass).toBeNull();
  });

  it('fallbacks: thin bass and empty stab are replaced and reported', async () => {
    const out = compileForm(form({ bassA: '..0.............', bassB: '................', stab: '................' }));
    expect(out.fallbacks).toEqual(['bass', 'stab']);
    expect((await check(out.code)).errorClass).toBeNull();
  });

  // Review Focus 1
  it('code-like junk in lanes never reaches the code', async () => {
    const junk = '"); process.exit(1); ("';
    const out = compileForm(form({ bassA: junk, hat: junk, stab: junk, reasoning: junk, key: junk, bassSound: junk }));
    expect(out.code).not.toContain('process');
    expect(out.code).not.toContain('exit');
    expect((await check(out.code)).errorClass).toBeNull();
  });

  // Review Focus 2
  it('missing fields, wrong types and wrong lane lengths still compile', async () => {
    const out = compileForm({ subgenre: 'polka', bassA: '0.0', hat: 'x'.repeat(40), bassCutoff: '900', effectAmount: 99, effect: 'flanger' });
    expect(out).toMatchObject({ subgenre: 'hypnotic', key: 'A', scale: 'minor', bpm: 128, effect: 'none' });
    expect(out.code).toContain('.lpf(900)');
    expect((await check(out.code)).errorClass).toBeNull();
    expect((await check(compileForm({}).code)).errorClass).toBeNull();
    expect((await check(compileForm(null).code)).errorClass).toBeNull();
  });
});
```


- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/eval/s6.compiler.test.js`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement `eval/s6/form.js`**

```js
import { SUBGENRES } from '../graph/knowledgeGraph.js';

// S6 form (spec Rev. 2 §2.3). The model fills this; eval/s6/compiler.js turns it into Strudel.
export const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const SCALES = ['minor', 'phrygian', 'dorian'];
export const EFFECTS = ['filter_sweep', 'delay_throw', 'reverb_wash', 'none'];
export const BASS_SOUNDS = ['sawtooth', 'square', 'sine'];
export const STAB_SOUNDS = ['sawtooth', 'square', 'triangle'];
export const LANE_FIELDS = ['bassA', 'bassB', 'hat', 'openhat', 'clap', 'stab'];

const lane = { type: 'string', minLength: 16, maxLength: 16 };

export const FORM_SCHEMA = {
  type: 'object',
  properties: {
    reasoning: { type: 'string' },
    subgenre: { type: 'string', enum: SUBGENRES },
    key: { type: 'string', enum: KEYS },
    scale: { type: 'string', enum: SCALES },
    bassA: lane,
    bassB: lane,
    hat: lane,
    openhat: lane,
    clap: lane,
    stab: lane,
    bassSound: { type: 'string', enum: BASS_SOUNDS },
    bassCutoff: { type: 'integer', minimum: 200, maximum: 1500 },
    bassResonance: { type: 'integer', minimum: 0, maximum: 20 },
    stabSound: { type: 'string', enum: STAB_SOUNDS },
    effect: { type: 'string', enum: EFFECTS },
    effectAmount: { type: 'integer', minimum: 0, maximum: 10 },
  },
};
FORM_SCHEMA.required = Object.keys(FORM_SCHEMA.properties);

export const FORM_EXAMPLE = {
  reasoning: 'Dark rolling techno: a steady offbeat bass that shifts once every four bars, sparse stabs, slow filter movement.',
  subgenre: 'hypnotic', key: 'F', scale: 'minor',
  bassA: '..0...0...0.0.0.', bassB: '..0...0...3.0.0.',
  hat: '..x...x...x...x.', openhat: '..............x.', clap: '....x.......x...',
  stab: '......0.......0.',
  bassSound: 'sawtooth', bassCutoff: 450, bassResonance: 10, stabSound: 'sawtooth',
  effect: 'filter_sweep', effectAmount: 6,
};

export const S6_SYSTEM = `You are a techno producer. The kick is always a straight 4/4 and the tempo follows the subgenre; both are added automatically. You fill in a form for a one-bar loop of 16 sixteenth steps.

Start with "reasoning": 2-4 sentences about subgenre, groove and mood.
Lanes are exactly 16 characters:
- hat, openhat, clap: "x" = hit, "." = silent.
- bassA, bassB, stab: a digit 0-7 = SCALE DEGREE (0 root, 2 third, 4 fifth, 7 octave), "." = rest.
Structure: the bass plays bar A three times, then bar B once (A A A B). B is A with 1-3 small changes, so the groove stays hypnotic but shifts.
The bass avoids the kick: put bass notes between the kicks (kicks are on steps 1, 5, 9, 13).
stab: short chord hits, use only 2-5 steps.
effect: exactly one movement effect; effectAmount 0-10 is its strength.

Example for "dark rolling techno":
${JSON.stringify(FORM_EXAMPLE)}

Do not copy the example. Fit the request. Answer with JSON only.`;
```

- [ ] **Step 4: Implement `eval/s6/compiler.js`**

```js
import { SUBGENRES, SUBGENRE_BPM } from '../graph/knowledgeGraph.js';
import { KEYS, SCALES, EFFECTS, BASS_SOUNDS, STAB_SOUNDS } from './form.js';

// Deterministic form → Strudel compiler (S6). Emits only its own templates plus
// whitelisted characters from the form: digits 0-7, "x" and rests. Never throws.
const DEFAULTS = { subgenre: 'hypnotic', key: 'A', scale: 'minor', bassSound: 'sawtooth', stabSound: 'sawtooth', effect: 'none' };
const BASS_FALLBACK = '~ ~ 0 ~ ~ ~ 0 ~ ~ ~ 0 ~ ~ ~ 0 ~'.split(' ');
const STAB_FALLBACK = '~ ~ ~ ~ ~ ~ 0 ~ ~ ~ ~ ~ ~ ~ ~ ~'.split(' ');
const MIN_BASS_NOTES = 3;

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(Number(x)) ? Number(x) : lo));
const pick = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback);
const lane = s => String(typeof s === 'string' ? s : '').padEnd(16, '.').slice(0, 16).split('');
const hits = (s, name) => lane(s).map(c => (c === 'x' || c === 'X' ? name : '~')).join(' ');
const degrees = s => lane(s).map(c => (/^[0-7]$/.test(c) ? c : '~'));
const noteCount = steps => steps.filter(c => c !== '~').length;
const fixed = (x, digits = 2) => x.toFixed(digits);

export function compileForm(input) {
  const f = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const subgenre = pick(f.subgenre, SUBGENRES, DEFAULTS.subgenre);
  const key = pick(f.key, KEYS, DEFAULTS.key);
  const scale = pick(f.scale, SCALES, DEFAULTS.scale);
  const effect = pick(f.effect, EFFECTS, DEFAULTS.effect);
  const bassSound = pick(f.bassSound, BASS_SOUNDS, DEFAULTS.bassSound);
  const stabSound = pick(f.stabSound, STAB_SOUNDS, DEFAULTS.stabSound);
  const bpm = SUBGENRE_BPM[subgenre];
  const cutoff = Math.round(clamp(f.bassCutoff, 200, 1500));
  const resonance = Math.round(clamp(f.bassResonance, 0, 20));
  const amount = clamp(f.effectAmount, 0, 10) / 10;

  const fallbacks = [];
  let bassA = degrees(f.bassA);
  let bassB = degrees(f.bassB);
  if (noteCount(bassA) < MIN_BASS_NOTES) { bassA = BASS_FALLBACK; fallbacks.push('bass'); }
  if (noteCount(bassB) < MIN_BASS_NOTES) bassB = bassA;
  let stab = degrees(f.stab);
  if (noteCount(stab) < 1) { stab = STAB_FALLBACK; fallbacks.push('stab'); }

  const A = `[${bassA.join(' ')}]`;
  const B = `[${bassB.join(' ')}]`;
  const stabChords = stab.map(c => (c === '~' ? '~' : `[${c},${+c + 2},${+c + 4}]`)).join(' ');
  const delayTime = fixed((60 / bpm) * 0.75, 3); // dotted eighth

  const bassLpf = effect === 'filter_sweep'
    ? `.lpf(sine.range(${Math.round(cutoff * (1 - 0.6 * amount))}, ${Math.round(cutoff * (1 + 2 * amount))}).slow(8))`
    : `.lpf(${cutoff})`;
  const stabFx = effect === 'delay_throw'
    ? `.delay(${fixed(0.3 + 0.4 * amount)}).delaytime(${delayTime}).delayfeedback(${fixed(0.35 + 0.3 * amount)})`
    : effect === 'reverb_wash'
      ? `.room(${fixed(0.4 + 0.5 * amount)}).size(${fixed(0.5 + 0.4 * amount)})`
      : '.room(0.2)';

  const layers = [
    's("bd*4").bank("RolandTR909")',
    `s("${hits(f.hat, 'hh')}").bank("RolandTR909").gain(perlin.range(0.3, 0.5))`,
    `s("${hits(f.openhat, 'oh')}").bank("RolandTR909").gain(0.3)`,
    `s("${hits(f.clap, 'cp')}").bank("RolandTR909").gain(0.55).room(0.15)`,
    // Bass A A A B in octave 1, stab triads in octave 3: shared key, separate registers.
    `n("<${A} ${A} ${A} ${B}>").scale("${key}1:${scale}").s("${bassSound}")${bassLpf}.lpq(${resonance}).decay(0.16).sustain(0.2).gain(0.75)`,
    `n("${stabChords}").scale("${key}3:${scale}").s("${stabSound}").lpf(1600).decay(0.12).sustain(0).gain(0.3)${stabFx}`,
  ];
  const code = `setcpm(${bpm}/4)\n\nstack(\n  ${layers.join(',\n  ')}\n)`;
  return { code, fallbacks, subgenre, key, scale, bpm, effect };
}
```


- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/eval/s6.compiler.test.js`
Expected: PASS. If a hat lane of all rests (`'~ ~ … ~'`) produces a `silent` sub-pattern, that is fine: other layers are audible in bar 0 (the kick always is).

- [ ] **Step 6: Commit**

```bash
git add eval/s6/form.js eval/s6/compiler.js tests/eval/s6.compiler.test.js
git commit -m "feat(eval): S6 techno form and deterministic compiler"
```

---

### Task 7: S6 stage, registry and 7-stage configuration

**Files:**
- Create: `eval/stages/s6.js`
- Modify: `eval/stages/index.js`, `eval/config.js`, `tests/eval/helpers.js`
- Test: `tests/eval/stages.s6.test.js`, `tests/eval/stages.s5.test.js` (registry test)

**Interfaces:**
- Consumes: `buildIntent` (`src/intent.js`), `callOllamaDetailed` (`src/llm.js`), `retrieveGraph`, `subgenreContextText` (Task 1), `FORM_SCHEMA`, `S6_SYSTEM` (Task 6), `compileForm` (Task 6), `makeCallLog`, `llmOptions` (`eval/stages/common.js`).
- Produces:
  - `S6 = { id: 'S6', tagSource: 'code', run(prompt, opts) → { code, selectedIds: null, intent, plans: [], form: object|null, fallbacks: string[], llm } }`, `parseForm(raw): object|null`.
  - `STAGES` with `S0`–`S6`.
  - `EVAL_CONFIG.stages` = 7 ids, `EVAL_CONFIG.contentCycles = 4`, `THRESHOLDS` + `inKey`, `clashRate`, `lowCrowding`, `EXTRA_COMPARISONS = [['S2','S6'],['S5','S6']]`.
  - test helper `isFormCall(body)`, `formJson(overrides)`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/eval/helpers.js`:

```js
export const isFormCall = body => Boolean(body.format?.properties?.bassA);

export const formJson = (o = {}) => JSON.stringify({
  reasoning: 'r', subgenre: 'acid', key: 'E', scale: 'minor',
  bassA: '..0...0...4.4.4.', bassB: '..1...1...5.5.5.',
  hat: '..x...x...x...x.', openhat: '..............x.', clap: '....x.......x...', stab: '......5.......7.',
  bassSound: 'sawtooth', bassCutoff: 500, bassResonance: 16, stabSound: 'square', effect: 'filter_sweep', effectAmount: 8, ...o,
});
```

`tests/eval/stages.s6.test.js`:

```js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { S6, parseForm } from '../../eval/stages/s6.js';
import { S6_SYSTEM } from '../../eval/s6/form.js';
import { mockOllama, bodies, isIntentCall, isFormCall, intentJson, formJson } from './helpers.js';

const opts = { temperature: 0.7, seed: 1004 };

describe('S6 form + compiler', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('intent call + one form call with graph context; compiles the form', async () => {
    mockOllama(b => (isIntentCall(b) ? intentJson(['bass']) : formJson()));
    const r = await S6.run('Acid-Techno mit 303-Bassline', opts);
    expect(S6).toMatchObject({ id: 'S6', tagSource: 'code' });
    expect(r.llm.calls).toBe(2);
    const form = bodies().find(isFormCall);
    expect(Object.keys(form.format.properties)[0]).toBe('reasoning');
    expect(form.messages[0].content.startsWith(S6_SYSTEM)).toBe(true);
    expect(form.messages[0].content).toContain('Knowledge graph context');
    expect(form.messages[0].content).toContain('acid → 132 BPM');
    expect(form.options).toEqual({ temperature: 0.7, seed: 1004, num_predict: 1024 });
    expect(r.code).toContain('setcpm(132/4)');
    expect(r.form.subgenre).toBe('acid');
    expect(r).toMatchObject({ selectedIds: null, plans: [], fallbacks: [] });
    expect(r.intent.genre).toBe('techno');
  });

  it('reports compiler fallbacks', async () => {
    mockOllama(b => (isIntentCall(b) ? intentJson([]) : formJson({ bassA: '................', stab: '................' })));
    expect((await S6.run('techno', opts)).fallbacks).toEqual(['bass', 'stab']);
  });

  it('unparseable answer → code null, form null', async () => {
    mockOllama(b => (isIntentCall(b) ? intentJson([]) : 'not json'));
    expect(await S6.run('techno', opts)).toMatchObject({ code: null, form: null, fallbacks: [] });
  });

  it('parseForm accepts objects only', () => {
    expect(parseForm('{"a":1}')).toEqual({ a: 1 });
    expect(parseForm('[1]')).toBeNull();
    expect(parseForm('null')).toBeNull();
    expect(parseForm('')).toBeNull();
  });
});
```

In `tests/eval/stages.s5.test.js` replace the registry test:

```js
  it('registry exposes all seven stages in order, matching EVAL_CONFIG', () => {
    expect(Object.keys(STAGES)).toEqual(['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6']);
    expect(Object.keys(STAGES)).toEqual(EVAL_CONFIG.stages);
    for (const [id, s] of Object.entries(STAGES)) expect(s.id).toBe(id);
    expect(Object.values(STAGES).map(s => s.tagSource)).toEqual(['code', 'code', 'code', 'ids', 'ids', 'ids', 'code']);
  });

  it('config: 4-bar content window, harmony thresholds, extra comparisons', () => {
    expect(EVAL_CONFIG.contentCycles).toBe(4);
    expect(THRESHOLDS).toMatchObject({ inKey: 0.05, clashRate: 0.05, lowCrowding: 0.05 });
    expect(EXTRA_COMPARISONS).toEqual([['S2', 'S6'], ['S5', 'S6']]);
  });
```

and change its config import to `import { EVAL_CONFIG, THRESHOLDS, EXTRA_COMPARISONS } from '../../eval/config.js';`

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/eval/stages.s6.test.js tests/eval/stages.s5.test.js`
Expected: FAIL (module `eval/stages/s6.js` not found; registry has 6 stages).

- [ ] **Step 3: Implement `eval/stages/s6.js`**

```js
import { callOllamaDetailed } from '../../src/llm.js';
import { buildIntent } from '../../src/intent.js';
import { retrieveGraph, subgenreContextText } from '../graph/graphRag.js';
import { FORM_SCHEMA, S6_SYSTEM } from '../s6/form.js';
import { compileForm } from '../s6/compiler.js';
import { makeCallLog, llmOptions } from './common.js';

export function parseForm(raw) {
  try {
    const form = JSON.parse(raw);
    return form && typeof form === 'object' && !Array.isArray(form) ? form : null;
  } catch {
    return null;
  }
}

// S6 — form + compiler (spec Rev. 2 §2.3). Keeps S5's intent call, graph knowledge and
// reasoning field; replaces catalogue selection with a structured form. Second deliberate
// change of output form (after S2 → S3).
export const S6 = {
  id: 'S6',
  tagSource: 'code',
  async run(prompt, opts) {
    const { log, onCall } = makeCallLog();
    const llm = llmOptions(opts, onCall);
    const intent = await buildIntent(prompt, llm);
    const system = `${S6_SYSTEM}\n\nKnowledge graph context:\n${subgenreContextText(retrieveGraph(prompt, intent))}`;
    const { raw } = await callOllamaDetailed(system, prompt, { ...llm, schema: FORM_SCHEMA });
    const form = parseForm(raw);
    if (!form) return { code: null, selectedIds: null, intent, plans: [], form: null, fallbacks: [], llm: log };
    const { code, fallbacks } = compileForm(form);
    return { code, selectedIds: null, intent, plans: [], form, fallbacks, llm: log };
  },
};
```

- [ ] **Step 4: Registry and config**

`eval/stages/index.js`:

```js
import { S0 } from './s0.js';
import { S1 } from './s1.js';
import { S2 } from './s2.js';
import { S3 } from './s3.js';
import { S4 } from './s4.js';
import { S5 } from './s5.js';
import { S6 } from './s6.js';

export const STAGES = { S0, S1, S2, S3, S4, S5, S6 };
```

`eval/config.js`:

```js
// Every experiment constant lives here so the thesis can cite one file.
// Commit this file BEFORE the first full measurement run — thresholds are set, not fitted.
export const EVAL_CONFIG = {
  model: 'qwen2.5:7b',
  temperature: 0.7,          // > 0 so repeated runs can differ (diversity axis); constant across stages
  numPredict: 1024,          // identical cap for all stages — S0–S2 write whole stacks, S4–S6 add reasoning
  reps: 10,
  seedBase: 1000,            // seed = seedBase + rep → same seed per rep across stages (paired design)
  stages: ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
  contentCycles: 4,          // lexicon + harmony window (A-A-A-B bass, chord changes); validity uses bar 0
  maxConsecutiveCrashes: 3,
};

// Minimum |paired median difference| for a substantial effect.
export const THRESHOLDS = {
  validity: 0.05,     // share of valid runs
  f1: 0.05,           // per-stage tag source (reported alongside)
  f1Code: 0.05,       // main fidelity measure: code lexicon for all stages
  entropy: 0.05,
  inKey: 0.05,        // harmony: share of notes in the best-fitting diatonic set
  clashRate: 0.05,    // harmony: share of simultaneous pairs at interval class 1 or 6
  lowCrowding: 0.05,  // harmony: share of simultaneous pairs below C3 closer than an octave
  latencyMs: 500,     // Liu & Heer 2014: +500 ms already changes interaction behaviour
};

// Besides adjacent stages: best free-code and best selection stage against the form.
export const EXTRA_COMPARISONS = [['S2', 'S6'], ['S5', 'S6']];

export const BOOTSTRAP = { iterations: 10000, alpha: 0.05, seed: 20261012 };
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/eval/`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add eval/stages/s6.js eval/stages/index.js eval/config.js tests/eval/helpers.js tests/eval/stages.s6.test.js tests/eval/stages.s5.test.js
git commit -m "feat(eval): stage S6 form + compiler, 7-stage registry and config"
```

---

### Task 8: Run records — schema 2 with harmony, form and fallbacks

**Files:**
- Modify: `eval/runner/core.js` (function `evaluateRun`, imports)
- Test: `tests/eval/runner.test.js`

**Interfaces:**
- Consumes: `checkValidity(code, { cycles })` (Task 2), `tagsFromCode(code, haps, { cycles })` (Task 3), `harmonyMetrics` (Task 4), `EVAL_CONFIG.contentCycles` (Task 7).
- Produces: record fields added/changed: `schema: 2`, `tagsFromCode` from the 4-bar window, `harmony: { pitched, inKey, clashRate, lowCrowding } | null` (null when not executing; `NaN` values serialize to `null`), `form: object|null`, `fallbacks: string[]|null`.

- [ ] **Step 1: Write the failing tests**

In `tests/eval/runner.test.js`:
- In `writes stages × prompts × reps records …` change `schema: 1` to `schema: 2` and append inside the test:

```js
    expect(s0.harmony).toEqual({ pitched: 0, inKey: null, clashRate: null, lowCrowding: null });
    expect(s0).toMatchObject({ form: null, fallbacks: null });
```

- Append a test:

```js
  it('records harmony over 4 bars, form and fallbacks from the stage result', async () => {
    const outPath = tmp();
    const formStage = {
      id: 'S6', tagSource: 'code',
      run: async () => ({
        code: 'stack(s("bd*4").bank("RolandTR909"), n("<[0 ~ 0 ~] [0 ~ 0 ~] [0 ~ 0 ~] [3 ~ 0 ~]>").scale("C1:minor").s("sawtooth"), n("[0,2,4]").scale("C3:minor").s("square"))',
        selectedIds: null, intent: null, plans: [], form: { subgenre: 'hypnotic' }, fallbacks: ['stab'], llm,
      }),
    };
    await runMatrix({ ...base, reps: 1, prompts: prompts.slice(0, 1), stages: [formStage], outPath });
    const [rec] = readLines(outPath);
    expect(rec).toMatchObject({ schema: 2, form: { subgenre: 'hypnotic' }, fallbacks: ['stab'] });
    expect(rec.harmony.inKey).toBe(1);
    expect(rec.harmony.pitched).toBeGreaterThan(8);
    expect(rec.tagsFromCode).toContain('hypnotic');   // only visible in the 4-bar window
  });
```

- In `records invalid code with its error class` add `expect(rec.harmony).toBeNull();`

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/eval/runner.test.js`
Expected: FAIL (`schema` is 1, `harmony` undefined).

- [ ] **Step 3: Implement**

In `eval/runner/core.js` add imports:

```js
import { harmonyMetrics } from '../harmony.js';
import { EVAL_CONFIG } from '../config.js';
```

Replace `evaluateRun` with:

```js
// Latency = wall clock of stage.run (all LLM calls + deterministic compilation).
// Validation, tagging and harmony happen outside the timed region.
export async function evaluateRun({ stage, prompt, rep, seed, temperature, now = () => performance.now() }) {
  const t0 = now();
  const result = await stage.run(prompt.text, { temperature, seed });
  const latencyMs = now() - t0;

  const cycles = EVAL_CONFIG.contentCycles;
  const validity = await checkValidity(result.code, { cycles });
  const content = validity.hapsAll ?? validity.haps;
  const codeTags = validity.executes ? tagsFromCode(result.code, content, { cycles }) : [];
  const harmony = validity.executes ? harmonyMetrics(content) : null;
  const tags = stage.tagSource === 'ids' ? tagsForPatternIds(result.selectedIds) : codeTags;
  const { outputs, ...llmCounts } = result.llm;

  return {
    schema: 2,
    stage: stage.id, promptId: prompt.id, category: prompt.category, rep, seed, temperature,
    code: result.code, selectedIds: result.selectedIds, intent: result.intent,
    form: result.form ?? null, fallbacks: result.fallbacks ?? null,
    errorClass: validity.errorClass, errorDetail: validity.detail, unknownSounds: validity.unknownSounds,
    executes: validity.executes,
    tags, tagsFromCode: codeTags, expected: prompt.expected, harmony,
    latencyMs, llm: llmCounts, rawOutputs: outputs, plans: result.plans,
    timestamp: new Date().toISOString(),
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/eval/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add eval/runner/core.js tests/eval/runner.test.js
git commit -m "feat(eval): run records schema 2 with 4-bar tags, harmony, form and fallbacks"
```

---

### Task 9: Corpus categories and techno sample prompts

**Files:**
- Modify: `eval/corpus/corpus.js` (`CATEGORIES`)
- Replace: `eval/corpus/prompts.json` (sample only — the author replaces it with the real 40 prompts)
- Test: `tests/eval/corpus.test.js`

**Interfaces:**
- Produces: `CATEGORIES = ['direct_hit', 'alias', 'structure', 'underspecified']`.

- [ ] **Step 1: Write the failing test**

Append to the `validateCorpus` describe block in `tests/eval/corpus.test.js`:

```js
  it('categories follow spec Rev. 2 §5', () => {
    expect(CATEGORIES).toEqual(['direct_hit', 'alias', 'structure', 'underspecified']);
  });

  it('the shipped sample prompts use known categories and tags', () => {
    const sample = JSON.parse(readFileSync(new URL('../../eval/corpus/prompts.json', import.meta.url), 'utf8'));
    const errors = validateCorpus(sample).filter(e => !e.startsWith('expected 10 prompts'));
    expect(errors).toEqual([]);
  });
```

and add `readFileSync` to the `node:fs` import.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/eval/corpus.test.js`
Expected: FAIL (`CATEGORIES` still contains `genre_no_hit`; the current sample uses removed tags such as `techno` and `house`).

- [ ] **Step 3: Implement**

`eval/corpus/corpus.js`:

```js
export const CATEGORIES = ['direct_hit', 'alias', 'structure', 'underspecified'];
```

`eval/corpus/prompts.json` (sample for the smoke run; ids use the category's first letter):

```json
{"prompts":[
{"id":"d01","category":"direct_hit","text":"Acid-Techno mit quietschender 303-Bassline","expected":["acid","bass","kick","driving"]},
{"id":"a01","category":"alias","text":"klingt nach Berghain um 6 Uhr morgens","expected":["hypnotic","dark","kick","bass"]},
{"id":"s01","category":"structure","text":"nur Kick, Bass und ein Stab, der Bass wechselt alle vier Takte","expected":["kick","bass","chords","hypnotic"]},
{"id":"u01","category":"underspecified","text":"mach was Dunkles","expected":["dark","kick"]}
]}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/eval/corpus.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add eval/corpus/corpus.js eval/corpus/prompts.json tests/eval/corpus.test.js
git commit -m "feat(eval): corpus category alias and techno sample prompts"
```

---

### Task 10: Analysis — harmony, S6 metrics, extra comparisons

**Files:**
- Modify: `eval/analysis.js` (whole file below), `eval/analyze.mjs`
- Test: `tests/eval/analysis.test.js`

**Interfaces:**
- Consumes: record schema 2 (Task 8), `EXTRA_COMPARISONS`, `THRESHOLDS` (Task 7), `LANE_FIELDS` (Task 6), metrics helpers (`eval/metrics.js`, unchanged).
- Produces:
  - `perPrompt(records)` adds `inKey`, `clashRate`, `lowCrowding` (mean over executing runs), `fallbackRate` (share of runs with ≥ 1 fallback; `NaN` if the stage records none), `laneEntropy: Record<lane, number> | null` (normalised entropy of each lane over valid runs with a form).
  - `summarize(records, { stages, thresholds, bootstrap, extraComparisons = [] })` adds per stage `inKey`, `clashRate`, `lowCrowding` (CIs), `fallbackRate` (median), `laneEntropy` (median per lane or `null`); comparisons for adjacent stages **and** `extraComparisons`, over metrics validity, f1, f1Code, entropy, inKey, clashRate, lowCrowding, latencyMs.
  - `toMarkdown(summary)` adds a harmony table and an S6 table; `toCsv(records)` adds `inKey, clashRate, lowCrowding, fallbacks`.

- [ ] **Step 1: Write the failing tests**

In `tests/eval/analysis.test.js`:
1. Replace `opts` with:

```js
const thresholds = { validity: 0.05, f1: 0.05, f1Code: 0.05, entropy: 0.05, inKey: 0.05, clashRate: 0.05, lowCrowding: 0.05, latencyMs: 500 };
const opts = { stages: ['S0', 'S1'], thresholds, bootstrap: { iterations: 200, alpha: 0.05, seed: 1 } };
```

2. Update the CSV header expectation:

```js
    expect(csv[0]).toBe('stage,promptId,category,rep,seed,errorClass,executes,latencyMs,promptTokens,evalTokens,tags,tagsFromCode,expected,inKey,clashRate,lowCrowding,fallbacks');
```

3. Append:

```js
describe('harmony and S6', () => {
  const h = (inKey, clashRate, lowCrowding) => ({ pitched: 8, inKey, clashRate, lowCrowding });
  const records = [];
  for (const p of ['p1', 'p2', 'p3', 'p4']) for (const rep of [0, 1]) {
    records.push(rec('S2', p, rep, { harmony: h(0.6, 0.3, 0.2) }));
    records.push(rec('S5', p, rep, { harmony: h(0.7, 0.2, 0.1) }));
    records.push(rec('S6', p, rep, {
      harmony: h(1, 0.05, 0), fallbacks: rep ? ['stab'] : [],
      form: { bassA: rep ? '0...............' : '1...............', hat: '..x...x...x...x.', bassB: 'a', openhat: 'b', clap: 'c', stab: 'd' },
    }));
  }
  const s = summarize(records, { ...opts, stages: ['S2', 'S5', 'S6'], extraComparisons: [['S2', 'S6'], ['S5', 'S6']] });

  it('per-stage harmony', () => {
    expect(s.stages.S6.inKey.estimate).toBe(1);
    expect(s.stages.S2.clashRate.estimate).toBeCloseTo(0.3, 10);
  });

  it('S6 fallback rate and lane entropy; other stages null', () => {
    expect(s.stages.S6.fallbackRate).toBe(0.5);
    expect(s.stages.S6.laneEntropy.hat).toBe(0);
    expect(s.stages.S6.laneEntropy.bassA).toBe(1);
    expect(s.stages.S2.laneEntropy).toBeNull();
    expect(s.stages.S2.fallbackRate).toBeNaN();
  });

  it('extra comparisons S2→S6 and S5→S6 next to adjacent ones', () => {
    const pairs = new Set(s.comparisons.map(c => `${c.from}>${c.to}`));
    expect(pairs).toEqual(new Set(['S2>S5', 'S5>S6', 'S2>S6']));
    const inKey = s.comparisons.find(c => c.from === 'S2' && c.to === 'S6' && c.metric === 'inKey');
    expect(inKey).toMatchObject({ estimate: 0.4, substantial: true });
  });

  it('markdown has harmony and S6 tables', () => {
    const md = toMarkdown(s);
    expect(md).toContain('In key');
    expect(md).toContain('Fallback rate');
  });

  // Review Focus 5
  it('schema-1 records without harmony/form/fallbacks do not break the analysis', () => {
    const old = [rec('S0', 'p1', 0), rec('S0', 'p2', 0)];
    const res = summarize(old, { ...opts, stages: ['S0'] });
    expect(res.stages.S0.inKey.estimate).toBeNaN();
    expect(res.stages.S0.laneEntropy).toBeNull();
    expect(toCsv(old).split('\n')).toHaveLength(3);
  });
});
```

Note: duplicate comparisons are not created — `S5>S6` is both adjacent and extra; the implementation de-duplicates pairs.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/eval/analysis.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement `eval/analysis.js`**

```js
import { readFileSync } from 'node:fs';
import { prf1, normalizedEntropy, distinctRatio, median, percentile, mean, bootstrapCI, pairedDiffCI, millerBand } from './metrics.js';
import { LANE_FIELDS } from './s6/form.js';

export function loadRecords(path) {
  const out = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* partial trailing line */ }
  }
  return out;
}

const groupBy = (xs, keyFn) => xs.reduce((m, x) => m.set(keyFn(x), [...(m.get(keyFn(x)) ?? []), x]), new Map());
const harmonyOf = (r, key) => (r.harmony && Number.isFinite(r.harmony[key]) ? r.harmony[key] : NaN);

export function perPrompt(records) {
  const out = new Map();
  for (const [key, runs] of groupBy(records, r => `${r.stage}|${r.promptId}`)) {
    const executing = runs.filter(r => r.executes);
    const valid = runs.filter(r => r.errorClass === null);
    const fid = executing.map(r => prf1(r.expected, r.tags));
    const withFallbacks = runs.filter(r => Array.isArray(r.fallbacks));
    const withForm = valid.filter(r => r.form && typeof r.form === 'object');
    out.set(key, {
      stage: runs[0].stage, promptId: runs[0].promptId, category: runs[0].category, n: runs.length,
      validityRate: valid.length / runs.length,
      f1: mean(fid.map(x => x.f1)),
      precision: mean(fid.map(x => x.precision)),
      recall: mean(fid.map(x => x.recall)),
      f1Code: mean(executing.map(r => prf1(r.expected, r.tagsFromCode).f1)),
      entropy: valid.length ? normalizedEntropy(valid.map(r => r.tags)) : NaN,
      distinct: valid.length ? distinctRatio(valid.map(r => r.tags)) : NaN,
      inKey: mean(executing.map(r => harmonyOf(r, 'inKey'))),
      clashRate: mean(executing.map(r => harmonyOf(r, 'clashRate'))),
      lowCrowding: mean(executing.map(r => harmonyOf(r, 'lowCrowding'))),
      fallbackRate: withFallbacks.length ? withFallbacks.filter(r => r.fallbacks.length > 0).length / withFallbacks.length : NaN,
      laneEntropy: withForm.length
        ? Object.fromEntries(LANE_FIELDS.map(f => [f, normalizedEntropy(withForm.map(r => [String(r.form[f] ?? '')]))]))
        : null,
      latencyMedian: median(runs.map(r => r.latencyMs)),
    });
  }
  return out;
}

const COMPARED = [
  ['validity', 'validityRate', 'validity'],
  ['f1', 'f1', 'f1'],
  ['f1Code', 'f1Code', 'f1Code'],
  ['entropy', 'entropy', 'entropy'],
  ['inKey', 'inKey', 'inKey'],
  ['clashRate', 'clashRate', 'clashRate'],
  ['lowCrowding', 'lowCrowding', 'lowCrowding'],
  ['latencyMs', 'latencyMedian', 'latencyMs'],
];

function comparisonPairs(present, extra) {
  const pairs = [];
  const seen = new Set();
  const add = (from, to) => {
    const k = `${from}>${to}`;
    if (seen.has(k) || !present.includes(from) || !present.includes(to)) return;
    seen.add(k);
    pairs.push([from, to]);
  };
  for (let i = 1; i < present.length; i++) add(present[i - 1], present[i]);
  for (const [from, to] of extra) add(from, to);
  return pairs;
}

export function summarize(records, { stages, thresholds, bootstrap, extraComparisons = [] }) {
  const pp = perPrompt(records);
  const promptIds = [...new Set(records.map(r => r.promptId))].sort();
  const series = (stage, field) => promptIds.map(id => pp.get(`${stage}|${id}`)?.[field] ?? NaN);
  const ci = (stage, field) => bootstrapCI(series(stage, field), median, bootstrap);

  const summary = { stages: {}, comparisons: [], byCategory: {} };
  for (const stage of stages) {
    const runs = records.filter(r => r.stage === stage);
    if (!runs.length) continue;
    const lat = runs.map(r => r.latencyMs);
    const errorCounts = {};
    for (const r of runs) if (r.errorClass) errorCounts[r.errorClass] = (errorCounts[r.errorClass] ?? 0) + 1;
    const lanes = promptIds.map(id => pp.get(`${stage}|${id}`)?.laneEntropy).filter(Boolean);
    summary.stages[stage] = {
      n: runs.length,
      errorCounts,
      validity: ci(stage, 'validityRate'),
      f1: ci(stage, 'f1'), precision: ci(stage, 'precision'), recall: ci(stage, 'recall'),
      f1Code: ci(stage, 'f1Code'),
      entropy: ci(stage, 'entropy'),
      distinct: median(series(stage, 'distinct')),
      inKey: ci(stage, 'inKey'),
      clashRate: ci(stage, 'clashRate'),
      lowCrowding: ci(stage, 'lowCrowding'),
      fallbackRate: median(series(stage, 'fallbackRate')),
      laneEntropy: lanes.length ? Object.fromEntries(LANE_FIELDS.map(f => [f, median(lanes.map(l => l[f]))])) : null,
      latency: {
        median: median(lat), p95: percentile(lat, 95), ci: ci(stage, 'latencyMedian'),
        bandMedian: millerBand(median(lat)), bandP95: millerBand(percentile(lat, 95)),
        shareWithin2s: lat.filter(x => x <= 2000).length / lat.length,
        shareWithin10s: lat.filter(x => x <= 10000).length / lat.length,
      },
      tokens: { promptMedian: median(runs.map(r => r.llm.promptTokens)), evalMedian: median(runs.map(r => r.llm.evalTokens)) },
    };
    summary.byCategory[stage] = {};
    for (const [category, cRuns] of groupBy(runs, r => r.category)) {
      const ids = new Set(cRuns.map(r => r.promptId));
      const stats = [...ids].map(id => pp.get(`${stage}|${id}`));
      summary.byCategory[stage][category] = {
        validity: median(stats.map(s => s.validityRate)),
        f1: median(stats.map(s => s.f1)),
        f1Code: median(stats.map(s => s.f1Code)),
        entropy: median(stats.map(s => s.entropy)),
        inKey: median(stats.map(s => s.inKey)),
        latencyMedian: median(cRuns.map(r => r.latencyMs)),
      };
    }
  }

  const present = stages.filter(s => summary.stages[s]);
  for (const [from, to] of comparisonPairs(present, extraComparisons)) {
    for (const [metric, field, thresholdKey] of COMPARED) {
      const d = pairedDiffCI(series(from, field), series(to, field), median, bootstrap);
      const threshold = thresholds[thresholdKey];
      const excludesZero = d.n > 0 && (d.lower > 0 || d.upper < 0);
      summary.comparisons.push({ from, to, metric, ...d, threshold, substantial: excludesZero && Math.abs(d.estimate) >= threshold });
    }
  }
  return summary;
}

const f = (x, digits = 3) => (Number.isFinite(x) ? x.toFixed(digits) : '–');
const fci = c => `${f(c.estimate)} [${f(c.lower)}, ${f(c.upper)}]`;

export function toMarkdown(summary) {
  const lines = [
    '| Stage | n | Validity | F1 (ids/code) | F1 (code lexicon) | Entropy | Latency median / p95 (ms) | Miller median / p95 |',
    '|---|---|---|---|---|---|---|---|',
  ];
  for (const [stage, s] of Object.entries(summary.stages)) {
    lines.push(`| ${stage} | ${s.n} | ${fci(s.validity)} | ${fci(s.f1)} | ${fci(s.f1Code)} | ${fci(s.entropy)} | ${f(s.latency.median, 0)} / ${f(s.latency.p95, 0)} | ${s.latency.bandMedian} / ${s.latency.bandP95} |`);
  }
  lines.push('', '| Stage | In key | Clash rate | Low crowding |', '|---|---|---|---|');
  for (const [stage, s] of Object.entries(summary.stages)) {
    lines.push(`| ${stage} | ${fci(s.inKey)} | ${fci(s.clashRate)} | ${fci(s.lowCrowding)} |`);
  }
  const formStages = Object.entries(summary.stages).filter(([, s]) => s.laneEntropy || Number.isFinite(s.fallbackRate));
  if (formStages.length) {
    lines.push('', '| Stage | Fallback rate | Lane entropy (bassA / bassB / hat / openhat / clap / stab) |', '|---|---|---|');
    for (const [stage, s] of formStages) {
      const le = s.laneEntropy ? ['bassA', 'bassB', 'hat', 'openhat', 'clap', 'stab'].map(k => f(s.laneEntropy[k], 2)).join(' / ') : '–';
      lines.push(`| ${stage} | ${f(s.fallbackRate)} | ${le} |`);
    }
  }
  lines.push('', '| From → To | Metric | Δ median [95% CI] | n | Threshold | Substantial |', '|---|---|---|---|---|---|');
  for (const c of summary.comparisons) {
    lines.push(`| ${c.from} → ${c.to} | ${c.metric} | ${fci(c)} | ${c.n} | ${c.threshold} | ${c.substantial ? 'yes' : 'no'} |`);
  }
  lines.push('', '| Stage | Error classes |', '|---|---|');
  for (const [stage, s] of Object.entries(summary.stages)) {
    lines.push(`| ${stage} | ${Object.entries(s.errorCounts).map(([k, v]) => `${k}: ${v}`).join(', ') || '–'} |`);
  }
  return lines.join('\n') + '\n';
}

const csvCell = v => {
  const s = Array.isArray(v) ? v.join(' ') : String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(records) {
  const header = ['stage', 'promptId', 'category', 'rep', 'seed', 'errorClass', 'executes', 'latencyMs', 'promptTokens', 'evalTokens', 'tags', 'tagsFromCode', 'expected', 'inKey', 'clashRate', 'lowCrowding', 'fallbacks'];
  const rows = records.map(r => [
    r.stage, r.promptId, r.category, r.rep, r.seed, r.errorClass, r.executes, Math.round(r.latencyMs), r.llm.promptTokens, r.llm.evalTokens,
    r.tags, r.tagsFromCode, r.expected, r.harmony?.inKey, r.harmony?.clashRate, r.harmony?.lowCrowding, r.fallbacks,
  ].map(csvCell).join(','));
  return [header.join(','), ...rows].join('\n');
}
```

`eval/analyze.mjs` — import and pass the extra comparisons:

```js
import { EVAL_CONFIG, THRESHOLDS, BOOTSTRAP, EXTRA_COMPARISONS } from './config.js';
```
```js
const summary = summarize(records, { stages: EVAL_CONFIG.stages, thresholds: THRESHOLDS, bootstrap: BOOTSTRAP, extraComparisons: EXTRA_COMPARISONS });
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/eval/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add eval/analysis.js eval/analyze.mjs tests/eval/analysis.test.js
git commit -m "feat(eval): analysis for harmony, S6 fallbacks and lane entropy, extra comparisons"
```

---

### Task 11: README, full test run and smoke run

**Files:**
- Modify: `eval/README.md` (whole file below; currently untracked)

**Interfaces:** none new.

- [ ] **Step 1: Write `eval/README.md`**

````markdown
# Evaluation harness — "Vom Prompt zum Beat"

Measures how stacked control stages affect a local `qwen2.5:7b` generating **techno** in Strudel.
Design: `docs/superpowers/specs/2026-10-12-creative-harness-stage-model-design.md` (Revision 2). All constants: `eval/config.js`.

## Stages
| Stage | Mechanism | Module | `f1` tags from |
|---|---|---|---|
| S0 | task (three techno parts) → code | `stages/s0.js` | code lexicon |
| S1 | + specification (allowed sounds, functions with ranges) | `stages/s1.js` | code lexicon |
| S2 | + few-shot (top-3 library patterns for drums, bass, melody) | `stages/s2.js` | code lexicon |
| S3 | + constraint: JSON pattern-id selection → compiler | `stages/s3.js` | pattern ids |
| S4 | + musical chain-of-thought | `stages/s4.js` | pattern ids |
| S5 | + GraphRAG (subgenre ↔ tempo ↔ pattern ↔ function) | `stages/s5.js` | pattern ids |
| S6 | form + compiler: model fills a techno form, `s6/compiler.js` writes the code (shared key, fixed 4/4 kick, A-A-A-B bass) | `stages/s6.js` | code lexicon |

Every stage produces drums, bass and a melodic part. The main fidelity measure is `f1Code` (code lexicon for all stages).

## Run
```bash
OLLAMA_ORIGINS="*" ollama serve
npm run eval:freeze                                   # once, after both annotation passes
npm run eval -- --out eval/results/full-YYYY-MM-DD.jsonl
npm run eval:analyze -- eval/results/full-YYYY-MM-DD.jsonl
```
Runs resume automatically; crashes land in `*.errors.jsonl` and are retried.
`eval/corpus/prompts.json` currently holds 4 sample prompts; the author replaces it with the 40 real prompts (categories `direct_hit`, `alias`, `structure`, `underspecified`).

## Metrics
- **Validity**: `checkValidity` on bar 0. Classes `syntax`, `unknown_function`, `unknown_sound` (exposé) plus `empty`, `forbidden`, `runtime`, `no_pattern`, `silent`.
- **Content window**: lexicon and harmony read bars 0–4 (`EVAL_CONFIG.contentCycles`).
- **Fidelity**: P/R/F1 vs frozen expected tags over executing runs. `f1Code` = code lexicon for every stage (main); `f1` = per-stage source.
- **Harmony** (`harmony.js`): in-key share (best of 12 diatonic sets), clash rate (simultaneous interval class 1 or 6), low crowding (simultaneous pairs below C3 within an octave).
- **Diversity**: normalised entropy of tag sets over valid runs; for S6 also per form lane.
- **S6**: fallback rate (compiler replaced a thin bass or empty stab).
- **Latency**: wall clock of `stage.run`, median + p95, Miller bands; tokens from Ollama.
- **Statistics**: per-prompt aggregates, paired bootstrap (10,000, seeded) for adjacent stages plus S2↔S6 and S5↔S6; substantial = CI excludes 0 and |Δ| ≥ `THRESHOLDS`.

## Known validity threats (discuss in thesis)
- Headless ≠ browser: REPL features are emulated in `strudelHeadless.js`.
- The code lexicon recognises only part of the vocabulary and subgenres only roughly (rules in `codeLexicon.js`).
- Harmony metrics are theory-based, not validated against listeners.
- The S6 example form strongly shapes the output (lane entropy shows it).
- Vocabulary, lexicon thresholds, graph, form, corpus and thresholds are set by the author.
````

- [ ] **Step 2: Full test run**

Run: `npx vitest run`
Expected: PASS for the whole repository (app tests plus `tests/eval/`). Report the count.

- [ ] **Step 3: Smoke run (needs Ollama with `qwen2.5:7b`)**

Run:
```bash
npm run eval -- --reps 1 --allow-unfrozen --out eval/results/smoke-rev2.jsonl
npm run eval:analyze -- eval/results/smoke-rev2.jsonl
```
Expected: 28 records (7 stages × 4 sample prompts × 1 rep), no crash streak. In the summary: S6 validity 1.000; S6 in-key 1.000; a harmony table and an S6 table are present; comparisons include `S2 → S6` and `S5 → S6`. If Ollama is not running, report that and skip this step — do not fake output.

Do not commit anything under `eval/results/`.

- [ ] **Step 4: Commit**

```bash
git add eval/README.md
git commit -m "docs(eval): README for techno focus, S6 and harmony"
```

---

## Self-Review Notes

- **Spec coverage:** §1 techno focus → Tasks 1, 5, 9; §2.1 three parts → Task 5 (S0–S5), Task 6 (S6); §2.2 S0 prompt, S1 `setcpm`, S5 graph on subgenres → Tasks 1, 5; §2.3 S6 form, compiler, fallbacks, example → Tasks 6, 7; §3 constants → Task 7 config; §4 content window → Task 2, 8; f1Code main → unchanged computation, README/analysis; harmony → Tasks 4, 8, 10; lane diversity and fallback rate → Task 10; extra comparisons → Tasks 7, 10; §4.1 vocabulary → Task 1; §4.2 lexicon → Task 3; §5 corpus categories → Task 9; §9 adaptation list → all tasks.
- **Type consistency:** `checkValidity(code, { cycles })` returns `hapsAll` (Task 2) and is consumed in Tasks 3, 4, 6, 8; `tagsFromCode(code, haps, { cycles })` (Task 3) used in Task 8; `harmonyMetrics` (Task 4) used in Tasks 6, 8; `SUBGENRES`/`SUBGENRE_BPM` (Task 1) used in Task 6; `LANE_FIELDS` (Task 6) used in Task 10; `EXTRA_COMPARISONS`, `contentCycles` (Task 7) used in Tasks 8, 10; `retrieveGraph` returns `seedSubgenres` everywhere.
- **Out of scope by spec:** no `src/` changes, no UI, no fine-tuning, no listening study.
````
