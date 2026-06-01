import { describe, it, expect } from 'vitest';
import { rebuildStack, makePillars, PILLAR_NAMES, assembleCode } from '../src/pillars.js';
import { soundLibrary } from '../src/library/soundLibrary.js';

const makeGlobal = (overrides = {}) => ({
  tempo: 1.0,
  masterVolume: 0.8,
  masterFilter: 1.0,
  intensity: 0.5,
  soloedPillar: null,
  ...overrides,
});

describe('PILLAR_NAMES', () => {
  it('has exactly 4 pillars in correct order', () => {
    expect(PILLAR_NAMES).toEqual(['kick', 'rumble_bass', 'groove', 'synth_fx']);
  });
});

describe('makePillars', () => {
  it('returns 4 pillar objects', () => {
    const p = makePillars();
    expect(p).toHaveLength(4);
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
    const result = rebuildStack(pillars, makeGlobal({ soloedPillar: 'kick' }));
    expect(result).not.toContain('stack(');
    expect(result).toContain('s("bd")');
    expect(result).not.toContain('hh*8');
  });

  it('soloed pillar with empty code returns null', () => {
    const pillars = makePillars();
    pillars[1].code = 's("hh*8")';
    const result = rebuildStack(pillars, makeGlobal({ soloedPillar: 'kick' }));
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

describe('assembleCode', () => {
  const basePlan = { selectedId: 'kick_sine_44', modifications: {} };

  it('returns base pattern code for default modifications', () => {
    const result = assembleCode(basePlan, 'kick');
    expect(result).toBe(soundLibrary.kick.find(p => p.id === 'kick_sine_44').code);
  });

  it('appends .gain() when gain != 1.0', () => {
    const plan = { selectedId: 'kick_sine_44', modifications: { gain: 0.5 } };
    expect(assembleCode(plan, 'kick')).toContain('.gain(0.5)');
  });

  it('does not append .gain() when gain is 1.0', () => {
    const plan = { selectedId: 'kick_sine_44', modifications: { gain: 1.0 } };
    const base = soundLibrary.kick.find(p => p.id === 'kick_sine_44').code;
    expect(assembleCode(plan, 'kick')).toBe(base);
  });

  it('appends .speed() when speed != 1.0', () => {
    const plan = { selectedId: 'kick_sine_44', modifications: { speed: 1.5 } };
    expect(assembleCode(plan, 'kick')).toContain('.speed(1.5)');
  });

  it('appends .slow() when slowdown > 1', () => {
    const plan = { selectedId: 'kick_sine_44', modifications: { slowdown: 2 } };
    expect(assembleCode(plan, 'kick')).toContain('.slow(2)');
  });

  it('does not append .slow() when slowdown is 1', () => {
    const plan = { selectedId: 'kick_sine_44', modifications: { slowdown: 1 } };
    const base = soundLibrary.kick.find(p => p.id === 'kick_sine_44').code;
    expect(assembleCode(plan, 'kick')).toBe(base);
  });

  it('appends multiple modifiers in order: slow, speed, gain', () => {
    const plan = { selectedId: 'kick_sine_44', modifications: { gain: 0.8, speed: 1.2, slowdown: 2 } };
    const result = assembleCode(plan, 'kick');
    const slowIdx = result.indexOf('.slow(');
    const speedIdx = result.indexOf('.speed(');
    const gainIdx = result.indexOf('.gain(0.8)');
    expect(slowIdx).toBeLessThan(speedIdx);
    expect(speedIdx).toBeLessThan(gainIdx);
  });

  it('falls back to first catalog entry when selectedId not found', () => {
    const plan = { selectedId: 'nonexistent_id', modifications: {} };
    const fallback = soundLibrary.kick[0].code;
    expect(assembleCode(plan, 'kick')).toBe(fallback);
  });

  it('returns empty string when pillar has no entries', () => {
    const plan = { selectedId: 'any', modifications: {} };
    expect(assembleCode(plan, 'unknown_pillar')).toBe('');
  });

  it('works for rumble_bass pillar', () => {
    const plan = { selectedId: 'rumble_acid', modifications: {} };
    const result = assembleCode(plan, 'rumble_bass');
    expect(result).toBe(soundLibrary.rumble_bass.find(p => p.id === 'rumble_acid').code);
  });
});
