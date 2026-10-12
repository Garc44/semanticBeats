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

  const testIntent = {
    genre: 'techno', bpm: 130, key: 'A', scale: 'minor', energy: 'mid',
    moods: ['dark', 'minimal'], textures: [], layers: [],
  };

  it('with intent: narrows catalog to top-8 retrieved patterns', async () => {
    mockFetch(mockPlan());
    await generateTransformationPlan('bass', 'dark bass', {}, testIntent);
    const systemText = systemTextOf(global.fetch.mock.calls[0]);
    const idCount = (systemText.match(/"id":/g) ?? []).length;
    expect(idCount).toBeLessThanOrEqual(8);
  });

  it('with intent: includes intent summary in system prompt', async () => {
    mockFetch(mockPlan());
    await generateTransformationPlan('bass', 'dark bass', {}, testIntent);
    expect(systemTextOf(global.fetch.mock.calls[0])).toContain('"genre":"techno"');
  });

  it('with intent: schema enum only contains narrowed ids', async () => {
    mockFetch(mockPlan());
    await generateTransformationPlan('bass', 'dark bass', {}, testIntent);
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.format.properties.selectedId.enum.length).toBeLessThanOrEqual(8);
  });

  it('without intent: full catalog (back-compat)', async () => {
    mockFetch(mockPlan());
    await generateTransformationPlan('bass', 'dark bass', {});
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.format.properties.selectedId.enum.length).toBeGreaterThan(8);
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

import { callOllamaDetailed } from '../src/llm.js';

function bodyOf(call) { return JSON.parse(call[1].body); }

describe('callOllamaDetailed', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('keeps app defaults: temperature 0, seed 42, num_predict 200', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ message: { content: 'x' } }) });
    await callOllamaDetailed('sys', 'user');
    expect(bodyOf(global.fetch.mock.calls[0]).options).toEqual({ temperature: 0, seed: 42, num_predict: 200 });
  });

  it('forwards temperature, seed, numPredict and reports tokens via onCall', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      message: { content: '```js\ns("bd")\n```' }, prompt_eval_count: 120, eval_count: 30,
    }) });
    const seen = [];
    const r = await callOllamaDetailed('sys', 'user', { temperature: 0.7, seed: 1003, numPredict: 1024, onCall: x => seen.push(x) });
    expect(bodyOf(global.fetch.mock.calls[0]).options).toEqual({ temperature: 0.7, seed: 1003, num_predict: 1024 });
    expect(r.text).toBe('s("bd")');
    expect(r.raw).toBe('```js\ns("bd")\n```');
    expect(r).toMatchObject({ promptTokens: 120, evalTokens: 30 });
    expect(typeof r.durationMs).toBe('number');
    expect(seen).toHaveLength(1);
  });
});

describe('generateTransformationPlan options', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('forwards llm options to Ollama', async () => {
    mockFetch(mockPlan());
    await generateTransformationPlan('drums', 'kick', {}, null, { llm: { temperature: 0.7, seed: 7, numPredict: 1024 } });
    expect(bodyOf(global.fetch.mock.calls[0]).options).toEqual({ temperature: 0.7, seed: 7, num_predict: 1024 });
  });

  it('reasoning: schema demands reasoning first and the plan returns it', async () => {
    mockFetch(mockPlan({ reasoning: 'Four on the floor fits techno.' }));
    const plan = await generateTransformationPlan('drums', 'kick', {}, null, { reasoning: true });
    const schema = bodyOf(global.fetch.mock.calls[0]).format;
    expect(Object.keys(schema.properties)[0]).toBe('reasoning');
    expect(schema.required).toContain('reasoning');
    expect(plan.reasoning).toBe('Four on the floor fits techno.');
    expect(systemTextOf(global.fetch.mock.calls[0])).toContain('reasoning');
  });

  it('without reasoning the schema has no reasoning field', async () => {
    mockFetch(mockPlan());
    const plan = await generateTransformationPlan('drums', 'kick', {});
    expect(bodyOf(global.fetch.mock.calls[0]).format.properties.reasoning).toBeUndefined();
    expect(plan.reasoning).toBeUndefined();
  });

  it('injects graph context into the system prompt', async () => {
    mockFetch(mockPlan());
    await generateTransformationPlan('drums', 'kick', {}, null, { graphContext: 'detroit → 118–127 BPM' });
    expect(systemTextOf(global.fetch.mock.calls[0])).toContain('detroit → 118–127 BPM');
  });

  it('catalogOverride restricts the selectedId enum', async () => {
    const { soundLibrary } = await import('../src/library/soundLibrary.js');
    const two = soundLibrary.drums.slice(0, 2);
    mockFetch(mockPlan({ selectedId: two[0].id }));
    await generateTransformationPlan('drums', 'kick', {}, null, { catalogOverride: two });
    expect(bodyOf(global.fetch.mock.calls[0]).format.properties.selectedId.enum).toEqual(two.map(p => p.id));
  });

  it('few-shot examples contain no typos', async () => {
    mockFetch(mockPlan());
    await generateTransformationPlan('drums', 'kick', {});
    expect(systemTextOf(global.fetch.mock.calls[0])).not.toContain('exlaplanation');
  });
});
