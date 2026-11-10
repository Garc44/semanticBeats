// Usage: node --import ./eval/node-hooks/register.mjs eval/library/tagAgreement.mjs [eval/library/tags-B.json]
// Agreement between the author's v2 tags (library, normalised) and the blind second pass,
// over subgenre and character only (element tags follow from the code, not from listening).
import { readFileSync } from 'node:fs';
import { EVAL_VOCAB, normalizeLibraryTags } from '../vocabulary.js';
import { LIBRARY_COVERAGE } from '../config.js';
import { cohensKappa, meanJaccard } from '../corpus/agreement.js';
import { NEW_PATTERNS } from './links.js';
import { unblind } from './tagSheet.js';

const vocab = [...EVAL_VOCAB.subgenre, ...EVAL_VOCAB.character];
const keep = tags => tags.filter(t => vocab.includes(t));
const path = process.argv[2] ?? new URL('./tags-B.json', import.meta.url);
// The sheet exports numbers (#n); the key written with the sheet maps them back to ids.
const keys = JSON.parse(readFileSync(new URL('./tag-sheet-keys.json', import.meta.url), 'utf8'));
const items = Object.entries(keys).map(([key, id]) => ({ key, id }));
const B = Object.fromEntries(Object.entries(unblind(JSON.parse(readFileSync(path, 'utf8')), items)).map(([id, tags]) => [id, keep(tags)]));
const A = Object.fromEntries(LIBRARY_COVERAGE.pillars.flatMap(p => NEW_PATTERNS[p].map(x => [x.id, keep(normalizeLibraryTags(x.tags))])));
const ids = Object.keys(A);
const missing = ids.filter(id => !(id in B));
if (missing.length) { console.error(`second pass misses: ${missing.join(', ')}`); process.exit(1); }

console.log(`patterns: ${ids.length}`);
console.log(`Cohen's kappa (pattern × tag): ${cohensKappa(A, B, ids, vocab).toFixed(3)}`);
console.log(`mean Jaccard: ${meanJaccard(A, B, ids).toFixed(3)}`);
for (const facet of ['subgenre', 'character'])
  console.log(`  kappa ${facet}: ${cohensKappa(A, B, ids, EVAL_VOCAB[facet]).toFixed(3)}`);
const diffs = ids.filter(id => B[id].slice().sort().join() !== A[id].slice().sort().join());
console.log(`\ndisagreements (${diffs.length}):`);
for (const id of diffs) console.log(`  ${id}: author [${A[id].join(', ')}] vs B [${B[id].join(', ')}]`);
