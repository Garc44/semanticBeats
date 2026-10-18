import { describe, it, expect, afterAll } from 'vitest';
import { compileForm } from '../../eval/s6/compiler.js';
import { FORM_SCHEMA, FORM_EXAMPLE, S6_SYSTEM, LANE_FIELDS } from '../../eval/s6/form.js';
import { checkValidity, closeValidityWorker } from '../../eval/validity.js';
import { harmonyMetrics } from '../../eval/harmony.js';

afterAll(() => closeValidityWorker());

const form = (o = {}) => ({ ...FORM_EXAMPLE, ...o });
const check = async code => checkValidity(code, { cycles: 4 });

describe('S6 form', () => {
  it('schema: reasoning first, every field required, 16-char lanes', () => {
    expect(Object.keys(FORM_SCHEMA.properties)[0]).toBe('reasoning');
    expect(FORM_SCHEMA.required).toEqual(Object.keys(FORM_SCHEMA.properties));
    for (const f of LANE_FIELDS) expect(FORM_SCHEMA.properties[f]).toMatchObject({ type: 'string', minLength: 16, maxLength: 16 });
    expect(FORM_SCHEMA.properties.subgenre.enum).toEqual(['acid', 'detroit', 'dub', 'hypnotic', 'industrial', 'minimal', 'peak-time']);
  });

  it('system prompt explains lanes, A-A-A-B and contains the example', () => {
    expect(S6_SYSTEM).toContain('A A A B');
    expect(S6_SYSTEM).toContain(JSON.stringify(FORM_EXAMPLE));
    expect(S6_SYSTEM).toContain('Do not copy the example');
  });
});

describe('compileForm', () => {
  it('example form → valid code, fixed kick, subgenre tempo, A-A-A-B bass', async () => {
    const out = compileForm(form());
    expect(out).toMatchObject({ subgenre: 'hypnotic', fallbacks: [] });
    expect(out.code).toContain('s("bd*4").bank("RolandTR909")');
    expect(out.code).toContain(`setcpm(${out.bpm}/4)`);
    expect(out.code).toMatch(/n\("<\[[^\]]+\] \[[^\]]+\] \[[^\]]+\] \[[^\]]+\]>"\)\.scale\("F1:minor"\)/);
    expect((await check(out.code)).errorClass).toBeNull();
  });

  it('tempo comes from the subgenre table', () => {
    expect(compileForm(form({ subgenre: 'dub' })).bpm).toBe(120);
    expect(compileForm(form({ subgenre: 'industrial' })).bpm).toBe(138);
  });

  it('every pitched note is in key over 4 bars', async () => {
    for (const key of ['C', 'F#', 'A#']) for (const scale of ['minor', 'phrygian', 'dorian']) {
      const res = await check(compileForm(form({ key, scale, bassA: '0.1.2.3.4.5.6.7.', bassB: '7654321076543210', stab: '0...3...5...6...' })).code);
      expect(res.errorClass).toBeNull();
      expect(harmonyMetrics(res.hapsAll).inKey).toBe(1);
    }
  });

  it('each effect compiles and is visible in the code', async () => {
    const codes = Object.fromEntries(['filter_sweep', 'delay_throw', 'reverb_wash', 'none'].map(effect => [effect, compileForm(form({ effect, effectAmount: 7 })).code]));
    expect(codes.filter_sweep).toContain('sine.range(');
    expect(codes.delay_throw).toContain('.delaytime(');
    expect(codes.reverb_wash).toContain('.size(');
    for (const code of Object.values(codes)) expect((await check(code)).errorClass).toBeNull();
  });

  it('fallbacks: thin bass and empty stab are replaced and reported', async () => {
    const out = compileForm(form({ bassA: '..0.............', bassB: '................', stab: '................' }));
    expect(out.fallbacks).toEqual(['bass', 'stab']);
    expect((await check(out.code)).errorClass).toBeNull();
  });

  // Review Focus 1
  it('code-like junk in lanes never reaches the code', async () => {
    const junk = '"); process.exit(1); ("';
    const out = compileForm(form({ bassA: junk, hat: junk, stab: junk, reasoning: junk, key: junk, bassSound: junk }));
    expect(out.code).not.toContain('process');
    expect(out.code).not.toContain('exit');
    expect((await check(out.code)).errorClass).toBeNull();
  });

  // Review Focus 2
  it('missing fields, wrong types and wrong lane lengths still compile', async () => {
    const out = compileForm({ subgenre: 'polka', bassA: '0.0', hat: 'x'.repeat(40), bassCutoff: '900', effectAmount: 99, effect: 'flanger' });
    expect(out).toMatchObject({ subgenre: 'hypnotic', key: 'A', scale: 'minor', bpm: 128, effect: 'none' });
    expect(out.code).toContain('.lpf(900)');
    expect((await check(out.code)).errorClass).toBeNull();
    expect((await check(compileForm({}).code)).errorClass).toBeNull();
    expect((await check(compileForm(null).code)).errorClass).toBeNull();
  });
});
