import { soundLibrary } from '../../src/library/soundLibrary.js';
import { METHOD_CARDS } from '../../src/library/strudelDocs.js';
import { TRANSFORMS } from '../../src/library/transformationsLibrary.js';
import { normalizeLibraryTags, EVAL_VOCAB } from '../vocabulary.js';

// Curated, deliberately small (stage S5): Genre ↔ Tempo ↔ Klangbaustein ↔ Strudel-Funktion.
// Aliases are node attributes — the entry points for prompts without a direct tag hit.
export const GENRE_NODES = [
  { label: 'techno',     aliases: ['techno', 'berghain', 'tresor', 'peak time', 'peak-time', 'rave', 'klockworks'] },
  { label: 'house',      aliases: ['house', 'chicago', 'garage', 'disco', 'jackin'] },
  { label: 'minimal',    aliases: ['minimal', 'microhouse', 'stripped', 'minimalist'] },
  { label: 'industrial', aliases: ['industrial', 'ebm', 'hard techno', 'factory', 'noise', 'warehouse'] },
  { label: 'dub',        aliases: ['dub', 'dub techno', 'basic channel', 'echo chamber', 'chain reaction'] },
  { label: 'ambient',    aliases: ['ambient', 'drone', 'chill', 'meditative', 'soundscape'] },
  { label: 'trance',     aliases: ['trance', 'psy', 'goa', 'euphoric'] },
  { label: 'lofi',       aliases: ['lofi', 'lo-fi', 'hip hop', 'hiphop', 'boom bap', 'study beats'] },
  { label: 'acid',       aliases: ['acid', '303', 'squelchy', 'acid house'] },
  { label: 'detroit',    aliases: ['detroit', 'motor city', 'underground resistance', 'motown'] },
];

export const TEMPO_BANDS = [
  { id: '70-95', min: 70, max: 95 },
  { id: '118-127', min: 118, max: 127 },
  { id: '128-134', min: 128, max: 134 },
  { id: '135-150', min: 135, max: 150 },
];

export const GENRE_TEMPO = {
  techno: ['128-134'], house: ['118-127'], minimal: ['118-127', '128-134'],
  industrial: ['135-150'], dub: ['70-95', '118-127'], ambient: ['70-95'],
  trance: ['135-150'], lofi: ['70-95'], acid: ['128-134', '135-150'],
  detroit: ['118-127', '128-134'],
};

// Library default aesthetic: dark techno.
export const DEFAULT_PATTERN_BANDS = ['128-134'];

const GENRES = new Set(EVAL_VOCAB.genre);
const METHOD_NAMES = new Set([...Object.keys(METHOD_CARDS), ...Object.values(TRANSFORMS).map(t => t.method)]);

function patternMethods(pattern) {
  const fromCode = [...pattern.code.matchAll(/\.([a-zA-Z]+)\s*\(/g)].map(m => m[1]);
  const fromTransforms = Object.keys(pattern.initialTransforms ?? {}).map(k => TRANSFORMS[k]?.method).filter(Boolean);
  return [...new Set([...fromCode, ...fromTransforms])].filter(m => METHOD_NAMES.has(m)).sort();
}

let cached = null;

export function buildKnowledgeGraph() {
  if (cached) return cached;
  const nodes = [];
  const edges = [];
  const methods = new Set();

  for (const g of GENRE_NODES) {
    nodes.push({ id: `genre:${g.label}`, type: 'genre', label: g.label, aliases: g.aliases });
    for (const band of GENRE_TEMPO[g.label]) edges.push([`genre:${g.label}`, `tempo:${band}`]);
  }
  for (const b of TEMPO_BANDS) nodes.push({ id: `tempo:${b.id}`, type: 'tempo', label: `${b.min}–${b.max} BPM`, min: b.min, max: b.max });

  for (const [pillar, patterns] of Object.entries(soundLibrary)) {
    for (const p of patterns) {
      const id = `pattern:${p.id}`;
      nodes.push({ id, type: 'pattern', label: p.name, pillar });
      const genres = normalizeLibraryTags(p.tags).filter(t => GENRES.has(t));
      const bands = genres.length ? [...new Set(genres.flatMap(g => GENRE_TEMPO[g]))] : DEFAULT_PATTERN_BANDS;
      for (const band of bands) edges.push([`tempo:${band}`, id]);
      for (const m of patternMethods(p)) { methods.add(m); edges.push([id, `method:${m}`]); }
    }
  }
  for (const m of [...methods].sort()) nodes.push({ id: `method:${m}`, type: 'method', label: m });

  cached = { nodes, edges };
  return cached;
}

export function neighbours(graph, id) {
  const out = [];
  for (const [a, b] of graph.edges) {
    if (a === id) out.push(b);
    else if (b === id) out.push(a);
  }
  return out;
}
