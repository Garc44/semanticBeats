import { soundLibrary } from '../../src/library/soundLibrary.js';
import { TECHNO_DRUMS } from '../../src/library/techno/drums.js';
import { TECHNO_BASS } from '../../src/library/techno/bass.js';
import { TECHNO_MELODY } from '../../src/library/techno/melody.js';
import { compileTrack } from '../../src/compiler.js';
import { makePillars } from '../../src/pillars.js';
export { esc } from './tagSheet.js';

// @strudel/core prints a banner on load; keep stdout pure HTML.
const log = console.log;
console.log = (...a) => console.error(...a);
const { code2hash } = await import('@strudel/core');
console.log = log;

export const NEW_PATTERNS = { drums: TECHNO_DRUMS, bass: TECHNO_BASS, melody: TECHNO_MELODY };
export const patternsOf = (pillar, onlyNew) => (onlyNew ? NEW_PATTERNS[pillar] : soundLibrary[pillar]);

const pillars = makePillars();

// strudel.cc link to the pattern compiled exactly like S3–S5, at 130 BPM.
export function strudelLink(pillarName, id) {
  const code = compileTrack({ selectedId: id, modifications: { speed: 1, slowdown: 1 } }, pillarName, pillars.find(p => p.name === pillarName));
  return `https://strudel.cc/#${code2hash(`setcpm(130/4)\n${code}`)}`;
}
