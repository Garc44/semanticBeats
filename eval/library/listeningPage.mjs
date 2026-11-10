// Usage: node --import ./eval/node-hooks/register.mjs eval/library/listeningPage.mjs [--only new] > library.html
// One strudel.cc link per pattern (compiled exactly like S3–S5, at 130 BPM) for listening checks.
import { soundLibrary } from '../../src/library/soundLibrary.js';
import { TECHNO_DRUMS } from '../../src/library/techno/drums.js';
import { TECHNO_BASS } from '../../src/library/techno/bass.js';
import { TECHNO_MELODY } from '../../src/library/techno/melody.js';
import { compileTrack } from '../../src/compiler.js';
import { makePillars } from '../../src/pillars.js';
import { LIBRARY_COVERAGE } from '../config.js';

// @strudel/core prints a banner on load; keep stdout pure HTML.
const log = console.log;
console.log = (...a) => console.error(...a);
const { code2hash } = await import('@strudel/core');
console.log = log;

const onlyNew = process.argv.includes('--only') && process.argv[process.argv.indexOf('--only') + 1] === 'new';
const NEW = { drums: TECHNO_DRUMS, bass: TECHNO_BASS, melody: TECHNO_MELODY };
const pillars = makePillars();
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function strudelLink(pillarName, id) {
  const code = compileTrack({ selectedId: id, modifications: { speed: 1, slowdown: 1 } }, pillarName, pillars.find(p => p.name === pillarName));
  return `https://strudel.cc/#${code2hash(`setcpm(130/4)\n${code}`)}`;
}

const sections = LIBRARY_COVERAGE.pillars.map(pillar => {
  const patterns = onlyNew ? NEW[pillar] : soundLibrary[pillar];
  const rows = patterns.map(p => `<tr><td><a href="${strudelLink(pillar, p.id)}" target="_blank">${esc(p.name)}</a></td><td><code>${esc(p.id)}</code></td><td>${esc(p.tags.join(', '))}</td></tr>`);
  return `<h2>${pillar} (${patterns.length})</h2>\n<table><tr><th>Pattern</th><th>ID</th><th>Tags</th></tr>\n${rows.join('\n')}\n</table>`;
});

console.log(`<!doctype html><html><head><meta charset="utf-8"><title>Library ${onlyNew ? 'v2 (new)' : 'all'}</title>
<style>body{font-family:system-ui;margin:2rem;max-width:60rem}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ddd;padding:.3rem;text-align:left}</style>
</head><body><h1>Library ${onlyNew ? 'v2 – new patterns' : '– all patterns'}</h1>
${sections.join('\n')}
</body></html>`);
