import { describe, it, expect } from 'vitest';
import { prf1, normalizedEntropy, distinctRatio, median, percentile, mean, bootstrapCI, pairedDiffCI, millerBand } from '../../eval/metrics.js';

const opts = { iterations: 500, alpha: 0.05, seed: 1 };

describe('prf1', () => {
  it('partial overlap', () => expect(prf1(['dark', 'techno'], ['dark', 'kick'])).toEqual({ precision: 0.5, recall: 0.5, f1: 0.5 }));
  it('perfect', () => expect(prf1(['a', 'b'], ['b', 'a'])).toEqual({ precision: 1, recall: 1, f1: 1 }));
  it('empty output', () => expect(prf1(['a'], [])).toEqual({ precision: 0, recall: 0, f1: 0 }));
  it('duplicates ignored', () => expect(prf1(['a'], ['a', 'a']).precision).toBe(1));
});

describe('diversity', () => {
  it('identical outputs → 0', () => expect(normalizedEntropy(Array(10).fill(['a', 'b']))).toBe(0));
  it('all distinct → 1', () => expect(normalizedEntropy([['a'], ['b'], ['c'], ['d']])).toBeCloseTo(1, 10));
  it('two outcomes evenly in 4 runs → 0.5', () => expect(normalizedEntropy([['a'], ['a'], ['b'], ['b']])).toBeCloseTo(0.5, 10));
  it('order inside a set does not matter', () => expect(normalizedEntropy([['a', 'b'], ['b', 'a']])).toBe(0));
  it('n ≤ 1 → 0', () => { expect(normalizedEntropy([])).toBe(0); expect(normalizedEntropy([['a']])).toBe(0); });
  it('distinctRatio', () => { expect(distinctRatio([['a'], ['a'], ['b'], ['c']])).toBe(0.75); expect(distinctRatio([])).toBe(0); });
});

describe('descriptives', () => {
  it('median', () => { expect(median([3, 1, 2])).toBe(2); expect(median([1, 2, 3, 4])).toBe(2.5); expect(median([])).toBeNaN(); });
  it('percentile type 7', () => { expect(percentile([1, 2, 3, 4, 5], 95)).toBeCloseTo(4.8, 10); expect(percentile([7], 95)).toBe(7); });
  it('mean', () => expect(mean([1, 2, 3])).toBe(2));
});

describe('bootstrap', () => {
  it('is deterministic for a seed', () => {
    const xs = [1, 5, 2, 8, 3, 9, 4];
    expect(bootstrapCI(xs, median, opts)).toEqual(bootstrapCI(xs, median, opts));
  });
  it('constant data → degenerate interval', () => {
    expect(bootstrapCI([2, 2, 2, 2], median, opts)).toEqual({ estimate: 2, lower: 2, upper: 2, n: 4 });
  });
  it('drops NaN', () => expect(bootstrapCI([1, NaN, 1], median, opts).n).toBe(2));
  it('paired difference of a constant shift', () => {
    const a = [1, 4, 2, 7], b = a.map(x => x + 1);
    expect(pairedDiffCI(a, b, median, opts)).toEqual({ estimate: 1, lower: 1, upper: 1, n: 4 });
  });
  it('paired drops pairs with NaN', () => expect(pairedDiffCI([1, NaN], [2, 3], median, opts).n).toBe(1));
});

describe('millerBand', () => {
  it('bands', () => {
    expect(millerBand(1999)).toBe('≤2s');
    expect(millerBand(2000)).toBe('≤2s');
    expect(millerBand(2001)).toBe('≤10s');
    expect(millerBand(10000)).toBe('≤10s');
    expect(millerBand(10001)).toBe('>10s');
  });
});
