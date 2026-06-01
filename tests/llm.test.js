import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateTransformationPlan } from '../src/llm.js';

function mockPlan(overrides = {}) {
  return {
    selectedId: 'kick_sine_44',
    explanation: 'Solid 4/4 kick for the foundation.',
    modifications: { gain: 1.0, speed: 1.0, slowdown: 1 },
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
    const result = await generateTransformationPlan('', 'make a kick', 'kick');
    expect(result).not.toBeNull();
    expect(result.selectedId).toBe('kick_sine_44');
    expect(typeof result.explanation).toBe('string');
  });

  it('returns modifications object', async () => {
    mockFetch(mockPlan({ modifications: { gain: 0.8, speed: 1.0, slowdown: 1 } }));
    const result = await generateTransformationPlan('', 'softer kick', 'kick');
    expect(result.modifications.gain).toBe(0.8);
  });

  it('sends pillarName in system message', async () => {
    mockFetch(mockPlan());
    await generateTransformationPlan('', 'make a kick', 'kick');
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.messages[0].content).toContain('kick');
  });

  it('injects catalog IDs into system prompt', async () => {
    mockFetch(mockPlan({ selectedId: 'rumble_hypnotic' }));
    await generateTransformationPlan('', 'deep bass', 'rumble_bass');
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.messages[0].content).toContain('rumble_hypnotic');
  });

  it('sends currentCode in user message when non-empty', async () => {
    const code = `note("c1*4").s("sine")`;
    mockFetch(mockPlan());
    await generateTransformationPlan(code, 'harder', 'kick');
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.messages[1].content).toContain('Current code:');
    expect(body.messages[1].content).toContain(code);
  });

  it('omits currentCode in user message when empty', async () => {
    mockFetch(mockPlan());
    await generateTransformationPlan('', 'start fresh', 'kick');
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.messages[1].content).not.toContain('Current code:');
  });

  it('returns null on invalid JSON', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: 'not json' } }),
    });
    expect(await generateTransformationPlan('', 'test', 'kick')).toBeNull();
  });

  it('returns null on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    expect(await generateTransformationPlan('', 'test', 'kick')).toBeNull();
  });

  it('returns null on fetch error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network'));
    expect(await generateTransformationPlan('', 'test', 'kick')).toBeNull();
  });

  it('returns null when selectedId missing', async () => {
    const { selectedId: _, ...plan } = mockPlan();
    mockFetch(plan);
    expect(await generateTransformationPlan('', 'test', 'kick')).toBeNull();
  });

  it('returns null when selectedId not in catalog', async () => {
    mockFetch(mockPlan({ selectedId: 'nonexistent_id' }));
    expect(await generateTransformationPlan('', 'test', 'kick')).toBeNull();
  });

  it('returns null when gain out of range (above 1.2)', async () => {
    mockFetch(mockPlan({ modifications: { gain: 2.5 } }));
    expect(await generateTransformationPlan('', 'test', 'kick')).toBeNull();
  });

  it('returns null when gain is negative', async () => {
    mockFetch(mockPlan({ modifications: { gain: -0.1 } }));
    expect(await generateTransformationPlan('', 'test', 'kick')).toBeNull();
  });

  it('returns null when slowdown is not integer', async () => {
    mockFetch(mockPlan({ modifications: { slowdown: 1.5 } }));
    expect(await generateTransformationPlan('', 'test', 'kick')).toBeNull();
  });

  it('returns null when slowdown is zero', async () => {
    mockFetch(mockPlan({ modifications: { slowdown: 0 } }));
    expect(await generateTransformationPlan('', 'test', 'kick')).toBeNull();
  });

  it('returns null when speed is negative', async () => {
    mockFetch(mockPlan({ modifications: { speed: -1 } }));
    expect(await generateTransformationPlan('', 'test', 'kick')).toBeNull();
  });

  it('strips markdown fences from response', async () => {
    const plan = mockPlan();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: '```json\n' + JSON.stringify(plan) + '\n```' } }),
    });
    const result = await generateTransformationPlan('', 'test', 'kick');
    expect(result).not.toBeNull();
  });

  it('accepts plan with no modifications field', async () => {
    const { modifications: _, ...plan } = mockPlan();
    mockFetch(plan);
    const result = await generateTransformationPlan('', 'test', 'kick');
    expect(result).not.toBeNull();
    expect(result.modifications).toEqual({});
  });

  it('accepts valid non-default modifications', async () => {
    mockFetch(mockPlan({ modifications: { gain: 0.6, speed: 1.5, slowdown: 2 } }));
    const result = await generateTransformationPlan('', 'test', 'kick');
    expect(result).not.toBeNull();
    expect(result.modifications.gain).toBe(0.6);
    expect(result.modifications.speed).toBe(1.5);
    expect(result.modifications.slowdown).toBe(2);
  });

  it('returns null for unknown pillar (empty catalog, no id match)', async () => {
    mockFetch(mockPlan({ selectedId: 'kick_sine_44' }));
    expect(await generateTransformationPlan('', 'test', 'unknown_pillar')).toBeNull();
  });

  it('uses correct pillar catalog — rumble_bass id valid for rumble_bass, not kick', async () => {
    mockFetch(mockPlan({ selectedId: 'rumble_hypnotic' }));
    const result = await generateTransformationPlan('', 'test', 'rumble_bass');
    expect(result).not.toBeNull();
    expect(result.selectedId).toBe('rumble_hypnotic');
  });
});
