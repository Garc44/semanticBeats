// Usage: node --import ./eval/node-hooks/register.mjs eval/library/exportConsensusSheet.mjs > consensus.html
// Consensus sheet for the v2 patterns: per sheet number the tags of pass A (library) and pass B
// (eval/library/tags-B.json) side by side, shared tags pre-ticked. "Export" downloads
// { tags: { '#n': string[] }, notes: { '#n': string }, undecided: string[] } → eval/library/tags-consensus.json.
import { readFileSync } from 'node:fs';
import { EVAL_VOCAB, normalizeLibraryTags } from '../vocabulary.js';
import { LIBRARY_COVERAGE } from '../config.js';
import { NEW_PATTERNS, strudelLink } from './links.js';
import { consensusRows, renderConsensusSheet } from './consensusSheet.js';

const read = name => JSON.parse(readFileSync(new URL(`./${name}`, import.meta.url), 'utf8'));
const vocab = [...EVAL_VOCAB.subgenre, ...EVAL_VOCAB.character];
const A = Object.fromEntries(LIBRARY_COVERAGE.pillars.flatMap(p =>
  NEW_PATTERNS[p].map(x => [x.id, normalizeLibraryTags(x.tags).filter(t => vocab.includes(t))])));

console.log(renderConsensusSheet(consensusRows(read('tag-sheet-keys.json'), A, read('tags-B.json')), strudelLink));
