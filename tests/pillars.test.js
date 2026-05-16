import { describe, it, expect } from 'vitest';
import { rebuildStack, makePillars, PILLAR_NAMES } from '../src/pillars.js';

const makeGlobal = (overrides = {}) => ({
  tempo: 1.0,
  masterVolume: 0.8,
  masterFilter: 1.0,
  intensity: 0.5,
  soloedPillar: null,
  ...overrides,
});

describe('PILLAR_NAMES', () => {
  it('has exactly 6 pillars in correct order', () => {
    expect(PILLAR_NAMES).toEqual(['foundation', 'bassline', 'percussion', 'melody', 'atmosphere', 'fx']);
  });
});

describe('makePillars', () => {
  it('returns 6 pillar objects', () => {
    const p = makePillars();
    expect(p).toHaveLength(6);
  });

  it('each pillar has name, code, muted, history', () => {
    const p = makePillars();
    for (const pillar of p) {
      expect(pillar).toHaveProperty('name');
      expect(pillar).toHaveProperty('code', '');
      expect(pillar).toHaveProperty('muted', false);
      expect(pillar).toHaveProperty('history');
      expect(Array.isArray(pillar.history)).toBe(true);
    }
  });
});

describe('rebuildStack', () => {
  it('returns null when all pillars are empty', () => {
    expect(rebuildStack(makePillars(), makeGlobal())).toBeNull();
  });

  it('returns null when all non-empty pillars are muted', () => {
    const pillars = makePillars();
    pillars[0].code = 's("bd")';
    pillars[0].muted = true;
    expect(rebuildStack(pillars, makeGlobal())).toBeNull();
  });

  it('single active pillar returns code without stack() wrapper', () => {
    const pillars = makePillars();
    pillars[0].code = 's("bd ~ sn ~")';
    const result = rebuildStack(pillars, makeGlobal());
    expect(result).not.toContain('stack(');
    expect(result).toContain('s("bd ~ sn ~")');
  });

  it('multiple active pillars wrapped in stack()', () => {
    const pillars = makePillars();
    pillars[0].code = 's("bd")';
    pillars[1].code = 's("hh*8")';
    const result = rebuildStack(pillars, makeGlobal());
    expect(result).toMatch(/^stack\(/);
    expect(result).toContain('s("bd")');
    expect(result).toContain('s("hh*8")');
  });

  it('muted pillar excluded from stack', () => {
    const pillars = makePillars();
    pillars[0].code = 's("bd")';
    pillars[1].code = 's("hh*8")';
    pillars[1].muted = true;
    const result = rebuildStack(pillars, makeGlobal());
    expect(result).not.toContain('stack(');
    expect(result).not.toContain('hh*8');
  });

  it('soloedPillar includes only that pillar', () => {
    const pillars = makePillars();
    pillars[0].code = 's("bd")';
    pillars[1].code = 's("hh*8")';
    const result = rebuildStack(pillars, makeGlobal({ soloedPillar: 'foundation' }));
    expect(result).not.toContain('stack(');
    expect(result).toContain('s("bd")');
    expect(result).not.toContain('hh*8');
  });

  it('soloed pillar with empty code returns null', () => {
    const pillars = makePillars();
    pillars[1].code = 's("hh*8")';
    const result = rebuildStack(pillars, makeGlobal({ soloedPillar: 'foundation' }));
    expect(result).toBeNull();
  });

  it('appends global effects chain', () => {
    const pillars = makePillars();
    pillars[0].code = 's("bd")';
    const result = rebuildStack(pillars, makeGlobal({ tempo: 1.5, masterVolume: 0.6, masterFilter: 0.5, intensity: 0.3 }));
    expect(result).toContain('.cps(1.5)');
    expect(result).toContain('.gain(0.6)');
    expect(result).toContain('.lpf(');
    expect(result).toContain('.shape(0.3)');
  });

  it('masterFilter 1.0 maps to ~18200 Hz lpf', () => {
    const pillars = makePillars();
    pillars[0].code = 's("bd")';
    const result = rebuildStack(pillars, makeGlobal({ masterFilter: 1.0 }));
    expect(result).toContain('.lpf(18200)');
  });

  it('masterFilter 0 maps to 200 Hz lpf', () => {
    const pillars = makePillars();
    pillars[0].code = 's("bd")';
    const result = rebuildStack(pillars, makeGlobal({ masterFilter: 0 }));
    expect(result).toContain('.lpf(200)');
  });
});
