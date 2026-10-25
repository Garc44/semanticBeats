import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ALL_TAGS } from '../vocabulary.js';

export const CATEGORIES = ['direct_hit', 'alias', 'structure', 'underspecified'];
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
    // Open-ended prompts ("make anything") have no expectation: excluded from fidelity only.
    if (p.openEnded) {
      if (!Array.isArray(p.expected) || p.expected.length) errors.push(`${p.id}: open-ended prompt must have no expected tags`);
    } else if (!Array.isArray(p.expected) || !p.expected.length) errors.push(`${p.id}: no expected tags`);
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
    .map(p => ({ id: p.id, category: p.category, text: p.text, expected: [...p.expected].sort(), openEnded: !!p.openEnded }));
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

export function assertFrozen(corpus, hashPath = DEFAULT_HASH_PATH) {
  if (!existsSync(hashPath)) throw new Error(`Corpus not frozen: ${hashPath} missing (run npm run eval:freeze)`);
  const frozen = readFileSync(hashPath, 'utf8').trim();
  if (frozen !== corpusHash(corpus)) throw new Error('Corpus changed since freeze — expectations must not be edited after freezing');
}
