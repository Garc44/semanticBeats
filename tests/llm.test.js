import { describe, it, expect, vi, beforeEach } from 'vitest';
import { classifyIntent, autoFixCode, generateCode } from '../src/llm.js';

describe('classifyIntent', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns parsed JSON on valid response', async () => {
    const mock = {
      interpretation: 'reduce high frequencies',
      strudelFunctions: ['lpf'],
      preserve: ['rhythm'],
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: JSON.stringify(mock) } }),
    });

    const result = await classifyIntent('s("bd sd")', 'make it darker');
    expect(result).toEqual(mock);
  });

  it('returns null on invalid JSON', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: 'not json' } }),
    });

    const result = await classifyIntent('s("bd sd")', 'make it darker');
    expect(result).toBeNull();
  });

  it('returns null on fetch error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network error'));

    const result = await classifyIntent('s("bd sd")', 'make it darker');
    expect(result).toBeNull();
  });

  it('returns null on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    const result = await classifyIntent('s("bd sd")', 'make it darker');
    expect(result).toBeNull();
  });

  it('strips markdown fences from response', async () => {
    const mock = {
      interpretation: 'add reverb',
      strudelFunctions: ['room'],
      preserve: ['notes'],
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { content: '```json\n' + JSON.stringify(mock) + '\n```' },
      }),
    });

    const result = await classifyIntent('s("bd sd")', 'add reverb');
    expect(result).toEqual(mock);
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

describe('generateCode', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('builds classification-aware prompt when classification provided', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: 's("bd sd").lpf(500)' } }),
    });

    const classification = {
      interpretation: 'reduce high frequencies',
      strudelFunctions: ['lpf'],
      preserve: ['rhythm'],
    };

    await generateCode([], 's("bd sd")', 'make it darker', classification);

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    const userMsg = body.messages.find((m) => m.role === 'user').content;
    expect(userMsg).toContain('Do exactly: reduce high frequencies');
    expect(userMsg).toContain('Use: lpf');
    expect(userMsg).toContain('Preserve: rhythm');
  });

  it('falls back to plain prompt when classification is null', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: 's("bd sd")' } }),
    });

    await generateCode([], 's("bd sd")', 'make it darker', null);

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    const userMsg = body.messages.find((m) => m.role === 'user').content;
    expect(userMsg).toBe('Current code:\ns("bd sd")\n\nRequest: make it darker');
  });

  it('falls back to plain prompt when classification omitted', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: 's("bd sd")' } }),
    });

    await generateCode([], 's("bd sd")', 'make it darker');

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    const userMsg = body.messages.find((m) => m.role === 'user').content;
    expect(userMsg).toBe('Current code:\ns("bd sd")\n\nRequest: make it darker');
  });

  it('strips markdown fences from output', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { content: '```javascript\ns("bd sd")\n```' },
      }),
    });

    const result = await generateCode([], 's("bd sd")', 'test');
    expect(result).toBe('s("bd sd")');
  });

  it('throws on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 });

    await expect(generateCode([], 's("bd sd")', 'test')).rejects.toThrow('Ollama HTTP 503');
  });
});
