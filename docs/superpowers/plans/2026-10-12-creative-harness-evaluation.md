# Creative Harness Evaluation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the measurement infrastructure for the bachelor thesis "Vom Prompt zum Beat". It runs six stacked control stages (S0–S5) of a local `qwen2.5:7b` on a frozen prompt corpus, without a browser, and reports syntactic validity, semantic fidelity (P/R/F1), output diversity (normalised entropy) and latency per stage.

**Architecture:** A new Node-only `eval/` tree sits next to the browser app. It evaluates Strudel code headless through `@strudel/core` plus a one-line stub for the broken `@kabelsalat/web` import. A validator sorts every output into error classes. Two tag mappers project outputs onto one evaluation vocabulary: library IDs map to tags, and a deterministic lexicon maps code to tags. The six stages are thin modules on top of the existing app pipeline (`buildIntent`, `generateTransformationPlan`, `compileTrack`). Each stage adds exactly one mechanism. A resumable runner writes one JSONL record per run, and an analyser computes medians, paired bootstrap CIs and Miller latency bands.

**Tech Stack:** Node 22 (ESM, `node:module` loader hooks), Vitest 4, `@strudel/core|mini|tonal|transpiler` 1.2.x (already installed through `@strudel/web`), `acorn` 8 (already installed through the transpiler; added as a direct dependency), Ollama `/api/chat`.

**Spec:** `docs/superpowers/specs/2026-10-12-creative-harness-stage-model-design.md` (stage model S0–S5, constants, metrics; read first). Background: exposé `docs/thesis/expose.pdf` (copied in Task 0), `PROJECT_STATE.md`.

**Decisions locked with the author (2026-10-12, see spec):**
- Stage model **S0–S5** (spec §2): S0 baseline · S1 + specification · S2 + few-shot · S3 + constraint (JSON selection + compiler = existing prototype) · S4 + chain-of-thought · S5 + GraphRAG. Each stage adds exactly one mechanism.
- Output unit of every run = **a whole track** (`stack(...)` of 1–5 layers). S0–S2: the model writes the whole stack itself. S3–S5: the pillars come from `intent.layers`, one selection call per pillar, and the layers are assembled into a stack.
- The LLM intent classifier (`buildIntent`) runs **from S2 onwards** (S1's spec is static and needs no intent). Its call counts toward latency.
- Phase 2/3 of the generative LayerSpec pipeline (`2026-07-06-generative-strudel-pipeline.md`, tasks 7–13) is **frozen**.
- The web UI stays unchanged. Evaluation runs in the terminal only.

## Global Constraints

- Model `qwen2.5:7b`, identical for all runs. `EVAL_CONFIG.model` must equal the model the client sends (`VITE_OLLAMA_MODEL` or the default), otherwise the runner aborts.
- Temperature is constant and **> 0** (`EVAL_CONFIG.temperature = 0.7`). The seed varies per repetition (`seed = seedBase + rep`) and is logged on every record.
- `num_predict` is constant across all stages (`EVAL_CONFIG.numPredict = 1024`), so truncation never differs between stages.
- Corpus: 40 prompts, 4 categories × 10 (`direct_hit`, `genre_no_hit`, `structure`, `underspecified`). Expected tags are frozen (SHA-256) before the first measurement run. The runner refuses an unfrozen corpus unless `--allow-unfrozen` is passed (smoke runs only).
- Full run = 6 stages × 40 prompts × 10 reps = **2,400 runs**.
- The four metrics stay separate and are never combined into a single score.
- Report median + bootstrap CI per stage. "Substantial" = paired CI excludes 0 **and** |estimate| ≥ preset threshold (`THRESHOLDS`, committed before the first full run).
- Latency is placed in Miller's bands (≤ 2 s, ≤ 10 s), not graded pass/fail.
- The browser app must keep working. App defaults stay `temperature 0`, `seed 42`, `num_predict 200`. All new LLM parameters are optional.
- Existing 198 tests stay green after every task.

## Review Focus

1. **REPL-only Strudel syntax** (`$:` labels, `setcpm(...)`, `.pianoroll()`): this plays in the app, so it must count as valid headless too. Pinned in Task 2.
2. **Dangerous LLM code** (`process.exit()`, `while(true){}`, `x.constructor.constructor(...)`): it must be rejected by the AST check before evaluation and never executed, because evaluation runs in Node with full process rights. Pinned in Task 2.
3. **Prose-wrapped baseline output** ("Here is your code: ```js … ```"): S0–S2 must take the first fenced block when one exists, otherwise a formatting habit is miscounted as a syntax error. Pinned in Task 7.
4. **Ollama down or model missing mid-run**: crashes must not be stored as finished runs. The run aborts after 3 consecutive crashes, and resume retries them. Pinned in Task 14.
5. **Interrupted run** (Ctrl-C while writing): a partial last JSONL line must not break resume or analysis. Pinned in Task 14.

---

## File Structure

```
eval/
  config.js                  EVAL_CONFIG, THRESHOLDS, BOOTSTRAP (all experiment constants)
  node-hooks/
    kabelsalat-stub.mjs      export class SalatRepl {}  (unused upstream import)
    hooks.mjs                Node resolve hook → stub
    register.mjs             node --import entry
  strudelHeadless.js         loadStrudel(), queryCycle(code) + REPL/viz no-op stubs
  data/knownSounds.json      snapshot of the app's sample manifests (generated)
  scripts/snapshotSounds.mjs regenerates knownSounds.json
  knownSounds.js             isKnownSound(value), soundLabel(value), BUILTIN_SYNTHS
  validity.js                checkValidity(code) → error class
  vocabulary.js              EVAL_VOCAB, LIBRARY_TAG_MAP, canonicalTags, tagsForPatternIds
  codeLexicon.js             tagsFromCode(code, haps)
  stages/
    common.js                trackPillars, assembleStack, extractCode, makeCallLog, llmOptions, runSelectionStage
    s0.js … s5.js            one stage object each: { id, tagSource, run(prompt, opts) }
    index.js                 STAGES map
  graph/
    knowledgeGraph.js        curated genre/tempo data + buildKnowledgeGraph()
    graphRag.js              retrieveGraph, rankWithGraph, graphContextText
    exportGraph.mjs          writes graph JSON for the thesis appendix
  corpus/
    prompts.json             40 prompts + frozen expected tags   (author, Task 13)
    annotation-A.json        annotation pass 1                   (author)
    annotation-B.json        annotation pass 2                   (author)
    FROZEN.sha256            written by freeze.mjs
    corpus.js                loadCorpus, validateCorpus, corpusHash, assertFrozen
    agreement.js             cohensKappa, meanJaccard
    freeze.mjs               validate + agreement report + write hash
  metrics.js                 prf1, normalizedEntropy, distinctRatio, median, percentile, bootstrapCI, pairedDiffCI, millerBand
  runner/core.js             runMatrix, evaluateRun, readDoneKeys, collectMeta
  runner.mjs                 CLI
  analysis.js                perPromptMetrics, summarize, toMarkdown, toCsv
  analyze.mjs                CLI
  results/                   JSONL + meta + summaries (smoke-* gitignored)
  README.md
tests/eval/                  one test file per eval module (+ helpers.js)
```

Modified app files: `vite.config.js`, `package.json`, `.gitignore`, `src/llm.js`, `src/intent.js`, `src/library/soundLibrary.js` (8 percussion patterns, Task 1), `tests/llm.test.js`, `tests/intent.test.js`.

---

### Task 0: Branch, headless Strudel, test infrastructure

**Files:**
- Create: `eval/node-hooks/kabelsalat-stub.mjs`, `eval/node-hooks/hooks.mjs`, `eval/node-hooks/register.mjs`, `eval/strudelHeadless.js`, `eval/config.js`, `docs/thesis/expose.pdf`
- Modify: `vite.config.js`, `package.json`, `.gitignore`
- Test: `tests/eval/strudelHeadless.test.js`

**Interfaces:**
- Produces: `loadStrudel(): Promise<{core, transpiler}>`, `queryCycle(code: string): Promise<Hap[]>` (throws Strudel's error, or an `Error` with `.code === 'NO_PATTERN'`), `EVAL_CONFIG`, `THRESHOLDS`, `BOOTSTRAP`.

Background (verified 2026-10-12): `import('@strudel/core')` fails in plain Node with `SyntaxError: The requested module '@kabelsalat/web' does not provide an export named 'SalatRepl'`, because `core/repl.mjs` imports it and the installed `@kabelsalat/web@0.4.1` lacks it. Headless evaluation never uses `SalatRepl`, so a stub is enough. Vitest also has to *inline* `@strudel/*` so the alias reaches imports inside `node_modules`. Without a stub, these valid app constructs fail headless: `$:` (`.p is not a function`), `setcpm` (`not defined`) and `.pianoroll()` (`not a function`).

- [ ] **Step 1: Verify branch, copy exposé, add acorn**

The branch `thesis/creative-harness-eval` already exists (spec commit `39299b0`). Work on it:

```bash
git checkout thesis/creative-harness-eval
mkdir -p docs/thesis && cp ~/Desktop/BachelorBrainstrom/exposeSemanticBeats.pdf docs/thesis/expose.pdf
npm install --save-dev acorn@8.16.0
```

- [ ] **Step 2: Node hooks**

`eval/node-hooks/kabelsalat-stub.mjs`:
```js
// @strudel/core/repl.mjs imports SalatRepl, which the installed @kabelsalat/web lacks.
// Headless evaluation never touches it — an empty class satisfies the import.
export class SalatRepl {}
```

`eval/node-hooks/hooks.mjs`:
```js
const STUB = new URL('./kabelsalat-stub.mjs', import.meta.url).href;

export async function resolve(specifier, context, next) {
  if (specifier === '@kabelsalat/web') return { url: STUB, shortCircuit: true };
  return next(specifier, context);
}
```

`eval/node-hooks/register.mjs`:
```js
import { register } from 'node:module';

register('./hooks.mjs', import.meta.url);
```

- [ ] **Step 3: Vitest config (test-only alias, browser app untouched)**

Replace `vite.config.js` with:
```js
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const kabelsalatStub = fileURLToPath(new URL('./eval/node-hooks/kabelsalat-stub.mjs', import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Headless Strudel for eval/: stub the broken @kabelsalat/web import and inline
    // @strudel/* so the alias reaches imports inside node_modules. Tests only.
    alias: { '@kabelsalat/web': kabelsalatStub },
    server: { deps: { inline: [/@strudel\//] } },
  },
});
```

- [ ] **Step 4: Config constants**

`eval/config.js`:
```js
// Every experiment constant lives here so the thesis can cite one file.
// Commit this file BEFORE the first full measurement run — thresholds are set, not fitted.
export const EVAL_CONFIG = {
  model: 'qwen2.5:7b',
  temperature: 0.7,          // > 0 so repeated runs can differ (diversity axis); constant across stages
  numPredict: 1024,          // identical cap for all stages — S0–S2 write whole stacks, S4/S5 add reasoning
  reps: 10,
  seedBase: 1000,            // seed = seedBase + rep → same seed per rep across stages (paired design)
  stages: ['S0', 'S1', 'S2', 'S3', 'S4', 'S5'],
  maxConsecutiveCrashes: 3,
};

// Minimum |paired median difference| for a substantial effect between adjacent stages.
export const THRESHOLDS = {
  validity: 0.05,     // share of valid runs
  f1: 0.05,
  f1Code: 0.05,       // uniform code-lexicon F1 (robustness check)
  entropy: 0.05,
  latencyMs: 500,     // Liu & Heer 2014: +500 ms already changes interaction behaviour
};

export const BOOTSTRAP = { iterations: 10000, alpha: 0.05, seed: 20261012 };
```

- [ ] **Step 5: Write the failing test**

`tests/eval/strudelHeadless.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { queryCycle } from '../../eval/strudelHeadless.js';

describe('queryCycle', () => {
  it('returns one cycle of haps for a valid pattern', async () => {
    const haps = await queryCycle('s("bd*4").bank("RolandTR909").lpf(400)');
    expect(haps).toHaveLength(4);
    expect(haps[0].value).toMatchObject({ s: 'bd', bank: 'RolandTR909', cutoff: 400 });
  });

  it('resolves scales through @strudel/tonal', async () => {
    const haps = await queryCycle('n("0 2 4").scale("C:minor").s("sine")');
    expect(haps).toHaveLength(3);
    expect(typeof haps[0].value.note).not.toBe('undefined');
  });

  it('throws NO_PATTERN when the expression is not a pattern', async () => {
    await expect(queryCycle('42')).rejects.toMatchObject({ code: 'NO_PATTERN' });
  });

  it('throws on JavaScript syntax errors', async () => {
    await expect(queryCycle('s("bd*4".lpf(400)')).rejects.toThrow();
  });

  it('stacks $: labelled patterns like the REPL does', async () => {
    const haps = await queryCycle('$: s("bd*4")\n$: s("hh*8")');
    expect(haps).toHaveLength(12);
  });

  it('accepts REPL tempo calls and visual methods as no-ops', async () => {
    expect(await queryCycle('setcpm(130/4)\ns("bd*4")')).toHaveLength(4);
    expect(await queryCycle('setcps(0.5)\ns("bd*4").pianoroll()')).toHaveLength(4);
  });

  it('ignores muted _$: labels', async () => {
    const haps = await queryCycle('$: s("bd*4")\n_$: s("hh*8")');
    expect(haps).toHaveLength(4);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run tests/eval/strudelHeadless.test.js`
Expected: FAIL, `Failed to resolve import "../../eval/strudelHeadless.js"`

- [ ] **Step 7: Implement `eval/strudelHeadless.js`**

```js
// Headless Strudel: evaluate code and query one cycle — no WebAudio, no DOM.
// Emulates the few REPL-level features @strudel/web adds on top of @strudel/core,
// so code that plays in the app is not misclassified as broken here.

const REPL_NOOP_FUNCTIONS = ['setcps', 'setcpm', 'setCps', 'setCpm', 'hush', 'samples'];
const VIZ_METHODS = [
  'pianoroll', 'punchcard', 'scope', 'spectrum', 'spiral', 'draw', 'analyze', 'fft',
  '_pianoroll', '_punchcard', '_scope', '_spectrum', '_spiral',
];

let ready = null;
let labelled = [];

export function loadStrudel() {
  if (!ready) {
    ready = (async () => {
      const core = await import('@strudel/core');
      const mini = await import('@strudel/mini');
      const tonal = await import('@strudel/tonal');
      const { transpiler } = await import('@strudel/transpiler');
      await core.evalScope(core, mini, tonal);

      for (const name of REPL_NOOP_FUNCTIONS) globalThis[name] = async () => {};
      for (const name of VIZ_METHODS) {
        if (typeof core.Pattern.prototype[name] !== 'function') {
          core.Pattern.prototype[name] = function () { return this; };
        }
      }
      // `$: pat` transpiles to pat.p('$'); muted labels start with '_'.
      core.Pattern.prototype.p = function (id) {
        if (!String(id).startsWith('_')) labelled.push(this);
        return this;
      };
      return { core, transpiler };
    })();
  }
  return ready;
}

// Throws whatever Strudel throws. Returns haps of cycle [0, 1).
export async function queryCycle(code) {
  const { core, transpiler } = await loadStrudel();
  labelled = [];
  const { pattern } = await core.evaluate(code, transpiler);
  const result = labelled.length ? core.stack(...labelled) : pattern;
  if (!result || typeof result.queryArc !== 'function') {
    const err = new Error('Expression did not evaluate to a pattern');
    err.code = 'NO_PATTERN';
    throw err;
  }
  return result.queryArc(0, 1);
}
```

- [ ] **Step 8: Run tests**

Run: `npx vitest run tests/eval/strudelHeadless.test.js`
Expected: PASS (7 tests). If the `_$:` test fails because the transpiler emits a different id for muted labels, log `id` inside `.p` once, adapt the `startsWith` check to what it emits, and note it in the commit message.

Run: `npm test`
Expected: all previous 198 tests plus the 7 new ones pass.

- [ ] **Step 9: Scripts and gitignore**

In `package.json` `"scripts"` add:
```json
"eval": "node --import ./eval/node-hooks/register.mjs eval/runner.mjs",
"eval:analyze": "node eval/analyze.mjs",
"eval:freeze": "node eval/corpus/freeze.mjs",
"eval:sounds": "node eval/scripts/snapshotSounds.mjs",
"eval:graph": "node --import ./eval/node-hooks/register.mjs eval/graph/exportGraph.mjs"
```

Append to `.gitignore`:
```
eval/results/smoke-*
```

- [ ] **Step 10: Commit**

```bash
git add eval/node-hooks eval/strudelHeadless.js eval/config.js tests/eval/strudelHeadless.test.js vite.config.js package.json package-lock.json .gitignore docs/thesis/expose.pdf PROJECT_STATE.md
git commit -m "feat(eval): headless Strudel evaluation + experiment config"
```

---

### Task 1: Known-sound whitelist + fix silent library sounds

**Files:**
- Create: `eval/scripts/snapshotSounds.mjs`, `eval/data/knownSounds.json` (generated), `eval/knownSounds.js`
- Modify: `src/library/soundLibrary.js` (8 percussion patterns)
- Test: `tests/eval/knownSounds.test.js`

**Interfaces:**
- Consumes: `queryCycle` (Task 0).
- Produces: `isKnownSound(value: object): boolean`, `soundLabel(value): string`, `BUILTIN_SYNTHS: string[]`.

Background: the app loads exactly two manifests (`src/strudel.js`): `tidal-drum-machines.json` (keys like `RolandTR909_bd`; the 909 has `bd cp cr hh ht lt mt oh rd rim sd`) and `dirt-samples` (218 names; includes `bd hh cp click lt clubkick`, **not** `oh rim ride`). A headless check on 2026-10-12 found 8 library patterns that call `oh`, `rim` or `ride` **without** `.bank(...)`. Those layers are silent in the app today. `ride` does not exist in the 909 bank at all (the name is `rd`).

- [ ] **Step 1: Snapshot script**

`eval/scripts/snapshotSounds.mjs`:
```js
// Snapshot of the sample manifests src/strudel.js loads. Re-run only if strudel.js changes.
import { writeFileSync, mkdirSync } from 'node:fs';

const SOURCES = {
  banked: 'https://raw.githubusercontent.com/felixroos/dough-samples/main/tidal-drum-machines.json',
  plain: 'https://raw.githubusercontent.com/tidalcycles/dirt-samples/main/strudel.json',
};

const out = { fetchedAt: new Date().toISOString(), sources: SOURCES };
for (const [kind, url] of Object.entries(SOURCES)) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const manifest = await res.json();
  out[kind] = Object.keys(manifest).filter(k => !k.startsWith('_')).sort();
}

mkdirSync(new URL('../data/', import.meta.url), { recursive: true });
writeFileSync(new URL('../data/knownSounds.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
console.log(`banked: ${out.banked.length}, plain: ${out.plain.length}`);
```

Run: `npm run eval:sounds`
Expected: `banked: 683, plain: 218` (counts may drift slightly upstream; record the printed numbers in the commit message).

- [ ] **Step 2: Write the failing test**

`tests/eval/knownSounds.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { isKnownSound, soundLabel } from '../../eval/knownSounds.js';
import { queryCycle } from '../../eval/strudelHeadless.js';
import { soundLibrary } from '../../src/library/soundLibrary.js';

describe('isKnownSound', () => {
  it('accepts banked drum machine samples', () => {
    expect(isKnownSound({ s: 'bd', bank: 'RolandTR909' })).toBe(true);
    expect(isKnownSound({ s: 'rd', bank: 'RolandTR909' })).toBe(true);
  });
  it('rejects names missing from the bank', () => {
    expect(isKnownSound({ s: 'ride', bank: 'RolandTR909' })).toBe(false);
  });
  it('accepts plain dirt samples and rejects unknown plain names', () => {
    expect(isKnownSound({ s: 'clubkick' })).toBe(true);
    expect(isKnownSound({ s: 'oh' })).toBe(false);
    expect(isKnownSound({ s: 'zzzkick' })).toBe(false);
  });
  it('accepts built-in synths and note() without s', () => {
    expect(isKnownSound({ s: 'sawtooth', note: 'c2' })).toBe(true);
    expect(isKnownSound({ s: 'saw' })).toBe(true);
    expect(isKnownSound({ note: 'c2' })).toBe(true);
  });
  it('strips sample index suffixes', () => {
    expect(isKnownSound({ s: 'bd:3' })).toBe(true);
  });
  it('labels banked sounds with their bank', () => {
    expect(soundLabel({ s: 'ride', bank: 'RolandTR909' })).toBe('RolandTR909_ride');
    expect(soundLabel({ s: 'zzz' })).toBe('zzz');
  });
});

describe('sound library integrity (headless)', () => {
  const all = Object.entries(soundLibrary).flatMap(([pillar, pats]) => pats.map(p => [pillar, p]));
  it.each(all.map(([pillar, p]) => [`${pillar}/${p.id}`, p]))('%s plays only known sounds', async (_, p) => {
    const haps = await queryCycle(p.code);
    expect(haps.length).toBeGreaterThan(0);
    const unknown = haps.map(h => h.value).filter(v => !isKnownSound(v)).map(soundLabel);
    expect([...new Set(unknown)]).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/eval/knownSounds.test.js`
Expected: FAIL, module `eval/knownSounds.js` not found.

- [ ] **Step 4: Implement `eval/knownSounds.js`**

```js
import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(new URL('./data/knownSounds.json', import.meta.url), 'utf8'));
const BANKED = new Set(data.banked);
const PLAIN = new Set(data.plain);

// superdough built-ins (no sample needed).
export const BUILTIN_SYNTHS = [
  'sine', 'square', 'triangle', 'sawtooth', 'saw', 'supersaw', 'pulse',
  'white', 'pink', 'brown', 'crackle',
];
const SYNTHS = new Set(BUILTIN_SYNTHS);

const baseName = s => String(s).split(':')[0];

// Can the app's sample setup resolve this hap value to a sound?
export function isKnownSound(value) {
  if (value?.s === undefined || value?.s === null) return true; // note() without s → default synth
  const name = baseName(value.s);
  if (SYNTHS.has(name)) return true;
  if (value.bank) return BANKED.has(`${value.bank}_${name}`);
  return PLAIN.has(name);
}

export function soundLabel(value) {
  return value?.bank ? `${value.bank}_${baseName(value.s)}` : baseName(value?.s);
}
```

- [ ] **Step 5: Run tests — expect exactly the 8 known library failures**

Run: `npx vitest run tests/eval/knownSounds.test.js`
Expected: unit tests PASS; library integrity FAILS for exactly `perc_industrial_iron`, `perc_breathing_ghost`, `perc_tape_drift_warp`, `perc_909_warehouse_anthem`, `perc_motor_city_groove`, `perc_sparse_open_hat`, `perc_rim_hat_minimal`, `perc_degrading_oh`.

- [ ] **Step 6: Fix the 8 patterns in `src/library/soundLibrary.js`**

Add `.bank("RolandTR909")` directly after each `s("...")` that uses `oh` or `rim`, and rename `ride` → `rd`. Exact replacements:

| id | old | new |
|---|---|---|
| perc_industrial_iron | `s("~ oh*4").gain(0.85)` | `s("~ oh*4").bank("RolandTR909").gain(0.85)` |
| perc_breathing_ghost | `s("~ oh").gain(0.7).room(0.3)` | `s("~ oh").bank("RolandTR909").gain(0.7).room(0.3)` |
| perc_tape_drift_warp | `s("rim(5,8)").speed(` | `s("rim(5,8)").bank("RolandTR909").speed(` |
| perc_tape_drift_warp | `s("~ oh/2").gain(0.6)` | `s("~ oh/2").bank("RolandTR909").gain(0.6)` |
| perc_909_warehouse_anthem | `s("~ oh ~ oh ~ oh ~ oh").gain(0.8)` | `s("~ oh ~ oh ~ oh ~ oh").bank("RolandTR909").gain(0.8)` |
| perc_909_warehouse_anthem | `s("~ ride ~ ride ~ ride ~ ride")` | `s("~ rd ~ rd ~ rd ~ rd").bank("RolandTR909")` |
| perc_motor_city_groove | `s("~ oh ~ oh ~ oh ~ oh").gain(0.7)` | `s("~ oh ~ oh ~ oh ~ oh").bank("RolandTR909").gain(0.7)` |
| perc_sparse_open_hat | `` code: `s("~ oh ~ ~ ~ oh ~ ~")` `` | `` code: `s("~ oh ~ ~ ~ oh ~ ~").bank("RolandTR909")` `` |
| perc_rim_hat_minimal | `s("~ rim ~ ~ ~ rim ~ ~").gain(0.8)` | `s("~ rim ~ ~ ~ rim ~ ~").bank("RolandTR909").gain(0.8)` |
| perc_degrading_oh | `` code: `s("oh(3,8)").degradeBy( `` | `` code: `s("oh(3,8)").bank("RolandTR909").degradeBy( `` |

`perc_909_warehouse_anthem` and `perc_motor_city_groove` contain the identical string `s("~ oh ~ oh ~ oh ~ oh")` with different `.gain`. Include the `.gain(...)` in each edit so it stays unique.

- [ ] **Step 7: Run tests**

Run: `npm test`
Expected: all pass (including `library.test.js` and the 58 integrity cases).

- [ ] **Step 8: Commit**

```bash
git add eval/scripts eval/data eval/knownSounds.js tests/eval/knownSounds.test.js src/library/soundLibrary.js
git commit -m "fix(library): bank 8 percussion patterns whose oh/rim/ride samples never resolved

Headless whitelist check (eval/knownSounds.js) found the layers silent in the app:
dirt-samples has no oh/rim/ride; the 909 bank names the ride 'rd'."
```

---

### Task 2: Validity classifier

**Files:**
- Create: `eval/validity.js`
- Test: `tests/eval/validity.test.js`

**Interfaces:**
- Consumes: `queryCycle` (Task 0), `isKnownSound`, `soundLabel` (Task 1), `acorn.parse`.
- Produces: `checkValidity(code: string|null): Promise<Validity>`, `ERROR_CLASSES`, `EXECUTING_CLASSES`.
  `Validity = { valid: boolean, executes: boolean, errorClass: null|'empty'|'syntax'|'forbidden'|'unknown_function'|'runtime'|'no_pattern'|'silent'|'unknown_sound', detail: string|null, haps: Hap[], unknownSounds: string[] }`.
  `valid` ⇔ `errorClass === null`. `executes` ⇔ `errorClass ∈ {null, 'unknown_sound', 'silent'}` (the code runs; F1 is computed over these runs).

Exposé mapping: *Syntaxfehler* = `syntax`; *unbekannte Funktion* = `unknown_function`; *nicht existierender Klangbaustein* = `unknown_sound`. The other classes are reported separately.

- [ ] **Step 1: Write the failing test**

`tests/eval/validity.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { checkValidity } from '../../eval/validity.js';

const cls = async code => (await checkValidity(code)).errorClass;

describe('checkValidity', () => {
  it('accepts a valid library-style track', async () => {
    const r = await checkValidity('stack(s("bd*4").bank("RolandTR909"), note("c1 eb1").s("sawtooth").lpf(400))');
    expect(r).toMatchObject({ valid: true, executes: true, errorClass: null, unknownSounds: [] });
    expect(r.haps.length).toBe(6);
  });

  it('classifies empty output', async () => {
    expect(await cls('')).toBe('empty');
    expect(await cls('   ')).toBe('empty');
    expect(await cls(null)).toBe('empty');
  });

  it('classifies JS and mini-notation syntax errors as syntax', async () => {
    expect(await cls('s("bd*4".lpf(400)')).toBe('syntax');
    expect(await cls('s("bd [hh")')).toBe('syntax');
  });

  it('classifies unknown methods and globals as unknown_function', async () => {
    expect(await cls('s("bd*4").fooBar(3)')).toBe('unknown_function');
    expect(await cls('fooBar("bd*4")')).toBe('unknown_function');
  });

  it('classifies non-pattern results', async () => {
    expect(await cls('42')).toBe('no_pattern');
  });

  it('classifies rest-only patterns as silent', async () => {
    const r = await checkValidity('s("~ ~")');
    expect(r).toMatchObject({ errorClass: 'silent', executes: true, valid: false });
  });

  it('classifies invented sounds as unknown_sound and lists them', async () => {
    const r = await checkValidity('stack(s("zzzkick*4"), s("ride").bank("RolandTR909"))');
    expect(r.errorClass).toBe('unknown_sound');
    expect(r.executes).toBe(true);
    expect(r.unknownSounds.sort()).toEqual(['RolandTR909_ride', 'zzzkick']);
  });

  // Review Focus 1: REPL-only syntax plays in the app → valid here too.
  it('treats $:, setcpm and .pianoroll as valid', async () => {
    expect(await cls('$: s("bd*4")\n$: s("hh*8").bank("RolandTR909")')).toBe(null);
    expect(await cls('setcpm(130/4)\ns("bd*4")')).toBe(null);
    expect(await cls('s("bd*4").pianoroll()')).toBe(null);
  });

  // Review Focus 2: never execute dangerous code.
  it('rejects process access, loops and constructor escapes before evaluation', async () => {
    expect(await cls('process.exit(1)')).toBe('forbidden');
    expect(await cls('while(true){}\ns("bd")')).toBe('forbidden');
    expect(await cls('for (;;) {}')).toBe('forbidden');
    expect(await cls('s("bd").constructor.constructor("return process")()')).toBe('forbidden');
    expect(await cls('s("bd")["constructor"]')).toBe('forbidden');
    expect(await cls('globalThis.x = 1; s("bd")')).toBe('forbidden');
    expect(await cls('import("node:fs")')).toBe('forbidden');
  });

  it('classifies other runtime throws as runtime', async () => {
    expect(await cls('const a = undefined; a.b')).toBe('runtime');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/eval/validity.test.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `eval/validity.js`**

```js
import { parse } from 'acorn';
import { queryCycle } from './strudelHeadless.js';
import { isKnownSound, soundLabel } from './knownSounds.js';

export const ERROR_CLASSES = ['empty', 'syntax', 'forbidden', 'unknown_function', 'runtime', 'no_pattern', 'silent', 'unknown_sound'];
export const EXECUTING_CLASSES = [null, 'unknown_sound', 'silent'];

// LLM code is evaluated in Node with full process rights — this AST check is the
// security boundary. Strudel code never needs any of these.
const FORBIDDEN_NAMES = new Set([
  'process', 'globalThis', 'global', 'window', 'document', 'require', 'module',
  'eval', 'Function', 'fetch', 'setTimeout', 'setInterval',
  'constructor', '__proto__', 'prototype',
]);
const LOOP_TYPES = new Set(['WhileStatement', 'DoWhileStatement', 'ForStatement', 'ForInStatement', 'ForOfStatement']);
const MODULE_TYPES = new Set(['ImportExpression', 'ImportDeclaration', 'ExportNamedDeclaration', 'ExportDefaultDeclaration', 'MetaProperty']);

function findForbidden(node) {
  if (LOOP_TYPES.has(node.type)) return `loop statement (${node.type})`;
  if (MODULE_TYPES.has(node.type)) return `module access (${node.type})`;
  if (node.type === 'Identifier' && FORBIDDEN_NAMES.has(node.name)) return `identifier ${node.name}`;
  if (node.type === 'MemberExpression' && node.computed && node.property.type === 'Literal'
      && FORBIDDEN_NAMES.has(String(node.property.value))) return `property ${node.property.value}`;
  for (const value of Object.values(node)) {
    for (const child of Array.isArray(value) ? value : [value]) {
      if (child && typeof child === 'object' && typeof child.type === 'string') {
        const hit = findForbidden(child);
        if (hit) return hit;
      }
    }
  }
  return null;
}

function classifyThrow(err) {
  if (err?.code === 'NO_PATTERN') return 'no_pattern';
  const msg = String(err?.message ?? err);
  if (msg.startsWith('[mini]')) return 'syntax';
  if (err instanceof ReferenceError || /is not a function|is not defined/.test(msg)) return 'unknown_function';
  return 'runtime';
}

const isAudible = v => v && typeof v === 'object' && ('s' in v || 'note' in v || 'n' in v);

function fail(errorClass, detail, extra = {}) {
  return {
    valid: false,
    executes: EXECUTING_CLASSES.includes(errorClass),
    errorClass, detail, haps: [], unknownSounds: [], ...extra,
  };
}

export async function checkValidity(code) {
  if (typeof code !== 'string' || !code.trim()) return fail('empty', 'no code');

  let ast;
  try {
    ast = parse(code, { ecmaVersion: 'latest', sourceType: 'module', allowAwaitOutsideFunction: true });
  } catch (err) {
    return fail('syntax', err.message);
  }
  const forbidden = findForbidden(ast);
  if (forbidden) return fail('forbidden', forbidden);

  let haps;
  try {
    haps = await queryCycle(code);
  } catch (err) {
    return fail(classifyThrow(err), String(err?.message ?? err));
  }

  const audible = haps.filter(h => isAudible(h.value));
  if (!audible.length) return fail('silent', 'no audible events in cycle 0..1', { haps });

  const unknownSounds = [...new Set(audible.map(h => h.value).filter(v => !isKnownSound(v)).map(soundLabel))];
  if (unknownSounds.length) return fail('unknown_sound', unknownSounds.join(', '), { haps, unknownSounds });

  return { valid: true, executes: true, errorClass: null, detail: null, haps, unknownSounds: [] };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/eval/validity.test.js`
Expected: PASS (11 tests). If `const a = undefined; a.b` returns `unknown_function` (V8 message wording differs), change the test input to `s("bd").gain(undefined.x)` and keep the expectation `runtime`. Do not loosen `classifyThrow`.

- [ ] **Step 5: Commit**

```bash
git add eval/validity.js tests/eval/validity.test.js
git commit -m "feat(eval): validity classifier with error classes + AST security gate"
```

---

### Task 3: LLM options plumbing in the app (temperature, seed, tokens, reasoning, graph context)

**Files:**
- Modify: `src/llm.js`, `src/intent.js`
- Test: `tests/llm.test.js`, `tests/intent.test.js`

**Interfaces:**
- Produces:
  - `callOllamaDetailed(system, user, { schema?, temperature=0, seed=42, numPredict=200, onCall? }) → Promise<{ text, raw, promptTokens, evalTokens, durationMs }>`. `onCall(result)` is invoked after each successful call.
  - `callOllama(system, user, options)`: unchanged contract (returns `text`), now forwards all options.
  - `OLLAMA_MODEL`, `OLLAMA_URL` exported.
  - `generateIntent(prompt, llm = {})`, `buildIntent(prompt, llm = {})`.
  - `generateTransformationPlan(pillarName, userPrompt, currentTracksState = {}, intent = null, { llm = {}, reasoning = false, graphContext = null, catalogOverride = null } = {})` → plan `{ selectedId, explanation, modifications, reasoning? }`.
- `llm` = the options object passed through to `callOllama` (`{ temperature, seed, numPredict, onCall }`).

App callers (`app.js:195-196`) stay unchanged, so defaults keep the app deterministic. This task also fixes the `"exlaplanation"` few-shot typo (PROJECT_STATE §8), because the examples are now rendered with `JSON.stringify`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/llm.test.js`:
```js
import { callOllamaDetailed } from '../src/llm.js';

function bodyOf(call) { return JSON.parse(call[1].body); }

describe('callOllamaDetailed', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('keeps app defaults: temperature 0, seed 42, num_predict 200', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ message: { content: 'x' } }) });
    await callOllamaDetailed('sys', 'user');
    expect(bodyOf(global.fetch.mock.calls[0]).options).toEqual({ temperature: 0, seed: 42, num_predict: 200 });
  });

  it('forwards temperature, seed, numPredict and reports tokens via onCall', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      message: { content: '```js\ns("bd")\n```' }, prompt_eval_count: 120, eval_count: 30,
    }) });
    const seen = [];
    const r = await callOllamaDetailed('sys', 'user', { temperature: 0.7, seed: 1003, numPredict: 1024, onCall: x => seen.push(x) });
    expect(bodyOf(global.fetch.mock.calls[0]).options).toEqual({ temperature: 0.7, seed: 1003, num_predict: 1024 });
    expect(r.text).toBe('s("bd")');
    expect(r.raw).toBe('```js\ns("bd")\n```');
    expect(r).toMatchObject({ promptTokens: 120, evalTokens: 30 });
    expect(typeof r.durationMs).toBe('number');
    expect(seen).toHaveLength(1);
  });
});

describe('generateTransformationPlan options', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('forwards llm options to Ollama', async () => {
    mockFetch(mockPlan());
    await generateTransformationPlan('drums', 'kick', {}, null, { llm: { temperature: 0.7, seed: 7, numPredict: 1024 } });
    expect(bodyOf(global.fetch.mock.calls[0]).options).toEqual({ temperature: 0.7, seed: 7, num_predict: 1024 });
  });

  it('reasoning: schema demands reasoning first and the plan returns it', async () => {
    mockFetch(mockPlan({ reasoning: 'Four on the floor fits techno.' }));
    const plan = await generateTransformationPlan('drums', 'kick', {}, null, { reasoning: true });
    const schema = bodyOf(global.fetch.mock.calls[0]).format;
    expect(Object.keys(schema.properties)[0]).toBe('reasoning');
    expect(schema.required).toContain('reasoning');
    expect(plan.reasoning).toBe('Four on the floor fits techno.');
    expect(systemTextOf(global.fetch.mock.calls[0])).toContain('reasoning');
  });

  it('without reasoning the schema has no reasoning field', async () => {
    mockFetch(mockPlan());
    const plan = await generateTransformationPlan('drums', 'kick', {});
    expect(bodyOf(global.fetch.mock.calls[0]).format.properties.reasoning).toBeUndefined();
    expect(plan.reasoning).toBeUndefined();
  });

  it('injects graph context into the system prompt', async () => {
    mockFetch(mockPlan());
    await generateTransformationPlan('drums', 'kick', {}, null, { graphContext: 'detroit → 118–127 BPM' });
    expect(systemTextOf(global.fetch.mock.calls[0])).toContain('detroit → 118–127 BPM');
  });

  it('catalogOverride restricts the selectedId enum', async () => {
    const { soundLibrary } = await import('../src/library/soundLibrary.js');
    const two = soundLibrary.drums.slice(0, 2);
    mockFetch(mockPlan({ selectedId: two[0].id }));
    await generateTransformationPlan('drums', 'kick', {}, null, { catalogOverride: two });
    expect(bodyOf(global.fetch.mock.calls[0]).format.properties.selectedId.enum).toEqual(two.map(p => p.id));
  });

  it('few-shot examples contain no typos', async () => {
    mockFetch(mockPlan());
    await generateTransformationPlan('drums', 'kick', {});
    expect(systemTextOf(global.fetch.mock.calls[0])).not.toContain('exlaplanation');
  });
});
```

Append to `tests/intent.test.js` (add `vi` to its vitest import if missing):
```js
describe('buildIntent llm options', () => {
  it('forwards llm options to the classifier call', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ message: { content: '{"genre":"techno","key":"A","scale":"minor","energy":"mid","moods":["dark"]}' } }) });
    await buildIntent('dark techno', { temperature: 0.7, seed: 9, numPredict: 1024 });
    expect(JSON.parse(global.fetch.mock.calls[0][1].body).options).toEqual({ temperature: 0.7, seed: 9, num_predict: 1024 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/llm.test.js tests/intent.test.js`
Expected: FAIL. `callOllamaDetailed` is not exported, and the options are ignored.

- [ ] **Step 3: Implement in `src/llm.js`**

Replace the config constants and `callOllama` with:
```js
// Browser: Vite env. Node (eval/): process env. Default: local qwen2.5:7b.
export const OLLAMA_MODEL = import.meta.env?.VITE_OLLAMA_MODEL ?? globalThis.process?.env?.VITE_OLLAMA_MODEL ?? 'qwen2.5:7b';
export const OLLAMA_URL = import.meta.env?.VITE_OLLAMA_URL ?? globalThis.process?.env?.VITE_OLLAMA_URL ?? 'http://localhost:11434/api/chat';

// Single Ollama call with timing + token accounting. App defaults are deterministic
// (temperature 0, seed 42); the evaluation harness overrides them per run.
// `schema` → Ollama's `format` (JSON Schema). Throws on HTTP error.
export async function callOllamaDetailed(systemPrompt, userPrompt, {
  schema = null, temperature = 0, seed = 42, numPredict = 200, onCall = null,
} = {}) {
  const body = {
    model: OLLAMA_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    stream: false,
    keep_alive: '30m',                                   // pin model in RAM — no cold reload between prompts
    options: { temperature, seed, num_predict: numPredict },
  };
  if (schema) body.format = schema;

  const started = Date.now();
  const response = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);
  const data = await response.json();
  const raw = data.message?.content ?? '';
  const result = {
    text: raw.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim(),
    raw,
    promptTokens: data.prompt_eval_count ?? 0,
    evalTokens: data.eval_count ?? 0,
    durationMs: Date.now() - started,
  };
  onCall?.(result);
  return result;
}

// Returns fence-stripped response text.
export async function callOllama(systemPrompt, userPrompt, options = {}) {
  return (await callOllamaDetailed(systemPrompt, userPrompt, options)).text;
}
```

Replace `buildPlanSchema` with:
```js
function buildPlanSchema(catalog, { reasoning = false } = {}) {
  const properties = {
    // Property order matters: the grammar makes the model write reasoning BEFORE choosing.
    ...(reasoning ? { reasoning: { type: 'string' } } : {}),
    selectedId: { type: 'string', enum: catalog.map(p => p.id) },
    explanation: { type: 'string' },
    modifications: {
      type: 'object',
      properties: {
        speed: { type: 'number', minimum: 0.25, maximum: 4.0 },
        slowdown: { type: 'integer', minimum: 1 },
      },
      additionalProperties: false,
    },
  };
  return {
    type: 'object',
    properties,
    required: reasoning ? ['reasoning', 'selectedId'] : ['selectedId'],
    additionalProperties: false,
  };
}

const PLAN_EXAMPLES = [
  { prompt: 'something darker and hypnotic',
    reasoning: 'Dark hypnotic techno wants a sparse, low-filtered part that repeats without drama.',
    plan: { selectedId: '<dark/hypnotic id>', explanation: 'deep rolling pattern matches the dark mood', modifications: { speed: 1.0, slowdown: 1 } } },
  { prompt: 'give me something more driving',
    reasoning: 'Driving means steady, accented hits on every beat at full tempo.',
    plan: { selectedId: '<punchy id>', explanation: 'punchy pattern adds drive', modifications: { speed: 1.0, slowdown: 1 } } },
  { prompt: 'same energy but faster',
    reasoning: 'The character should stay; only the tempo doubles.',
    plan: { selectedId: '<current-style id>', explanation: 'keeps the feel, doubles the pace', modifications: { speed: 2.0, slowdown: 1 } } },
];

function renderPlanExamples(reasoning) {
  return PLAN_EXAMPLES
    .map(e => `"${e.prompt}" -> ${JSON.stringify(reasoning ? { reasoning: e.reasoning, ...e.plan } : e.plan)}`)
    .join('\n');
}
```

Change `generateTransformationPlan`. Signature, catalog, prompt additions, call and return:
```js
export async function generateTransformationPlan(pillarName, userPrompt, currentTracksState = {}, intent = null, {
  llm = {}, reasoning = false, graphContext = null, catalogOverride = null,
} = {}) {
  try {
    const fullCatalog = soundLibrary[pillarName] ?? [];
    const catalog = catalogOverride
      ?? (intent ? rankPatternsByIntent(pillarName, intent).slice(0, 8).map(r => r.pattern) : fullCatalog);
```
Inside the system prompt template, directly after `${intentBlock}`, insert:
```js
${graphContext ? `\nKnowledge graph context (curated genre → tempo → pattern → function links):\n${graphContext}\n` : ''}
```
Then add as the first rule line when reasoning is on, inside `Rules:`:
```js
${reasoning ? '- reasoning: FIRST write 2–4 sentences thinking like a producer — which genre conventions, tempo and groove the request implies, and which catalog pattern fulfils them. Then choose.\n' : ''}
```
Replace the literal three example lines (including the typo line) with:
```js
${renderPlanExamples(reasoning)}
```
Replace the call and return:
```js
    const cleaned = await callOllama(systemPrompt, userPrompt, { ...llm, schema: buildPlanSchema(catalog, { reasoning }) });
    // … existing parsing + checks unchanged …
    return {
      selectedId: plan.selectedId,
      explanation: plan.explanation ?? '',
      modifications: safeMods,
      ...(reasoning ? { reasoning: plan.reasoning ?? '' } : {}),
    };
```

- [ ] **Step 4: Implement in `src/intent.js`**

```js
export async function generateIntent(prompt, llm = {}) {
  // … unchanged system prompt …
    const cleaned = await callOllama(systemPrompt, prompt, { ...llm, schema: buildIntentSchema() });
```
```js
export async function buildIntent(prompt, llm = {}) {
  const lexed = lexIntent(prompt);
  const llmIntent = await generateIntent(prompt, llm);
  const intent = { ...DEFAULT_INTENT, ...compact(llmIntent ?? {}), ...compact({ bpm: lexed.bpm, genre: lexed.genre, textures: lexed.textures }) };
```
(Rename the local `llm` → `llmIntent` so it does not shadow the parameter. The rest is unchanged.)

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: all pass. Existing `llm.test.js` cases still pass, because positional arguments are unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/llm.js src/intent.js tests/llm.test.js tests/intent.test.js
git commit -m "feat(llm): optional sampling params, token accounting, reasoning + graph context for plans

App defaults unchanged (temperature 0, seed 42). Few-shot examples rendered via
JSON.stringify — fixes the 'exlaplanation' typo."
```

---

### Task 4: Evaluation vocabulary + library tag normalisation

**Files:**
- Create: `eval/vocabulary.js`
- Test: `tests/eval/vocabulary.test.js`

**Interfaces:**
- Produces: `EVAL_VOCAB {genre, character, element}`, `ALL_TAGS: string[]`, `LIBRARY_TAG_MAP: Record<string,string[]>`, `PILLAR_ELEMENT`, `canonicalTags(tags): string[]` (filter to vocab, dedupe, sort), `normalizeLibraryTags(tags): string[]`, `patternById(id): {pillar, pattern}|null`, `tagsForPatternIds(ids): string[]`.

This is the shared vocabulary from the exposé (*gemeinsames Schlagwortvokabular*). Expected corpus tags, ID-derived tags and code-derived tags all live in `ALL_TAGS`.

- [ ] **Step 1: Write the failing test**

`tests/eval/vocabulary.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { ALL_TAGS, LIBRARY_TAG_MAP, canonicalTags, normalizeLibraryTags, tagsForPatternIds, patternById } from '../../eval/vocabulary.js';
import { soundLibrary } from '../../src/library/soundLibrary.js';

const allPatterns = Object.entries(soundLibrary).flatMap(([pillar, ps]) => ps.map(p => ({ pillar, p })));

describe('vocabulary', () => {
  it('has no duplicate tags across facets', () => {
    expect(new Set(ALL_TAGS).size).toBe(ALL_TAGS.length);
  });

  it('maps every library tag explicitly (empty list = deliberately dropped)', () => {
    const libTags = new Set(allPatterns.flatMap(({ p }) => p.tags));
    const missing = [...libTags].filter(t => !(t in LIBRARY_TAG_MAP));
    expect(missing).toEqual([]);
  });

  it('maps only into the vocabulary', () => {
    for (const targets of Object.values(LIBRARY_TAG_MAP)) for (const t of targets) expect(ALL_TAGS).toContain(t);
  });

  it('pattern ids are unique across pillars', () => {
    const ids = allPatterns.map(({ p }) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('canonicalTags filters, dedupes and sorts', () => {
    expect(canonicalTags(['techno', 'dark', 'nonsense', 'dark'])).toEqual(['dark', 'techno']);
  });

  it('normalises library tags', () => {
    expect(normalizeLibraryTags(['303', 'squelch', 'hihat', '909'])).toEqual(['acid', 'hats']);
  });

  it('tagsForPatternIds unions pillar element + library tags', () => {
    expect(patternById('basic_kick').pillar).toBe('drums');
    expect(tagsForPatternIds(['basic_kick'])).toEqual(['kick', 'techno']);
    expect(tagsForPatternIds(['basic_kick', 'unknown_id'])).toEqual(['kick', 'techno']);
    expect(tagsForPatternIds([])).toEqual([]);
  });

  it('every library pattern yields at least one tag', () => {
    for (const { p } of allPatterns) expect(tagsForPatternIds([p.id]).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/eval/vocabulary.test.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `eval/vocabulary.js`**

```js
import { soundLibrary } from '../src/library/soundLibrary.js';

// Shared evaluation vocabulary. Corpus expectations, ID-derived tags (S3–S5) and
// code-derived tags (all stages) are all expressed in exactly these terms.
export const EVAL_VOCAB = {
  genre: ['techno', 'house', 'minimal', 'industrial', 'dub', 'ambient', 'trance', 'lofi', 'acid', 'detroit'],
  character: ['dark', 'hypnotic', 'driving', 'warm', 'gritty', 'spacious', 'glitchy', 'sparse', 'dense', 'metallic', 'deep', 'dissonant', 'evolving'],
  element: ['kick', 'bass', 'sub', 'hats', 'clap', 'percussion', 'lead', 'chords', 'arp', 'pad', 'fx'],
};
export const ALL_TAGS = Object.values(EVAL_VOCAB).flat();
const VOCAB = new Set(ALL_TAGS);

// Every library tag → canonical tags. [] = deliberately dropped (technical or not semantic).
export const LIBRARY_TAG_MAP = {
  'dark': ['dark'], 'minimal': ['minimal'], 'bass': ['bass'], 'techno': ['techno'], 'melody': ['lead'],
  'perc': ['percussion'], 'kick': ['kick'], '909': [], 'hihat': ['hats'], 'industrial': ['industrial'],
  'sparse': ['sparse'], 'hypnotic': ['hypnotic'], 'chromatic': ['dissonant'], 'synth': ['lead'],
  'transition': ['fx'], 'groove': [], 'acid': ['acid'], 'saw': [], 'minor': ['dark'], 'filter': [],
  'sub': ['sub'], 'sine': [], 'chord': ['chords'], 'phrygian': ['dark'], 'generative': ['evolving'],
  'tritone': ['dissonant'], 'dissonant': ['dissonant'], 'arp': ['arp'], '303': ['acid'],
  'distorted': ['gritty'], '4x4': ['kick'], '4*4': ['kick'], 'house': ['house'], 'syncopated': [],
  'euclidean': [], 'rolling': ['hypnotic'], 'offbeat': [], 'stereo': ['spacious'], 'driving': ['driving'],
  'delay': ['spacious'], 'atmospheric': ['spacious'], 'square': [], 'clap': ['clap'], 'lo-fi': ['lofi'],
  'squelch': ['acid'], 'bleep': ['lead'], 'descending': [], 'basic': [], 'foundation': ['kick'],
  'dirt': [], 'club': [], 'warm': ['warm'], 'rhythmic': [], 'two-bar': [], 'dynamic': [],
  'accented': ['driving'], 'progressive': ['evolving'], 'slinker': [], 'tribal': ['percussion'],
  'tom': ['percussion'], 'percussive': ['percussion'], 'classic': [], 'deep': ['deep'],
  'resonance': ['acid'], 'dub': ['dub'], 'metallic': ['metallic'], 'modulation': ['evolving'],
  'panning': ['spacious'], 'hats': ['hats'], 'ambient': ['ambient'], 'probability': ['glitchy'],
  'ghostly': ['spacious'], 'tape-drift': ['lofi'], 'pitch-modulation': ['evolving'], 'warp': ['glitchy'],
  'rimshot': ['percussion'], 'warehouse': ['industrial'], 'detroit': ['detroit'], 'toms': ['percussion'],
  'modulated': ['evolving'], 'rim': ['percussion'], 'degrading': ['glitchy'], 'sequence': ['arp'],
  'trance': ['trance'], 'shimmer': ['pad'], 'polyrhythmic': [], 'psychedelic': ['hypnotic'],
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

// Exposé: from S2 on, tags come from the selected ids. Unknown ids contribute nothing.
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

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/eval/vocabulary.test.js`
Expected: PASS. If "maps every library tag" lists missing tags (multi-line tag arrays the plan's grep missed), add each to `LIBRARY_TAG_MAP` with a deliberate mapping or `[]`, then re-run.

- [ ] **Step 5: Commit**

```bash
git add eval/vocabulary.js tests/eval/vocabulary.test.js
git commit -m "feat(eval): shared evaluation vocabulary + library tag normalisation"
```

---

### Task 5: Code lexicon (code → tags)

**Files:**
- Create: `eval/codeLexicon.js`
- Test: `tests/eval/codeLexicon.test.js`

**Interfaces:**
- Consumes: `canonicalTags` (Task 4), `isKnownSound`, `BUILTIN_SYNTHS` (Task 1), `noteToMidi` from `@strudel/core`, haps from `checkValidity(...).haps` (Task 2).
- Produces: `tagsFromCode(code: string, haps: Hap[]): string[]`.

This is the exposé's methodological contribution: S0–S2 output has no IDs, so tags are derived deterministically from what the code *plays*. Unknown sounds produce no element or density tags, which lowers precision exactly as the exposé describes. Every rule is a fixed threshold, documented here and cited in the thesis.

| Rule | Tag |
|---|---|
| known `s ∈ {bd, kick, clubkick}` | kick |
| known `s ∈ {hh, oh, hat, hihat, rd, ride, cr, crash}` | hats |
| known `s ∈ {cp, clap}` | clap |
| known `s ∈ {rim, rs, sd, snare, lt, mt, ht, tom, click, perc, cb, shaker}` | percussion |
| pitched (synth or no `s`), MIDI < 48 | bass |
| pitched, MIDI < 36 | sub |
| pitched, MIDI ≥ 48 | lead |
| ≥ 3 pitched MIDI ≥ 48 onsets at the same time | chords |
| kick onsets at 0, ¼, ½, ¾ | techno |
| any `cutoff < 800` | dark |
| `.scale("…:minor/phrygian/locrian/aeolian")` in code | dark |
| any `room ≥ 0.4` or `delay ≥ 0.4` | spacious |
| any `shape ≥ 0.3`, `distort ≥ 0.2`, `crush ≤ 8`, `coarse ≥ 4` | gritty |
| `crush ≤ 8` | lofi |
| `resonance ≥ 10` on saw/sawtooth/square | acid |
| `.degradeBy(`, `.sometimes`, `.rarely` or mini `?` in code | glitchy |
| known audible events in cycle ≥ 24 | dense |
| known audible events in cycle ≤ 6 | sparse |

- [ ] **Step 1: Write the failing test**

`tests/eval/codeLexicon.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { tagsFromCode } from '../../eval/codeLexicon.js';
import { queryCycle } from '../../eval/strudelHeadless.js';

const tagsOf = async code => tagsFromCode(code, await queryCycle(code));

describe('tagsFromCode', () => {
  it('four-on-the-floor 909 kick → kick, sparse, techno', async () => {
    expect(await tagsOf('s("bd*4").bank("RolandTR909")')).toEqual(['kick', 'sparse', 'techno']);
  });

  it('16 hats → hats only (neither sparse nor dense)', async () => {
    expect(await tagsOf('s("hh*16").bank("RolandTR909")')).toEqual(['hats']);
  });

  it('low resonant saw → acid, bass, dark, sparse, sub', async () => {
    expect(await tagsOf('note("c1 c1 eb1 g1").s("sawtooth").lpf(400).lpq(15)')).toEqual(['acid', 'bass', 'dark', 'sparse', 'sub']);
  });

  it('triad with reverb → chords, lead, spacious, sparse', async () => {
    expect(await tagsOf('note("[c3,eb3,g3]").s("triangle").room(0.6)')).toEqual(['chords', 'lead', 'spacious', 'sparse']);
  });

  it('invented sounds yield no tags', async () => {
    expect(await tagsOf('s("zzz*4")')).toEqual([]);
  });

  it('degradeBy → glitchy; minor scale → dark', async () => {
    expect(await tagsOf('stack(s("bd*4"), s("hh*8")).degradeBy(0.3)')).toContain('glitchy');
    expect(await tagsOf('n("0 2 4").scale("A:phrygian").s("sine")')).toContain('dark');
  });

  it('crush ≤ 8 → gritty + lofi', async () => {
    const tags = await tagsOf('s("hh*8").bank("RolandTR909").crush(6)');
    expect(tags).toEqual(expect.arrayContaining(['gritty', 'lofi', 'hats']));
  });

  it('dense cycles', async () => {
    expect(await tagsOf('stack(s("hh*16"), s("bd*8"), s("cp*4"))')).toContain('dense');
  });

  it('works without haps (invalid code) and returns only regex tags', () => {
    expect(tagsFromCode('s("bd").degradeBy(0.5', [])).toEqual(['glitchy']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/eval/codeLexicon.test.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `eval/codeLexicon.js`**

```js
import { noteToMidi } from '@strudel/core';
import { canonicalTags } from './vocabulary.js';
import { isKnownSound, BUILTIN_SYNTHS } from './knownSounds.js';

// Deterministic code → tag lexicon (thesis: methodological contribution).
// Thresholds are fixed constants — change them only before the corpus is frozen.
const KICK = new Set(['bd', 'kick', 'clubkick']);
const HATS = new Set(['hh', 'oh', 'hat', 'hihat', 'rd', 'ride', 'cr', 'crash']);
const CLAP = new Set(['cp', 'clap']);
const PERC = new Set(['rim', 'rs', 'sd', 'snare', 'lt', 'mt', 'ht', 'tom', 'click', 'perc', 'cb', 'shaker']);
const SYNTHS = new Set(BUILTIN_SYNTHS);
const ACID_SOURCES = new Set(['saw', 'sawtooth', 'square']);
const FOUR_ON_FLOOR = [0, 0.25, 0.5, 0.75];

const DENSE_MIN_EVENTS = 24;
const SPARSE_MAX_EVENTS = 6;
const DARK_CUTOFF_HZ = 800;

const baseName = s => (s === undefined || s === null ? undefined : String(s).split(':')[0]);

function midiOf(value) {
  if (typeof value.note === 'number') return value.note;
  if (typeof value.note === 'string') {
    try { return noteToMidi(value.note); } catch { return null; }
  }
  return null;
}

export function tagsFromCode(code, haps = []) {
  const tags = new Set();
  const pitchedOnsets = new Map();
  const kickOnsets = new Set();
  let knownEvents = 0;

  for (const hap of haps) {
    const v = hap.value;
    if (!v || typeof v !== 'object') continue;
    if (!isKnownSound(v)) continue;
    const sound = baseName(v.s);
    const onset = hap.whole ? hap.whole.begin.valueOf() : null;
    knownEvents++;

    if (sound && KICK.has(sound)) { tags.add('kick'); if (onset !== null) kickOnsets.add(onset); }
    if (sound && HATS.has(sound)) tags.add('hats');
    if (sound && CLAP.has(sound)) tags.add('clap');
    if (sound && PERC.has(sound)) tags.add('percussion');

    const midi = midiOf(v);
    if (midi !== null && (sound === undefined || SYNTHS.has(sound))) {
      if (midi < 48) tags.add('bass');
      if (midi < 36) tags.add('sub');
      if (midi >= 48) {
        tags.add('lead');
        if (onset !== null) pitchedOnsets.set(onset, (pitchedOnsets.get(onset) ?? 0) + 1);
      }
    }

    if (typeof v.cutoff === 'number' && v.cutoff < DARK_CUTOFF_HZ) tags.add('dark');
    if ((v.room ?? 0) >= 0.4 || (v.delay ?? 0) >= 0.4) tags.add('spacious');
    const crushed = typeof v.crush === 'number' && v.crush <= 8;
    if ((v.shape ?? 0) >= 0.3 || (v.distort ?? 0) >= 0.2 || crushed || (v.coarse ?? 0) >= 4) tags.add('gritty');
    if (crushed) tags.add('lofi');
    if ((v.resonance ?? 0) >= 10 && ACID_SOURCES.has(sound)) tags.add('acid');
  }

  if ([...pitchedOnsets.values()].some(n => n >= 3)) tags.add('chords');
  if (FOUR_ON_FLOOR.every(t => kickOnsets.has(t))) tags.add('techno');
  if (knownEvents >= DENSE_MIN_EVENTS) tags.add('dense');
  if (knownEvents > 0 && knownEvents <= SPARSE_MAX_EVENTS) tags.add('sparse');

  const src = String(code ?? '');
  if (/\.degradeBy\(|\.sometimes|\.rarely|[\w~\]]\?/.test(src)) tags.add('glitchy');
  if (/scale\(\s*["'][^"']*:(minor|phrygian|locrian|aeolian)/i.test(src)) tags.add('dark');

  return canonicalTags([...tags]);
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/eval/codeLexicon.test.js`
Expected: PASS. If the `lpq` test misses `acid`, check `haps[0].value` keys: Strudel stores `lpq` as `resonance` (confirm with a one-line `console.log`). If the key differs, use the key you observe, with `resonance` as fallback, and note it in the commit.

- [ ] **Step 5: Commit**

```bash
git add eval/codeLexicon.js tests/eval/codeLexicon.test.js
git commit -m "feat(eval): deterministic code→tag lexicon"
```

---

### Task 6: Stage scaffolding + S3 (constraint = prototype selection pipeline)

**Files:**
- Create: `eval/stages/common.js`, `eval/stages/s3.js`, `tests/eval/helpers.js`
- Test: `tests/eval/stages.s3.test.js`

**Interfaces:**
- Consumes: `buildIntent(prompt, llm)`, `generateTransformationPlan(..., options)` (Task 3), `compileTrack`, `makePillars`, `PILLAR_NAMES`, `EVAL_CONFIG`.
- Produces:
  - `RunOpts = { temperature: number, seed: number }`
  - `StageResult = { code: string|null, selectedIds: string[]|null, intent: object|null, plans: object[], llm: { calls, promptTokens, evalTokens, llmMs, outputs: string[] } }`
  - `Stage = { id: 'S0'..'S5', tagSource: 'code'|'ids', run(prompt: string, opts: RunOpts): Promise<StageResult> }`
  - `common.js`: `DEFAULT_TRACK_PILLARS`, `trackPillars(intent)`, `assembleStack(codes)`, `extractCode(raw)`, `makeCallLog()`, `llmOptions(opts, onCall)`, `runSelectionStage(prompt, opts, { planOptionsFor? })`.
  - `s3.js`: `export const S3: Stage`.
- Test helper `mockOllama(handler)`: `handler(body) → string content`. Every response carries `prompt_eval_count: 10, eval_count: 5`.

S3 is built first because it already exists as the app pipeline (spec §2.1 S3). Here it is only wrapped.

- [ ] **Step 1: Test helper**

`tests/eval/helpers.js`:
```js
import { vi } from 'vitest';

// Route each Ollama request to handler(body) → response content string.
export function mockOllama(handler) {
  global.fetch = vi.fn(async (_url, init) => {
    const body = JSON.parse(init.body);
    return { ok: true, json: async () => ({ message: { content: handler(body) }, prompt_eval_count: 10, eval_count: 5 }) };
  });
  return global.fetch;
}

export const bodies = () => global.fetch.mock.calls.map(c => JSON.parse(c[1].body));
export const isIntentCall = body => Boolean(body.format?.properties?.genre);
export const isPlanCall = body => Boolean(body.format?.properties?.selectedId);

export const intentJson = layers => JSON.stringify({
  genre: 'techno', key: 'A', scale: 'minor', energy: 'mid', moods: ['dark'], textures: [],
  layers: layers.map(pillar => ({ pillar, character: 'x' })),
});

// Picks the first allowed id — always valid regardless of retrieval ranking.
export const firstChoicePlan = (body, extra = {}) => JSON.stringify({
  selectedId: body.format.properties.selectedId.enum[0],
  explanation: 'fits', modifications: { speed: 1, slowdown: 1 }, ...extra,
});
```

- [ ] **Step 2: Write the failing test**

`tests/eval/stages.s3.test.js`:
```js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { S3 } from '../../eval/stages/s3.js';
import { trackPillars, assembleStack, extractCode } from '../../eval/stages/common.js';
import { mockOllama, bodies, isIntentCall, intentJson, firstChoicePlan } from './helpers.js';
import { soundLibrary } from '../../src/library/soundLibrary.js';

const opts = { temperature: 0.7, seed: 1003 };

describe('common', () => {
  it('trackPillars keeps PILLAR_NAMES order and defaults to drums+bass', () => {
    expect(trackPillars({ layers: [{ pillar: 'melody' }, { pillar: 'drums' }, { pillar: 'drums' }] })).toEqual(['drums', 'melody']);
    expect(trackPillars({ layers: [] })).toEqual(['drums', 'bass']);
    expect(trackPillars(null)).toEqual(['drums', 'bass']);
  });
  it('assembleStack', () => {
    expect(assembleStack([])).toBeNull();
    expect(assembleStack(['a', null])).toBe('a');
    expect(assembleStack(['a', 'b'])).toBe('stack(\na,\nb\n)');
  });
  it('extractCode takes the first fenced block, else the whole text', () => {
    expect(extractCode('Here you go:\n```js\ns("bd")\n```\nEnjoy!')).toBe('s("bd")');
    expect(extractCode('```\nnote("c2")\n```')).toBe('note("c2")');
    expect(extractCode('  s("bd*4")  ')).toBe('s("bd*4")');
    expect(extractCode('')).toBeNull();
  });
});

describe('S3 constraint stage', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('builds a stack with one selected pattern per intent pillar', async () => {
    mockOllama(b => (isIntentCall(b) ? intentJson(['drums', 'bass']) : firstChoicePlan(b)));
    const r = await S3.run('dark techno with bass', opts);
    expect(S3).toMatchObject({ id: 'S3', tagSource: 'ids' });
    expect(r.selectedIds).toHaveLength(2);
    expect(soundLibrary.drums.map(p => p.id)).toContain(r.selectedIds[0]);
    expect(soundLibrary.bass.map(p => p.id)).toContain(r.selectedIds[1]);
    expect(r.code.startsWith('stack(')).toBe(true);
    expect(r.llm).toMatchObject({ calls: 3, promptTokens: 30, evalTokens: 15 });
    expect(r.llm.outputs).toHaveLength(3);
    expect(r.intent.genre).toBe('techno');
  });

  it('forwards temperature, seed and the constant num_predict on every call', async () => {
    mockOllama(b => (isIntentCall(b) ? intentJson(['drums']) : firstChoicePlan(b)));
    await S3.run('kick', opts);
    for (const b of bodies()) expect(b.options).toEqual({ temperature: 0.7, seed: 1003, num_predict: 1024 });
  });

  it('a failed pillar plan drops that layer but keeps the track', async () => {
    mockOllama(b => {
      if (isIntentCall(b)) return intentJson(['drums', 'bass']);
      return b.messages[0].content.includes('low-end movement') ? 'not json' : firstChoicePlan(b);
    });
    const r = await S3.run('techno', opts);
    expect(r.selectedIds).toHaveLength(1);
    expect(r.code.startsWith('stack(')).toBe(false);
  });

  it('all plans failing → code null', async () => {
    mockOllama(b => (isIntentCall(b) ? intentJson(['drums']) : 'not json'));
    const r = await S3.run('techno', opts);
    expect(r.code).toBeNull();
    expect(r.selectedIds).toEqual([]);
  });

  it('passes earlier selections as cohesion context to later pillars', async () => {
    mockOllama(b => (isIntentCall(b) ? intentJson(['drums', 'bass']) : firstChoicePlan(b)));
    const r = await S3.run('techno', opts);
    const bassPrompt = bodies()[2].messages[0].content;
    const drumName = soundLibrary.drums.find(p => p.id === r.selectedIds[0]).name;
    expect(bassPrompt).toContain(drumName);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/eval/stages.s3.test.js`
Expected: FAIL, module not found.

- [ ] **Step 4: Implement `eval/stages/common.js`**

```js
import { buildIntent } from '../../src/intent.js';
import { generateTransformationPlan } from '../../src/llm.js';
import { compileTrack } from '../../src/compiler.js';
import { PILLAR_NAMES, makePillars } from '../../src/pillars.js';
import { EVAL_CONFIG } from '../config.js';

// Underspecified prompts with no recognisable part get a minimal techno track.
export const DEFAULT_TRACK_PILLARS = ['drums', 'bass'];

export function trackPillars(intent) {
  const wanted = new Set((intent?.layers ?? []).map(l => l.pillar));
  const ordered = PILLAR_NAMES.filter(p => wanted.has(p));
  return ordered.length ? ordered : DEFAULT_TRACK_PILLARS;
}

export function assembleStack(layerCodes) {
  const layers = layerCodes.filter(Boolean);
  if (!layers.length) return null;
  return layers.length === 1 ? layers[0] : `stack(\n${layers.join(',\n')}\n)`;
}

// Minimal, identical post-processing for free-code stages (S0–S2):
// first fenced block if present, else the trimmed text.
export function extractCode(raw) {
  const text = String(raw ?? '');
  const fenced = text.match(/```[\w-]*\n([\s\S]*?)```/);
  const code = (fenced ? fenced[1] : text).trim();
  return code || null;
}

export function makeCallLog() {
  const log = { calls: 0, promptTokens: 0, evalTokens: 0, llmMs: 0, outputs: [] };
  const onCall = ({ promptTokens, evalTokens, durationMs, raw }) => {
    log.calls++;
    log.promptTokens += promptTokens;
    log.evalTokens += evalTokens;
    log.llmMs += durationMs;
    log.outputs.push(raw);
  };
  return { log, onCall };
}

export function llmOptions({ temperature, seed }, onCall) {
  return { temperature, seed, numPredict: EVAL_CONFIG.numPredict, onCall };
}

// S3–S5: the prototype's selection pipeline. One plan call per intent pillar, sequential,
// earlier picks passed as cohesion context — exactly like app.js. planOptionsFor adds the
// stage's mechanism (reasoning, graph context) without touching anything else.
export async function runSelectionStage(prompt, opts, { planOptionsFor = () => ({}) } = {}) {
  const { log, onCall } = makeCallLog();
  const llm = llmOptions(opts, onCall);
  const intent = await buildIntent(prompt, llm);
  const pillars = makePillars();
  const tracksState = {};
  const layers = [];
  const selectedIds = [];
  const plans = [];

  for (const pillarName of trackPillars(intent)) {
    const plan = await generateTransformationPlan(pillarName, prompt, tracksState, intent, {
      llm, ...planOptionsFor(pillarName, intent),
    });
    plans.push({ pillar: pillarName, plan });
    if (!plan) continue;
    tracksState[pillarName] = plan.selectedId;
    selectedIds.push(plan.selectedId);
    layers.push(compileTrack(plan, pillarName, pillars.find(p => p.name === pillarName)));
  }

  return { code: assembleStack(layers), selectedIds, intent, plans, llm: log };
}
```

- [ ] **Step 5: Implement `eval/stages/s3.js`**

```js
import { runSelectionStage } from './common.js';

// S3 — constraint: JSON selection of pattern ids (schema) + deterministic compiler.
// This is the existing prototype pipeline. Same retrieval as S2, but the model no longer writes code.
export const S3 = {
  id: 'S3',
  tagSource: 'ids',
  run: (prompt, opts) => runSelectionStage(prompt, opts),
};
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run tests/eval/stages.s3.test.js`
Expected: PASS (8 tests).

- [ ] **Step 7: Commit**

```bash
git add eval/stages/common.js eval/stages/s3.js tests/eval/helpers.js tests/eval/stages.s3.test.js
git commit -m "feat(eval): stage scaffolding + S3 constraint stage (prototype pipeline)"
```

---

### Task 7: Free-code stages S0 baseline, S1 specification, S2 few-shot

**Files:**
- Create: `eval/stages/s0.js`, `eval/stages/s1.js`, `eval/stages/s2.js`
- Test: `tests/eval/stages.free.test.js`

**Interfaces:**
- Consumes: `callOllamaDetailed` (Task 3), `buildIntent`, `rankPatternsByIntent`, `METHOD_CARDS`, `BANKS`, common helpers (Task 6), `isKnownSound` (Task 1).
- Produces:
  - `s0.js`: `S0_SYSTEM: string`, `S0: Stage` (`tagSource: 'code'`, 1 call, `intent: null`)
  - `s1.js`: `SPEC_SOUNDS`, `CORE_FUNCTIONS`, `buildSpecBlock(): string`, `S1_SYSTEM: string` (= `S0_SYSTEM + '\n' + buildSpecBlock()`), `S1: Stage` (`tagSource: 'code'`, 1 call, `intent: null`)
  - `s2.js`: `EXAMPLES_PER_PILLAR = 3`, `buildExamplesBlock(intent): string`, `S2: Stage` (`tagSource: 'code'`, 2 calls, `intent` set)

Spec §2.1: S1 adds a **static** specification and needs no intent. S2 adds the intent call, because choosing the examples depends on it. Each stage adds exactly one mechanism to the one before.

- [ ] **Step 1: Write the failing test**

`tests/eval/stages.free.test.js`:
```js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { S0, S0_SYSTEM } from '../../eval/stages/s0.js';
import { S1, S1_SYSTEM, SPEC_SOUNDS, buildSpecBlock } from '../../eval/stages/s1.js';
import { S2, buildExamplesBlock } from '../../eval/stages/s2.js';
import { isKnownSound } from '../../eval/knownSounds.js';
import { METHOD_CARDS } from '../../src/library/strudelDocs.js';
import { mockOllama, bodies, isIntentCall, intentJson } from './helpers.js';

const opts = { temperature: 0.7, seed: 1000 };

describe('S0 baseline', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('one unconstrained call, code out', async () => {
    mockOllama(() => 's("bd*4")');
    const r = await S0.run('dark techno', opts);
    expect(S0).toMatchObject({ id: 'S0', tagSource: 'code' });
    expect(r).toMatchObject({ code: 's("bd*4")', selectedIds: null, intent: null });
    expect(r.llm.calls).toBe(1);
    const [b] = bodies();
    expect(b.format).toBeUndefined();
    expect(b.messages[0].content).toBe(S0_SYSTEM);
    expect(b.messages[1].content).toBe('dark techno');
    expect(b.options).toEqual({ temperature: 0.7, seed: 1000, num_predict: 1024 });
  });

  // Review Focus 3
  it('extracts the fenced block from prose-wrapped answers', async () => {
    mockOllama(() => 'Sure! Here is a beat:\n```javascript\nstack(s("bd*4"), s("hh*8"))\n```\nHave fun.');
    expect((await S0.run('beat', opts)).code).toBe('stack(s("bd*4"), s("hh*8"))');
  });

  it('empty answer → code null', async () => {
    mockOllama(() => '');
    expect((await S0.run('beat', opts)).code).toBeNull();
  });
});

describe('S1 specification', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('every specified drum name resolves in every specified bank', () => {
    for (const bank of SPEC_SOUNDS.banks)
      for (const s of SPEC_SOUNDS.banked) expect(isKnownSound({ s, bank })).toBe(true);
  });

  it('spec block lists sounds, core functions and every METHOD_CARD with range', () => {
    const block = buildSpecBlock();
    expect(block).toContain('RolandTR909');
    expect(block).toContain('sawtooth');
    expect(block).toContain('stack');
    for (const name of Object.keys(METHOD_CARDS)) expect(block).toMatch(new RegExp(`^- ${name}\\(`, 'm'));
    expect(block).toContain('- lpf(hz): 100–5000 — ');
    expect(block).toContain('- vowel("a".."u"): a|e|i|o|u — ');
  });

  it('one free-code call with the static spec, no intent', async () => {
    mockOllama(() => 's("bd*4").bank("RolandTR909")');
    const r = await S1.run('dark techno', opts);
    expect(S1).toMatchObject({ id: 'S1', tagSource: 'code' });
    expect(r).toMatchObject({ code: 's("bd*4").bank("RolandTR909")', intent: null, selectedIds: null });
    expect(r.llm.calls).toBe(1);
    const [b] = bodies();
    expect(b.format).toBeUndefined();
    expect(b.messages[0].content).toBe(S1_SYSTEM);
    expect(S1_SYSTEM.startsWith(S0_SYSTEM)).toBe(true);
  });
});

describe('S2 few-shot', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('examples block holds the top-3 library patterns per intent pillar, with code', () => {
    const block = buildExamplesBlock({ genre: 'techno', moods: ['dark'], textures: [], layers: [{ pillar: 'drums' }, { pillar: 'bass' }] });
    expect((block.match(/^\[drums\]/gm) ?? []).length).toBe(3);
    expect((block.match(/^\[bass\]/gm) ?? []).length).toBe(3);
    expect(block).not.toMatch(/^\[melody\]/m);
    expect(block).toMatch(/^\[drums\] \w+ \(tags: .+\): s\(/m);
  });

  it('intent call + one free-code call on top of the S1 prompt', async () => {
    mockOllama(b => (isIntentCall(b) ? intentJson(['drums']) : '```\ns("bd*4").bank("RolandTR909")\n```'));
    const r = await S2.run('dark techno kick', opts);
    expect(S2).toMatchObject({ id: 'S2', tagSource: 'code' });
    expect(r.code).toBe('s("bd*4").bank("RolandTR909")');
    expect(r.selectedIds).toBeNull();
    expect(r.llm.calls).toBe(2);
    expect(r.intent.genre).toBe('techno');
    const codeCall = bodies()[1];
    expect(codeCall.format).toBeUndefined();
    expect(codeCall.messages[0].content.startsWith(S1_SYSTEM)).toBe(true);
    expect(codeCall.messages[0].content).toContain('[drums]');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/eval/stages.free.test.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `eval/stages/s0.js`**

```js
import { callOllamaDetailed } from '../../src/llm.js';
import { extractCode, makeCallLog, llmOptions } from './common.js';

// S0 — baseline: raw prompt, direct code output. The system prompt only states the
// task and output format; without it the model answers in prose.
export const S0_SYSTEM = `You are a live-coding assistant for Strudel (strudel.cc), a JavaScript pattern language for music.
Write Strudel code for the user's request.
Output ONLY the Strudel code — no prose, no markdown fences, no comments.`;

export const S0 = {
  id: 'S0',
  tagSource: 'code',
  async run(prompt, opts) {
    const { log, onCall } = makeCallLog();
    const { raw } = await callOllamaDetailed(S0_SYSTEM, prompt, llmOptions(opts, onCall));
    return { code: extractCode(raw), selectedIds: null, intent: null, plans: [], llm: log };
  },
};
```

- [ ] **Step 4: Implement `eval/stages/s1.js`**

```js
import { callOllamaDetailed } from '../../src/llm.js';
import { METHOD_CARDS, BANKS } from '../../src/library/strudelDocs.js';
import { S0_SYSTEM } from './s0.js';
import { extractCode, makeCallLog, llmOptions } from './common.js';

// Only names present in BOTH banks (the 808 has no rd) — asserted in tests.
export const SPEC_SOUNDS = {
  banked: ['bd', 'sd', 'cp', 'hh', 'oh', 'rim', 'lt', 'mt', 'ht'],
  banks: BANKS,
  synths: ['sine', 'square', 'triangle', 'sawtooth'],
};

export const CORE_FUNCTIONS = ['s', 'note', 'n', 'stack', 'cat', 'seq', 'bank', 'scale', 'fast', 'slow', 'gain'];

const range = card => (card.type === 'enum' ? card.values.join('|') : `${card.min}–${card.max}`);

// Formal target-language specification (Text2DSL-style): static, identical for every prompt.
export function buildSpecBlock() {
  const methods = Object.entries(METHOD_CARDS).map(([name, card]) => `- ${name}${card.sig}: ${range(card)} — ${card.note}`);
  return `
Allowed sound sources (use nothing else):
- Drum samples, always with .bank(${SPEC_SOUNDS.banks.map(b => `"${b}"`).join(' or ')}): ${SPEC_SOUNDS.banked.join(', ')}
- Synths for note(...).s(...): ${SPEC_SOUNDS.synths.join(', ')}

Core functions: ${CORE_FUNCTIONS.join(', ')}

Effect functions (stay inside the ranges):
${methods.join('\n')}`;
}

export const S1_SYSTEM = `${S0_SYSTEM}\n${buildSpecBlock()}`;

// S1 — S0 + specification of allowed sounds and functions. No intent: the spec is prompt-independent.
export const S1 = {
  id: 'S1',
  tagSource: 'code',
  async run(prompt, opts) {
    const { log, onCall } = makeCallLog();
    const { raw } = await callOllamaDetailed(S1_SYSTEM, prompt, llmOptions(opts, onCall));
    return { code: extractCode(raw), selectedIds: null, intent: null, plans: [], llm: log };
  },
};
```

- [ ] **Step 5: Implement `eval/stages/s2.js`**

```js
import { callOllamaDetailed } from '../../src/llm.js';
import { buildIntent } from '../../src/intent.js';
import { rankPatternsByIntent } from '../../src/promptEngine.js';
import { S1_SYSTEM } from './s1.js';
import { extractCode, makeCallLog, llmOptions, trackPillars } from './common.js';

export const EXAMPLES_PER_PILLAR = 3;

const oneLine = code => code.replace(/\s+/g, ' ').trim();

// Similarity-selected few-shot examples: top-k library patterns per intent pillar.
export function buildExamplesBlock(intent) {
  const examples = trackPillars(intent).flatMap(pillar =>
    rankPatternsByIntent(pillar, intent)
      .slice(0, EXAMPLES_PER_PILLAR)
      .map(({ pattern }) => `[${pillar}] ${pattern.id} (tags: ${pattern.tags.join(', ')}): ${oneLine(pattern.code)}`));

  return `
Example patterns that match this request (adapt or combine them; one layer per part, combined with stack(...)):
${examples.join('\n')}`;
}

// S2 — S1 + few-shot examples. The intent call starts here: example choice depends on it.
export const S2 = {
  id: 'S2',
  tagSource: 'code',
  async run(prompt, opts) {
    const { log, onCall } = makeCallLog();
    const llm = llmOptions(opts, onCall);
    const intent = await buildIntent(prompt, llm);
    const system = `${S1_SYSTEM}\n${buildExamplesBlock(intent)}`;
    const { raw } = await callOllamaDetailed(system, prompt, llm);
    return { code: extractCode(raw), selectedIds: null, intent, plans: [], llm: log };
  },
};
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run tests/eval/stages.free.test.js`
Expected: PASS (9 tests). If the `vowel` assertion fails, print `METHOD_CARDS.vowel.sig` and adapt the expected string to the exact `sig` text. The format `- name+sig: range — note` stays unchanged.

- [ ] **Step 7: Commit**

```bash
git add eval/stages/s0.js eval/stages/s1.js eval/stages/s2.js tests/eval/stages.free.test.js
git commit -m "feat(eval): free-code stages S0 baseline, S1 specification, S2 few-shot"
```

---

### Task 8: S4 musical chain-of-thought

**Files:**
- Create: `eval/stages/s4.js`
- Test: `tests/eval/stages.s4.test.js`

**Interfaces:**
- Consumes: `runSelectionStage` (Task 6), the `reasoning` option (Task 3).
- Produces: `S4` (`tagSource: 'ids'`).

- [ ] **Step 1: Write the failing test**

`tests/eval/stages.s4.test.js`:
```js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { S4 } from '../../eval/stages/s4.js';
import { mockOllama, bodies, isIntentCall, isPlanCall, intentJson, firstChoicePlan } from './helpers.js';

describe('S4 musical chain-of-thought', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('every plan call demands reasoning first; plans carry it', async () => {
    mockOllama(b => (isIntentCall(b) ? intentJson(['drums', 'bass']) : firstChoicePlan(b, { reasoning: 'Techno needs a steady pulse.' })));
    const r = await S4.run('dark techno', { temperature: 0.7, seed: 1 });
    expect(S4).toMatchObject({ id: 'S4', tagSource: 'ids' });
    const planBodies = bodies().filter(isPlanCall);
    expect(planBodies).toHaveLength(2);
    for (const b of planBodies) {
      expect(Object.keys(b.format.properties)[0]).toBe('reasoning');
      expect(b.format.required).toContain('reasoning');
    }
    expect(r.plans.every(p => p.plan.reasoning === 'Techno needs a steady pulse.')).toBe(true);
    expect(r.selectedIds).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/eval/stages.s4.test.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `eval/stages/s4.js`**

```js
import { runSelectionStage } from './common.js';

// S4 — S3 + musical chain-of-thought: a reasoning field the schema forces BEFORE selectedId.
export const S4 = {
  id: 'S4',
  tagSource: 'ids',
  run: (prompt, opts) => runSelectionStage(prompt, opts, { planOptionsFor: () => ({ reasoning: true }) }),
};
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/eval/stages.s4.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add eval/stages/s4.js tests/eval/stages.s4.test.js
git commit -m "feat(eval): S4 musical chain-of-thought stage"
```

---

### Task 9: Curated knowledge graph + GraphRAG retrieval

**Files:**
- Create: `eval/graph/knowledgeGraph.js`, `eval/graph/graphRag.js`, `eval/graph/exportGraph.mjs`
- Test: `tests/eval/graph.test.js`

**Interfaces:**
- Consumes: `soundLibrary`, `normalizeLibraryTags`, `EVAL_VOCAB` (Task 4), `METHOD_CARDS` (strudelDocs), `TRANSFORMS` (transformationsLibrary), `lexIntent`, `rankPatternsByIntent`.
- Produces:
  - `knowledgeGraph.js`: `GENRE_NODES`, `TEMPO_BANDS`, `GENRE_TEMPO`, `DEFAULT_PATTERN_BANDS`, `buildKnowledgeGraph(): { nodes: Node[], edges: [string, string][] }` (memoised), `neighbours(graph, id): string[]`.
  - Node ids: `genre:<name>`, `tempo:<min>-<max>`, `pattern:<id>`, `method:<name>`.
  - `graphRag.js`: `retrieveGraph(prompt, intent): { seedGenres: string[], bands: string[], bpm: number|null }`, `rankWithGraph(pillar, retrieval, intent, k = 8): Pattern[]`, `graphContextText(retrieval, pillar, ranked): string`.

The graph follows the exposé exactly: node types genre, tempo, sound building block (pattern) and Strudel function. The only edges are **genre–tempo**, **tempo–pattern** and **pattern–method**. Genre nodes carry `aliases`, which is how prompts without a direct tag hit ("Detroit", "Berghain", "Basic Channel") enter the graph. Pattern–tempo edges are derived from each pattern's canonical genre tags through `GENRE_TEMPO`. Patterns without a genre tag get `DEFAULT_PATTERN_BANDS` (the library's dark-techno default). Pattern–method edges come from the methods present in the pattern code and in its `initialTransforms`.

Graph score of a pattern = number of seed tempo bands it is linked to. Final rank = `rankPatternsByIntent` tag score + graph score. Ties keep library order.

- [ ] **Step 1: Write the failing test**

`tests/eval/graph.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { buildKnowledgeGraph, neighbours, GENRE_NODES, TEMPO_BANDS } from '../../eval/graph/knowledgeGraph.js';
import { retrieveGraph, rankWithGraph, graphContextText } from '../../eval/graph/graphRag.js';
import { soundLibrary } from '../../src/library/soundLibrary.js';
import { EVAL_VOCAB } from '../../eval/vocabulary.js';

const type = id => id.split(':')[0];
const intent = (genre = 'techno') => ({ genre, moods: ['dark'], textures: [], layers: [] });

describe('knowledge graph', () => {
  const g = buildKnowledgeGraph();
  const total = Object.values(soundLibrary).flat().length;

  it('has one genre node per vocab genre, 4 tempo bands, every pattern', () => {
    expect(g.nodes.filter(n => n.type === 'genre').map(n => n.label).sort()).toEqual([...EVAL_VOCAB.genre].sort());
    expect(g.nodes.filter(n => n.type === 'tempo')).toHaveLength(TEMPO_BANDS.length);
    expect(g.nodes.filter(n => n.type === 'pattern')).toHaveLength(total);
  });

  it('only exposé edge types exist', () => {
    const allowed = new Set(['genre|tempo', 'tempo|pattern', 'method|pattern']);
    for (const [a, b] of g.edges) expect(allowed.has([type(a), type(b)].sort().join('|'))).toBe(true);
  });

  it('every pattern has ≥1 tempo edge; every genre ≥1 tempo edge', () => {
    for (const n of g.nodes.filter(n => n.type === 'pattern' || n.type === 'genre'))
      expect(neighbours(g, n.id).some(id => type(id) === 'tempo')).toBe(true);
  });

  it('pattern–method edges come from code and initialTransforms', () => {
    expect(neighbours(g, 'pattern:kick_berghain_rumble')).toEqual(expect.arrayContaining(['method:lpf', 'method:room', 'method:shape']));
  });

  it('every genre has at least one alias equal to its own label', () => {
    for (const gn of GENRE_NODES) expect(gn.aliases).toContain(gn.label);
  });
});

describe('graphRag', () => {
  it('resolves genre aliases without a direct tag hit', () => {
    expect(retrieveGraph('a Motor City style groove', intent()).seedGenres).toContain('detroit');
    expect(retrieveGraph('music for a Berghain closing set', intent()).seedGenres).toContain('techno');
    expect(retrieveGraph('something in the vein of Basic Channel', intent()).seedGenres).toContain('dub');
  });

  it('falls back to intent genre (lofi_hiphop → lofi)', () => {
    expect(retrieveGraph('make something', intent('lofi_hiphop')).seedGenres).toEqual(['lofi']);
  });

  it('explicit bpm selects exactly its band', () => {
    const r = retrieveGraph('warehouse stomper at 140 bpm', intent());
    expect(r.bpm).toBe(140);
    expect(r.bands).toEqual(['tempo:135-150']);
  });

  it('genre seeds expand to their tempo bands', () => {
    expect(retrieveGraph('detroit', intent()).bands.sort()).toEqual(['tempo:118-127', 'tempo:128-134']);
  });

  it('rankWithGraph returns k patterns of the pillar, detroit pattern first for detroit prompts', () => {
    const r = retrieveGraph('a Motor City style groove', intent());
    const ranked = rankWithGraph('percussion', r, intent(), 8);
    expect(ranked).toHaveLength(8);
    expect(ranked.every(p => soundLibrary.percussion.includes(p))).toBe(true);
    expect(ranked[0].id).toBe('perc_motor_city_groove');
  });

  it('context text names genre, BPM band, patterns and functions', () => {
    const r = retrieveGraph('detroit', intent());
    const ranked = rankWithGraph('drums', r, intent(), 8);
    const text = graphContextText(r, 'drums', ranked);
    expect(text).toContain('detroit');
    expect(text).toMatch(/118–127 BPM/);
    expect(text).toContain(ranked[0].id);
    expect(text).toMatch(/functions: .*\w/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/eval/graph.test.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `eval/graph/knowledgeGraph.js`**

```js
import { soundLibrary } from '../../src/library/soundLibrary.js';
import { METHOD_CARDS } from '../../src/library/strudelDocs.js';
import { TRANSFORMS } from '../../src/library/transformationsLibrary.js';
import { normalizeLibraryTags, EVAL_VOCAB } from '../vocabulary.js';

// Curated, deliberately small (stage S5): Genre ↔ Tempo ↔ Klangbaustein ↔ Strudel-Funktion.
// Aliases are node attributes — the entry points for prompts without a direct tag hit.
export const GENRE_NODES = [
  { label: 'techno',     aliases: ['techno', 'berghain', 'tresor', 'peak time', 'peak-time', 'rave', 'klockworks'] },
  { label: 'house',      aliases: ['house', 'chicago', 'garage', 'disco', 'jackin'] },
  { label: 'minimal',    aliases: ['minimal', 'microhouse', 'stripped', 'minimalist'] },
  { label: 'industrial', aliases: ['industrial', 'ebm', 'hard techno', 'factory', 'noise', 'warehouse'] },
  { label: 'dub',        aliases: ['dub', 'dub techno', 'basic channel', 'echo chamber', 'chain reaction'] },
  { label: 'ambient',    aliases: ['ambient', 'drone', 'chill', 'meditative', 'soundscape'] },
  { label: 'trance',     aliases: ['trance', 'psy', 'goa', 'euphoric'] },
  { label: 'lofi',       aliases: ['lofi', 'lo-fi', 'hip hop', 'hiphop', 'boom bap', 'study beats'] },
  { label: 'acid',       aliases: ['acid', '303', 'squelchy', 'acid house'] },
  { label: 'detroit',    aliases: ['detroit', 'motor city', 'underground resistance', 'motown'] },
];

export const TEMPO_BANDS = [
  { id: '70-95', min: 70, max: 95 },
  { id: '118-127', min: 118, max: 127 },
  { id: '128-134', min: 128, max: 134 },
  { id: '135-150', min: 135, max: 150 },
];

export const GENRE_TEMPO = {
  techno: ['128-134'], house: ['118-127'], minimal: ['118-127', '128-134'],
  industrial: ['135-150'], dub: ['70-95', '118-127'], ambient: ['70-95'],
  trance: ['135-150'], lofi: ['70-95'], acid: ['128-134', '135-150'],
  detroit: ['118-127', '128-134'],
};

// Library default aesthetic: dark techno.
export const DEFAULT_PATTERN_BANDS = ['128-134'];

const GENRES = new Set(EVAL_VOCAB.genre);
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

  for (const g of GENRE_NODES) {
    nodes.push({ id: `genre:${g.label}`, type: 'genre', label: g.label, aliases: g.aliases });
    for (const band of GENRE_TEMPO[g.label]) edges.push([`genre:${g.label}`, `tempo:${band}`]);
  }
  for (const b of TEMPO_BANDS) nodes.push({ id: `tempo:${b.id}`, type: 'tempo', label: `${b.min}–${b.max} BPM`, min: b.min, max: b.max });

  for (const [pillar, patterns] of Object.entries(soundLibrary)) {
    for (const p of patterns) {
      const id = `pattern:${p.id}`;
      nodes.push({ id, type: 'pattern', label: p.name, pillar });
      const genres = normalizeLibraryTags(p.tags).filter(t => GENRES.has(t));
      const bands = genres.length ? [...new Set(genres.flatMap(g => GENRE_TEMPO[g]))] : DEFAULT_PATTERN_BANDS;
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

- [ ] **Step 4: Implement `eval/graph/graphRag.js`**

```js
import { buildKnowledgeGraph, neighbours, GENRE_NODES, TEMPO_BANDS } from './knowledgeGraph.js';
import { lexIntent } from '../../src/intent.js';
import { rankPatternsByIntent } from '../../src/promptEngine.js';

const INTENT_GENRE_TO_VOCAB = { lofi_hiphop: 'lofi' };
const CONTEXT_PATTERNS = 5;

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const mentions = (text, alias) => new RegExp(`\\b${escapeRe(alias)}\\b`, 'i').test(text);

export function retrieveGraph(prompt, intent) {
  const graph = buildKnowledgeGraph();
  let seedGenres = GENRE_NODES.filter(g => g.aliases.some(a => mentions(prompt, a))).map(g => g.label);
  if (!seedGenres.length && intent?.genre) seedGenres = [INTENT_GENRE_TO_VOCAB[intent.genre] ?? intent.genre];
  seedGenres = seedGenres.filter(g => GENRE_NODES.some(n => n.label === g));

  const bpm = lexIntent(prompt).bpm;
  const bandOfBpm = bpm ? TEMPO_BANDS.find(b => bpm >= b.min && bpm <= b.max) : null;
  const bands = bandOfBpm
    ? [`tempo:${bandOfBpm.id}`]
    : [...new Set(seedGenres.flatMap(g => neighbours(graph, `genre:${g}`)))].sort();

  return { seedGenres, bands, bpm: bpm ?? null };
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

export function graphContextText(retrieval, pillar, ranked) {
  const graph = buildKnowledgeGraph();
  const label = id => graph.nodes.find(n => n.id === id)?.label ?? id;
  const top = ranked.slice(0, CONTEXT_PATTERNS);
  const functions = [...new Set(top.flatMap(p =>
    neighbours(graph, `pattern:${p.id}`).filter(id => id.startsWith('method:')).map(label)))].sort();

  const lines = [];
  for (const g of retrieval.seedGenres) {
    const bands = neighbours(graph, `genre:${g}`).map(label).join(', ');
    lines.push(`${g} → ${bands}`);
  }
  if (retrieval.bpm) lines.push(`requested tempo ${retrieval.bpm} BPM → ${retrieval.bands.map(label).join(', ')}`);
  lines.push(`${pillar} patterns in these tempo bands: ${top.map(p => p.id).join(', ')}`);
  lines.push(`typical Strudel functions: ${functions.join(', ') || '(none)'}`);
  return lines.join('\n');
}
```

- [ ] **Step 5: Export script for the thesis appendix**

`eval/graph/exportGraph.mjs`:
```js
import { writeFileSync } from 'node:fs';
import { buildKnowledgeGraph } from './knowledgeGraph.js';

const graph = buildKnowledgeGraph();
writeFileSync(new URL('./knowledgeGraph.json', import.meta.url), JSON.stringify(graph, null, 2) + '\n');
const count = t => graph.nodes.filter(n => n.type === t).length;
console.log(`nodes: genre ${count('genre')}, tempo ${count('tempo')}, pattern ${count('pattern')}, method ${count('method')}; edges ${graph.edges.length}`);
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run tests/eval/graph.test.js`
Expected: PASS. Two tests depend on library data:
- If `kick_berghain_rumble` lacks an expected method, inspect its `code` and `initialTransforms` (`shape`, `reverb→room`, `room_size→size`, `lopass→lpf`, `lopass_q→lpq`) and correct the test to what the data says.
- If `perc_motor_city_groove` is not ranked first, print the totals. Another pattern with the same total may precede it by library order; then assert `ranked.slice(0, 3).map(p => p.id)` contains it and record the observed order in the commit.

Run: `npm run eval:graph`
Expected: `nodes: genre 10, tempo 4, pattern 58, method <n>; edges <m>`.

- [ ] **Step 7: Commit**

```bash
git add eval/graph tests/eval/graph.test.js
git commit -m "feat(eval): curated genre–tempo–pattern–function graph + GraphRAG retrieval"
```

---

### Task 10: S5 GraphRAG stage + stage registry

**Files:**
- Create: `eval/stages/s5.js`, `eval/stages/index.js`
- Test: `tests/eval/stages.s5.test.js`

**Interfaces:**
- Consumes: `runSelectionStage` (Task 6), `retrieveGraph`, `rankWithGraph`, `graphContextText` (Task 9), the `catalogOverride`, `graphContext` and `reasoning` options (Task 3), `S0`–`S4` (Tasks 6–8).
- Produces: `S5` (`tagSource: 'ids'`), `STAGES: Record<'S0'|'S1'|'S2'|'S3'|'S4'|'S5', Stage>`.

- [ ] **Step 1: Write the failing test**

`tests/eval/stages.s5.test.js`:
```js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { S5 } from '../../eval/stages/s5.js';
import { STAGES } from '../../eval/stages/index.js';
import { EVAL_CONFIG } from '../../eval/config.js';
import { mockOllama, bodies, isIntentCall, isPlanCall, intentJson, firstChoicePlan } from './helpers.js';

describe('S5 GraphRAG', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('keeps reasoning, injects graph context and graph-ranked catalog', async () => {
    mockOllama(b => (isIntentCall(b) ? intentJson(['percussion']) : firstChoicePlan(b, { reasoning: 'r' })));
    const r = await S5.run('a Motor City style groove', { temperature: 0.7, seed: 1 });
    expect(S5).toMatchObject({ id: 'S5', tagSource: 'ids' });
    const [plan] = bodies().filter(isPlanCall);
    expect(Object.keys(plan.format.properties)[0]).toBe('reasoning');
    expect(plan.messages[0].content).toContain('Knowledge graph context');
    expect(plan.messages[0].content).toContain('detroit');
    expect(plan.format.properties.selectedId.enum).toHaveLength(8);
    expect(plan.format.properties.selectedId.enum).toContain('perc_motor_city_groove');
    expect(r.selectedIds).toHaveLength(1);
  });

  it('registry exposes all six stages in order, matching EVAL_CONFIG', () => {
    expect(Object.keys(STAGES)).toEqual(['S0', 'S1', 'S2', 'S3', 'S4', 'S5']);
    expect(Object.keys(STAGES)).toEqual(EVAL_CONFIG.stages);
    for (const [id, s] of Object.entries(STAGES)) expect(s.id).toBe(id);
    expect(Object.values(STAGES).map(s => s.tagSource)).toEqual(['code', 'code', 'code', 'ids', 'ids', 'ids']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/eval/stages.s5.test.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`eval/stages/s5.js`:
```js
import { runSelectionStage } from './common.js';
import { retrieveGraph, rankWithGraph, graphContextText } from '../graph/graphRag.js';

const CATALOG_SIZE = 8; // same narrowing width as S3/S4

// S5 — S4 + GraphRAG: graph-reranked candidates and transitive genre/tempo/function context.
export const S5 = {
  id: 'S5',
  tagSource: 'ids',
  run: (prompt, opts) => runSelectionStage(prompt, opts, {
    planOptionsFor: (pillar, intent) => {
      const retrieval = retrieveGraph(prompt, intent);
      const ranked = rankWithGraph(pillar, retrieval, intent, CATALOG_SIZE);
      return { reasoning: true, catalogOverride: ranked, graphContext: graphContextText(retrieval, pillar, ranked) };
    },
  }),
};
```

`eval/stages/index.js`:
```js
import { S0 } from './s0.js';
import { S1 } from './s1.js';
import { S2 } from './s2.js';
import { S3 } from './s3.js';
import { S4 } from './s4.js';
import { S5 } from './s5.js';

export const STAGES = { S0, S1, S2, S3, S4, S5 };
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/eval/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add eval/stages/s5.js eval/stages/index.js tests/eval/stages.s5.test.js
git commit -m "feat(eval): S5 GraphRAG stage + stage registry"
```

---

### Task 11: Metrics

**Files:**
- Create: `eval/metrics.js`
- Test: `tests/eval/metrics.test.js`

**Interfaces:**
- Produces:
  - `prf1(expected: string[], got: string[]) → { precision, recall, f1 }`. Empty `got` → precision 0.
  - `normalizedEntropy(tagSets: string[][]) → number in [0,1]`. Outcome = sorted tag set; H / ln(n); n ≤ 1 → 0.
  - `distinctRatio(tagSets) → distinct outcomes / n` (0 for n = 0).
  - `median(xs)`, `percentile(xs, p)` (linear interpolation, type 7), `mean(xs)`. All return `NaN` for empty input.
  - `mulberry32(seed) → () => number`.
  - `bootstrapCI(values, stat = median, { iterations, alpha, seed }) → { estimate, lower, upper, n }` (NaN values dropped).
  - `pairedDiffCI(a, b, stat = median, opts) → { estimate, lower, upper, n }` over per-index differences `b[i] - a[i]`. Pairs with NaN are dropped.
  - `millerBand(ms) → '≤2s' | '≤10s' | '>10s'`.

- [ ] **Step 1: Write the failing test**

`tests/eval/metrics.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { prf1, normalizedEntropy, distinctRatio, median, percentile, mean, bootstrapCI, pairedDiffCI, millerBand } from '../../eval/metrics.js';

const opts = { iterations: 500, alpha: 0.05, seed: 1 };

describe('prf1', () => {
  it('partial overlap', () => expect(prf1(['dark', 'techno'], ['dark', 'kick'])).toEqual({ precision: 0.5, recall: 0.5, f1: 0.5 }));
  it('perfect', () => expect(prf1(['a', 'b'], ['b', 'a'])).toEqual({ precision: 1, recall: 1, f1: 1 }));
  it('empty output', () => expect(prf1(['a'], [])).toEqual({ precision: 0, recall: 0, f1: 0 }));
  it('duplicates ignored', () => expect(prf1(['a'], ['a', 'a']).precision).toBe(1));
});

describe('diversity', () => {
  it('identical outputs → 0', () => expect(normalizedEntropy(Array(10).fill(['a', 'b']))).toBe(0));
  it('all distinct → 1', () => expect(normalizedEntropy([['a'], ['b'], ['c'], ['d']])).toBeCloseTo(1, 10));
  it('two outcomes evenly in 4 runs → 0.5', () => expect(normalizedEntropy([['a'], ['a'], ['b'], ['b']])).toBeCloseTo(0.5, 10));
  it('order inside a set does not matter', () => expect(normalizedEntropy([['a', 'b'], ['b', 'a']])).toBe(0));
  it('n ≤ 1 → 0', () => { expect(normalizedEntropy([])).toBe(0); expect(normalizedEntropy([['a']])).toBe(0); });
  it('distinctRatio', () => { expect(distinctRatio([['a'], ['a'], ['b'], ['c']])).toBe(0.75); expect(distinctRatio([])).toBe(0); });
});

describe('descriptives', () => {
  it('median', () => { expect(median([3, 1, 2])).toBe(2); expect(median([1, 2, 3, 4])).toBe(2.5); expect(median([])).toBeNaN(); });
  it('percentile type 7', () => { expect(percentile([1, 2, 3, 4, 5], 95)).toBeCloseTo(4.8, 10); expect(percentile([7], 95)).toBe(7); });
  it('mean', () => expect(mean([1, 2, 3])).toBe(2));
});

describe('bootstrap', () => {
  it('is deterministic for a seed', () => {
    const xs = [1, 5, 2, 8, 3, 9, 4];
    expect(bootstrapCI(xs, median, opts)).toEqual(bootstrapCI(xs, median, opts));
  });
  it('constant data → degenerate interval', () => {
    expect(bootstrapCI([2, 2, 2, 2], median, opts)).toEqual({ estimate: 2, lower: 2, upper: 2, n: 4 });
  });
  it('drops NaN', () => expect(bootstrapCI([1, NaN, 1], median, opts).n).toBe(2));
  it('paired difference of a constant shift', () => {
    const a = [1, 4, 2, 7], b = a.map(x => x + 1);
    expect(pairedDiffCI(a, b, median, opts)).toEqual({ estimate: 1, lower: 1, upper: 1, n: 4 });
  });
  it('paired drops pairs with NaN', () => expect(pairedDiffCI([1, NaN], [2, 3], median, opts).n).toBe(1));
});

describe('millerBand', () => {
  it('bands', () => {
    expect(millerBand(1999)).toBe('≤2s');
    expect(millerBand(2000)).toBe('≤2s');
    expect(millerBand(2001)).toBe('≤10s');
    expect(millerBand(10000)).toBe('≤10s');
    expect(millerBand(10001)).toBe('>10s');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/eval/metrics.test.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `eval/metrics.js`**

```js
export function prf1(expected, got) {
  const E = new Set(expected);
  const G = new Set(got);
  const tp = [...G].filter(t => E.has(t)).length;
  const precision = G.size ? tp / G.size : 0;
  const recall = E.size ? tp / E.size : 0;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  return { precision, recall, f1 };
}

const outcomeKey = tags => [...new Set(tags)].sort().join('|');

// Shannon entropy over tag-set outcomes, normalised by ln(n) (max when all n runs differ).
export function normalizedEntropy(tagSets) {
  const n = tagSets.length;
  if (n <= 1) return 0;
  const counts = new Map();
  for (const tags of tagSets) counts.set(outcomeKey(tags), (counts.get(outcomeKey(tags)) ?? 0) + 1);
  let h = 0;
  for (const c of counts.values()) { const p = c / n; h -= p * Math.log(p); }
  return h / Math.log(n);
}

export function distinctRatio(tagSets) {
  if (!tagSets.length) return 0;
  return new Set(tagSets.map(outcomeKey)).size / tagSets.length;
}

const finite = xs => xs.filter(x => Number.isFinite(x));

export function mean(xs) {
  const v = finite(xs);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : NaN;
}

export function percentile(xs, p) {
  const v = finite(xs).sort((a, b) => a - b);
  if (!v.length) return NaN;
  const h = (v.length - 1) * (p / 100);
  const lo = Math.floor(h);
  return v[lo] + (h - lo) * ((v[lo + 1] ?? v[lo]) - v[lo]);
}

export const median = xs => percentile(xs, 50);

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function percentileInterval(samples, alpha) {
  return { lower: percentile(samples, (alpha / 2) * 100), upper: percentile(samples, (1 - alpha / 2) * 100) };
}

export function bootstrapCI(values, stat = median, { iterations, alpha, seed }) {
  const v = finite(values);
  if (!v.length) return { estimate: NaN, lower: NaN, upper: NaN, n: 0 };
  const rand = mulberry32(seed);
  const samples = [];
  for (let i = 0; i < iterations; i++) {
    const resample = v.map(() => v[Math.floor(rand() * v.length)]);
    samples.push(stat(resample));
  }
  return { estimate: stat(v), ...percentileInterval(samples, alpha), n: v.length };
}

// Paired by index (= by prompt): resample prompts, statistic of per-prompt differences.
export function pairedDiffCI(a, b, stat = median, opts) {
  const diffs = a.map((x, i) => b[i] - x).filter(d => Number.isFinite(d));
  return bootstrapCI(diffs, stat, opts);
}

// Miller 1968: ≤2 s keeps conversational flow; ≤10 s keeps attention on the task.
export function millerBand(ms) {
  if (ms <= 2000) return '≤2s';
  if (ms <= 10000) return '≤10s';
  return '>10s';
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/eval/metrics.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add eval/metrics.js tests/eval/metrics.test.js
git commit -m "feat(eval): metrics — P/R/F1, normalised entropy, bootstrap CIs, Miller bands"
```

---

### Task 12: Corpus infrastructure (validation, agreement, freeze)

**Files:**
- Create: `eval/corpus/corpus.js`, `eval/corpus/agreement.js`, `eval/corpus/freeze.mjs`
- Test: `tests/eval/corpus.test.js`

**Interfaces:**
- Consumes: `ALL_TAGS` (Task 4).
- Produces:
  - `CATEGORIES = ['direct_hit', 'genre_no_hit', 'structure', 'underspecified']`, `PROMPTS_PER_CATEGORY = 10`
  - `Corpus = { version: 1, prompts: [{ id, category, text, expected: string[] }] }`
  - `loadCorpus(path = DEFAULT_CORPUS_PATH): Corpus`, `validateCorpus(corpus): string[]` (errors), `corpusHash(corpus): string` (sha256 hex, independent of key/prompt order), `assertFrozen(corpus, hashPath = DEFAULT_HASH_PATH)` (throws if missing or different)
  - `Annotation = { annotatedAt: string, tags: Record<promptId, string[]> }`
  - `cohensKappa(passA.tags, passB.tags, ids, vocab) → number`, `meanJaccard(passA.tags, passB.tags, ids) → number`

- [ ] **Step 1: Write the failing test**

`tests/eval/corpus.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateCorpus, corpusHash, assertFrozen, CATEGORIES } from '../../eval/corpus/corpus.js';
import { cohensKappa, meanJaccard } from '../../eval/corpus/agreement.js';

function fixture() {
  const prompts = CATEGORIES.flatMap((category, c) =>
    Array.from({ length: 10 }, (_, i) => ({ id: `${category[0]}${String(i + 1).padStart(2, '0')}`, category, text: `prompt ${c}-${i}`, expected: ['techno', 'kick'] })));
  return { version: 1, prompts };
}

describe('validateCorpus', () => {
  it('accepts 4×10 well-formed prompts', () => expect(validateCorpus(fixture())).toEqual([]));

  it('reports count, duplicate id, unknown tag, empty text/expected, bad category', () => {
    const c = fixture();
    c.prompts[1].id = c.prompts[0].id;
    c.prompts[2].expected = ['nonsense'];
    c.prompts[3].text = ' ';
    c.prompts[4].expected = [];
    c.prompts[5].category = 'other';
    c.prompts.pop();
    const errors = validateCorpus(c).join('\n');
    expect(errors).toMatch(/duplicate id/);
    expect(errors).toMatch(/unknown tag "nonsense"/);
    expect(errors).toMatch(/empty text/);
    expect(errors).toMatch(/no expected tags/);
    expect(errors).toMatch(/unknown category "other"/);
    expect(errors).toMatch(/expected 10 prompts in "underspecified"/);
  });
});

describe('corpusHash / assertFrozen', () => {
  it('is independent of prompt order, key order and tag order', () => {
    const a = fixture();
    const b = fixture();
    b.prompts.reverse();
    b.prompts[0] = { expected: [...b.prompts[0].expected].reverse(), text: b.prompts[0].text, category: b.prompts[0].category, id: b.prompts[0].id };
    expect(corpusHash(a)).toBe(corpusHash(b));
  });

  it('changes when an expectation changes', () => {
    const a = fixture();
    const b = fixture();
    b.prompts[0].expected = ['house'];
    expect(corpusHash(a)).not.toBe(corpusHash(b));
  });

  it('assertFrozen throws when missing or different, passes when equal', () => {
    const dir = mkdtempSync(join(tmpdir(), 'corpus-'));
    const hashPath = join(dir, 'FROZEN.sha256');
    expect(() => assertFrozen(fixture(), hashPath)).toThrow(/not frozen/);
    writeFileSync(hashPath, 'deadbeef\n');
    expect(() => assertFrozen(fixture(), hashPath)).toThrow(/changed since freeze/);
    writeFileSync(hashPath, corpusHash(fixture()) + '\n');
    expect(() => assertFrozen(fixture(), hashPath)).not.toThrow();
  });
});

describe('agreement', () => {
  const vocab = ['a', 'b'];
  it('perfect agreement → kappa 1', () => expect(cohensKappa({ p: ['a'] }, { p: ['a'] }, ['p'], vocab)).toBe(1));
  it('total disagreement → kappa -1', () => expect(cohensKappa({ p: ['a'] }, { p: ['b'] }, ['p'], vocab)).toBe(-1));
  it('degenerate (all same, all agree) → 1', () => expect(cohensKappa({ p: [] }, { p: [] }, ['p'], vocab)).toBe(1));
  it('jaccard', () => {
    expect(meanJaccard({ p: ['a', 'b'], q: ['a'] }, { p: ['a'], q: ['a'] }, ['p', 'q'])).toBe(0.75);
    expect(meanJaccard({ p: [] }, { p: [] }, ['p'])).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/eval/corpus.test.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `eval/corpus/corpus.js`**

```js
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ALL_TAGS } from '../vocabulary.js';

export const CATEGORIES = ['direct_hit', 'genre_no_hit', 'structure', 'underspecified'];
export const PROMPTS_PER_CATEGORY = 10;
export const DEFAULT_CORPUS_PATH = fileURLToPath(new URL('./prompts.json', import.meta.url));
export const DEFAULT_HASH_PATH = fileURLToPath(new URL('./FROZEN.sha256', import.meta.url));

const VOCAB = new Set(ALL_TAGS);

export function loadCorpus(path = DEFAULT_CORPUS_PATH) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function validateCorpus(corpus) {
  const errors = [];
  const seen = new Set();
  for (const p of corpus.prompts ?? []) {
    if (seen.has(p.id)) errors.push(`duplicate id "${p.id}"`);
    seen.add(p.id);
    if (!CATEGORIES.includes(p.category)) errors.push(`${p.id}: unknown category "${p.category}"`);
    if (!String(p.text ?? '').trim()) errors.push(`${p.id}: empty text`);
    if (!Array.isArray(p.expected) || !p.expected.length) errors.push(`${p.id}: no expected tags`);
    for (const t of p.expected ?? []) if (!VOCAB.has(t)) errors.push(`${p.id}: unknown tag "${t}"`);
  }
  for (const c of CATEGORIES) {
    const n = (corpus.prompts ?? []).filter(p => p.category === c).length;
    if (n !== PROMPTS_PER_CATEGORY) errors.push(`expected ${PROMPTS_PER_CATEGORY} prompts in "${c}", found ${n}`);
  }
  return errors;
}

export function corpusHash(corpus) {
  const canonical = [...corpus.prompts]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(p => ({ id: p.id, category: p.category, text: p.text, expected: [...p.expected].sort() }));
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

export function assertFrozen(corpus, hashPath = DEFAULT_HASH_PATH) {
  if (!existsSync(hashPath)) throw new Error(`Corpus not frozen: ${hashPath} missing (run npm run eval:freeze)`);
  const frozen = readFileSync(hashPath, 'utf8').trim();
  if (frozen !== corpusHash(corpus)) throw new Error('Corpus changed since freeze — expectations must not be edited after freezing');
}
```

- [ ] **Step 4: Implement `eval/corpus/agreement.js`**

```js
// Binary decision per (prompt, vocabulary tag): did the annotator assign it?
export function cohensKappa(a, b, ids, vocab) {
  let agree = 0, aYes = 0, bYes = 0, n = 0;
  for (const id of ids) {
    const A = new Set(a[id] ?? []);
    const B = new Set(b[id] ?? []);
    for (const t of vocab) {
      const x = A.has(t), y = B.has(t);
      if (x === y) agree++;
      if (x) aYes++;
      if (y) bYes++;
      n++;
    }
  }
  const po = agree / n;
  const pe = (aYes / n) * (bYes / n) + (1 - aYes / n) * (1 - bYes / n);
  if (pe === 1) return po === 1 ? 1 : 0;
  return (po - pe) / (1 - pe);
}

export function meanJaccard(a, b, ids) {
  const scores = ids.map(id => {
    const A = new Set(a[id] ?? []);
    const B = new Set(b[id] ?? []);
    const union = new Set([...A, ...B]);
    if (!union.size) return 1;
    return [...A].filter(t => B.has(t)).length / union.size;
  });
  return scores.reduce((s, x) => s + x, 0) / scores.length;
}
```

- [ ] **Step 5: Implement `eval/corpus/freeze.mjs`**

```js
// Validates the corpus, reports inter-pass agreement, writes FROZEN.sha256 (once).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadCorpus, validateCorpus, corpusHash, DEFAULT_HASH_PATH } from './corpus.js';
import { cohensKappa, meanJaccard } from './agreement.js';
import { ALL_TAGS } from '../vocabulary.js';

const force = process.argv.includes('--force');
const corpus = loadCorpus();
const errors = validateCorpus(corpus);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

const read = name => JSON.parse(readFileSync(fileURLToPath(new URL(`./${name}`, import.meta.url)), 'utf8'));
const A = read('annotation-A.json');
const B = read('annotation-B.json');
const ids = corpus.prompts.map(p => p.id);
const missing = ids.filter(id => !(id in A.tags) || !(id in B.tags));
if (missing.length) { console.error(`annotation passes miss: ${missing.join(', ')}`); process.exit(1); }

console.log(`pass A ${A.annotatedAt} vs pass B ${B.annotatedAt}`);
console.log(`Cohen's kappa (prompt × tag): ${cohensKappa(A.tags, B.tags, ids, ALL_TAGS).toFixed(3)}`);
console.log(`mean Jaccard: ${meanJaccard(A.tags, B.tags, ids).toFixed(3)}`);

if (existsSync(DEFAULT_HASH_PATH) && !force) {
  console.error('Already frozen. Re-freezing invalidates every measurement run — pass --force only if no full run exists yet.');
  process.exit(1);
}
const hash = corpusHash(corpus);
writeFileSync(DEFAULT_HASH_PATH, hash + '\n');
console.log(`frozen: ${hash}`);
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run tests/eval/corpus.test.js`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add eval/corpus/corpus.js eval/corpus/agreement.js eval/corpus/freeze.mjs tests/eval/corpus.test.js
git commit -m "feat(eval): corpus validation, annotation agreement, freeze hash"
```

---

### Task 13: Write and annotate the corpus (AUTHOR — manual, not code)

The exposé states that the author creates the prompts and annotates them in two passes at different times. An implementing agent must **not** write these files. It stops here and hands over to the author.

**Files (author):** `eval/corpus/prompts.json`, `eval/corpus/annotation-A.json`, `eval/corpus/annotation-B.json`

- [ ] **Step 1: Write 40 prompts** in `eval/corpus/prompts.json`, 10 per category. The `expected` field is filled in Step 4. Format and one example per category:

```json
{
  "version": 1,
  "prompts": [
    { "id": "d01", "category": "direct_hit", "text": "dark hypnotic techno with a rolling bassline", "expected": [] },
    { "id": "g01", "category": "genre_no_hit", "text": "something that would fit a Motor City afterhour", "expected": [] },
    { "id": "s01", "category": "structure", "text": "kick, offbeat hats and a squelchy acid line on top", "expected": [] },
    { "id": "u01", "category": "underspecified", "text": "make it slap", "expected": [] }
  ]
}
```
Category rules:
- `direct_hit`: the prompt contains at least one word from `EVAL_VOCAB` or the lexer (`intent.js` lexicons).
- `genre_no_hit`: names a genre/scene **only** through a word that is *not* in `EVAL_VOCAB` or the lexer lexicons. This is the S5 test bed (aliases in `eval/graph/knowledgeGraph.js` → `GENRE_NODES`). Write the prompts *before* looking at the aliases, or note in the thesis which came first.
- `structure`: names ≥ 2 parts (multi-layer request).
- `underspecified`: vague, no genre, no part.

- [ ] **Step 2: Annotation pass A.** Write `annotation-A.json` = `{ "annotatedAt": "<ISO date>", "tags": { "d01": ["bass","dark","hypnotic","techno"], … } }`, using only tags from `EVAL_VOCAB`. Do not look at any model output.

- [ ] **Step 3: Annotation pass B**, at least 7 days later, written blind (don't open pass A).

- [ ] **Step 4: Adjudicate.** Write the final `expected` for every prompt into `prompts.json`. Document the rule you used (e.g. "intersection, plus disputed tags decided by re-reading the prompt").

- [ ] **Step 5: Freeze**

Run: `npm run eval:freeze`
Expected: kappa + Jaccard printed and `frozen: <hash>`. Put both agreement numbers in the thesis.

- [ ] **Step 6: Commit THRESHOLDS + corpus together, then tag**

```bash
git add eval/corpus eval/config.js
git commit -m "data(eval): frozen prompt corpus + annotation passes"
git tag corpus-frozen
```

---

### Task 14: Runner (resumable JSONL, environment metadata)

**Files:**
- Create: `eval/runner/core.js`, `eval/runner.mjs`
- Test: `tests/eval/runner.test.js`

**Interfaces:**
- Consumes: `STAGES` (Task 10), `checkValidity` (Task 2), `tagsFromCode` (Task 5), `tagsForPatternIds` (Task 4), `loadCorpus`, `validateCorpus`, `assertFrozen`, `corpusHash` (Task 12), `EVAL_CONFIG`, `callOllamaDetailed`, `OLLAMA_MODEL`, `OLLAMA_URL` (Task 3).
- Produces:
  - `runKey({stage, promptId, rep}) → "S0|d01|3"`
  - `readDoneKeys(path) → Set<string>` (ignores a malformed trailing line)
  - `evaluateRun({ stage, prompt, rep, seed, temperature, now }) → Promise<RunRecord>` (throws if the stage throws)
  - `runMatrix({ stages: Stage[], prompts, reps, seedBase, temperature, outPath, maxConsecutiveCrashes, now?, log? }) → Promise<{ written, skipped, crashed }>`
  - `collectMeta({ corpus, config }) → Promise<object>`
  - `RunRecord = { schema: 1, stage, promptId, category, rep, seed, temperature, code, selectedIds, intent, errorClass, errorDetail, unknownSounds, executes, tags, tagsFromCode, expected, latencyMs, llm: {calls, promptTokens, evalTokens, llmMs}, rawOutputs, plans, timestamp }`
- Crashes (stage throws, e.g. Ollama unreachable) go to `<outPath>.errors.jsonl`, **not** to the main file, so resume retries them.

Order: `for rep → for prompt → for stage`. Stages of the same prompt and rep run back to back, so slow drift (thermal, background load) hits all stages equally.

- [ ] **Step 1: Write the failing test**

`tests/eval/runner.test.js`:
```js
import { describe, it, expect, vi } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runMatrix, readDoneKeys, runKey } from '../../eval/runner/core.js';

const llm = { calls: 1, promptTokens: 10, evalTokens: 5, llmMs: 3, outputs: ['raw'] };
const codeStage = { id: 'S0', tagSource: 'code', run: vi.fn(async () => ({ code: 's("bd*4").bank("RolandTR909")', selectedIds: null, intent: null, plans: [], llm })) };
const idStage = { id: 'S3', tagSource: 'ids', run: vi.fn(async () => ({ code: 's("bd*4").bank("RolandTR909")', selectedIds: ['basic_kick'], intent: { genre: 'techno' }, plans: [], llm })) };
const prompts = [
  { id: 'd01', category: 'direct_hit', text: 'techno kick', expected: ['kick', 'techno'] },
  { id: 'u01', category: 'underspecified', text: 'make it slap', expected: ['driving'] },
];
const readLines = p => readFileSync(p, 'utf8').trim().split('\n').map(l => JSON.parse(l));
const tmp = () => join(mkdtempSync(join(tmpdir(), 'run-')), 'run.jsonl');
const base = { prompts, reps: 2, seedBase: 1000, temperature: 0.7, maxConsecutiveCrashes: 3, log: () => {} };

describe('runMatrix', () => {
  it('writes stages × prompts × reps records with seeds, tags and timing', async () => {
    const outPath = tmp();
    const res = await runMatrix({ ...base, stages: [codeStage, idStage], outPath });
    expect(res).toEqual({ written: 8, skipped: 0, crashed: 0 });
    const recs = readLines(outPath);
    expect(recs).toHaveLength(8);
    expect(new Set(recs.map(r => r.seed))).toEqual(new Set([1000, 1001]));
    const s0 = recs.find(r => r.stage === 'S0');
    expect(s0).toMatchObject({ schema: 1, errorClass: null, executes: true, temperature: 0.7, llm: { calls: 1, promptTokens: 10, evalTokens: 5, llmMs: 3 } });
    expect(s0.tags).toEqual(expect.arrayContaining(['kick', 'techno']));
    expect(s0.tags).toEqual(s0.tagsFromCode);
    const s3 = recs.find(r => r.stage === 'S3');
    expect(s3.tags).toEqual(['kick', 'techno']);
    expect(typeof s3.latencyMs).toBe('number');
    expect(recs.slice(0, 2).map(r => r.stage)).toEqual(['S0', 'S3']);
  });

  it('resumes: finished keys are skipped', async () => {
    const outPath = tmp();
    await runMatrix({ ...base, stages: [codeStage], outPath });
    codeStage.run.mockClear();
    const res = await runMatrix({ ...base, stages: [codeStage], outPath });
    expect(res).toEqual({ written: 0, skipped: 4, crashed: 0 });
    expect(codeStage.run).not.toHaveBeenCalled();
  });

  // Review Focus 5
  it('tolerates a partial trailing line from an interrupted run', async () => {
    const outPath = tmp();
    await runMatrix({ ...base, reps: 1, stages: [codeStage], outPath });
    writeFileSync(outPath, readFileSync(outPath, 'utf8') + '{"stage":"S0","promptId":"u0', { flag: 'w' });
    expect(readDoneKeys(outPath).size).toBe(2);
  });

  // Review Focus 4
  it('crashes go to .errors.jsonl, are retried on resume, and abort after N in a row', async () => {
    const outPath = tmp();
    const dead = { id: 'S1', tagSource: 'code', run: vi.fn(async () => { throw new Error('fetch failed'); }) };
    await expect(runMatrix({ ...base, stages: [dead], outPath })).rejects.toThrow(/3 consecutive crashes/);
    expect(existsSync(outPath) ? readFileSync(outPath, 'utf8').trim() : '').toBe('');
    expect(readLines(`${outPath}.errors.jsonl`)).toHaveLength(3);
    expect(readDoneKeys(outPath).size).toBe(0);
  });

  it('records invalid code with its error class', async () => {
    const outPath = tmp();
    const broken = { id: 'S0', tagSource: 'code', run: async () => ({ code: 's("bd".fast(', selectedIds: null, intent: null, plans: [], llm }) };
    await runMatrix({ ...base, reps: 1, prompts: prompts.slice(0, 1), stages: [broken], outPath });
    const [rec] = readLines(outPath);
    expect(rec).toMatchObject({ errorClass: 'syntax', executes: false, tags: [], tagsFromCode: [] });
  });

  it('runKey', () => expect(runKey({ stage: 'S0', promptId: 'd01', rep: 3 })).toBe('S0|d01|3'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/eval/runner.test.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `eval/runner/core.js`**

```js
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import { checkValidity } from '../validity.js';
import { tagsFromCode } from '../codeLexicon.js';
import { tagsForPatternIds } from '../vocabulary.js';
import { corpusHash } from '../corpus/corpus.js';
import { OLLAMA_MODEL, OLLAMA_URL } from '../../src/llm.js';

export const runKey = ({ stage, promptId, rep }) => `${stage}|${promptId}|${rep}`;

export function readDoneKeys(path) {
  const done = new Set();
  if (!existsSync(path)) return done;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { done.add(runKey(JSON.parse(line))); } catch { /* partial line from an interrupted write */ }
  }
  return done;
}

// Latency = wall clock of stage.run (all LLM calls + deterministic compilation).
// Validation and tagging happen outside the timed region.
export async function evaluateRun({ stage, prompt, rep, seed, temperature, now = () => performance.now() }) {
  const t0 = now();
  const result = await stage.run(prompt.text, { temperature, seed });
  const latencyMs = now() - t0;

  const validity = await checkValidity(result.code);
  const codeTags = validity.executes ? tagsFromCode(result.code, validity.haps) : [];
  const tags = stage.tagSource === 'ids' ? tagsForPatternIds(result.selectedIds) : codeTags;
  const { outputs, ...llmCounts } = result.llm;

  return {
    schema: 1,
    stage: stage.id, promptId: prompt.id, category: prompt.category, rep, seed, temperature,
    code: result.code, selectedIds: result.selectedIds, intent: result.intent,
    errorClass: validity.errorClass, errorDetail: validity.detail, unknownSounds: validity.unknownSounds,
    executes: validity.executes,
    tags, tagsFromCode: codeTags, expected: prompt.expected,
    latencyMs, llm: llmCounts, rawOutputs: outputs, plans: result.plans,
    timestamp: new Date().toISOString(),
  };
}

export async function runMatrix({ stages, prompts, reps, seedBase, temperature, outPath, maxConsecutiveCrashes, now, log = console.log }) {
  const done = readDoneKeys(outPath);
  const errorsPath = `${outPath}.errors.jsonl`;
  const total = stages.length * prompts.length * reps;
  let written = 0, skipped = 0, crashed = 0, streak = 0;

  for (let rep = 0; rep < reps; rep++) {
    const seed = seedBase + rep;
    for (const prompt of prompts) {
      for (const stage of stages) {
        const key = runKey({ stage: stage.id, promptId: prompt.id, rep });
        if (done.has(key)) { skipped++; continue; }
        try {
          const record = await evaluateRun({ stage, prompt, rep, seed, temperature, now });
          appendFileSync(outPath, JSON.stringify(record) + '\n');
          written++;
          streak = 0;
          log(`[${written + skipped}/${total}] ${key} ${record.errorClass ?? 'ok'} ${Math.round(record.latencyMs)}ms`);
        } catch (err) {
          crashed++;
          streak++;
          appendFileSync(errorsPath, JSON.stringify({ key, error: String(err?.message ?? err), timestamp: new Date().toISOString() }) + '\n');
          log(`[crash] ${key}: ${err?.message ?? err}`);
          if (streak >= maxConsecutiveCrashes) {
            throw new Error(`Aborting after ${streak} consecutive crashes — is Ollama running with ${OLLAMA_MODEL}?`);
          }
        }
      }
    }
  }
  return { written, skipped, crashed };
}

const sh = cmd => { try { return execSync(cmd, { encoding: 'utf8' }).trim(); } catch { return null; } };

export async function collectMeta({ corpus, config }) {
  const base = OLLAMA_URL.replace(/\/api\/chat$/, '');
  const getJson = async path => { try { return await (await fetch(base + path)).json(); } catch { return null; } };
  const version = await getJson('/api/version');
  const tags = await getJson('/api/tags');
  const model = tags?.models?.find(m => m.name === OLLAMA_MODEL || m.model === OLLAMA_MODEL);
  return {
    startedAt: new Date().toISOString(),
    config,
    model: OLLAMA_MODEL,
    modelDigest: model?.digest ?? null,
    modelDetails: model?.details ?? null,
    ollamaVersion: version?.version ?? null,
    corpusHash: corpusHash(corpus),
    gitCommit: sh('git rev-parse HEAD'),
    gitDirty: Boolean(sh('git status --porcelain')),
    node: process.version,
    platform: `${os.platform()} ${os.release()} ${os.arch()}`,
    cpu: os.cpus()[0]?.model ?? null,
    cpuCores: os.cpus().length,
    totalMemGB: Math.round(os.totalmem() / 2 ** 30),
  };
}
```

- [ ] **Step 4: Implement `eval/runner.mjs` (CLI)**

```js
// Usage:
//   npm run eval -- --out eval/results/full-2026-11-01.jsonl
//   npm run eval -- --stages S0,S3 --prompts d01,g01 --reps 2 --allow-unfrozen --out eval/results/smoke-1.jsonl
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { EVAL_CONFIG } from './config.js';
import { STAGES } from './stages/index.js';
import { loadCorpus, validateCorpus, assertFrozen } from './corpus/corpus.js';
import { runMatrix, collectMeta } from './runner/core.js';
import { callOllamaDetailed, OLLAMA_MODEL } from '../src/llm.js';

const { values: args } = parseArgs({
  options: {
    out: { type: 'string' },
    stages: { type: 'string', default: EVAL_CONFIG.stages.join(',') },
    prompts: { type: 'string' },
    reps: { type: 'string', default: String(EVAL_CONFIG.reps) },
    'allow-unfrozen': { type: 'boolean', default: false },
  },
});
if (!args.out) { console.error('--out <path.jsonl> is required'); process.exit(1); }

if (OLLAMA_MODEL !== EVAL_CONFIG.model) {
  console.error(`Model mismatch: client sends ${OLLAMA_MODEL}, EVAL_CONFIG.model is ${EVAL_CONFIG.model}`);
  process.exit(1);
}

const corpus = loadCorpus();
const errors = validateCorpus(corpus);
if (!args['allow-unfrozen']) {
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  assertFrozen(corpus);
}

const stages = args.stages.split(',').map(id => STAGES[id] ?? (() => { throw new Error(`unknown stage ${id}`); })());
const wanted = args.prompts ? new Set(args.prompts.split(',')) : null;
const prompts = corpus.prompts.filter(p => !wanted || wanted.has(p.id));
const reps = Number(args.reps);

mkdirSync(dirname(args.out), { recursive: true });
const metaPath = `${args.out}.meta.json`;
if (!existsSync(metaPath)) {
  writeFileSync(metaPath, JSON.stringify(await collectMeta({ corpus, config: { ...EVAL_CONFIG, stages: stages.map(s => s.id), reps, promptIds: prompts.map(p => p.id) } }), null, 2) + '\n');
}

// Warm-up: load the model into RAM so the first measured run is not a cold start.
await callOllamaDetailed('Reply with OK.', 'OK', { numPredict: 1 });

const res = await runMatrix({
  stages, prompts, reps,
  seedBase: EVAL_CONFIG.seedBase,
  temperature: EVAL_CONFIG.temperature,
  maxConsecutiveCrashes: EVAL_CONFIG.maxConsecutiveCrashes,
  outPath: args.out,
});
console.log(`done: ${res.written} written, ${res.skipped} skipped, ${res.crashed} crashed`);
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/eval/runner.test.js`
Expected: PASS.

Run: `npm test`
Expected: everything green.

- [ ] **Step 6: Commit**

```bash
git add eval/runner eval/runner.mjs tests/eval/runner.test.js
git commit -m "feat(eval): resumable runner with crash isolation + environment metadata"
```

---

### Task 15: Analysis (summary, paired comparisons, Markdown + CSV)

**Files:**
- Create: `eval/analysis.js`, `eval/analyze.mjs`
- Test: `tests/eval/analysis.test.js`

**Interfaces:**
- Consumes: metrics (Task 11), `THRESHOLDS`, `BOOTSTRAP` (Task 0), JSONL from Task 14.
- Produces:
  - `loadRecords(path) → RunRecord[]` (skips malformed lines)
  - `perPrompt(records) → Map<"stage|promptId", PromptStats>`, where `PromptStats = { stage, promptId, category, n, validityRate, f1, precision, recall, f1Code, entropy, distinct, latencyMedian }`. F1 metrics are means over **executing** runs (NaN if none). Entropy and distinct are computed over **valid** runs.
  - `summarize(records, { stages, thresholds, bootstrap }) → Summary`:
    `{ stages: { [id]: StageSummary }, comparisons: Comparison[], byCategory: { [id]: { [category]: {...} } } }`.
    `StageSummary = { n, errorCounts, validity: CI, f1: CI, precision: CI, recall: CI, f1Code: CI, entropy: CI, distinct: number, latency: { median, p95, ci: CI, bandMedian, bandP95, shareWithin2s, shareWithin10s }, tokens: { promptMedian, evalMedian } }`
    `Comparison = { from, to, metric: 'validity'|'f1'|'f1Code'|'entropy'|'latencyMs', estimate, lower, upper, n, threshold, substantial }`
  - `toMarkdown(summary) → string`, `toCsv(records) → string`

Statistics unit: per-prompt aggregates (40 values per stage), paired across stages by prompt. This avoids pseudo-replication from the 10 reps. Latency median and p95 are additionally reported over all runs.

- [ ] **Step 1: Write the failing test**

`tests/eval/analysis.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { perPrompt, summarize, toMarkdown, toCsv } from '../../eval/analysis.js';

const rec = (stage, promptId, rep, o = {}) => ({
  stage, promptId, category: 'direct_hit', rep, seed: 1000 + rep,
  errorClass: null, executes: true, tags: ['a'], tagsFromCode: ['a'], expected: ['a', 'b'],
  latencyMs: 1000, llm: { calls: 1, promptTokens: 100, evalTokens: 20, llmMs: 900 }, ...o,
});
const opts = { stages: ['S0', 'S1'], thresholds: { validity: 0.05, f1: 0.05, f1Code: 0.05, entropy: 0.05, latencyMs: 500 }, bootstrap: { iterations: 200, alpha: 0.05, seed: 1 } };

describe('perPrompt', () => {
  it('validity over all runs, F1 over executing runs, entropy over valid runs', () => {
    const stats = perPrompt([
      rec('S0', 'p1', 0),
      rec('S0', 'p1', 1, { errorClass: 'syntax', executes: false, tags: [], tagsFromCode: [] }),
    ]).get('S0|p1');
    expect(stats.validityRate).toBe(0.5);
    expect(stats.f1).toBeCloseTo(2 / 3, 10);
    expect(stats.entropy).toBe(0);
    expect(stats.n).toBe(2);
  });

  it('no executing run → F1 NaN', () => {
    const stats = perPrompt([rec('S0', 'p1', 0, { errorClass: 'empty', executes: false, tags: [] })]).get('S0|p1');
    expect(stats.f1).toBeNaN();
  });
});

describe('summarize', () => {
  const records = [];
  for (const p of ['p1', 'p2', 'p3', 'p4']) for (const rep of [0, 1]) {
    records.push(rec('S0', p, rep, { errorClass: 'syntax', executes: false, tags: [], tagsFromCode: [], latencyMs: 800 }));
    records.push(rec('S1', p, rep, { tags: rep ? ['a', 'b'] : ['a'], latencyMs: 2500 }));
  }
  const s = summarize(records, opts);

  it('stage summaries', () => {
    expect(s.stages.S0.validity.estimate).toBe(0);
    expect(s.stages.S1.validity.estimate).toBe(1);
    expect(s.stages.S0.errorCounts).toEqual({ syntax: 8 });
    expect(s.stages.S1.entropy.estimate).toBe(1);
    expect(s.stages.S1.latency).toMatchObject({ median: 2500, bandMedian: '≤10s', shareWithin2s: 0, shareWithin10s: 1 });
    expect(s.stages.S0.latency.bandMedian).toBe('≤2s');
  });

  it('adjacent paired comparisons flag substantial differences', () => {
    const v = s.comparisons.find(c => c.from === 'S0' && c.to === 'S1' && c.metric === 'validity');
    expect(v).toMatchObject({ estimate: 1, lower: 1, upper: 1, substantial: true, n: 4 });
    const lat = s.comparisons.find(c => c.metric === 'latencyMs');
    expect(lat).toMatchObject({ estimate: 1700, substantial: true });
    const f1 = s.comparisons.find(c => c.metric === 'f1');
    expect(f1.n).toBe(0);
    expect(f1.substantial).toBe(false);
  });

  it('by category', () => expect(s.byCategory.S1.direct_hit.validity).toBe(1));

  it('markdown + csv', () => {
    expect(toMarkdown(s)).toContain('| S1 |');
    const csv = toCsv(records).split('\n');
    expect(csv[0]).toBe('stage,promptId,category,rep,seed,errorClass,executes,latencyMs,promptTokens,evalTokens,tags,tagsFromCode,expected');
    expect(csv).toHaveLength(17);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/eval/analysis.test.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `eval/analysis.js`**

```js
import { readFileSync } from 'node:fs';
import { prf1, normalizedEntropy, distinctRatio, median, percentile, mean, bootstrapCI, pairedDiffCI, millerBand } from './metrics.js';

export function loadRecords(path) {
  const out = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* partial trailing line */ }
  }
  return out;
}

const groupBy = (xs, keyFn) => xs.reduce((m, x) => m.set(keyFn(x), [...(m.get(keyFn(x)) ?? []), x]), new Map());

export function perPrompt(records) {
  const out = new Map();
  for (const [key, runs] of groupBy(records, r => `${r.stage}|${r.promptId}`)) {
    const executing = runs.filter(r => r.executes);
    const valid = runs.filter(r => r.errorClass === null);
    const fid = executing.map(r => prf1(r.expected, r.tags));
    out.set(key, {
      stage: runs[0].stage, promptId: runs[0].promptId, category: runs[0].category, n: runs.length,
      validityRate: valid.length / runs.length,
      f1: mean(fid.map(x => x.f1)),
      precision: mean(fid.map(x => x.precision)),
      recall: mean(fid.map(x => x.recall)),
      f1Code: mean(executing.map(r => prf1(r.expected, r.tagsFromCode).f1)),
      entropy: valid.length ? normalizedEntropy(valid.map(r => r.tags)) : NaN,
      distinct: valid.length ? distinctRatio(valid.map(r => r.tags)) : NaN,
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
  ['latencyMs', 'latencyMedian', 'latencyMs'],
];

export function summarize(records, { stages, thresholds, bootstrap }) {
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
    summary.stages[stage] = {
      n: runs.length,
      errorCounts,
      validity: ci(stage, 'validityRate'),
      f1: ci(stage, 'f1'), precision: ci(stage, 'precision'), recall: ci(stage, 'recall'),
      f1Code: ci(stage, 'f1Code'),
      entropy: ci(stage, 'entropy'),
      distinct: median(series(stage, 'distinct')),
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
        entropy: median(stats.map(s => s.entropy)),
        latencyMedian: median(cRuns.map(r => r.latencyMs)),
      };
    }
  }

  const present = stages.filter(s => summary.stages[s]);
  for (let i = 1; i < present.length; i++) {
    const [from, to] = [present[i - 1], present[i]];
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
  const header = ['stage', 'promptId', 'category', 'rep', 'seed', 'errorClass', 'executes', 'latencyMs', 'promptTokens', 'evalTokens', 'tags', 'tagsFromCode', 'expected'];
  const rows = records.map(r => [r.stage, r.promptId, r.category, r.rep, r.seed, r.errorClass, r.executes, Math.round(r.latencyMs), r.llm.promptTokens, r.llm.evalTokens, r.tags, r.tagsFromCode, r.expected].map(csvCell).join(','));
  return [header.join(','), ...rows].join('\n');
}
```

- [ ] **Step 4: Implement `eval/analyze.mjs`**

```js
// Usage: npm run eval:analyze -- eval/results/full-2026-11-01.jsonl
import { writeFileSync } from 'node:fs';
import { loadRecords, summarize, toMarkdown, toCsv } from './analysis.js';
import { EVAL_CONFIG, THRESHOLDS, BOOTSTRAP } from './config.js';

const path = process.argv[2];
if (!path) { console.error('usage: npm run eval:analyze -- <run.jsonl>'); process.exit(1); }

const records = loadRecords(path);
const summary = summarize(records, { stages: EVAL_CONFIG.stages, thresholds: THRESHOLDS, bootstrap: BOOTSTRAP });
const stem = path.replace(/\.jsonl$/, '');
writeFileSync(`${stem}.summary.json`, JSON.stringify(summary, null, 2) + '\n');
writeFileSync(`${stem}.summary.md`, toMarkdown(summary));
writeFileSync(`${stem}.csv`, toCsv(records) + '\n');
console.log(toMarkdown(summary));
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/eval/analysis.test.js`
Expected: PASS.

Run: `npm test`
Expected: everything green.

- [ ] **Step 6: Commit**

```bash
git add eval/analysis.js eval/analyze.mjs tests/eval/analysis.test.js
git commit -m "feat(eval): analysis — per-prompt stats, paired bootstrap comparisons, md/csv export"
```

---

### Task 16: Smoke run against real Ollama + README

**Files:**
- Create: `eval/README.md`
- Run output: `eval/results/smoke-<date>.jsonl` (gitignored)

**Interfaces:**
- Consumes: everything above. A temporary `prompts.json` is fine here (`--allow-unfrozen`). If Task 13 is not done yet, use a scratch corpus file with 4 prompts (one per category) and point `loadCorpus` at it by temporarily copying it to `eval/corpus/prompts.json`. Delete it afterwards. **Do not commit it.**

- [ ] **Step 1: Start Ollama**

Run (separate terminal): `ollama pull qwen2.5:7b && OLLAMA_ORIGINS="*" ollama serve`

- [ ] **Step 2: Smoke run: 4 prompts × 6 stages × 2 reps = 48 runs**

Run: `npm run eval -- --prompts <one id per category, comma-separated> --reps 2 --allow-unfrozen --out eval/results/smoke-$(date +%F).jsonl`
Expected: 48 lines `[k/48] Sx|id|rep <class|ok> <ms>ms`, then `done: 48 written, 0 skipped, 0 crashed`. A `.meta.json` with non-null `modelDigest` and `ollamaVersion`.

Sanity checks (inspect the JSONL; these are expectations, not tests):
- S3–S5 almost always `ok` (code comes from the library). Any S3+ `syntax`/`unknown_function` means a compiler bug: stop and investigate with superpowers:systematic-debugging.
- S0 shows a mix of error classes; S1/S2 should show fewer `unknown_sound`. If **every** S0–S2 run is `forbidden` or `unknown_function`, read 3 raw outputs. A systematic headless false negative (a REPL feature missing from `strudelHeadless.js`) must be fixed before the full run.
- S4/S5 plans carry non-empty `reasoning`; S5 system prompts contain `Knowledge graph context`.
- No record has `latencyMs` < 50 for an LLM stage (would mean a mocked/cached path).

- [ ] **Step 3: Analyse the smoke run**

Run: `npm run eval:analyze -- eval/results/smoke-<date>.jsonl`
Expected: a Markdown table with 6 stage rows and 25 comparison rows, plus `.summary.json`, `.summary.md` and `.csv` next to the JSONL.

- [ ] **Step 4: Ctrl-C resume check (Review Focus 5, live)**

Start the same smoke command with a new `--out`, press Ctrl-C after ~5 runs, then start it again.
Expected: the second invocation prints `skipped` for the finished keys and completes the rest.

- [ ] **Step 5: Write `eval/README.md`**

````markdown
# Evaluation harness — "Vom Prompt zum Beat"

Measures how stacked control stages affect a local `qwen2.5:7b` generating Strudel code.
Spec: `docs/thesis/expose.pdf`. All constants: `eval/config.js`.

## Stages (each adds exactly one mechanism)
| Stage | Mechanism | Module | Tags from |
|---|---|---|---|
| S0 | raw prompt → code | `stages/s0.js` | code lexicon |
| S1 | + specification (allowed sounds, functions with ranges) | `stages/s1.js` | code lexicon |
| S2 | + few-shot (top-3 similar library patterns per intent pillar) | `stages/s2.js` | code lexicon |
| S3 | + constraint: JSON pattern-id selection → deterministic compiler | `stages/s3.js` | pattern ids |
| S4 | + musical chain-of-thought (`reasoning` before `selectedId`) | `stages/s4.js` | pattern ids |
| S5 | + GraphRAG (genre ↔ tempo ↔ pattern ↔ function) | `stages/s5.js` | pattern ids |

Output unit = one whole track. Intent classification (`buildIntent`) runs from S2 on and counts toward latency.
Design rationale: `docs/superpowers/specs/2026-10-12-creative-harness-stage-model-design.md`.

## Run
```bash
OLLAMA_ORIGINS="*" ollama serve
npm run eval:freeze                                   # once, after annotation
npm run eval -- --out eval/results/full-YYYY-MM-DD.jsonl
npm run eval:analyze -- eval/results/full-YYYY-MM-DD.jsonl
```
Runs resume automatically; crashes land in `*.errors.jsonl` and are retried.

## Metrics
- **Validity**: `checkValidity` (`validity.js`), headless `queryArc(0,1)`. Classes: `syntax`, `unknown_function`, `unknown_sound` (exposé) plus `empty`, `forbidden`, `runtime`, `no_pattern`, `silent`.
- **Fidelity**: P/R/F1 of tags vs frozen expected tags, over executing runs. `f1` uses the exposé's per-stage source; `f1Code` uses the code lexicon for all stages (uniform measurement, robustness check).
- **Diversity**: normalised Shannon entropy of tag-set outcomes over valid runs of one prompt.
- **Latency**: wall clock of `stage.run`, median + p95, Miller bands ≤2 s / ≤10 s; tokens from Ollama.
- **Statistics**: per-prompt aggregates, paired bootstrap (10,000 resamples, seeded) between adjacent stages; substantial = CI excludes 0 and |Δ| ≥ `THRESHOLDS`.

## Known validity threats (discuss in thesis)
- Headless ≠ browser: REPL features are emulated in `strudelHeadless.js` (`$:`, `setcpm`, viz methods as no-ops).
- The code lexicon infers genre only from four-on-the-floor kicks, acid resonance and bit-crush, so S0–S2 genre recall is structurally lower than ID-derived tags. Report `f1Code` next to `f1`.
- Vocabulary, lexicon thresholds, graph and corpus are all set by the author.
````

- [ ] **Step 6: Commit**

```bash
git add eval/README.md
git commit -m "docs(eval): harness README"
```

- [ ] **Step 7: Full run (after Task 13 is done and `corpus-frozen` is tagged)**

Run: `npm run eval -- --out eval/results/full-$(date +%F).jsonl` (2,400 runs; expect several hours locally, and it resumes after interruption), then `npm run eval:analyze -- eval/results/full-<date>.jsonl`.

```bash
git add eval/results/full-*
git commit -m "data(eval): full measurement run"
```

---

## Self-Review Notes

- **Spec coverage (spec §§1–9):** stage model S0–S5 (§2) → Tasks 6–10 (S3 first, then S0–S2, S4, graph, S5). Constants (§3) → Tasks 0/3/14. Validity with exposé error classes + AST gate (§4) → Task 2. Shared vocabulary + code lexicon, `f1`/`f1Code` (§4) → Tasks 4/5/14/15. Entropy, latency, Miller bands, paired bootstrap + thresholds (§4) → Tasks 11/15. Corpus with 2 annotation passes + freeze (§5) → Tasks 12–13. Out of scope (§6) respected; UI untouched. Validity threats (§7) → README. Library fix (§9) → Task 1. 2,400 runs → Task 16.
- **Deliberate additions beyond the exposé** (mention in the thesis): `f1Code` as a uniform robustness measure, the extra error classes, the AST security gate, and the 8-pattern library fix found by the validator.
