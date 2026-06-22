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
  it('has exactly 5 pillars in correct order', () => {
    expect(PILLAR_NAMES).toEqual(['drums', 'bass', 'percussion', 'melody', 'transitions']);
  });
});

describe('makePillars', () => {
  it('returns 5 pillar objects', () => {
    const p = makePillars();
    expect(p).toHaveLength(5);
  });

  it('each pillar has name, code, muted, history, selectedId, lastMods, knobs', () => {
    const p = makePillars();
    for (const pillar of p) {
      expect(pillar).toHaveProperty('name');
      expect(pillar).toHaveProperty('code', '');
      expect(pillar).toHaveProperty('muted', false);
      expect(pillar).toHaveProperty('history');
      expect(Array.isArray(pillar.history)).toBe(true);
      expect(pillar).toHaveProperty('selectedId', null);
      expect(pillar).toHaveProperty('lastMods');
      expect(pillar).toHaveProperty('knobs');
      expect(typeof pillar.knobs).toBe('object');
    }
  });

  it('drums pillar has correct knob defaults', () => {
    const drums = makePillars().find(p => p.name === 'drums');
    expect(drums.knobs.gain).toBe(0.8);
    expect(drums.knobs.drive).toBe(0.0);
    expect(drums.knobs.decay).toBe(0.12);
  });

  it('bass pillar has correct knob defaults', () => {
    const bass = makePillars().find(p => p.name === 'bass');
    expect(bass.knobs.gain).toBe(0.7);
    expect(bass.knobs.cutoff).toBe(1.0);
    expect(bass.knobs.stutter).toBe(0.0);
  });

  it('percussion pillar has correct knob defaults', () => {
    const perc = makePillars().find(p => p.name === 'percussion');
    expect(perc.knobs.gain).toBe(0.6);
    expect(perc.knobs.decay).toBe(0.12);
  });

  it('melody pillar has correct knob defaults', () => {
    const m = makePillars().find(p => p.name === 'melody');
    expect(m.knobs.gain).toBe(0.5);
    expect(m.knobs.cutoff).toBe(0.6);
    expect(m.knobs.resonance).toBe(0.1);
    expect(m.knobs.space).toBe(0.2);
  });

  it('transitions pillar has correct knob defaults', () => {
    const t = makePillars().find(p => p.name === 'transitions');
    expect(t.knobs.gain).toBe(0.4);
    expect(t.knobs.hpf).toBe(0.0);
    expect(t.knobs.size).toBe(0.5);
  });

  it('knobs objects are independent (not shared references)', () => {
    const pillars = makePillars();
    pillars[0].knobs.gain = 0.1;
    const fresh = makePillars();
    expect(fresh[0].knobs.gain).toBe(0.8);
  });

  it('each pillar has an empty transforms object', () => {
    const pillars = makePillars();
    for (const p of pillars) {
      expect(p).toHaveProperty('transforms');
      expect(typeof p.transforms).toBe('object');
      expect(p.transforms).not.toBeNull();
      expect(Object.keys(p.transforms).length).toBe(0);
    }
  });
});

describe('rebuildStack', () => {
  it('returns null when all pillars are empty', () => {
    expect(rebuildStack(makePillars(), makeGlobal())).toBeNull();
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

  it('muted pillar is excluded from stack', () => {
    const pillars = makePillars();
    pillars[0].code = 's("bd")';
    pillars[0].muted = true;
    pillars[1].code = 's("hh*8")';
    const result = rebuildStack(pillars, makeGlobal());
    expect(result).not.toContain('s("bd")');
    expect(result).toContain('s("hh*8")');
  });

  it('soloedPillar includes only that pillar', () => {
    const pillars = makePillars();
    pillars[0].code = 's("bd")';
    pillars[1].code = 's("hh*8")';
    const result = rebuildStack(pillars, makeGlobal({ soloedPillar: 'drums' }));
    expect(result).not.toContain('stack(');
    expect(result).toContain('s("bd")');
    expect(result).not.toContain('hh*8');
  });

  it('soloed pillar with empty code returns null', () => {
    const pillars = makePillars();
    pillars[1].code = 's("hh*8")';
    const result = rebuildStack(pillars, makeGlobal({ soloedPillar: 'drums' }));
    expect(result).toBeNull();
  });

  it('appends global effects chain', () => {
    const pillars = makePillars();
    pillars[0].code = 's("bd")';
    const result = rebuildStack(pillars, makeGlobal({ tempo: 120, beatsPerCycle: 4, masterVolume: 0.6, masterFilter: 0.5, intensity: 0.3 }));
    expect(result).toContain('.cps(0.5)');
    expect(result).toContain('.postgain(0.6)');
    expect(result).toContain('.lpf(');
    expect(result).toContain('.shape(0.3)');
  });

  it('master volume is postgain so per-pillar gain is not overridden', () => {
    const pillars = makePillars();
    pillars[0].code = 's("bd").gain(0.4)';
    pillars[1].code = 's("hh*8").gain(0.7)';
    const result = rebuildStack(pillars, makeGlobal({ masterVolume: 0.8 }));
    // per-pillar gains must survive (Strudel .gain() overrides, so master can't use .gain())
    expect(result).toContain('.gain(0.4)');
    expect(result).toContain('.gain(0.7)');
    expect(result).toContain('.postgain(0.8)');
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
