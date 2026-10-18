import { describe, it, expect, afterAll } from 'vitest';
import { checkValidity, closeValidityWorker } from '../../eval/validity.js';
import { soundLibrary } from '../../src/library/soundLibrary.js';

afterAll(() => closeValidityWorker());

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

  it('rejects computed-member, reflection and this bypasses', async () => {
    expect(await cls("s('bd')['constr'+'uctor']['constr'+'uctor']")).toBe('forbidden');
    expect(await cls("Reflect.get(Reflect.getPrototypeOf(()=>1), 'constr'.concat('uctor'))")).toBe('forbidden');
    expect(await cls("s('bd')[`constructor`]")).toBe('forbidden');
    expect(await cls('this.x')).toBe('forbidden');
    expect(await cls('Object.getPrototypeOf(s("bd"))')).toBe('forbidden');
  });

  it('never flags library pattern code as forbidden', async () => {
    const codes = Object.values(soundLibrary).flat().map(p => p.code);
    expect(codes.length).toBeGreaterThan(50);
    for (const code of codes) expect(await cls(code), code).not.toBe('forbidden');
    expect(await cls(`stack(${codes[0]}, ${codes[1]})`)).not.toBe('forbidden');
  });

  it('contains runaway evaluation (huge pattern, microtask loop)', async () => {
    expect(await cls('s("bd*1e9")')).toBe('runtime');
    const r = await checkValidity('const f=()=>Promise.resolve().then(f); f(); s("bd")');
    expect(r.errorClass).toBe('runtime');
    expect(r.detail).toContain('unresponsive');
    expect((await checkValidity('s("bd*4")')).valid).toBe(true);
  }, 30000);

  it('rejects computed keys in destructuring, literals and classes', async () => {
    expect(await cls("const {['constr'+'uctor']: C} = s('bd'); s('bd')")).toBe('forbidden');
    expect(await cls("const {'constructor': C} = s('bd'); s('bd')")).toBe('forbidden');
    expect(await cls("const o = {['a'+'b']: 1}; s('bd')")).toBe('forbidden');
    expect(await cls("class A { ['m'+'x']() {} }; s('bd')")).toBe('forbidden');
  });

  it('keeps the worker usable after a starving payload that also throws', async () => {
    expect(await cls('const f=()=>Promise.resolve().then(f); f(); null.x')).toBe('runtime');
    expect(await cls('s("bd*4")')).toBe(null);
  }, 30000);

  it('handles overlapping calls', async () => {
    const rs = await Promise.all([cls('s("bd*4")'), cls('s("~ ~")'), cls('fooBar(1)')]);
    expect(rs).toEqual([null, 'silent', 'unknown_function']);
  });

  it('rejects Strudel string-eval entry points', async () => {
    expect(await cls("await evaluate('(() => { throw new Error(String(typeof process)) })()')")).toBe('forbidden');
    expect(await cls('evalScope({}); s("bd")')).toBe('forbidden');
  });
});

describe('content window', () => {
  it('hapsAll spans the requested bars, haps stays bar 0', async () => {
    const r = await checkValidity('s("bd*4").bank("RolandTR909")', { cycles: 4 });
    expect(r.errorClass).toBeNull();
    expect(r.haps).toHaveLength(4);
    expect(r.hapsAll).toHaveLength(16);
    expect(r.hapsAll[15].whole).toEqual({ begin: 3.75, end: 4 });
  });

  it('defaults to one bar; non-executing classes have empty hapsAll', async () => {
    expect((await checkValidity('s("bd*4").bank("RolandTR909")')).hapsAll).toHaveLength(4);
    expect((await checkValidity('s("bd".fast(')).hapsAll).toEqual([]);
  });

  it('silent in bar 0 stays silent even if later bars sound', async () => {
    const r = await checkValidity('s("<~ bd>").bank("RolandTR909")', { cycles: 4 });
    expect(r.errorClass).toBe('silent');
    expect(r.hapsAll.length).toBeGreaterThan(0);
  });
});
