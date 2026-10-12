import { appendFileSync, existsSync, readFileSync, truncateSync } from 'node:fs';
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

// An interrupted write can leave a partial last line without '\n'. Drop it so
// the next append starts on a fresh line (the fragment was never a complete record).
export function trimPartialTail(path) {
  if (!existsSync(path)) return;
  const buf = readFileSync(path);
  if (buf.length === 0 || buf[buf.length - 1] === 0x0a) return;
  truncateSync(path, buf.lastIndexOf(0x0a) + 1);
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
  const errorsPath = `${outPath}.errors.jsonl`;
  trimPartialTail(outPath);
  trimPartialTail(errorsPath);
  const done = readDoneKeys(outPath);
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
