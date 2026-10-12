import { buildKnowledgeGraph, neighbours, GENRE_NODES, TEMPO_BANDS } from './knowledgeGraph.js';
import { lexIntent } from '../../src/intent.js';
import { rankPatternsByIntent } from '../../src/promptEngine.js';

const INTENT_GENRE_TO_VOCAB = { lofi_hiphop: 'lofi' };
const CONTEXT_PATTERNS = 5;

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const mentions = (text, alias) => new RegExp(`\\b${escapeRe(alias)}\\b`, 'i').test(text);

export function retrieveGraph(prompt, intent) {
  const graph = buildKnowledgeGraph();
  let seedGenres = GENRE_NODES.filter(g => g.aliases.some(a => mentions(prompt, a))).map(g => g.label);
  if (!seedGenres.length && intent?.genre) seedGenres = [INTENT_GENRE_TO_VOCAB[intent.genre] ?? intent.genre];
  seedGenres = seedGenres.filter(g => GENRE_NODES.some(n => n.label === g));

  const bpm = lexIntent(prompt).bpm;
  const bandOfBpm = bpm ? TEMPO_BANDS.find(b => bpm >= b.min && bpm <= b.max) : null;
  const bands = bandOfBpm
    ? [`tempo:${bandOfBpm.id}`]
    : [...new Set(seedGenres.flatMap(g => neighbours(graph, `genre:${g}`)))].sort();

  return { seedGenres, bands, bpm: bpm ?? null };
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

export function graphContextText(retrieval, pillar, ranked) {
  const graph = buildKnowledgeGraph();
  const label = id => graph.nodes.find(n => n.id === id)?.label ?? id;
  const top = ranked.slice(0, CONTEXT_PATTERNS);
  const functions = [...new Set(top.flatMap(p =>
    neighbours(graph, `pattern:${p.id}`).filter(id => id.startsWith('method:')).map(label)))].sort();

  const lines = [];
  for (const g of retrieval.seedGenres) {
    const bands = neighbours(graph, `genre:${g}`).map(label).join(', ');
    lines.push(`${g} → ${bands}`);
  }
  if (retrieval.bpm) lines.push(`requested tempo ${retrieval.bpm} BPM → ${retrieval.bands.map(label).join(', ')}`);
  lines.push(`${pillar} patterns in these tempo bands: ${top.map(p => p.id).join(', ')}`);
  lines.push(`typical Strudel functions: ${functions.join(', ') || '(none)'}`);
  return lines.join('\n');
}
