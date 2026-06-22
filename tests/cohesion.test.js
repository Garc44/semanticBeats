import { describe, it, expect } from 'vitest';
import { rankSoundsByCohesion } from '../src/library/cohesion.js';
import { soundLibrary } from '../src/library/soundLibrary.js';

const ids = (ranked) => ranked.map(r => r.pattern.id);

describe('rankSoundsByCohesion', () => {
  it('no other active tracks -> all fits false, original order', () => {
    const ranked = rankSoundsByCohesion('drums', {});
    expect(ranked).toHaveLength(soundLibrary.drums.length);
    expect(ranked.every(r => r.fits === false)).toBe(true);
    expect(ids(ranked)).toEqual(soundLibrary.drums.map(p => p.id));
  });

  it('overlapping tags -> fitting sounds marked and sorted first', () => {
    // bass_acid_squelch tags include "techno"; some drum patterns share "techno".
    const ranked = rankSoundsByCohesion('drums', { bass: 'bass_acid_squelch' });
    const fitting = ranked.filter(r => r.fits);
    expect(fitting.length).toBeGreaterThan(0);
    // basic_kick has the "techno" tag -> must be marked
    expect(fitting.some(r => r.pattern.id === 'basic_kick')).toBe(true);
    // all fitting come before all non-fitting
    const firstNonFit = ranked.findIndex(r => !r.fits);
    const lastFit = ranked.map(r => r.fits).lastIndexOf(true);
    expect(lastFit).toBeLessThan(firstNonFit);
  });

  it('ignores unknown / null ids', () => {
    const ranked = rankSoundsByCohesion('drums', { bass: 'no_such_id', melody: null });
    expect(ranked.every(r => r.fits === false)).toBe(true);
  });

  it('does not count same-pillar selection as "other"', () => {
    const ranked = rankSoundsByCohesion('drums', { drums: 'basic_kick' });
    expect(ranked.every(r => r.fits === false)).toBe(true);
  });

  it('unknown pillar -> empty array', () => {
    expect(rankSoundsByCohesion('nope', { drums: 'basic_kick' })).toEqual([]);
  });
});
