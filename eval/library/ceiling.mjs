// Usage: node --import ./eval/node-hooks/register.mjs eval/library/ceiling.mjs
// Diagnosis: best ID-derived F1 any selection could reach, per prompt over every drums × bass × melody
// combination of the current library, then the mean over prompts with an expectation.
import { soundLibrary } from '../../src/library/soundLibrary.js';
import { loadCorpus } from '../corpus/corpus.js';
import { tagsForPatternIds } from '../vocabulary.js';
import { prf1, mean } from '../metrics.js';

const [drums, bass, melody] = ['drums', 'bass', 'melody'].map(p => soundLibrary[p].map(x => x.id));
const combos = [];
for (const d of drums) for (const b of bass) for (const m of melody) combos.push(tagsForPatternIds([d, b, m]));

const best = loadCorpus().prompts
  .filter(p => p.expected?.length)
  .map(p => Math.max(...combos.map(tags => prf1(p.expected, tags).f1)));

console.log(`library: ${drums.length} drums × ${bass.length} bass × ${melody.length} melody = ${combos.length} combinations`);
console.log(`prompts with expectation: ${best.length}`);
console.log(`ceiling (mean best ID-F1): ${mean(best).toFixed(3)}`);
