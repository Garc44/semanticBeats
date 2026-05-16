import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateTransformationPlan, autoFixCode } from '../src/llm.js';

describe('generateTransformationPlan', () => {
  beforeEach(() => vi.restoreAllMocks());

  function capturedBody() {
    return JSON.parse(global.fetch.mock.calls[0][1].body);
  }

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

  it('includes pillarName in system message content', async () => {
    const plan = { mode: 'transform', style: 'acid', target: 'bass', intensity: 0.7 };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: JSON.stringify(plan) } }),
    });
    await generateTransformationPlan('s("bd")', 'make it acid', [], 0.5, 'bassline');
    const body = capturedBody();
    expect(body.messages[0].content).toContain('bassline');
  });

  it('includes intensityHint in system message content', async () => {
    const plan = { mode: 'transform', style: 'acid', target: 'bass', intensity: 0.8 };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: JSON.stringify(plan) } }),
    });
    await generateTransformationPlan('s("bd")', 'make it acid', [], 0.8, 'melody');
    const body = capturedBody();
    expect(body.messages[0].content).toContain('0.8');
  });

  it('passes history as middle messages in fetch body', async () => {
    const plan = { mode: 'transform', style: 'groove', target: 'all', intensity: 0.5 };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: JSON.stringify(plan) } }),
    });
    const history = [
      { role: 'user', content: 'Previous request' },
      { role: 'assistant', content: '{"mode":"transform","style":"minimal","target":"all","intensity":0.3}' },
    ];
    await generateTransformationPlan('s("bd")', 'now groovy', history, 0.5, 'foundation');
    const body = capturedBody();
    expect(body.messages).toHaveLength(4); // system + 2 history + user
    expect(body.messages[1]).toEqual(history[0]);
    expect(body.messages[2]).toEqual(history[1]);
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
