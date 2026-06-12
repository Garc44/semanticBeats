import { describe, it, expect } from 'vitest';
import { compileTrack } from '../src/compiler.js';

function makePillar(name, knobOverrides = {}, muted = false, transforms = {}) {
  const defaults = {
    drums:           { gain: 0.8, drive: 0.0, decay: 0.12 },
    bass_percussion: { gain: 0.7, cutoff: 1.0, stutter: 0.0 },
    melody:          { gain: 0.5, cutoff: 0.6, resonance: 0.1, space: 0.2 },
    transitions:     { gain: 0.4, hpf: 0.0, size: 0.5 },
  };
  return { name, muted, knobs: { ...defaults[name], ...knobOverrides }, selectedId: null, lastMods: {}, transforms };
}

describe('compileTrack — drums', () => {
  it('wraps base pattern code in parens', () => {
    const pillar = makePillar('drums');
    const result = compileTrack({ selectedId: 'kick_berghain_rumble', modifications: {} }, 'drums', pillar);
    expect(result).toMatch(/^\(/);
  });

  it('appends gain, distort, decay from knobs', () => {
    const pillar = makePillar('drums', { gain: 0.8, drive: 0.5, decay: 0.2 });
    const result = compileTrack({ selectedId: 'kick_berghain_rumble', modifications: {} }, 'drums', pillar);
    expect(result).toContain('.gain(0.8)');
    expect(result).toContain('.distort(0.2)');
    expect(result).toContain('.decay(0.2)');
  });

  it('muted track compiles to gain(0)', () => {
    const pillar = makePillar('drums', { gain: 0.8 }, true);
    const result = compileTrack({ selectedId: 'kick_berghain_rumble', modifications: {} }, 'drums', pillar);
    expect(result).toContain('.gain(0)');
    expect(result).not.toContain('.gain(0.8)');
  });

  it('applies slowdown via .slow()', () => {
    const pillar = makePillar('drums');
    const result = compileTrack({ selectedId: 'kick_berghain_rumble', modifications: { slowdown: 2 } }, 'drums', pillar);
    expect(result).toContain('.slow(2)');
  });

  it('applies speed via .fast() not .speed()', () => {
    const pillar = makePillar('drums');
    const result = compileTrack({ selectedId: 'kick_berghain_rumble', modifications: { speed: 2.0 } }, 'drums', pillar);
    expect(result).toContain('.fast(2)');
    expect(result).not.toContain('.speed(');
  });

  it('does not append .slow(1) when slowdown is 1', () => {
    const pillar = makePillar('drums');
    const result = compileTrack({ selectedId: 'kick_berghain_rumble', modifications: { slowdown: 1 } }, 'drums', pillar);
    expect(result).not.toContain('.slow(');
  });

  it('does not append .fast(1) when speed is 1.0', () => {
    const pillar = makePillar('drums');
    const result = compileTrack({ selectedId: 'kick_berghain_rumble', modifications: { speed: 1.0 } }, 'drums', pillar);
    expect(result).not.toContain('.fast(');
  });
});

describe('compileTrack — bass_percussion', () => {
  it('appends gain, lpf, degradeBy from knobs', () => {
    const pillar = makePillar('bass_percussion', { gain: 0.7, cutoff: 0.5, stutter: 0.5 });
    const result = compileTrack({ selectedId: 'bass_acid_squelch', modifications: {} }, 'bass_percussion', pillar);
    expect(result).toContain('.gain(0.7)');
    expect(result).toContain('.lpf(600)');
    expect(result).toContain('.degradeBy(0.2)');
  });

  it('clamps lpf to minimum 80Hz when cutoff is 0', () => {
    const pillar = makePillar('bass_percussion', { cutoff: 0.0 });
    const result = compileTrack({ selectedId: 'bass_acid_squelch', modifications: {} }, 'bass_percussion', pillar);
    expect(result).toContain('.lpf(80)');
  });

  it('muted bass_percussion compiles to gain(0)', () => {
    const pillar = makePillar('bass_percussion', { gain: 0.7 }, true);
    const result = compileTrack({ selectedId: 'bass_acid_squelch', modifications: {} }, 'bass_percussion', pillar);
    expect(result).toContain('.gain(0)');
    expect(result).not.toContain('.gain(0.7)');
  });
});

describe('compileTrack — melody', () => {
  it('appends gain, lpf, lpq, room, delay from knobs', () => {
    const pillar = makePillar('melody', { gain: 0.5, cutoff: 0.5, resonance: 0.4, space: 0.4 });
    const result = compileTrack({ selectedId: 'melody_ostgut_synth', modifications: {} }, 'melody', pillar);
    expect(result).toContain('.gain(0.5)');
    expect(result).toContain('.lpf(2000)');
    expect(result).toContain('.lpq(6)');
    expect(result).toContain('.room(0.34)');
    expect(result).toContain('.delay(0.2)');
  });

  it('clamps lpf to minimum 150Hz when cutoff is 0', () => {
    const pillar = makePillar('melody', { cutoff: 0.0 });
    const result = compileTrack({ selectedId: 'melody_ostgut_synth', modifications: {} }, 'melody', pillar);
    expect(result).toContain('.lpf(150)');
  });
});

describe('compileTrack — transitions', () => {
  it('appends gain, hpf, room, size from knobs', () => {
    const pillar = makePillar('transitions', { gain: 0.4, hpf: 0.5, size: 0.7 });
    const result = compileTrack({ selectedId: 'arp_strobe_bleep', modifications: {} }, 'transitions', pillar);
    expect(result).toContain('.gain(0.4)');
    expect(result).toContain('.hpf(1250)');
    expect(result).toContain('.room(0.7)');
    expect(result).toContain('.size(0.7)');
  });
});

describe('compileTrack — edge cases', () => {
  it('returns empty string when pillar catalog is empty/unknown', () => {
    const pillar = makePillar('drums');
    const result = compileTrack({ selectedId: 'kick_berghain_rumble', modifications: {} }, 'nonexistent_pillar', pillar);
    expect(result).toBe('');
  });

  it('falls back to first catalog entry when selectedId not found', () => {
    const pillar = makePillar('drums');
    const result = compileTrack({ selectedId: 'nonexistent_id', modifications: {} }, 'drums', pillar);
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles missing modifications gracefully', () => {
    const pillar = makePillar('drums');
    const result = compileTrack({ selectedId: 'kick_berghain_rumble' }, 'drums', pillar);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('compileTrack — transforms layer', () => {
  const drumPlan = { selectedId: 'kick_berghain_rumble', modifications: {} };
  const melodyPlan = { selectedId: 'melody_ostgut_synth', modifications: {} };

  it('numeric transform appended after knob layer', () => {
    const pillar = makePillar('drums', {}, false, { reverb: 0.7 });
    const code = compileTrack(drumPlan, 'drums', pillar);
    expect(code).toContain('.room(0.7)');
  });

  it('boolean transform appended using compiled form', () => {
    const pillar = makePillar('drums', {}, false, { reverse: true });
    const code = compileTrack(drumPlan, 'drums', pillar);
    expect(code).toContain('.rev()');
  });

  it('enum transform appended with quoted value', () => {
    const pillar = makePillar('melody', {}, false, { vowel: 'o' });
    const code = compileTrack(melodyPlan, 'melody', pillar);
    expect(code).toContain('.vowel("o")');
  });

  it('null transform value is skipped', () => {
    const pillar = makePillar('drums', {}, false, { crush: null });
    const code = compileTrack(drumPlan, 'drums', pillar);
    expect(code).not.toContain('.crush(');
  });

  it('boolean false transform is skipped', () => {
    const pillar = makePillar('drums', {}, false, { reverse: false });
    const code = compileTrack(drumPlan, 'drums', pillar);
    expect(code).not.toContain('.rev()');
  });

  it('empty transforms object leaves code unchanged', () => {
    const withTransforms = makePillar('drums', {}, false, {});
    const withoutTransforms = makePillar('drums', {}, false);
    const a = compileTrack(drumPlan, 'drums', withTransforms);
    const b = compileTrack(drumPlan, 'drums', withoutTransforms);
    expect(a).toBe(b);
  });

  it('deterministic order: crush before degrade before echo', () => {
    const pillar = makePillar('drums', {}, false, { echo: 0.5, crush: 4, degrade: 0.2 });
    const code = compileTrack(drumPlan, 'drums', pillar);
    const crushIdx = code.indexOf('.crush(');
    const degradeIdx = code.indexOf('.degradeBy(');
    const echoIdx = code.indexOf('.delay(');
    expect(crushIdx).toBeGreaterThan(-1);
    expect(crushIdx).toBeLessThan(degradeIdx);
    expect(degradeIdx).toBeLessThan(echoIdx);
  });

  it('transforms compile after knob layer', () => {
    const pillar = makePillar('drums', { gain: 0.8 }, false, { reverb: 0.6 });
    const code = compileTrack(drumPlan, 'drums', pillar);
    const gainIdx = code.indexOf('.gain(0.8)');
    const roomIdx = code.indexOf('.room(0.6)');
    expect(gainIdx).toBeGreaterThan(-1);
    expect(gainIdx).toBeLessThan(roomIdx);
  });
});
