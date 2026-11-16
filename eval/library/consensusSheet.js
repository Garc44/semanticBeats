import { EVAL_VOCAB } from '../vocabulary.js';
import { esc } from './tagSheet.js';

const FACETS = ['subgenre', 'character'];
const VOCAB = new Set(FACETS.flatMap(f => EVAL_VOCAB[f]));
const num = key => Number(key.slice(1));

// One row per sheet number: tags both passes chose, only pass A (library), only pass B (blind sheet).
// keys: { '#n': id }, a: { id: tags }, b: { '#n': tags }. Only subgenre + character count.
export function consensusRows(keys, a, b) {
  return Object.entries(keys)
    .sort(([x], [y]) => num(x) - num(y))
    .map(([key, id]) => {
      const A = (a[id] ?? []).filter(t => VOCAB.has(t));
      const B = (b[key] ?? []).filter(t => VOCAB.has(t));
      return {
        key, pillar: id.split('_')[0], id,
        both: A.filter(t => B.includes(t)),
        onlyA: A.filter(t => !B.includes(t)),
        onlyB: B.filter(t => !A.includes(t)),
      };
    });
}

// Unblinded only as far as needed: both tag sets are shown, pattern names and ids are not
// (ids carry subgenre words and would pull the decision towards pass A).
export function renderConsensusSheet(rows, linkFor) {
  const box = (r, t) => {
    const mark = r.both.includes(t) ? 'both' : r.onlyA.includes(t) ? 'a' : r.onlyB.includes(t) ? 'b' : '';
    const badge = mark === 'both' ? '<sup>A+B</sup>' : mark === 'a' ? '<sup>A</sup>' : mark === 'b' ? '<sup>B</sup>' : '';
    return `<label class="${mark}"><input type="checkbox" data-key="${r.key}" value="${t}"${mark === 'both' ? ' checked' : ''}>${t}${badge}</label>`;
  };
  const body = rows.map(r => `<tr id="row${r.key.slice(1)}"><td><b>${r.key}</b><br>${r.pillar}<br><a href="${esc(linkFor(r.pillar, r.id))}" target="_blank">anhören</a></td>
<td>${FACETS.map(f => `<div><b>${f === 'subgenre' ? 'Unterart' : 'Charakter'}</b><br>${EVAL_VOCAB[f].map(t => box(r, t)).join(' ')}</div>`).join('')}
<input class="note" data-note="${r.key}" placeholder="Notiz (optional): warum so entschieden"></td>
<td><label><input type="checkbox" data-done="${r.key}"> entschieden</label></td></tr>`);

  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Library Konsens</title>
<style>
body{font-family:system-ui;margin:2rem auto;max-width:72rem;padding:0 1rem;color:#222;background:#fff}
table{border-collapse:collapse;width:100%}td{border-bottom:1px solid #ddd;padding:.6rem;vertical-align:top}
label{margin-right:.5rem;white-space:nowrap;display:inline-block;padding:0 .2rem;border-radius:3px}
label.both{background:#d6f5d6}label.a{background:#dbe8ff}label.b{background:#ffe7c7}
sup{font-size:.65em;margin-left:.1em;color:#555}
.note{width:100%;margin-top:.4rem;padding:.3rem;box-sizing:border-box}
tr.done{opacity:.55}#bar{position:sticky;top:0;background:#fff;padding:.5rem 0;border-bottom:2px solid #222;z-index:1}
</style></head><body>
<h1>Library Konsens</h1>
<p>Für jedes Pattern gemeinsam anhören und die endgültigen Tags festlegen.
<span style="background:#d6f5d6">A+B</span> = beide gewählt (schon angekreuzt),
<span style="background:#dbe8ff">A</span> = nur Durchgang A (Agent, vom Autor geprüft),
<span style="background:#ffe7c7">B</span> = nur Durchgang B.
Häkchen setzen oder entfernen, dann „entschieden“ anklicken. Alles wird automatisch im Browser gespeichert.
Am Ende „Export“ und <code>tags-consensus.json</code> nach <code>eval/library/</code> legen.</p>
<div id="bar"><span id="progress"></span> <button id="export">Export tags-consensus.json</button></div>
<table>${body.join('\n')}</table>
<script>
const keys = ${JSON.stringify(rows.map(r => r.key))};
const STORE = 'library-consensus-v2';
const q = s => [...document.querySelectorAll(s)];
const collect = () => {
  const tags = {}, notes = {}, done = {};
  for (const k of keys) {
    tags[k] = q('input[data-key="' + k + '"]:checked').map(b => b.value);
    notes[k] = document.querySelector('[data-note="' + k + '"]').value.trim();
    done[k] = document.querySelector('[data-done="' + k + '"]').checked;
  }
  return { tags, notes, done };
};
const render = () => {
  const { done } = collect();
  for (const k of keys) document.getElementById('row' + k.slice(1)).classList.toggle('done', done[k]);
  document.getElementById('progress').textContent = keys.filter(k => done[k]).length + ' / ' + keys.length + ' entschieden';
};
try {
  const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
  if (saved) for (const k of keys) {
    for (const b of q('input[data-key="' + k + '"]')) b.checked = (saved.tags[k] || []).includes(b.value);
    document.querySelector('[data-note="' + k + '"]').value = saved.notes[k] || '';
    document.querySelector('[data-done="' + k + '"]').checked = !!saved.done[k];
  }
} catch (e) {}
const save = () => { try { localStorage.setItem(STORE, JSON.stringify(collect())); } catch (e) {} render(); };
document.addEventListener('change', save);
document.addEventListener('input', save);
render();
document.getElementById('export').onclick = () => {
  const { tags, notes, done } = collect();
  const open = keys.filter(k => !done[k]);
  if (open.length && !confirm(open.length + ' Patterns sind noch nicht entschieden (z. B. ' + open.slice(0, 5).join(', ') + '). Trotzdem exportieren?')) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ tags, notes, undecided: open }, null, 2)], { type: 'application/json' }));
  a.download = 'tags-consensus.json';
  a.click();
};
</script></body></html>`;
}
