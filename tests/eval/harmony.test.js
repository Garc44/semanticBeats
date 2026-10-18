import { describe, it, expect, afterAll } from 'vitest';
import { harmonyMetrics, DIATONIC_SETS } from '../../eval/harmony.js';
import { queryCycles } from '../../eval/strudelHeadless.js';
import { checkValidity, closeValidityWorker } from '../../eval/validity.js';

const of = async (code, cycles = 1) => harmonyMetrics(await queryCycles(code, cycles));
afterAll(() => closeValidityWorker());

describe('harmonyMetrics', () => {
  it('12 diatonic sets of 7 pitch classes', () => {
    expect(DIATONIC_SETS).toHaveLength(12);
    expect(DIATONIC_SETS[0]).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });

  it('scale melody: fully in key, no simultaneous pairs', async () => {
    const h = await of('n("0 2 4 5").scale("C3:minor").s("sine")');
    expect(h).toMatchObject({ pitched: 4, inKey: 1 });
    expect(h.clashRate).toBeNaN();
    expect(h.lowCrowding).toBeNaN();
  });

  it('chromatic run: 7 of 12 in the best key', async () => {
    expect((await of('note("c3 db3 d3 eb3 e3 f3 gb3 g3 ab3 a3 bb3 b3").s("sine")')).inKey).toBeCloseTo(7 / 12, 10);
  });

  it('semitone and tritone clash, triad does not', async () => {
    expect((await of('note("[c3,db3]").s("sine")')).clashRate).toBe(1);
    expect((await of('note("[c3,gb3]").s("sine")')).clashRate).toBe(1);
    expect((await of('note("[c3,e3,g3]").s("sine")')).clashRate).toBe(0);
  });

  it('low crowding only below C3 and within an octave', async () => {
    expect((await of('note("[c1,e1]").s("sine")')).lowCrowding).toBe(1);
    expect((await of('note("[c1,c3]").s("sine")')).lowCrowding).toBe(0);
    expect((await of('note("[c3,e3]").s("sine")')).lowCrowding).toBe(0);
  });

  it('two layers in different keys clash over 4 bars', async () => {
    const h = await of('stack(n("0 ~ 0 ~").scale("D1:phrygian").s("sawtooth"), n("[0,2,4]").scale("G#3:minor").s("square"))', 4);
    expect(h.inKey).toBeLessThan(1);
    expect(h.clashRate).toBeGreaterThan(0);
  });

  // Review Focus 4
  it('drums only and haps without whole → NaN, no crash', async () => {
    const drums = await of('s("bd*4").bank("RolandTR909")');
    expect(drums.pitched).toBe(0);
    expect(drums.inKey).toBeNaN();
    expect(harmonyMetrics([{ value: { note: 48, s: 'sine' }, whole: null }, { value: null, whole: null }])).toMatchObject({ pitched: 0 });
    expect(harmonyMetrics([]).inKey).toBeNaN();
  });

  it('works with serialized haps from checkValidity', async () => {
    const code = 'note("[c3,db3] [c3,e3]").s("sine")';
    const res = await checkValidity(code, { cycles: 4 });
    expect(harmonyMetrics(res.hapsAll)).toEqual(await of(code, 4));
  });
});
