import { soundLibrary } from '../../src/library/soundLibrary.js';
import { METHOD_CARDS } from '../../src/library/strudelDocs.js';
import { TRANSFORMS } from '../../src/library/transformationsLibrary.js';
import { normalizeLibraryTags, EVAL_VOCAB } from '../vocabulary.js';

// Curated, deliberately small (stage S5, context for S6): Unterart ↔ Tempo ↔ Klangbaustein ↔ Strudel-Funktion.
// Aliases are node attributes — the entry points for prompts without a direct tag hit (corpus category "alias").
export const SUBGENRES = EVAL_VOCAB.subgenre;

export const SUBGENRE_NODES = [
  { label: 'acid',       aliases: ['acid', '303', 'squelch', 'squelchy'] },
  { label: 'detroit',    aliases: ['detroit', 'motor city', 'underground resistance', 'motown'] },
  { label: 'dub',        aliases: ['dub', 'dub techno', 'basic channel', 'echo chamber', 'chain reaction'] },
  { label: 'hypnotic',   aliases: ['hypnotic', 'hypnotisch', 'berghain', 'rolling', '4am', '4 uhr'] },
  { label: 'industrial', aliases: ['industrial', 'ebm', 'hard techno', 'warehouse', 'factory', 'fabrik', 'noise'] },
  { label: 'minimal',    aliases: ['minimal', 'minimalistisch', 'microhouse', 'stripped', 'minimalist'] },
  { label: 'peak-time',  aliases: ['peak-time', 'peak time', 'tresor', 'rave', 'festival', 'mainstage'] },
];

export const TEMPO_BANDS = [
  { id: '115-124', min: 115, max: 124 },
  { id: '125-129', min: 125, max: 129 },
  { id: '130-134', min: 130, max: 134 },
  { id: '135-150', min: 135, max: 150 },
];

// Spec §2.3: standard tempo per subgenre. S6's compiler uses exactly this table.
export const SUBGENRE_BPM = { acid: 132, detroit: 130, dub: 120, hypnotic: 128, industrial: 138, minimal: 125, 'peak-time': 134 };

export function bandOfBpm(bpm) {
  return TEMPO_BANDS.find(b => bpm >= b.min && bpm <= b.max) ?? null;
}

export const SUBGENRE_TEMPO = Object.fromEntries(SUBGENRES.map(s => [s, [bandOfBpm(SUBGENRE_BPM[s]).id]]));

// Library default aesthetic: driving dark techno.
export const DEFAULT_PATTERN_BANDS = ['130-134'];

const SUBGENRE_SET = new Set(SUBGENRES);
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

  for (const s of SUBGENRE_NODES) {
    nodes.push({ id: `subgenre:${s.label}`, type: 'subgenre', label: s.label, aliases: s.aliases });
    for (const band of SUBGENRE_TEMPO[s.label]) edges.push([`subgenre:${s.label}`, `tempo:${band}`]);
  }
  for (const b of TEMPO_BANDS) nodes.push({ id: `tempo:${b.id}`, type: 'tempo', label: `${b.min}–${b.max} BPM`, min: b.min, max: b.max });

  for (const [pillar, patterns] of Object.entries(soundLibrary)) {
    for (const p of patterns) {
      const id = `pattern:${p.id}`;
      nodes.push({ id, type: 'pattern', label: p.name, pillar });
      const subs = normalizeLibraryTags(p.tags).filter(t => SUBGENRE_SET.has(t));
      const bands = subs.length ? [...new Set(subs.flatMap(s => SUBGENRE_TEMPO[s]))] : DEFAULT_PATTERN_BANDS;
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
