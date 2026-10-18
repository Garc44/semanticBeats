import { describe, it, expect, beforeEach, vi } from 'vitest';
import { S3 } from '../../eval/stages/s3.js';
import { TRACK_PILLARS, trackPillars, assembleStack, extractCode } from '../../eval/stages/common.js';
import { mockOllama, bodies, isIntentCall, intentJson, firstChoicePlan } from './helpers.js';
import { soundLibrary } from '../../src/library/soundLibrary.js';

const opts = { temperature: 0.7, seed: 1003 };

describe('common', () => {
  it('trackPillars is always drums, bass, melody (spec §2.1)', () => {
    expect(trackPillars({ layers: [{ pillar: 'percussion' }] })).toEqual(['drums', 'bass', 'melody']);
    expect(trackPillars(null)).toEqual(['drums', 'bass', 'melody']);
    expect(TRACK_PILLARS).toEqual(['drums', 'bass', 'melody']);
  });
  it('assembleStack', () => {
    expect(assembleStack([])).toBeNull();
    expect(assembleStack(['a', null])).toBe('a');
    expect(assembleStack(['a', 'b'])).toBe('stack(\na,\nb\n)');
  });
  it('extractCode takes the first fenced block, else the whole text', () => {
    expect(extractCode('Here you go:\n```js\ns("bd")\n```\nEnjoy!')).toBe('s("bd")');
    expect(extractCode('```\nnote("c2")\n```')).toBe('note("c2")');
    expect(extractCode('  s("bd*4")  ')).toBe('s("bd*4")');
    expect(extractCode('')).toBeNull();
  });
});

describe('S3 constraint stage', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('builds a stack with one selected pattern per part', async () => {
    mockOllama(b => (isIntentCall(b) ? intentJson(['drums', 'bass']) : firstChoicePlan(b)));
    const r = await S3.run('dark techno with bass', opts);
    expect(S3).toMatchObject({ id: 'S3', tagSource: 'ids' });
    expect(r.selectedIds).toHaveLength(3);
    expect(soundLibrary.drums.map(p => p.id)).toContain(r.selectedIds[0]);
    expect(soundLibrary.bass.map(p => p.id)).toContain(r.selectedIds[1]);
    expect(soundLibrary.melody.map(p => p.id)).toContain(r.selectedIds[2]);
    expect(r.code.startsWith('stack(')).toBe(true);
    expect(r.llm).toMatchObject({ calls: 4, promptTokens: 40, evalTokens: 20 });
    expect(r.llm.outputs).toHaveLength(4);
    expect(r.intent.genre).toBe('techno');
  });

  it('forwards temperature, seed and the constant num_predict on every call', async () => {
    mockOllama(b => (isIntentCall(b) ? intentJson(['drums']) : firstChoicePlan(b)));
    await S3.run('kick', opts);
    for (const b of bodies()) expect(b.options).toEqual({ temperature: 0.7, seed: 1003, num_predict: 1024 });
  });

  it('a failed pillar plan drops that layer but keeps the track', async () => {
    mockOllama(b => {
      if (isIntentCall(b)) return intentJson(['drums', 'bass']);
      return b.messages[0].content.includes('low-end movement') ? 'not json' : firstChoicePlan(b);
    });
    const r = await S3.run('techno', opts);
    expect(r.selectedIds).toHaveLength(2);
    expect(r.code.startsWith('stack(')).toBe(true);
  });

  it('all plans failing → code null', async () => {
    mockOllama(b => (isIntentCall(b) ? intentJson(['drums']) : 'not json'));
    const r = await S3.run('techno', opts);
    expect(r.code).toBeNull();
    expect(r.selectedIds).toEqual([]);
  });

  it('passes earlier selections as cohesion context to later pillars', async () => {
    mockOllama(b => (isIntentCall(b) ? intentJson(['drums', 'bass']) : firstChoicePlan(b)));
    const r = await S3.run('techno', opts);
    const bassPrompt = bodies()[2].messages[0].content;
    const drumName = soundLibrary.drums.find(p => p.id === r.selectedIds[0]).name;
    expect(bassPrompt).toContain(drumName);
  });
});
