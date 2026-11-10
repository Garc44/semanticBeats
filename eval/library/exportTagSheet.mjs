// Usage: node --import ./eval/node-hooks/register.mjs eval/library/exportTagSheet.mjs > tag-sheet.html
// Blind tagging sheet for the second annotator: v2 patterns in shuffled order, numbered, without
// names, ids or tags — only a listening link and checkboxes for subgenre and character.
// "Export JSON" downloads { [id]: string[] } → save as eval/library/tags-B.json.
import { EVAL_VOCAB } from '../vocabulary.js';
import { LIBRARY_COVERAGE, BOOTSTRAP } from '../config.js';
import { mulberry32 } from '../metrics.js';
import { patternsOf, strudelLink, esc } from './links.js';

const items = LIBRARY_COVERAGE.pillars.flatMap(pillar => patternsOf(pillar, true).map(p => ({ pillar, id: p.id, link: strudelLink(pillar, p.id) })));
const rand = mulberry32(BOOTSTRAP.seed);
for (let i = items.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [items[i], items[j]] = [items[j], items[i]];
}

const boxes = (n, facet) => EVAL_VOCAB[facet].map(t => `<label><input type="checkbox" data-n="${n}" value="${t}">${t}</label>`).join(' ');
const rows = items.map((it, n) => `<tr><td>#${n + 1}</td><td>${it.pillar}</td><td><a href="${esc(it.link)}" target="_blank">anhören</a></td>
<td><b>Unterart</b><br>${boxes(n, 'subgenre')}<br><b>Charakter</b><br>${boxes(n, 'character')}</td></tr>`);

console.log(`<!doctype html><html><head><meta charset="utf-8"><title>Library Tagging</title>
<style>body{font-family:system-ui;margin:2rem;max-width:70rem}table{border-collapse:collapse;width:100%}td{border-bottom:1px solid #ddd;padding:.5rem;vertical-align:top}label{margin-right:.6rem;white-space:nowrap}</style>
</head><body><h1>Library Tagging (blind)</h1>
<p>Jedes Pattern anhören (Link öffnet strudel.cc, dort Play). Ankreuzen, welche Unterart(en) und welcher Charakter hörbar sind. Am Ende „Export JSON“ und die Datei zurückschicken.</p>
<table>${rows.join('\n')}</table>
<p><button id="export">Export JSON</button></p>
<script>
const ids = ${JSON.stringify(items.map(it => it.id))};
document.getElementById('export').onclick = () => {
  const out = {};
  ids.forEach((id, n) => { out[id] = [...document.querySelectorAll('input[data-n="' + n + '"]:checked')].map(b => b.value); });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }));
  a.download = 'tags-B.json';
  a.click();
};
</script></body></html>`);
