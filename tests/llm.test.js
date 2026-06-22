import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateTransformationPlan, generateTransformPatch } from '../src/llm.js';

// Wrap text the way Ollama's /api/chat response nests it.
function ollamaResponse(text) {
  return { ok: true, json: async () => ({ message: { content: text } }) };
}

// Pull the system prompt out of a captured Ollama request body.
function systemTextOf(call) {
  return JSON.parse(call[1].body).messages[0].content;
}

function mockPlan(overrides = {}) {
  return {
    selectedId: 'basic_kick',
    explanation: 'Solid 4/4 kick for the foundation.',
    modifications: { speed: 1.0, slowdown: 1 },
    ...overrides,
  };
}

function mockFetch(plan) {
  global.fetch = vi.fn().mockResolvedValue(ollamaResponse(JSON.stringify(plan)));
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
    expect(systemTextOf(global.fetch.mock.calls[0])).toContain('rhythmic foundation');
  });

  it('includes pillar catalog in system prompt', async () => {
    mockFetch(mockPlan({ selectedId: 'bass_rolling_hypnotic' }));
    await generateTransformationPlan('bass', 'deep bass', {});
    expect(systemTextOf(global.fetch.mock.calls[0])).toContain('bass_rolling_hypnotic');
  });

  it('includes other channels (name + tags) in system prompt as cohesion context', async () => {
    mockFetch(mockPlan());
    const currentTracksState = { drums: 'basic_kick', bass: 'rumble_acid', transitions: null };
    await generateTransformationPlan('melody', 'add synth', currentTracksState);
    const systemText = systemTextOf(global.fetch.mock.calls[0]);
    // known id resolves to its display name + tags
    expect(systemText).toContain('Basic Kick');
    expect(systemText).toContain('kick');
    // unknown id falls back to the raw id
    expect(systemText).toContain('rumble_acid');
    // empty channel marked, own channel excluded
    expect(systemText).toContain('(empty)');
    expect(systemText).not.toContain('melody:');
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
    global.fetch = vi.fn().mockResolvedValue(ollamaResponse(wrapped));
    const result = await generateTransformationPlan('drums', 'kick', {});
    expect(result).not.toBeNull();
    expect(result.selectedId).toBe('basic_kick');
  });

  it('never throws — returns null on JSON parse error', async () => {
    global.fetch = vi.fn().mockResolvedValue(ollamaResponse('not json at all'));
    await expect(generateTransformationPlan('drums', 'kick', {})).resolves.toBeNull();
  });
});

function mockPatchFetch(patch) {
  global.fetch = vi.fn().mockResolvedValue(ollamaResponse(JSON.stringify(patch)));
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
    global.fetch = vi.fn().mockResolvedValue(ollamaResponse('not json at all'));
    const patch = await generateTransformPatch(
      'drums', 'test', { selectedId: 'kick_berghain_rumble', transforms: {} }
    );
    expect(patch).toBeNull();
  });

  it('strips markdown fences before parsing', async () => {
    global.fetch = vi.fn().mockResolvedValue(ollamaResponse('```json\n{"reverb": 0.5}\n```'));
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
    expect(systemTextOf(global.fetch.mock.calls[0])).toContain('"crush": 4');
  });

  it('null patch value passes through (removal intent preserved for mergeLlmTransformPatch)', async () => {
    mockPatchFetch({ crush: null });
    const patch = await generateTransformPatch(
      'drums', 'remove the grit',
      { selectedId: 'kick_berghain_rumble', transforms: { crush: 4 } }
    );
    expect(patch).toEqual({ crush: null });
  });

  // airbag: LLM leads, but if it returns {} on a clearly-named request, the
  // deterministic parser catches it instead of producing a dead no-op.
  it('falls back to the parser when the LLM returns an empty object', async () => {
    mockPatchFetch({});
    const patch = await generateTransformPatch(
      'drums', 'add reverb',
      { selectedId: 'kick_berghain_rumble', transforms: {} }
    );
    expect(patch).toEqual({ reverb: 0.4 });
  });

  it('falls back to the parser when the LLM call errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    const patch = await generateTransformPatch(
      'drums', 'reverb 0.9',
      { selectedId: 'kick_berghain_rumble', transforms: {} }
    );
    expect(patch).toEqual({ reverb: 0.9 });
  });

  it('returns null when both the LLM and the parser find nothing', async () => {
    mockPatchFetch({});
    const patch = await generateTransformPatch(
      'drums', 'make it sound higher',
      { selectedId: 'kick_berghain_rumble', transforms: {} }
    );
    expect(patch).toBeNull();
  });
});

describe('autoFixCode', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns fixed code string on success', async () => {
    global.fetch = vi.fn().mockResolvedValue(ollamaResponse('s("bd*4")'));
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
