import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateTransformationPlan, generateTransformPatch } from '../src/llm.js';

function mockPlan(overrides = {}) {
  return {
    selectedId: 'basic_kick',
    explanation: 'Solid 4/4 kick for the foundation.',
    modifications: { speed: 1.0, slowdown: 1 },
    ...overrides,
  };
}

function mockFetch(plan) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ message: { content: JSON.stringify(plan) } }),
  });
}

describe('generateTransformationPlan', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns plan with selectedId on valid response', async () => {
    mockFetch(mockPlan());
    const result = await generateTransformationPlan('drums', 'make a kick', {});
    expect(result).not.toBeNull();
    expect(result.selectedId).toBe('basic_kick');
    expect(typeof result.explanation).toBe('string');
  });

  it('returns modifications object with speed and slowdown', async () => {
    mockFetch(mockPlan({ modifications: { speed: 1.5, slowdown: 2 } }));
    const result = await generateTransformationPlan('drums', 'slower kick', {});
    expect(result.modifications.speed).toBe(1.5);
    expect(result.modifications.slowdown).toBe(2);
  });

  it('includes track role in system prompt', async () => {
    mockFetch(mockPlan());
    await generateTransformationPlan('drums', 'make a kick', {});
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.messages[0].content).toContain('rhythmic foundation');
  });

  it('includes pillar catalog in system prompt', async () => {
    mockFetch(mockPlan({ selectedId: 'bass_rolling_hypnotic' }));
    await generateTransformationPlan('bass', 'deep bass', {});
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.messages[0].content).toContain('bass_rolling_hypnotic');
  });

  it('includes other channels in system prompt as cohesion context', async () => {
    mockFetch(mockPlan());
    const currentTracksState = { drums: 'basic_kick', bass: 'rumble_acid', transitions: null };
    await generateTransformationPlan('melody', 'add synth', currentTracksState);
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.messages[0].content).toContain('basic_kick');
    expect(body.messages[0].content).toContain('rumble_acid');
    expect(body.messages[0].content).not.toContain('melody:');
  });

  it('returns null when fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    const result = await generateTransformationPlan('drums', 'kick', {});
    expect(result).toBeNull();
  });

  it('returns null when selectedId not in catalog', async () => {
    mockFetch(mockPlan({ selectedId: 'nonexistent_id' }));
    const result = await generateTransformationPlan('drums', 'kick', {});
    expect(result).toBeNull();
  });

  it('returns null when selectedId missing', async () => {
    mockFetch({ explanation: 'oops', modifications: {} });
    const result = await generateTransformationPlan('drums', 'kick', {});
    expect(result).toBeNull();
  });

  it('returns null when speed out of range [0.25, 4.0]', async () => {
    mockFetch(mockPlan({ modifications: { speed: 10.0, slowdown: 1 } }));
    const result = await generateTransformationPlan('drums', 'kick', {});
    expect(result).toBeNull();
  });

  it('returns null when speed is below 0.25', async () => {
    mockFetch(mockPlan({ modifications: { speed: 0.1, slowdown: 1 } }));
    const result = await generateTransformationPlan('drums', 'kick', {});
    expect(result).toBeNull();
  });

  it('returns null when slowdown is not an integer', async () => {
    mockFetch(mockPlan({ modifications: { speed: 1.0, slowdown: 1.5 } }));
    const result = await generateTransformationPlan('drums', 'kick', {});
    expect(result).toBeNull();
  });

  it('returns null when slowdown is less than 1', async () => {
    mockFetch(mockPlan({ modifications: { speed: 1.0, slowdown: 0 } }));
    const result = await generateTransformationPlan('drums', 'kick', {});
    expect(result).toBeNull();
  });

  it('strips markdown fences from LLM output', async () => {
    const wrapped = '```json\n' + JSON.stringify(mockPlan()) + '\n```';
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: wrapped } }),
    });
    const result = await generateTransformationPlan('drums', 'kick', {});
    expect(result).not.toBeNull();
    expect(result.selectedId).toBe('basic_kick');
  });

  it('never throws — returns null on JSON parse error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: 'not json at all' } }),
    });
    await expect(generateTransformationPlan('drums', 'kick', {})).resolves.toBeNull();
  });
});

function mockPatchFetch(patch) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ message: { content: JSON.stringify(patch) } }),
  });
}

describe('generateTransformPatch', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('returns parsed patch object on valid response', async () => {
    mockPatchFetch({ reverb: 0.7, crush: 4 });
    const patch = await generateTransformPatch(
      'drums', 'make it gritty',
      { selectedId: 'kick_berghain_rumble', transforms: {} }
    );
    expect(patch).toEqual({ reverb: 0.7, crush: 4 });
  });

  it('returns null when fetch response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    const patch = await generateTransformPatch(
      'drums', 'test', { selectedId: 'kick_berghain_rumble', transforms: {} }
    );
    expect(patch).toBeNull();
  });

  it('returns null when response is an array (not object)', async () => {
    mockPatchFetch([1, 2, 3]);
    const patch = await generateTransformPatch(
      'drums', 'test', { selectedId: 'kick_berghain_rumble', transforms: {} }
    );
    expect(patch).toBeNull();
  });

  it('returns null on invalid JSON', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: 'not json at all' } }),
    });
    const patch = await generateTransformPatch(
      'drums', 'test', { selectedId: 'kick_berghain_rumble', transforms: {} }
    );
    expect(patch).toBeNull();
  });

  it('strips markdown fences before parsing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: '```json\n{"reverb": 0.5}\n```' } }),
    });
    const patch = await generateTransformPatch(
      'drums', 'test', { selectedId: 'kick_berghain_rumble', transforms: {} }
    );
    expect(patch).toEqual({ reverb: 0.5 });
  });

  it('includes currentTransforms in system prompt', async () => {
    mockPatchFetch({});
    await generateTransformPatch(
      'drums', 'test',
      { selectedId: 'kick_berghain_rumble', transforms: { crush: 4 } }
    );
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.messages[0].content).toContain('"crush": 4');
  });

  it('null patch value passes through (removal intent preserved for mergeLlmTransformPatch)', async () => {
    mockPatchFetch({ crush: null });
    const patch = await generateTransformPatch(
      'drums', 'remove the grit',
      { selectedId: 'kick_berghain_rumble', transforms: { crush: 4 } }
    );
    expect(patch).toEqual({ crush: null });
  });
});

describe('autoFixCode', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns fixed code string on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: 's("bd*4")' } }),
    });
    const { autoFixCode } = await import('../src/llm.js');
    const result = await autoFixCode('broken code', 'SyntaxError');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('throws on HTTP error', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const { autoFixCode } = await import('../src/llm.js');
    await expect(autoFixCode('broken', 'error')).rejects.toThrow();
  });
});
