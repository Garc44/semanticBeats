import { describe, it, expect } from 'vitest';
import {
  TRANSFORMS,
  PILLAR_TRANSFORMS,
  getTransformsForPillar,
  mergeLlmTransformPatch,
} from '../src/library/transformationsLibrary.js';

describe('TRANSFORMS registry', () => {
  it('every entry has required fields', () => {
    for (const [id, t] of Object.entries(TRANSFORMS)) {
      expect(typeof t.method, id).toBe('string');
      expect(['numeric', 'boolean', 'enum'], id).toContain(t.type);
      expect(typeof t.description, id).toBe('string');
      if (t.type === 'numeric') {
        expect(typeof t.min, id).toBe('number');
        expect(typeof t.max, id).toBe('number');
        expect(t.min, id).toBeLessThan(t.max);
      }
      if (t.type === 'boolean') {
        expect(typeof t.compiled, id).toBe('string');
      }
      if (t.type === 'enum') {
        expect(Array.isArray(t.values), id).toBe(true);
        expect(t.values.length, id).toBeGreaterThan(0);
      }
    }
  });
});

describe('PILLAR_TRANSFORMS manifest', () => {
  const PILLAR_NAMES = ['drums', 'bass', 'percussion', 'bass_percussion', 'melody', 'transitions'];

  it('has an entry for each pillar', () => {
    for (const name of PILLAR_NAMES) {
      expect(PILLAR_TRANSFORMS[name], name).toBeDefined();
      expect(Array.isArray(PILLAR_TRANSFORMS[name]), name).toBe(true);
    }
  });

  it('every referenced id exists in TRANSFORMS', () => {
    for (const [pillar, ids] of Object.entries(PILLAR_TRANSFORMS)) {
      for (const id of ids) {
        expect(TRANSFORMS[id], `${pillar}:${id}`).toBeDefined();
      }
    }
  });
});

describe('getTransformsForPillar', () => {
  it('returns only transforms in PILLAR_TRANSFORMS for that pillar', () => {
    const drumIds = PILLAR_TRANSFORMS['drums'];
    const result = getTransformsForPillar('drums');
    expect(result.map(t => t.id)).toEqual(drumIds);
  });

  it('each result entry includes id + all TRANSFORMS fields', () => {
    const result = getTransformsForPillar('melody');
    for (const t of result) {
      expect(typeof t.id).toBe('string');
      expect(typeof t.method).toBe('string');
      expect(typeof t.type).toBe('string');
    }
  });

  it('returns empty array for unknown pillar', () => {
    expect(getTransformsForPillar('unknown')).toEqual([]);
  });
});

describe('mergeLlmTransformPatch', () => {
  it('adds valid numeric transform to pillar.transforms', () => {
    const pillar = { name: 'drums', transforms: {} };
    mergeLlmTransformPatch(pillar, { crush: 4 });
    expect(pillar.transforms.crush).toBe(4);
  });

  it('adds valid boolean transform', () => {
    const pillar = { name: 'drums', transforms: {} };
    mergeLlmTransformPatch(pillar, { reverse: true });
    expect(pillar.transforms.reverse).toBe(true);
  });

  it('silently ignores transform not in PILLAR_TRANSFORMS for pillar', () => {
    const pillar = { name: 'drums', transforms: {} };
    mergeLlmTransformPatch(pillar, { vowel: 'o' }); // vowel not in drums
    expect(pillar.transforms.vowel).toBeUndefined();
  });

  it('deletes transform when value is null', () => {
    const pillar = { name: 'drums', transforms: { crush: 4 } };
    mergeLlmTransformPatch(pillar, { crush: null });
    expect(pillar.transforms.crush).toBeUndefined();
  });

  it('deletes transform when value is false (boolean false slip guard)', () => {
    const pillar = { name: 'drums', transforms: { reverse: true } };
    mergeLlmTransformPatch(pillar, { reverse: false });
    expect(pillar.transforms.reverse).toBeUndefined();
  });

  it('preserves existing transforms not present in patch', () => {
    const pillar = { name: 'drums', transforms: { reverb: 0.5, crush: 4 } };
    mergeLlmTransformPatch(pillar, { reverb: 0.8 });
    expect(pillar.transforms.crush).toBe(4);
    expect(pillar.transforms.reverb).toBe(0.8);
  });
});
