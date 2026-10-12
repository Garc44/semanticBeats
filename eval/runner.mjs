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
import { closeValidityWorker } from './validity.js';

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

let res;
try {
  res = await runMatrix({
    stages, prompts, reps,
    seedBase: EVAL_CONFIG.seedBase,
    temperature: EVAL_CONFIG.temperature,
    maxConsecutiveCrashes: EVAL_CONFIG.maxConsecutiveCrashes,
    outPath: args.out,
  });
} finally {
  await closeValidityWorker();
}
console.log(`done: ${res.written} written, ${res.skipped} skipped, ${res.crashed} crashed`);
