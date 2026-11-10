import { EVAL_VOCAB } from '../vocabulary.js';
import { LIBRARY_COVERAGE } from '../config.js';
import { mulberry32 } from '../metrics.js';

export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// v2 patterns in a seeded shuffle, numbered #1..#n. Ids carry subgenre words, so the sheet and its
// export only ever see the numbers; unblind() maps them back with the same items.
export function blindItems(newPatterns, seed) {
  const items = LIBRARY_COVERAGE.pillars.flatMap(pillar => (newPatterns[pillar] ?? []).map(p => ({ pillar, id: p.id })));
  const rand = mulberry32(seed);
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items.map((it, n) => ({ ...it, key: `#${n + 1}` }));
}

export function unblind(exported, items) {
  return Object.fromEntries(items.filter(it => it.key in exported).map(it => [it.id, exported[it.key]]));
}

export function renderTagSheet(items, linkFor) {
  const boxes = (key, facet) => EVAL_VOCAB[facet].map(t => `<label><input type="checkbox" data-key="${key}" value="${t}">${t}</label>`).join(' ');
  const rows = items.map(it => `<tr><td>${it.key}</td><td>${it.pillar}</td><td><a href="${esc(linkFor(it.pillar, it.id))}" target="_blank">anhören</a></td>
<td><b>Unterart</b><br>${boxes(it.key, 'subgenre')}<br><b>Charakter</b><br>${boxes(it.key, 'character')}</td></tr>`);
  return `<!doctype html><html><head><meta charset="utf-8"><title>Library Tagging</title>
<style>body{font-family:system-ui;margin:2rem;max-width:70rem}table{border-collapse:collapse;width:100%}td{border-bottom:1px solid #ddd;padding:.5rem;vertical-align:top}label{margin-right:.6rem;white-space:nowrap}</style>
</head><body><h1>Library Tagging (blind)</h1>
<p>Jedes Pattern anhören (Link öffnet strudel.cc, dort Play). Ankreuzen, welche Unterart(en) und welcher Charakter hörbar sind. Am Ende „Export JSON“ und die Datei zurückschicken.</p>
<table>${rows.join('\n')}</table>
<p><button id="export">Export JSON</button></p>
<script>
const keys = ${JSON.stringify(items.map(it => it.key))};
document.getElementById('export').onclick = () => {
  const out = {};
  for (const key of keys) out[key] = [...document.querySelectorAll('input[data-key="' + key + '"]:checked')].map(b => b.value);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }));
  a.download = 'tags-B.json';
  a.click();
};
</script></body></html>`;
}
