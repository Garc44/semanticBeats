import { describe, it, expect, afterAll } from 'vitest';
import { tagsFromCode } from '../../eval/codeLexicon.js';
import { queryCycle } from '../../eval/strudelHeadless.js';
import { checkValidity, closeValidityWorker } from '../../eval/validity.js';

const tagsOf = async code => tagsFromCode(code, await queryCycle(code));

afterAll(async () => { await closeValidityWorker(); });

describe('tagsFromCode', () => {
  it('four-on-the-floor 909 kick → kick, sparse', async () => {
    expect(await tagsOf('s("bd*4").bank("RolandTR909")')).toEqual(['kick', 'sparse']);
  });

  it('works with serialized haps from checkValidity (worker path)', async () => {
    const code = 's("bd*4").bank("RolandTR909")';
    const res = await checkValidity(code);
    expect(tagsFromCode(code, res.haps)).toEqual(await tagsOf(code));
  });

  it('16 hats → hats only (neither sparse nor dense)', async () => {
    expect(await tagsOf('s("hh*16").bank("RolandTR909")')).toEqual(['hats']);
  });

  it('low resonant saw → acid, bass, dark, sparse, sub', async () => {
    expect(await tagsOf('note("c1 c1 eb1 g1").s("sawtooth").lpf(400).lpq(15)')).toEqual(['acid', 'bass', 'dark', 'sparse', 'sub']);
  });

  it('triad with reverb → chords, lead, spacious, sparse', async () => {
    expect(await tagsOf('note("[c3,eb3,g3]").s("triangle").room(0.6)')).toEqual(['chords', 'lead', 'spacious', 'sparse']);
  });

  it('invented sounds yield no tags', async () => {
    expect(await tagsOf('s("zzz*4")')).toEqual([]);
  });

  it('degradeBy → glitchy; minor scale → dark', async () => {
    expect(await tagsOf('stack(s("bd*4"), s("hh*8")).degradeBy(0.3)')).toContain('glitchy');
    expect(await tagsOf('n("0 2 4").scale("A:phrygian").s("sine")')).toContain('dark');
  });

  it('crush ≤ 8 → gritty', async () => {
    const tags = await tagsOf('s("hh*8").bank("RolandTR909").crush(6)');
    expect(tags).toEqual(expect.arrayContaining(['gritty', 'hats']));
  });

  it('dense cycles', async () => {
    expect(await tagsOf('stack(s("hh*16"), s("bd*8"), s("cp*4"))')).toContain('dense');
  });

  it('works without haps (invalid code) and returns only regex tags', () => {
    expect(tagsFromCode('s("bd").degradeBy(0.5', [])).toEqual(['glitchy']);
  });
});
