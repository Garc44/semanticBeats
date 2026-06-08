import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateTransformationPlan } from '../src/llm.js';

function mockPlan(overrides = {}) {
  return {
    selectedId: 'kick_sine_44',
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
    expect(result.selectedId).toBe('kick_sine_44');
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
    mockFetch(mockPlan({ selectedId: 'rumble_hypnotic' }));
    await generateTransformationPlan('bass', 'deep bass', {});
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.messages[0].content).toContain('rumble_hypnotic');
  });

  it('includes other channels in system prompt as cohesion context', async () => {
    mockFetch(mockPlan());
    const currentTracksState = { drums: 'kick_sine_44', bass: 'rumble_acid', transitions: null };
    await generateTransformationPlan('melody', 'add synth', currentTracksState);
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.messages[0].content).toContain('kick_sine_44');
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
    expect(result.selectedId).toBe('kick_sine_44');
  });

  it('never throws — returns null on JSON parse error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: 'not json at all' } }),
    });
    await expect(generateTransformationPlan('drums', 'kick', {})).resolves.toBeNull();
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
