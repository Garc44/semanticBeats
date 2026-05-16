import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateTransformationPlan, autoFixCode } from '../src/llm.js';

describe('generateTransformationPlan', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns transform plan for existing code', async () => {
    const plan = {
      mode: 'transform',
      style: 'acid',
      target: 'bass',
      intensity: 0.7,
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: JSON.stringify(plan) } }),
    });
    expect(await generateTransformationPlan('s("bd sd")', 'make it acid')).toEqual(plan);
  });

  it('returns generate plan when code is empty', async () => {
    const plan = { mode: 'generate', seedCode: 's("bd ~ sn ~")', operations: [] };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: JSON.stringify(plan) } }),
    });
    const result = await generateTransformationPlan('', 'make a beat');
    expect(result.mode).toBe('generate');
    expect(typeof result.seedCode).toBe('string');
  });

  it('returns null on invalid JSON', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: 'not json' } }),
    });
    expect(await generateTransformationPlan('s("bd")', 'test')).toBeNull();
  });

  it('returns null on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    expect(await generateTransformationPlan('s("bd")', 'test')).toBeNull();
  });

  it('returns null on fetch error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network'));
    expect(await generateTransformationPlan('s("bd")', 'test')).toBeNull();
  });

  it('returns null when mode field is missing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: '{"target":"bass"}' } }),
    });
    expect(await generateTransformationPlan('s("bd")', 'test')).toBeNull();
  });

  it('returns null when transform mode lacks style string', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: '{"mode":"transform","target":"bass","intensity":0.5}' } }),
    });
    expect(await generateTransformationPlan('s("bd")', 'test')).toBeNull();
  });

  it('returns null when transform mode lacks intensity number', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: '{"mode":"transform","style":"acid","target":"bass"}' } }),
    });
    expect(await generateTransformationPlan('s("bd")', 'test')).toBeNull();
  });

  it('returns null when generate mode lacks seedCode string', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: '{"mode":"generate","operations":[]}' } }),
    });
    expect(await generateTransformationPlan('', 'test')).toBeNull();
  });

  it('strips markdown fences from response', async () => {
    const plan = { mode: 'transform', style: 'groove', target: 'all', intensity: 0.5 };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { content: '```json\n' + JSON.stringify(plan) + '\n```' },
      }),
    });
    expect(await generateTransformationPlan('s("bd")', 'test')).toEqual(plan);
  });

  it('returns compose plan for additive request with existing code', async () => {
    const plan = { mode: 'compose', voiceType: 'melody', notes: 'c4 e4 g4 ~', style: 'acid', intensity: 0.7 };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: JSON.stringify(plan) } }),
    });
    expect(await generateTransformationPlan('s("bd ~ sn ~")', 'add a melody')).toEqual(plan);
  });

  it('returns null for compose mode with empty currentCode', async () => {
    const plan = { mode: 'compose', voiceType: 'melody', notes: 'c4 e4 g4 ~', style: 'acid', intensity: 0.7 };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: JSON.stringify(plan) } }),
    });
    expect(await generateTransformationPlan('', 'add a melody')).toBeNull();
  });

  it('returns null for compose mode with invalid voiceType', async () => {
    const plan = { mode: 'compose', voiceType: 'trumpet', notes: 'c4 e4', style: 'acid', intensity: 0.7 };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: JSON.stringify(plan) } }),
    });
    expect(await generateTransformationPlan('s("bd")', 'add a trumpet')).toBeNull();
  });

  it('returns null for compose mode with missing notes', async () => {
    const plan = { mode: 'compose', voiceType: 'melody', notes: '', style: 'acid', intensity: 0.7 };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: JSON.stringify(plan) } }),
    });
    expect(await generateTransformationPlan('s("bd")', 'add a melody')).toBeNull();
  });

  it('returns null for compose mode with whitespace-only notes', async () => {
    const plan = { mode: 'compose', voiceType: 'melody', notes: '   ', style: 'acid', intensity: 0.7 };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: JSON.stringify(plan) } }),
    });
    expect(await generateTransformationPlan('s("bd")', 'add a melody')).toBeNull();
  });

  it('returns null for compose mode with invalid style', async () => {
    const plan = { mode: 'compose', voiceType: 'melody', notes: 'c4 e4', style: 'jazz', intensity: 0.7 };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: JSON.stringify(plan) } }),
    });
    expect(await generateTransformationPlan('s("bd")', 'add a melody')).toBeNull();
  });

  it('returns null for compose mode with out-of-range intensity', async () => {
    const plan = { mode: 'compose', voiceType: 'melody', notes: 'c4 e4', style: 'acid', intensity: 1.5 };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: JSON.stringify(plan) } }),
    });
    expect(await generateTransformationPlan('s("bd")', 'add a melody')).toBeNull();
  });
});

describe('autoFixCode', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns cleaned code on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: 's("bd sd")' } }),
    });

    const result = await autoFixCode('s("bd sd"', 'Unexpected end of input');
    expect(result).toBe('s("bd sd")');
  });

  it('strips markdown fences from fixed code', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { content: '```javascript\ns("bd sd")\n```' },
      }),
    });

    const result = await autoFixCode('s("bd sd"', 'error');
    expect(result).toBe('s("bd sd")');
  });

  it('throws on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    await expect(autoFixCode('bad code', 'error')).rejects.toThrow('Ollama HTTP 500');
  });
});
