// Snapshot of the sample manifests src/strudel.js loads. Re-run only if strudel.js changes.
import { writeFileSync, mkdirSync } from 'node:fs';

const SOURCES = {
  banked: 'https://raw.githubusercontent.com/felixroos/dough-samples/main/tidal-drum-machines.json',
  plain: 'https://raw.githubusercontent.com/tidalcycles/dirt-samples/main/strudel.json',
};

const out = { fetchedAt: new Date().toISOString(), sources: SOURCES };
for (const [kind, url] of Object.entries(SOURCES)) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const manifest = await res.json();
  out[kind] = Object.keys(manifest).filter(k => !k.startsWith('_')).sort();
}

mkdirSync(new URL('../data/', import.meta.url), { recursive: true });
writeFileSync(new URL('../data/knownSounds.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
console.log(`banked: ${out.banked.length}, plain: ${out.plain.length}`);
