// Usage: node --import ./eval/node-hooks/register.mjs eval/library/ceiling.mjs [--v1]
// Reference points for ID-derived F1 over every drums × bass × melody combination of the library:
// random pick (one pattern per pillar, exact expectation) and best possible pick (ceiling).
// Per prompt with an expectation, then the mean over prompts. --v1 drops the library v2 patterns
// (TECHNO_*), i.e. the library of main run 1.
import { soundLibrary } from '../../src/library/soundLibrary.js';
import { TECHNO_DRUMS } from '../../src/library/techno/drums.js';
import { TECHNO_BASS } from '../../src/library/techno/bass.js';
import { TECHNO_MELODY } from '../../src/library/techno/melody.js';
import { loadCorpus } from '../corpus/corpus.js';
import { tagsForPatternIds } from '../vocabulary.js';
import { mean } from '../metrics.js';
import { selectionBaselines } from './baselines.js';

const v1 = process.argv.includes('--v1');
const v2Ids = new Set([...TECHNO_DRUMS, ...TECHNO_BASS, ...TECHNO_MELODY].map(p => p.id));
const pillars = ['drums', 'bass', 'melody'].map(name =>
  soundLibrary[name].filter(p => !(v1 && v2Ids.has(p.id))).map(p => tagsForPatternIds([p.id])));

const prompts = loadCorpus().prompts.filter(p => p.expected?.length);
const rows = prompts.map(p => ({ id: p.id, category: p.category, ...selectionBaselines(p.expected, pillars) }));
const m = sel => mean(rows.map(sel)).toFixed(3);

console.log(`library ${v1 ? 'v1 (run 1)' : 'current'}: ${pillars.map(x => x.length).join(' × ')} = ${rows[0].combinations} combinations`);
console.log(`prompts with expectation: ${rows.length}`);
console.log(`random pick: F1 ${m(r => r.random.f1)}, precision ${m(r => r.random.precision)}, recall ${m(r => r.random.recall)}`);
console.log(`ceiling (best pick): F1 ${m(r => r.best.f1)}`);
for (const c of [...new Set(rows.map(r => r.category))]) {
  const rs = rows.filter(r => r.category === c);
  console.log(`  ${c}: random ${mean(rs.map(r => r.random.f1)).toFixed(3)}, ceiling ${mean(rs.map(r => r.best.f1)).toFixed(3)}`);
}
