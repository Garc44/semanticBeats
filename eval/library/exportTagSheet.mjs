// Usage: node --import ./eval/node-hooks/register.mjs eval/library/exportTagSheet.mjs [--round 2] > tag-sheet.html
// Blind tagging sheet for the second annotator: v2 patterns shuffled and numbered, without names,
// ids or tags — only a listening link and checkboxes for subgenre and character.
// Round 1 = all v2 patterns at the time; a later round = v2 patterns no earlier round's key covers.
// "Export JSON" downloads { "#n": string[] } → save as eval/library/tags-B[-n].json.
// The number → id key goes to tag-sheet-keys[-n].json (commit it with the sheet; tagAgreement reads it).
// An existing key is never overwritten: the numbering of a handed-out sheet must not move.
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BOOTSTRAP } from '../config.js';
import { NEW_PATTERNS, strudelLink } from './links.js';
import { blindItems, renderTagSheet } from './tagSheet.js';
import { roundFiles, parseRound, patternsForRound } from './round.js';

const here = name => fileURLToPath(new URL(`./${name}`, import.meta.url));
const round = parseRound(process.argv.slice(2));
const files = roundFiles(round);
const earlier = new Set();
for (let r = 1; r < round; r++) for (const id of Object.values(JSON.parse(readFileSync(here(roundFiles(r).keys), 'utf8')))) earlier.add(id);

let items;
if (existsSync(here(files.keys))) {
  // Re-render a handed-out sheet from its key (same numbers), never re-shuffle.
  const pillarOf = Object.fromEntries(Object.entries(NEW_PATTERNS).flatMap(([p, list]) => list.map(x => [x.id, p])));
  items = Object.entries(JSON.parse(readFileSync(here(files.keys), 'utf8'))).map(([key, id]) => ({ key, id, pillar: pillarOf[id] }));
  console.error(`${files.keys} exists: sheet rendered from it (${items.length} patterns), key unchanged`);
} else {
  items = blindItems(patternsForRound(NEW_PATTERNS, earlier), BOOTSTRAP.seed);
  if (!items.length) throw new Error(`round ${round}: no v2 pattern left that earlier rounds do not cover`);
  writeFileSync(here(files.keys), JSON.stringify(Object.fromEntries(items.map(it => [it.key, it.id])), null, 2) + '\n');
  console.error(`round ${round}: ${items.length} patterns, key written to ${files.keys}`);
}
console.log(renderTagSheet(items, strudelLink, { store: files.sheetStore, exportName: files.b }));
