import { vi } from 'vitest';

// Route each Ollama request to handler(body) → response content string.
export function mockOllama(handler) {
  global.fetch = vi.fn(async (_url, init) => {
    const body = JSON.parse(init.body);
    return { ok: true, json: async () => ({ message: { content: handler(body) }, prompt_eval_count: 10, eval_count: 5 }) };
  });
  return global.fetch;
}

export const bodies = () => global.fetch.mock.calls.map(c => JSON.parse(c[1].body));
export const isIntentCall = body => Boolean(body.format?.properties?.genre);
export const isPlanCall = body => Boolean(body.format?.properties?.selectedId);

export const intentJson = layers => JSON.stringify({
  genre: 'techno', key: 'A', scale: 'minor', energy: 'mid', moods: ['dark'], textures: [],
  layers: layers.map(pillar => ({ pillar, character: 'x' })),
});

// Picks the first allowed id — always valid regardless of retrieval ranking.
export const firstChoicePlan = (body, extra = {}) => JSON.stringify({
  selectedId: body.format.properties.selectedId.enum[0],
  explanation: 'fits', modifications: { speed: 1, slowdown: 1 }, ...extra,
});

export const isFormCall = body => Boolean(body.format?.properties?.bassA);

export const formJson = (o = {}) => JSON.stringify({
  reasoning: 'r', subgenre: 'acid', key: 'E', scale: 'minor',
  bassA: '..0...0...4.4.4.', bassB: '..1...1...5.5.5.',
  hat: '..x...x...x...x.', openhat: '..............x.', clap: '....x.......x...', stab: '......5.......7.',
  bassSound: 'sawtooth', bassCutoff: 500, bassResonance: 16, stabSound: 'square', effect: 'filter_sweep', effectAmount: 8, ...o,
});
