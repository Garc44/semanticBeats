import { describe, it, expect } from 'vitest';
import { applyTransformation, generateSeed, buildVoiceCode, stackCode } from '../src/patchEngine.js';

const base = 's("bd ~ sn ~")';

describe('applyTransformation', () => {
  it('adds room when not present', () => {
    const plan = { operations: [{ type: 'increase_reverb', amount: 0.4 }] };
    expect(applyTransformation(base, plan)).toContain('.room(');
  });

  it('increases existing room value', () => {
    const code = 's("bd ~ sn ~").room(0.3)';
    const plan = { operations: [{ type: 'increase_reverb', amount: 0.2 }] };
    expect(applyTransformation(code, plan)).toContain('.room(0.5)');
  });

  it('caps room at 0.9', () => {
    const code = 's("bd ~ sn ~").room(0.8)';
    const plan = { operations: [{ type: 'increase_reverb', amount: 0.5 }] };
    expect(applyTransformation(code, plan)).toContain('.room(0.9)');
  });

  it('reduces room value', () => {
    const code = 's("bd ~ sn ~").room(0.6)';
    const plan = { operations: [{ type: 'reduce_reverb', amount: 0.2 }] };
    expect(applyTransformation(code, plan)).toContain('.room(0.4)');
  });

  it('appends delay when absent', () => {
    const plan = { operations: [{ type: 'add_delay', amount: 0.3 }] };
    expect(applyTransformation(base, plan)).toContain('.delay(0.3)');
  });

  it('does not duplicate delay when already present', () => {
    const code = 's("bd").delay(0.3)';
    const plan = { operations: [{ type: 'add_delay', amount: 0.4 }] };
    const result = applyTransformation(code, plan);
    expect(result.match(/\.delay\(/g)).toHaveLength(1);
  });

  it('applies increase_filter_motion as pattern', () => {
    const plan = { operations: [{ type: 'increase_filter_motion', amount: 0.5 }] };
    expect(applyTransformation(base, plan)).toContain('.lpf(');
  });

  it('skips unknown operations without throwing', () => {
    const plan = { operations: [{ type: 'invented_op', amount: 0.3 }] };
    expect(applyTransformation(base, plan)).toBe(base);
  });

  it('applies multiple operations in order', () => {
    const plan = {
      operations: [
        { type: 'increase_reverb', amount: 0.3 },
        { type: 'add_delay', amount: 0.2 },
      ],
    };
    const result = applyTransformation(base, plan);
    expect(result).toContain('.room(');
    expect(result).toContain('.delay(');
  });

  it('returns original code with empty operations', () => {
    const plan = { operations: [] };
    expect(applyTransformation(base, plan)).toBe(base);
  });
});

describe('generateSeed', () => {
  it('uses provided seedCode', () => {
    const plan = { seedCode: 's("bd ~ sn ~")', operations: [] };
    expect(generateSeed(plan)).toBe('s("bd ~ sn ~")');
  });

  it('applies operations to seedCode', () => {
    const plan = {
      seedCode: 's("bd ~ sn ~")',
      operations: [{ type: 'increase_reverb', amount: 0.4 }],
    };
    expect(generateSeed(plan)).toContain('.room(');
  });

  it('falls back to default seed when seedCode missing', () => {
    const result = generateSeed({ operations: [] });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('buildVoiceCode', () => {
  it('builds melody voice with sine sound', () => {
    const result = buildVoiceCode('melody', 'c4 e4 g4 ~', []);
    expect(result).toContain('note("c4 e4 g4 ~")');
    expect(result).toContain('.sound("sine")');
    expect(result).toContain('.gain(0.5)');
  });

  it('builds bass voice with sawtooth sound', () => {
    const result = buildVoiceCode('bass', 'c2 ~ e2 ~', []);
    expect(result).toContain('note("c2 ~ e2 ~")');
    expect(result).toContain('.sound("sawtooth")');
  });

  it('builds chords voice with square sound', () => {
    const result = buildVoiceCode('chords', 'c3 g3', []);
    expect(result).toContain('note("c3 g3")');
    expect(result).toContain('.sound("square")');
  });

  it('builds percussion voice using s() not note()', () => {
    const result = buildVoiceCode('percussion', 'hh*4', []);
    expect(result).toContain('s("hh*4")');
    expect(result).not.toContain('note(');
    expect(result).toContain('.gain(0.7)');
  });

  it('applies operations to the base code', () => {
    const ops = [{ type: 'increase_reverb', amount: 0.4 }];
    const result = buildVoiceCode('melody', 'c4 e4', ops);
    expect(result).toContain('.room(');
  });

  it('unknown voiceType falls back to sine', () => {
    const result = buildVoiceCode('unknown', 'c4', []);
    expect(result).toContain('.sound("sine")');
  });
});
