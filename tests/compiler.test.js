import { describe, it, expect } from 'vitest';
import { compileTrack } from '../src/compiler.js';

function makePillar(name, knobOverrides = {}, muted = false) {
  const defaults = {
    drums:           { gain: 0.8, drive: 0.0, decay: 0.12 },
    bass_percussion: { gain: 0.7, cutoff: 1.0, stutter: 0.0 },
    melody:          { gain: 0.5, cutoff: 0.6, resonance: 0.1, space: 0.2 },
    transitions:     { gain: 0.4, hpf: 0.0, size: 0.5 },
  };
  return { name, muted, knobs: { ...defaults[name], ...knobOverrides }, selectedId: null, lastMods: {} };
}

describe('compileTrack — drums', () => {
  it('wraps base pattern code in parens', () => {
    const pillar = makePillar('drums');
    const result = compileTrack({ selectedId: 'kick_sine_44', modifications: {} }, 'drums', pillar);
    expect(result).toMatch(/^\(s\("bd:0\*4"\)/);
  });

  it('appends gain, distort, decay from knobs', () => {
    const pillar = makePillar('drums', { gain: 0.8, drive: 0.5, decay: 0.2 });
    const result = compileTrack({ selectedId: 'kick_sine_44', modifications: {} }, 'drums', pillar);
    expect(result).toContain('.gain(0.8)');
    expect(result).toContain('.distort(0.2)');
    expect(result).toContain('.decay(0.2)');
  });

  it('muted track compiles to gain(0)', () => {
    const pillar = makePillar('drums', { gain: 0.8 }, true);
    const result = compileTrack({ selectedId: 'kick_sine_44', modifications: {} }, 'drums', pillar);
    expect(result).toContain('.gain(0)');
    expect(result).not.toContain('.gain(0.8)');
  });

  it('applies slowdown via .slow()', () => {
    const pillar = makePillar('drums');
    const result = compileTrack({ selectedId: 'kick_sine_44', modifications: { slowdown: 2 } }, 'drums', pillar);
    expect(result).toContain('.slow(2)');
  });

  it('applies speed via .fast() not .speed()', () => {
    const pillar = makePillar('drums');
    const result = compileTrack({ selectedId: 'kick_sine_44', modifications: { speed: 2.0 } }, 'drums', pillar);
    expect(result).toContain('.fast(2)');
    expect(result).not.toContain('.speed(');
  });

  it('does not append .slow(1) when slowdown is 1', () => {
    const pillar = makePillar('drums');
    const result = compileTrack({ selectedId: 'kick_sine_44', modifications: { slowdown: 1 } }, 'drums', pillar);
    expect(result).not.toContain('.slow(');
  });

  it('does not append .fast(1) when speed is 1.0', () => {
    const pillar = makePillar('drums');
    const result = compileTrack({ selectedId: 'kick_sine_44', modifications: { speed: 1.0 } }, 'drums', pillar);
    expect(result).not.toContain('.fast(');
  });
});

describe('compileTrack — bass_percussion', () => {
  it('appends gain, lpf, degradeBy from knobs', () => {
    const pillar = makePillar('bass_percussion', { gain: 0.7, cutoff: 0.5, stutter: 0.5 });
    const result = compileTrack({ selectedId: 'rumble_hypnotic', modifications: {} }, 'bass_percussion', pillar);
    expect(result).toContain('.gain(0.7)');
    expect(result).toContain('.lpf(600)');
    expect(result).toContain('.degradeBy(0.2)');
  });

  it('clamps lpf to minimum 80Hz when cutoff is 0', () => {
    const pillar = makePillar('bass_percussion', { cutoff: 0.0 });
    const result = compileTrack({ selectedId: 'rumble_hypnotic', modifications: {} }, 'bass_percussion', pillar);
    expect(result).toContain('.lpf(80)');
  });
});

describe('compileTrack — melody', () => {
  it('appends gain, lpf, lpq, room, delay from knobs', () => {
    const pillar = makePillar('melody', { gain: 0.5, cutoff: 0.5, resonance: 0.4, space: 0.4 });
    const result = compileTrack({ selectedId: 'synthfx_hypnotic', modifications: {} }, 'melody', pillar);
    expect(result).toContain('.gain(0.5)');
    expect(result).toContain('.lpf(2000)');
    expect(result).toContain('.lpq(6)');
    expect(result).toContain('.room(0.34)');
    expect(result).toContain('.delay(0.2)');
  });

  it('clamps lpf to minimum 150Hz when cutoff is 0', () => {
    const pillar = makePillar('melody', { cutoff: 0.0 });
    const result = compileTrack({ selectedId: 'synthfx_hypnotic', modifications: {} }, 'melody', pillar);
    expect(result).toContain('.lpf(150)');
  });
});

describe('compileTrack — transitions', () => {
  it('appends gain, hpf, room, size from knobs', () => {
    const pillar = makePillar('transitions', { gain: 0.4, hpf: 0.5, size: 0.7 });
    const result = compileTrack({ selectedId: 'synthfx_dub', modifications: {} }, 'transitions', pillar);
    expect(result).toContain('.gain(0.4)');
    expect(result).toContain('.hpf(1250)');
    expect(result).toContain('.room(0.7)');
    expect(result).toContain('.size(0.7)');
  });
});

describe('compileTrack — edge cases', () => {
  it('returns empty string when pillar catalog is empty/unknown', () => {
    const pillar = makePillar('drums');
    const result = compileTrack({ selectedId: 'kick_sine_44', modifications: {} }, 'nonexistent_pillar', pillar);
    expect(result).toBe('');
  });

  it('falls back to first catalog entry when selectedId not found', () => {
    const pillar = makePillar('drums');
    const result = compileTrack({ selectedId: 'nonexistent_id', modifications: {} }, 'drums', pillar);
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles missing modifications gracefully', () => {
    const pillar = makePillar('drums');
    const result = compileTrack({ selectedId: 'kick_sine_44' }, 'drums', pillar);
    expect(result.length).toBeGreaterThan(0);
  });
});
