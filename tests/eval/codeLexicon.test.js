import { describe, it, expect, afterAll } from 'vitest';
import { tagsFromCode, parseBpm } from '../../eval/codeLexicon.js';
import { queryCycle, queryCycles } from '../../eval/strudelHeadless.js';
import { checkValidity, closeValidityWorker } from '../../eval/validity.js';

const tagsOf = async code => tagsFromCode(code, await queryCycle(code));
const tagsOf4 = async code => tagsFromCode(code, await queryCycles(code, 4), { cycles: 4 });

afterAll(async () => { await closeValidityWorker(); });

describe('tagsFromCode', () => {
  it('four-on-the-floor 909 kick → kick, minimal, sparse', async () => {
    expect(await tagsOf('s("bd*4").bank("RolandTR909")')).toEqual(['kick', 'minimal', 'sparse']);
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
    expect(await tagsOf('note("c1 c1 eb1 g1").s("sawtooth").lpf(400).lpq(15)')).toEqual(['acid', 'bass', 'dark', 'minimal', 'sparse', 'sub']);
  });

  it('triad with reverb → chords, lead, spacious, sparse', async () => {
    expect(await tagsOf('note("[c3,eb3,g3]").s("triangle").room(0.6)')).toEqual(['chords', 'dub', 'lead', 'spacious', 'sparse']);
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

describe('parseBpm', () => {
  it('reads setcpm and setcps, defaults to 120', () => {
    expect(parseBpm('setcpm(132/4)\ns("bd")')).toBe(132);
    expect(parseBpm('setcpm(30)')).toBe(120);
    expect(parseBpm('setcps(0.5)')).toBe(120);
    expect(parseBpm('setcps(.55)')).toBe(132);
    expect(parseBpm('s("bd*4")')).toBe(120);
  });

  // Review Focus 3
  it('never throws on unusual tempo calls', () => {
    expect(parseBpm('setcpm(x)')).toBe(120);
    expect(parseBpm('setcpm(130/4*1)')).toBe(120);
    expect(parseBpm('setcpm()')).toBe(120);
    expect(parseBpm('setcpm(0/4)')).toBe(120);
    expect(parseBpm(null)).toBe(120);
  });
});

describe('techno rules over 4 bars', () => {
  it('density is per bar, not per window', async () => {
    expect(await tagsOf4('s("bd*4").bank("RolandTR909")')).toEqual(['kick', 'minimal', 'sparse']);
  });

  it('driving = four-on-the-floor + offbeat hats', async () => {
    const tags = await tagsOf4('stack(s("bd*4").bank("RolandTR909"), s("[~ hh]*4").bank("RolandTR909"))');
    expect(tags).toContain('driving');
    expect(await tagsOf4('stack(s("bd*4").bank("RolandTR909"), s("hh*4").bank("RolandTR909"))')).not.toContain('driving');
  });

  it('hypnotic = same bass bar in ≥ 3 of 4 bars', async () => {
    const aaab = 'n("<[0 ~ 0 ~] [0 ~ 0 ~] [0 ~ 0 ~] [3 ~ 0 ~]>").scale("C1:minor").s("sawtooth")';
    const abcd = 'n("<[0 ~ 0 ~] [1 ~ 0 ~] [2 ~ 0 ~] [3 ~ 0 ~]>").scale("C1:minor").s("sawtooth")';
    expect(await tagsOf4(aaab)).toContain('hypnotic');
    expect(await tagsOf4(abcd)).not.toContain('hypnotic');
    expect(await tagsOf(aaab)).not.toContain('hypnotic'); // needs the 4-bar window
  });

  it('industrial = gritty + ≥ 135 BPM', async () => {
    expect(await tagsOf4('setcpm(138/4)\ns("hh*8").bank("RolandTR909").shape(0.5)')).toContain('industrial');
    expect(await tagsOf4('setcpm(128/4)\ns("hh*8").bank("RolandTR909").shape(0.5)')).not.toContain('industrial');
  });

  it('peak-time = 130–134 BPM + dense', async () => {
    expect(await tagsOf4('setcpm(132/4)\nstack(s("hh*16"), s("bd*8"), s("cp*4")).bank("RolandTR909")')).toContain('peak-time');
  });

  it('detroit = chords + warm + 125–132 BPM', async () => {
    const tags = await tagsOf4('setcpm(130/4)\nnote("[c3,eb3,g3]*2").s("sawtooth").lpf(1500)');
    expect(tags).toEqual(expect.arrayContaining(['chords', 'detroit', 'warm']));
    expect(await tagsOf4('setcpm(130/4)\nnote("[c3,eb3,g3]*2").s("sawtooth").lpf(600)')).not.toContain('detroit');
  });

  it('works with serialized 4-bar haps from checkValidity', async () => {
    const code = 'stack(s("bd*4").bank("RolandTR909"), s("[~ hh]*4").bank("RolandTR909"))';
    const res = await checkValidity(code, { cycles: 4 });
    expect(tagsFromCode(code, res.hapsAll, { cycles: 4 })).toEqual(await tagsOf4(code));
  });
});
