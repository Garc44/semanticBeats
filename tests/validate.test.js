import { describe, it, expect } from 'vitest';
import { validateCode, validatePlan } from '../src/validate.js';

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
    selectedId: 'kick_sine_44',
    explanation: 'Solid kick.',
    modifications: { gain: 1.0 },
  };

  it('passes a valid plan for kick', () => {
    const r = validatePlan(validPlan, 'kick');
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('passes plan with no modifications', () => {
    expect(validatePlan({ selectedId: 'kick_sine_44', explanation: 'x' }, 'kick').valid).toBe(true);
  });

  it('fails when plan is null', () => {
    expect(validatePlan(null, 'kick').valid).toBe(false);
  });

  it('fails when selectedId is missing', () => {
    const r = validatePlan({ explanation: 'x' }, 'kick');
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/selectedId/);
  });

  it('fails when selectedId not in catalog', () => {
    const r = validatePlan({ selectedId: 'nonexistent' }, 'kick');
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/not in catalog/);
  });

  it('fails when gain is above 1.2', () => {
    const r = validatePlan({ selectedId: 'kick_sine_44', modifications: { gain: 2.0 } }, 'kick');
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/gain/);
  });

  it('fails when speed is zero', () => {
    const r = validatePlan({ selectedId: 'kick_sine_44', modifications: { speed: 0 } }, 'kick');
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/speed/);
  });

  it('fails when slowdown is not integer', () => {
    const r = validatePlan({ selectedId: 'kick_sine_44', modifications: { slowdown: 2.5 } }, 'kick');
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/slowdown/);
  });

  it('validates rumble_bass IDs against rumble_bass catalog', () => {
    const r = validatePlan({ selectedId: 'rumble_acid' }, 'rumble_bass');
    expect(r.valid).toBe(true);
  });

  it('fails rumble_bass ID against wrong pillar catalog', () => {
    const r = validatePlan({ selectedId: 'rumble_acid' }, 'kick');
    expect(r.valid).toBe(false);
  });
});
