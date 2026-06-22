import { describe, it, expect } from 'vitest';
import { EMOTION_RECIPES, getEmotionsForPillar } from '../src/library/emotionsLibrary.js';
import { TRANSFORMS, PILLAR_TRANSFORMS } from '../src/library/transformationsLibrary.js';

const PILLARS = ['drums', 'bass', 'percussion', 'melody', 'transitions'];

describe('EMOTION_RECIPES integrity', () => {
  it('only defines recipes for real pillars', () => {
    for (const name of Object.keys(EMOTION_RECIPES)) {
      expect(PILLARS).toContain(name);
    }
  });

  it('every recipe has id, label, transforms', () => {
    for (const recipes of Object.values(EMOTION_RECIPES)) {
      for (const r of recipes) {
        expect(typeof r.id).toBe('string');
        expect(typeof r.label).toBe('string');
        expect(r.transforms && typeof r.transforms).toBe('object');
        expect(Object.keys(r.transforms).length).toBeGreaterThan(0);
      }
    }
  });

  it('recipe ids are unique within a pillar', () => {
    for (const recipes of Object.values(EMOTION_RECIPES)) {
      const ids = recipes.map(r => r.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('every effect id exists in TRANSFORMS', () => {
    for (const recipes of Object.values(EMOTION_RECIPES)) {
      for (const r of recipes) {
        for (const fx of Object.keys(r.transforms)) {
          expect(TRANSFORMS[fx], `${r.id}: ${fx}`).toBeTruthy();
        }
      }
    }
  });

  it('every effect is allowed by the pillar', () => {
    for (const [pillar, recipes] of Object.entries(EMOTION_RECIPES)) {
      const allowed = PILLAR_TRANSFORMS[pillar] ?? [];
      for (const r of recipes) {
        for (const fx of Object.keys(r.transforms)) {
          expect(allowed, `${pillar}/${r.id}: ${fx}`).toContain(fx);
        }
      }
    }
  });

  it('every numeric value is within the effect min/max', () => {
    for (const recipes of Object.values(EMOTION_RECIPES)) {
      for (const r of recipes) {
        for (const [fx, val] of Object.entries(r.transforms)) {
          const t = TRANSFORMS[fx];
          if (t.type === 'numeric') {
            expect(val, `${r.id}: ${fx}`).toBeGreaterThanOrEqual(t.min);
            expect(val, `${r.id}: ${fx}`).toBeLessThanOrEqual(t.max);
          }
          if (t.type === 'boolean') expect(val).toBe(true);
        }
      }
    }
  });
});

describe('getEmotionsForPillar', () => {
  it('returns an array of recipes for a known pillar', () => {
    const list = getEmotionsForPillar('drums');
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });

  it('returns [] for an unknown pillar', () => {
    expect(getEmotionsForPillar('nope')).toEqual([]);
  });
});
