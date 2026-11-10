// Usage: node --import ./eval/node-hooks/register.mjs eval/library/freeze.mjs [--force]
// Checks coverage and writes the library v2 hash to FROZEN.sha256 (once, before run 2).
import { writeFileSync, existsSync } from 'node:fs';
import { soundLibrary } from '../../src/library/soundLibrary.js';
import { coverageGaps } from './coverage.js';
import { libraryHash, DEFAULT_LIBRARY_HASH_PATH } from './hash.js';

const gaps = coverageGaps(soundLibrary);
if (gaps.length) { console.error('coverage gaps:', gaps); process.exit(1); }
if (existsSync(DEFAULT_LIBRARY_HASH_PATH) && !process.argv.includes('--force')) {
  console.error('Already frozen. Re-freezing invalidates run 2 — pass --force only if no full run exists yet.');
  process.exit(1);
}
const hash = libraryHash();
writeFileSync(DEFAULT_LIBRARY_HASH_PATH, hash + '\n');
console.log(`frozen: ${hash}`);
