// Usage: node --import ./eval/node-hooks/register.mjs eval/library/listeningPage.mjs [--only new] > library.html
// One strudel.cc link per pattern (compiled exactly like S3–S5, at 130 BPM) for listening checks.
import { LIBRARY_COVERAGE } from '../config.js';
import { patternsOf, strudelLink, esc } from './links.js';

const onlyNew = process.argv.includes('--only') && process.argv[process.argv.indexOf('--only') + 1] === 'new';

const sections = LIBRARY_COVERAGE.pillars.map(pillar => {
  const patterns = patternsOf(pillar, onlyNew);
  const rows = patterns.map(p => `<tr><td><a href="${strudelLink(pillar, p.id)}" target="_blank">${esc(p.name)}</a></td><td><code>${esc(p.id)}</code></td><td>${esc(p.tags.join(', '))}</td></tr>`);
  return `<h2>${pillar} (${patterns.length})</h2>\n<table><tr><th>Pattern</th><th>ID</th><th>Tags</th></tr>\n${rows.join('\n')}\n</table>`;
});

console.log(`<!doctype html><html><head><meta charset="utf-8"><title>Library ${onlyNew ? 'v2 (new)' : 'all'}</title>
<style>body{font-family:system-ui;margin:2rem;max-width:60rem}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ddd;padding:.3rem;text-align:left}</style>
</head><body><h1>Library ${onlyNew ? 'v2 – new patterns' : '– all patterns'}</h1>
${sections.join('\n')}
</body></html>`);
