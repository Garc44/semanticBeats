import { describe, it, expect } from 'vitest';
import {
  TRANSFORMS,
  PILLAR_TRANSFORMS,
  getTransformsForPillar,
  mergeLlmTransformPatch,
  parseDirectCommand,
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

  // B: model pads patches with `0`; treat as removal so it never emits .x(0) or clobbers.
  it('drops zero-padded keys instead of writing them (no .distort(0) junk)', () => {
    const pillar = { name: 'drums', transforms: {} };
    mergeLlmTransformPatch(pillar, { crush: 16, distort: 0, reverb: 0 });
    expect(pillar.transforms.crush).toBe(16);
    expect(pillar.transforms.distort).toBeUndefined();
    expect(pillar.transforms.reverb).toBeUndefined();
  });

  it('zero value removes an already-active effect (turn it off)', () => {
    const pillar = { name: 'drums', transforms: { reverb: 0.8 } };
    mergeLlmTransformPatch(pillar, { reverb: 0 });
    expect(pillar.transforms.reverb).toBeUndefined();
  });

  it('keeps dj_filter at 0 — its zero is meaningful (full mud)', () => {
    const pillar = { name: 'percussion', transforms: {} };
    mergeLlmTransformPatch(pillar, { dj_filter: 0 });
    expect(pillar.transforms.dj_filter).toBe(0);
  });

  it('explicit crush:16 survives the merge (not mistaken for padding)', () => {
    const pillar = { name: 'drums', transforms: {} };
    mergeLlmTransformPatch(pillar, { crush: 16 });
    expect(pillar.transforms.crush).toBe(16);
  });
});

describe('parseDirectCommand (A: deterministic explicit commands)', () => {
  it('parses "set the crush to 16"', () => {
    expect(parseDirectCommand('drums', 'set the crush to 16')).toEqual({ crush: 16 });
  });

  it('parses bare "crush 16"', () => {
    expect(parseDirectCommand('drums', 'crush 16')).toEqual({ crush: 16 });
  });

  it('parses decimals "reverb to 0.8"', () => {
    expect(parseDirectCommand('drums', 'reverb to 0.8')).toEqual({ reverb: 0.8 });
  });

  it('resolves layman aliases ("space" -> reverb)', () => {
    expect(parseDirectCommand('drums', 'set space to 0.5')).toEqual({ reverb: 0.5 });
  });

  it('clamps to the transform range', () => {
    expect(parseDirectCommand('drums', 'crush 999')).toEqual({ crush: 16 });
    expect(parseDirectCommand('drums', 'set crush to 0')).toEqual({ crush: 1 });
  });

  it('parses removal "remove reverb" -> null', () => {
    expect(parseDirectCommand('drums', 'remove the reverb')).toEqual({ reverb: null });
  });

  it('parses "turn off echo" on a pillar that allows it', () => {
    expect(parseDirectCommand('bass', 'turn off echo')).toEqual({ echo: null });
  });

  it('returns null for effect not allowed on the pillar', () => {
    expect(parseDirectCommand('drums', 'set vowel to 2')).toBeNull();
  });

  it('returns null for vibe prompts with no explicit command (defer to LLM)', () => {
    expect(parseDirectCommand('melody', 'make it sound spooky and far away')).toBeNull();
  });

  it('does not false-trigger on numbers without an effect name', () => {
    expect(parseDirectCommand('drums', 'give me 4 on the floor')).toBeNull();
  });
});
