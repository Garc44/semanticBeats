import { buildKnowledgeGraph, neighbours, SUBGENRE_NODES, SUBGENRES, SUBGENRE_BPM, bandOfBpm } from './knowledgeGraph.js';
import { lexIntent } from '../../src/intent.js';
import { rankPatternsByIntent } from '../../src/promptEngine.js';

const CONTEXT_PATTERNS = 5;
const CONTEXT_FUNCTIONS = 8;
const SUBGENRE_SET = new Set(SUBGENRES);

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const mentions = (text, alias) => new RegExp(`\\b${escapeRe(alias)}\\b`, 'i').test(text);

export function retrieveGraph(prompt, intent) {
  const graph = buildKnowledgeGraph();
  let seedSubgenres = SUBGENRE_NODES.filter(s => s.aliases.some(a => mentions(prompt, a))).map(s => s.label);
  // Intent genres come from src/intent.js; only those that are techno subgenres can seed.
  if (!seedSubgenres.length && SUBGENRE_SET.has(intent?.genre)) seedSubgenres = [intent.genre];

  const bpm = lexIntent(prompt).bpm;
  const band = bpm ? bandOfBpm(bpm) : null;
  const bands = band
    ? [`tempo:${band.id}`]
    : [...new Set(seedSubgenres.flatMap(s => neighbours(graph, `subgenre:${s}`)))].sort();

  return { seedSubgenres, bands, bpm: bpm ?? null };
}

// Tag score (existing retrieval) + graph score (seed bands the pattern is linked to).
export function rankWithGraph(pillar, retrieval, intent, k = 8) {
  const graph = buildKnowledgeGraph();
  const seedBands = new Set(retrieval.bands);
  return rankPatternsByIntent(pillar, intent)
    .map(({ pattern, score }, order) => {
      const graphScore = neighbours(graph, `pattern:${pattern.id}`).filter(id => seedBands.has(id)).length;
      return { pattern, total: score + graphScore, order };
    })
    .sort((a, b) => b.total - a.total || a.order - b.order)
    .slice(0, k)
    .map(r => r.pattern);
}

const labelOf = (graph, id) => graph.nodes.find(n => n.id === id)?.label ?? id;

// S5: context for one pillar's selection.
export function graphContextText(retrieval, pillar, ranked) {
  const graph = buildKnowledgeGraph();
  const top = ranked.slice(0, CONTEXT_PATTERNS);
  const functions = [...new Set(top.flatMap(p =>
    neighbours(graph, `pattern:${p.id}`).filter(id => id.startsWith('method:')).map(id => labelOf(graph, id))))].sort();

  const lines = [];
  for (const s of retrieval.seedSubgenres) {
    lines.push(`${s} → ${neighbours(graph, `subgenre:${s}`).map(id => labelOf(graph, id)).join(', ')}`);
  }
  if (retrieval.bpm) lines.push(`requested tempo ${retrieval.bpm} BPM → ${retrieval.bands.map(id => labelOf(graph, id)).join(', ')}`);
  lines.push(`${pillar} patterns in these tempo bands: ${top.map(p => p.id).join(', ')}`);
  lines.push(`typical Strudel functions: ${functions.join(', ') || '(none)'}`);
  return lines.join('\n');
}

// S6: subgenre → tempo knowledge plus the functions most used by patterns in the seed bands.
export function subgenreContextText(retrieval) {
  const graph = buildKnowledgeGraph();
  const lines = retrieval.seedSubgenres.length
    ? retrieval.seedSubgenres.map(s => `${s} → ${SUBGENRE_BPM[s]} BPM (${neighbours(graph, `subgenre:${s}`).map(id => labelOf(graph, id)).join(', ')})`)
    : [`no subgenre recognised — choose the closest of: ${SUBGENRES.join(', ')}`];
  if (retrieval.bpm) lines.push(`requested tempo ${retrieval.bpm} BPM`);

  const bands = retrieval.bands.length ? retrieval.bands : graph.nodes.filter(n => n.type === 'tempo').map(n => n.id);
  const counts = new Map();
  for (const band of bands) {
    for (const p of neighbours(graph, band).filter(id => id.startsWith('pattern:'))) {
      for (const m of neighbours(graph, p).filter(id => id.startsWith('method:'))) {
        counts.set(labelOf(graph, m), (counts.get(labelOf(graph, m)) ?? 0) + 1);
      }
    }
  }
  const functions = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, CONTEXT_FUNCTIONS).map(([m]) => m);
  lines.push(`typical Strudel functions: ${functions.join(', ') || '(none)'}`);
  return lines.join('\n');
}
