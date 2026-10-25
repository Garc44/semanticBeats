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
// Open-ended prompts carry no tags by rule, so they would only inflate agreement.
const ids = corpus.prompts.filter(p => !p.openEnded).map(p => p.id);
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
