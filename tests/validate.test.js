import { describe, it, expect } from 'vitest';
import { validateCode } from '../src/validate.js';

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
