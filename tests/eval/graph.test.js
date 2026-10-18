import { describe, it, expect } from 'vitest';
import { buildKnowledgeGraph, neighbours, SUBGENRE_NODES, SUBGENRES, TEMPO_BANDS, SUBGENRE_BPM, SUBGENRE_TEMPO, bandOfBpm } from '../../eval/graph/knowledgeGraph.js';
import { retrieveGraph, rankWithGraph, graphContextText, subgenreContextText } from '../../eval/graph/graphRag.js';
import { soundLibrary } from '../../src/library/soundLibrary.js';
import { EVAL_VOCAB } from '../../eval/vocabulary.js';

const type = id => id.split(':')[0];
const intent = (genre = 'techno') => ({ genre, moods: ['dark'], textures: [], layers: [] });

describe('knowledge graph', () => {
  const g = buildKnowledgeGraph();
  const total = Object.values(soundLibrary).flat().length;

  it('one subgenre node per vocab subgenre, 4 tempo bands, every pattern', () => {
    expect(SUBGENRES).toEqual(EVAL_VOCAB.subgenre);
    expect(g.nodes.filter(n => n.type === 'subgenre').map(n => n.label)).toEqual(EVAL_VOCAB.subgenre);
    expect(TEMPO_BANDS.map(b => b.id)).toEqual(['115-124', '125-129', '130-134', '135-150']);
    expect(g.nodes.filter(n => n.type === 'tempo')).toHaveLength(4);
    expect(g.nodes.filter(n => n.type === 'pattern')).toHaveLength(total);
  });

  it('subgenre tempo table (spec §2.3) and its band', () => {
    expect(SUBGENRE_BPM).toEqual({ acid: 132, detroit: 130, dub: 120, hypnotic: 128, industrial: 138, minimal: 125, 'peak-time': 134 });
    expect(SUBGENRE_TEMPO.dub).toEqual(['115-124']);
    expect(SUBGENRE_TEMPO.industrial).toEqual(['135-150']);
    expect(bandOfBpm(127).id).toBe('125-129');
    expect(bandOfBpm(90)).toBeNull();
  });

  it('only spec edge types exist', () => {
    const allowed = new Set(['subgenre|tempo', 'pattern|tempo', 'method|pattern']);
    for (const [a, b] of g.edges) expect(allowed.has([type(a), type(b)].sort().join('|'))).toBe(true);
  });

  it('every pattern and every subgenre has ≥1 tempo edge', () => {
    for (const n of g.nodes.filter(n => n.type === 'pattern' || n.type === 'subgenre'))
      expect(neighbours(g, n.id).some(id => type(id) === 'tempo')).toBe(true);
  });

  it('pattern–method edges come from code and initialTransforms', () => {
    expect(neighbours(g, 'pattern:kick_berghain_rumble')).toEqual(expect.arrayContaining(['method:lpf', 'method:room', 'method:shape']));
  });

  it('every subgenre has an alias equal to its own label', () => {
    for (const s of SUBGENRE_NODES) expect(s.aliases).toContain(s.label);
  });
});

describe('graphRag', () => {
  it('resolves scene aliases without a direct tag hit', () => {
    expect(retrieveGraph('a Motor City style groove', intent()).seedSubgenres).toEqual(['detroit']);
    expect(retrieveGraph('klingt nach Berghain um 6 Uhr', intent()).seedSubgenres).toEqual(['hypnotic']);
    expect(retrieveGraph('something in the vein of Basic Channel', intent()).seedSubgenres).toEqual(['dub']);
  });

  it('falls back to the intent genre only where it is a subgenre', () => {
    expect(retrieveGraph('make something', intent('minimal')).seedSubgenres).toEqual(['minimal']);
    expect(retrieveGraph('make something', intent('techno')).seedSubgenres).toEqual([]);
  });

  it('explicit bpm selects exactly its band', () => {
    const r = retrieveGraph('warehouse stomper at 140 bpm', intent());
    expect(r.bpm).toBe(140);
    expect(r.bands).toEqual(['tempo:135-150']);
  });

  it('subgenre seeds expand to their tempo band', () => {
    expect(retrieveGraph('dub techno', intent()).bands).toEqual(['tempo:115-124']);
  });

  it('rankWithGraph returns k patterns of the pillar', () => {
    const r = retrieveGraph('a Motor City style groove', intent());
    const ranked = rankWithGraph('percussion', r, intent(), 8);
    expect(ranked).toHaveLength(8);
    expect(ranked.every(p => soundLibrary.percussion.includes(p))).toBe(true);
    expect(ranked.map(p => p.id)).toContain('perc_motor_city_groove');
  });

  it('pattern context text names subgenre, band, patterns and functions', () => {
    const r = retrieveGraph('detroit', intent());
    const ranked = rankWithGraph('drums', r, intent(), 8);
    const text = graphContextText(r, 'drums', ranked);
    expect(text).toContain('detroit');
    expect(text).toMatch(/130–134 BPM/);
    expect(text).toContain(ranked[0].id);
    expect(text).toMatch(/functions: .*\w/);
  });

  it('subgenre context text for S6: tempo per seed, list of subgenres when none', () => {
    expect(subgenreContextText(retrieveGraph('acid please', intent()))).toMatch(/acid → 132 BPM/);
    const none = subgenreContextText(retrieveGraph('make it slap', intent()));
    expect(none).toContain('no subgenre recognised');
    for (const s of SUBGENRES) expect(none).toContain(s);
    expect(subgenreContextText(retrieveGraph('acid please', intent()))).toMatch(/typical Strudel functions: \w/);
  });
});
