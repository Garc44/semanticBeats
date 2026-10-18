import { describe, it, expect } from 'vitest';
import { queryCycle, queryCycles, evaluatePattern } from '../../eval/strudelHeadless.js';

describe('queryCycle', () => {
  it('returns one cycle of haps for a valid pattern', async () => {
    const haps = await queryCycle('s("bd*4").bank("RolandTR909").lpf(400)');
    expect(haps).toHaveLength(4);
    expect(haps[0].value).toMatchObject({ s: 'bd', bank: 'RolandTR909', cutoff: 400 });
  });

  it('resolves scales through @strudel/tonal', async () => {
    const haps = await queryCycle('n("0 2 4").scale("C:minor").s("sine")');
    expect(haps).toHaveLength(3);
    expect(typeof haps[0].value.note).not.toBe('undefined');
  });

  it('throws NO_PATTERN when the expression is not a pattern', async () => {
    await expect(queryCycle('42')).rejects.toMatchObject({ code: 'NO_PATTERN' });
  });

  it('throws on JavaScript syntax errors', async () => {
    await expect(queryCycle('s("bd*4".lpf(400)')).rejects.toThrow();
  });

  it('stacks $: labelled patterns like the REPL does', async () => {
    const haps = await queryCycle('$: s("bd*4")\n$: s("hh*8")');
    expect(haps).toHaveLength(12);
  });

  it('accepts REPL tempo calls and visual methods as no-ops', async () => {
    expect(await queryCycle('setcpm(130/4)\ns("bd*4")')).toHaveLength(4);
    expect(await queryCycle('setcps(0.5)\ns("bd*4").pianoroll()')).toHaveLength(4);
  });

  it('ignores muted _$: labels', async () => {
    const haps = await queryCycle('$: s("bd*4")\n_$: s("hh*8")');
    expect(haps).toHaveLength(4);
  });

  it('does not leave string-eval helpers on globalThis', async () => {
    await queryCycle('s("bd")');
    for (const n of ['evaluate', 'evalScope', 'strudelScope']) expect(typeof globalThis[n]).toBe('undefined');
  });
});

describe('multi-bar queries', () => {
  it('queryCycles spans n bars; queryCycle stays bar 0', async () => {
    expect(await queryCycles('s("bd*4")', 4)).toHaveLength(16);
    expect(await queryCycle('s("bd*4")')).toHaveLength(4);
  });

  it('alternation advances per bar', async () => {
    const haps = await queryCycles('note("<c3 e3 g3 b3>")', 4);
    expect(haps.map(h => h.value.note)).toEqual(['c3', 'e3', 'g3', 'b3']);
  });

  it('evaluatePattern returns a queryable pattern', async () => {
    const pat = await evaluatePattern('s("bd hh")');
    expect(pat.queryArc(0, 2)).toHaveLength(4);
  });
});
