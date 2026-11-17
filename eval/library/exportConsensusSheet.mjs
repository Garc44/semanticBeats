// Usage: node --import ./eval/node-hooks/register.mjs eval/library/exportConsensusSheet.mjs [--round 2] > consensus.html
// Consensus sheet for one tagging round: per sheet number the tags of pass A (library) and pass B
// (eval/library/tags-B[-n].json) side by side, shared tags pre-ticked. "Export" downloads
// { tags: { '#n': string[] }, notes: { '#n': string }, undecided: string[] } → eval/library/tags-consensus[-n].json.
import { readFileSync } from 'node:fs';
import { EVAL_VOCAB, normalizeLibraryTags } from '../vocabulary.js';
import { LIBRARY_COVERAGE } from '../config.js';
import { NEW_PATTERNS, strudelLink } from './links.js';
import { consensusRows, renderConsensusSheet } from './consensusSheet.js';
import { roundFiles, parseRound } from './round.js';

const files = roundFiles(parseRound(process.argv.slice(2)));
const read = name => JSON.parse(readFileSync(new URL(`./${name}`, import.meta.url), 'utf8'));
const vocab = [...EVAL_VOCAB.subgenre, ...EVAL_VOCAB.character];
const A = Object.fromEntries(LIBRARY_COVERAGE.pillars.flatMap(p =>
  NEW_PATTERNS[p].map(x => [x.id, normalizeLibraryTags(x.tags).filter(t => vocab.includes(t))])));

console.log(renderConsensusSheet(consensusRows(read(files.keys), A, read(files.b)), strudelLink,
  { store: files.consensusStore, exportName: files.consensus }));
