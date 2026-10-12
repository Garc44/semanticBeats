import { describe, it, expect } from 'vitest';
import { checkValidity } from '../../eval/validity.js';

const cls = async code => (await checkValidity(code)).errorClass;

describe('checkValidity', () => {
  it('accepts a valid library-style track', async () => {
    const r = await checkValidity('stack(s("bd*4").bank("RolandTR909"), note("c1 eb1").s("sawtooth").lpf(400))');
    expect(r).toMatchObject({ valid: true, executes: true, errorClass: null, unknownSounds: [] });
    expect(r.haps.length).toBe(6);
  });

  it('classifies empty output', async () => {
    expect(await cls('')).toBe('empty');
    expect(await cls('   ')).toBe('empty');
    expect(await cls(null)).toBe('empty');
  });

  it('classifies JS and mini-notation syntax errors as syntax', async () => {
    expect(await cls('s("bd*4".lpf(400)')).toBe('syntax');
    expect(await cls('s("bd [hh")')).toBe('syntax');
  });

  it('classifies unknown methods and globals as unknown_function', async () => {
    expect(await cls('s("bd*4").fooBar(3)')).toBe('unknown_function');
    expect(await cls('fooBar("bd*4")')).toBe('unknown_function');
  });

  it('classifies non-pattern results', async () => {
    expect(await cls('42')).toBe('no_pattern');
  });

  it('classifies rest-only patterns as silent', async () => {
    const r = await checkValidity('s("~ ~")');
    expect(r).toMatchObject({ errorClass: 'silent', executes: true, valid: false });
  });

  it('classifies invented sounds as unknown_sound and lists them', async () => {
    const r = await checkValidity('stack(s("zzzkick*4"), s("ride").bank("RolandTR909"))');
    expect(r.errorClass).toBe('unknown_sound');
    expect(r.executes).toBe(true);
    expect(r.unknownSounds.sort()).toEqual(['RolandTR909_ride', 'zzzkick']);
  });

  // Review Focus 1: REPL-only syntax plays in the app → valid here too.
  it('treats $:, setcpm and .pianoroll as valid', async () => {
    expect(await cls('$: s("bd*4")\n$: s("hh*8").bank("RolandTR909")')).toBe(null);
    expect(await cls('setcpm(130/4)\ns("bd*4")')).toBe(null);
    expect(await cls('s("bd*4").pianoroll()')).toBe(null);
  });

  // Review Focus 2: never execute dangerous code.
  it('rejects process access, loops and constructor escapes before evaluation', async () => {
    expect(await cls('process.exit(1)')).toBe('forbidden');
    expect(await cls('while(true){}\ns("bd")')).toBe('forbidden');
    expect(await cls('for (;;) {}')).toBe('forbidden');
    expect(await cls('s("bd").constructor.constructor("return process")()')).toBe('forbidden');
    expect(await cls('s("bd")["constructor"]')).toBe('forbidden');
    expect(await cls('globalThis.x = 1; s("bd")')).toBe('forbidden');
    expect(await cls('import("node:fs")')).toBe('forbidden');
  });

  it('classifies other runtime throws as runtime', async () => {
    expect(await cls('const a = undefined; a.b')).toBe('runtime');
  });
});
