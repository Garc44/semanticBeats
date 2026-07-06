import { describe, it, expect } from 'vitest';
import { validateCode, validatePlan, validateMiniNotation, countMiniEvents } from '../src/validate.js';

describe('validateCode', () => {
  it('passes valid Strudel code', () => {
    expect(validateCode('s("bd ~ sn ~")')).toEqual({ valid: true, errors: [] });
  });

  it('fails on empty string', () => {
    const r = validateCode('');
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('Code is empty');
  });

  it('fails on null', () => {
    expect(validateCode(null).valid).toBe(false);
  });

  it('fails on markdown fences', () => {
    const r = validateCode('```js\ns("bd")\n```');
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('Code contains markdown fences');
  });

  it('fails on unbalanced open parens', () => {
    const r = validateCode('s("bd"');
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('Unbalanced parentheses');
  });

  it('fails on unbalanced close parens', () => {
    const r = validateCode('s("bd"))');
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('Unbalanced parentheses');
  });

  it('fails on unknown Strudel function', () => {
    const r = validateCode('s("bd").fakeEffect(0.5)');
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/Unknown function: fakeEffect/);
  });

  it('passes code with known effects chained', () => {
    expect(validateCode('s("bd ~ sn ~").room(0.3).gain(0.8).lpf(1000)')).toEqual({ valid: true, errors: [] });
  });
});

describe('validatePlan', () => {
  const validPlan = {
    selectedId: 'basic_kick',
    explanation: 'Solid kick.',
    modifications: { gain: 1.0 },
  };

  it('passes a valid plan for drums', () => {
    const r = validatePlan(validPlan, 'drums');
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('passes plan with no modifications', () => {
    expect(validatePlan({ selectedId: 'basic_kick', explanation: 'x' }, 'drums').valid).toBe(true);
  });

  it('fails when plan is null', () => {
    expect(validatePlan(null, 'drums').valid).toBe(false);
  });

  it('fails when selectedId is missing', () => {
    const r = validatePlan({ explanation: 'x' }, 'drums');
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/selectedId/);
  });

  it('fails when selectedId not in catalog', () => {
    const r = validatePlan({ selectedId: 'nonexistent' }, 'drums');
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/not in catalog/);
  });

  it('fails when gain is above 1.2', () => {
    const r = validatePlan({ selectedId: 'basic_kick', modifications: { gain: 2.0 } }, 'drums');
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/gain/);
  });

  it('fails when speed is zero', () => {
    const r = validatePlan({ selectedId: 'basic_kick', modifications: { speed: 0 } }, 'drums');
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/speed/);
  });

  it('fails when slowdown is not integer', () => {
    const r = validatePlan({ selectedId: 'basic_kick', modifications: { slowdown: 2.5 } }, 'drums');
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/slowdown/);
  });

  it('validates bass IDs against bass catalog', () => {
    const r = validatePlan({ selectedId: 'bass_acid_squelch' }, 'bass');
    expect(r.valid).toBe(true);
  });

  it('fails bass ID against wrong pillar catalog', () => {
    const r = validatePlan({ selectedId: 'bass_acid_squelch' }, 'drums');
    expect(r.valid).toBe(false);
  });
});

describe('validateMiniNotation', () => {
  it('accepts valid sample notation', () => {
    expect(validateMiniNotation('bd ~ [~ bd] bd*2', 'sample').valid).toBe(true);
    expect(validateMiniNotation('bd(3,8)', 'sample').valid).toBe(true);
    expect(validateMiniNotation('hh*8 <oh hh>', 'sample').valid).toBe(true);
  });

  it('accepts valid note notation including chords', () => {
    expect(validateMiniNotation('c2 [~ eb2] c2 [g1 bb1]', 'note').valid).toBe(true);
    expect(validateMiniNotation('[c2,eb2,g2] ~ ~ ~', 'note').valid).toBe(true);
    expect(validateMiniNotation('fs4 ~ cs5 ~', 'note').valid).toBe(true);
  });

  it('rejects unknown samples', () => {
    const r = validateMiniNotation('bd kaboom bd', 'sample');
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('kaboom');
  });

  it('rejects malformed notes', () => {
    expect(validateMiniNotation('c2 h9 x', 'note').valid).toBe(false);
  });

  it('rejects unbalanced brackets and empty input', () => {
    expect(validateMiniNotation('bd [bd bd', 'sample').valid).toBe(false);
    expect(validateMiniNotation('   ', 'sample').valid).toBe(false);
  });

  it('rejects code-injection characters', () => {
    expect(validateMiniNotation('bd").gain(9)//', 'sample').valid).toBe(false);
  });
});

describe('countMiniEvents', () => {
  it('counts non-rest atoms', () => {
    expect(countMiniEvents('bd ~ bd ~')).toBe(2);
    expect(countMiniEvents('~ ~ ~ ~')).toBe(0);
    expect(countMiniEvents('[c2,eb2,g2] ~')).toBe(3);
  });
});
