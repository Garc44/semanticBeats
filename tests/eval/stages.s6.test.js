import { describe, it, expect, beforeEach, vi } from 'vitest';
import { S6, parseForm } from '../../eval/stages/s6.js';
import { S6_SYSTEM } from '../../eval/s6/form.js';
import { mockOllama, bodies, isIntentCall, isFormCall, intentJson, formJson } from './helpers.js';

const opts = { temperature: 0.7, seed: 1004 };

describe('S6 form + compiler', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('intent call + one form call with graph context; compiles the form', async () => {
    mockOllama(b => (isIntentCall(b) ? intentJson(['bass']) : formJson()));
    const r = await S6.run('Acid-Techno mit 303-Bassline', opts);
    expect(S6).toMatchObject({ id: 'S6', tagSource: 'code' });
    expect(r.llm.calls).toBe(2);
    const form = bodies().find(isFormCall);
    expect(Object.keys(form.format.properties)[0]).toBe('reasoning');
    expect(form.messages[0].content.startsWith(S6_SYSTEM)).toBe(true);
    expect(form.messages[0].content).toContain('Knowledge graph context');
    expect(form.messages[0].content).toContain('acid → 132 BPM');
    expect(form.options).toEqual({ temperature: 0.7, seed: 1004, num_predict: 1024 });
    expect(r.code).toContain('setcpm(132/4)');
    expect(r.form.subgenre).toBe('acid');
    expect(r).toMatchObject({ selectedIds: null, plans: [], fallbacks: [] });
    expect(r.intent.genre).toBe('techno');
  });

  it('reports compiler fallbacks', async () => {
    mockOllama(b => (isIntentCall(b) ? intentJson([]) : formJson({ bassA: '................', stab: '................' })));
    expect((await S6.run('techno', opts)).fallbacks).toEqual(['bass', 'stab']);
  });

  it('unparseable answer → code null, form null', async () => {
    mockOllama(b => (isIntentCall(b) ? intentJson([]) : 'not json'));
    expect(await S6.run('techno', opts)).toMatchObject({ code: null, form: null, fallbacks: [] });
  });

  it('parseForm accepts objects only', () => {
    expect(parseForm('{"a":1}')).toEqual({ a: 1 });
    expect(parseForm('[1]')).toBeNull();
    expect(parseForm('null')).toBeNull();
    expect(parseForm('')).toBeNull();
  });
});
