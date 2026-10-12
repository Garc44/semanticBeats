import { describe, it, expect, beforeEach, vi } from 'vitest';
import { S0, S0_SYSTEM } from '../../eval/stages/s0.js';
import { S1, S1_SYSTEM, SPEC_SOUNDS, buildSpecBlock } from '../../eval/stages/s1.js';
import { S2, buildExamplesBlock } from '../../eval/stages/s2.js';
import { isKnownSound } from '../../eval/knownSounds.js';
import { METHOD_CARDS } from '../../src/library/strudelDocs.js';
import { mockOllama, bodies, isIntentCall, intentJson } from './helpers.js';

const opts = { temperature: 0.7, seed: 1000 };

describe('S0 baseline', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('one unconstrained call, code out', async () => {
    mockOllama(() => 's("bd*4")');
    const r = await S0.run('dark techno', opts);
    expect(S0).toMatchObject({ id: 'S0', tagSource: 'code' });
    expect(r).toMatchObject({ code: 's("bd*4")', selectedIds: null, intent: null });
    expect(r.llm.calls).toBe(1);
    const [b] = bodies();
    expect(b.format).toBeUndefined();
    expect(b.messages[0].content).toBe(S0_SYSTEM);
    expect(b.messages[1].content).toBe('dark techno');
    expect(b.options).toEqual({ temperature: 0.7, seed: 1000, num_predict: 1024 });
  });

  // Review Focus 3
  it('extracts the fenced block from prose-wrapped answers', async () => {
    mockOllama(() => 'Sure! Here is a beat:\n```javascript\nstack(s("bd*4"), s("hh*8"))\n```\nHave fun.');
    expect((await S0.run('beat', opts)).code).toBe('stack(s("bd*4"), s("hh*8"))');
  });

  it('empty answer → code null', async () => {
    mockOllama(() => '');
    expect((await S0.run('beat', opts)).code).toBeNull();
  });
});

describe('S1 specification', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('every specified drum name resolves in every specified bank', () => {
    for (const bank of SPEC_SOUNDS.banks)
      for (const s of SPEC_SOUNDS.banked) expect(isKnownSound({ s, bank })).toBe(true);
  });

  it('spec block lists sounds, core functions and every METHOD_CARD with range', () => {
    const block = buildSpecBlock();
    expect(block).toContain('RolandTR909');
    expect(block).toContain('sawtooth');
    expect(block).toContain('stack');
    for (const name of Object.keys(METHOD_CARDS)) expect(block).toMatch(new RegExp(`^- ${name}\\(`, 'm'));
    expect(block).toContain('- lpf(hz): 100–5000 — ');
    expect(block).toContain('- vowel("a".."u"): a|e|i|o|u — ');
  });

  it('one free-code call with the static spec, no intent', async () => {
    mockOllama(() => 's("bd*4").bank("RolandTR909")');
    const r = await S1.run('dark techno', opts);
    expect(S1).toMatchObject({ id: 'S1', tagSource: 'code' });
    expect(r).toMatchObject({ code: 's("bd*4").bank("RolandTR909")', intent: null, selectedIds: null });
    expect(r.llm.calls).toBe(1);
    const [b] = bodies();
    expect(b.format).toBeUndefined();
    expect(b.messages[0].content).toBe(S1_SYSTEM);
    expect(S1_SYSTEM.startsWith(S0_SYSTEM)).toBe(true);
  });
});

describe('S2 few-shot', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('examples block holds the top-3 library patterns per intent pillar, with code', () => {
    const block = buildExamplesBlock({ genre: 'techno', moods: ['dark'], textures: [], layers: [{ pillar: 'drums' }, { pillar: 'bass' }] });
    expect((block.match(/^\[drums\]/gm) ?? []).length).toBe(3);
    expect((block.match(/^\[bass\]/gm) ?? []).length).toBe(3);
    expect(block).not.toMatch(/^\[melody\]/m);
    expect(block).toMatch(/^\[drums\] \w+ \(tags: .+\): s\(/m);
  });

  it('intent call + one free-code call on top of the S1 prompt', async () => {
    mockOllama(b => (isIntentCall(b) ? intentJson(['drums']) : '```\ns("bd*4").bank("RolandTR909")\n```'));
    const r = await S2.run('dark techno kick', opts);
    expect(S2).toMatchObject({ id: 'S2', tagSource: 'code' });
    expect(r.code).toBe('s("bd*4").bank("RolandTR909")');
    expect(r.selectedIds).toBeNull();
    expect(r.llm.calls).toBe(2);
    expect(r.intent.genre).toBe('techno');
    const codeCall = bodies()[1];
    expect(codeCall.format).toBeUndefined();
    expect(codeCall.messages[0].content.startsWith(S1_SYSTEM)).toBe(true);
    expect(codeCall.messages[0].content).toContain('[drums]');
  });
});
