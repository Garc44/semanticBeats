// Usage: node --import ./eval/node-hooks/register.mjs eval/library/exportTagSheet.mjs > tag-sheet.html
// Blind tagging sheet for the second annotator: v2 patterns shuffled and numbered, without names,
// ids or tags — only a listening link and checkboxes for subgenre and character.
// "Export JSON" downloads { "#n": string[] } → save as eval/library/tags-B.json.
// The number → id key goes to tag-sheet-keys.json (commit it with the sheet; tagAgreement reads it).
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BOOTSTRAP } from '../config.js';
import { NEW_PATTERNS, strudelLink } from './links.js';
import { blindItems, renderTagSheet } from './tagSheet.js';

const items = blindItems(NEW_PATTERNS, BOOTSTRAP.seed);
writeFileSync(fileURLToPath(new URL('./tag-sheet-keys.json', import.meta.url)),
  JSON.stringify(Object.fromEntries(items.map(it => [it.key, it.id])), null, 2) + '\n');
console.log(renderTagSheet(items, strudelLink));
