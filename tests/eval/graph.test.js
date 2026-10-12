import { describe, it, expect } from 'vitest';
import { buildKnowledgeGraph, neighbours, GENRE_NODES, TEMPO_BANDS } from '../../eval/graph/knowledgeGraph.js';
import { retrieveGraph, rankWithGraph, graphContextText } from '../../eval/graph/graphRag.js';
import { soundLibrary } from '../../src/library/soundLibrary.js';
import { EVAL_VOCAB } from '../../eval/vocabulary.js';

const type = id => id.split(':')[0];
const intent = (genre = 'techno') => ({ genre, moods: ['dark'], textures: [], layers: [] });

describe('knowledge graph', () => {
  const g = buildKnowledgeGraph();
  const total = Object.values(soundLibrary).flat().length;

  it('has one genre node per vocab genre, 4 tempo bands, every pattern', () => {
    expect(g.nodes.filter(n => n.type === 'genre').map(n => n.label).sort()).toEqual([...EVAL_VOCAB.genre].sort());
    expect(g.nodes.filter(n => n.type === 'tempo')).toHaveLength(TEMPO_BANDS.length);
    expect(g.nodes.filter(n => n.type === 'pattern')).toHaveLength(total);
  });

  it('only exposé edge types exist', () => {
    const allowed = new Set(['genre|tempo', 'pattern|tempo', 'method|pattern']);
    for (const [a, b] of g.edges) expect(allowed.has([type(a), type(b)].sort().join('|'))).toBe(true);
  });

  it('every pattern has ≥1 tempo edge; every genre ≥1 tempo edge', () => {
    for (const n of g.nodes.filter(n => n.type === 'pattern' || n.type === 'genre'))
      expect(neighbours(g, n.id).some(id => type(id) === 'tempo')).toBe(true);
  });

  it('pattern–method edges come from code and initialTransforms', () => {
    expect(neighbours(g, 'pattern:kick_berghain_rumble')).toEqual(expect.arrayContaining(['method:lpf', 'method:room', 'method:shape']));
  });

  it('every genre has at least one alias equal to its own label', () => {
    for (const gn of GENRE_NODES) expect(gn.aliases).toContain(gn.label);
  });
});

describe('graphRag', () => {
  it('resolves genre aliases without a direct tag hit', () => {
    expect(retrieveGraph('a Motor City style groove', intent()).seedGenres).toContain('detroit');
    expect(retrieveGraph('music for a Berghain closing set', intent()).seedGenres).toContain('techno');
    expect(retrieveGraph('something in the vein of Basic Channel', intent()).seedGenres).toContain('dub');
  });

  it('falls back to intent genre (lofi_hiphop → lofi)', () => {
    expect(retrieveGraph('make something', intent('lofi_hiphop')).seedGenres).toEqual(['lofi']);
  });

  it('explicit bpm selects exactly its band', () => {
    const r = retrieveGraph('warehouse stomper at 140 bpm', intent());
    expect(r.bpm).toBe(140);
    expect(r.bands).toEqual(['tempo:135-150']);
  });

  it('genre seeds expand to their tempo bands', () => {
    expect(retrieveGraph('detroit', intent()).bands.sort()).toEqual(['tempo:118-127', 'tempo:128-134']);
  });

  it('rankWithGraph returns k patterns of the pillar, detroit pattern first for detroit prompts', () => {
    const r = retrieveGraph('a Motor City style groove', intent());
    const ranked = rankWithGraph('percussion', r, intent(), 8);
    expect(ranked).toHaveLength(8);
    expect(ranked.every(p => soundLibrary.percussion.includes(p))).toBe(true);
    expect(ranked[0].id).toBe('perc_motor_city_groove');
  });

  it('context text names genre, BPM band, patterns and functions', () => {
    const r = retrieveGraph('detroit', intent());
    const ranked = rankWithGraph('drums', r, intent(), 8);
    const text = graphContextText(r, 'drums', ranked);
    expect(text).toContain('detroit');
    expect(text).toMatch(/118–127 BPM/);
    expect(text).toContain(ranked[0].id);
    expect(text).toMatch(/functions: .*\w/);
  });
});
