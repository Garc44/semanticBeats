import { describe, it, expect } from 'vitest';
import { rankPatternsByIntent } from '../src/promptEngine.js';

const intent = (over = {}) => ({
  genre: 'techno', bpm: 130, key: 'A', scale: 'minor', energy: 'mid',
  moods: ['dark', 'minimal'], textures: ['hypnotic'], layers: [], ...over,
});

describe('rankPatternsByIntent', () => {
  it('returns full catalog, sorted by score descending', () => {
    const ranked = rankPatternsByIntent('drums', intent());
    expect(ranked.length).toBeGreaterThan(5);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
    }
  });

  it('genre tag match outranks single mood match', () => {
    const ranked = rankPatternsByIntent('drums', intent({ moods: [], textures: [] }));
    // every drums pattern tagged "techno" must outrank untagged ones
    const top = ranked[0].pattern;
    expect(top.tags.map(t => t.toLowerCase())).toContain('techno');
  });

  it('mood tags contribute to score', () => {
    const dark = rankPatternsByIntent('bass', intent({ genre: 'ambient', moods: ['dark'], textures: [] }));
    const scored = dark.find(r => r.pattern.tags.includes('dark'));
    expect(scored.score).toBeGreaterThan(0);
  });

  it('maps bass_percussion alias to bass catalog', () => {
    const ranked = rankPatternsByIntent('bass_percussion', intent());
    expect(ranked[0].pattern.id.startsWith('bass')).toBe(true);
  });

  it('unknown pillar returns empty array', () => {
    expect(rankPatternsByIntent('nope', intent())).toEqual([]);
  });
});
