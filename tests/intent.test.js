import { describe, it, expect, vi, beforeEach } from 'vitest';
import { lexIntent, moodVocabulary, GENRES, KEYS, SCALES, GENRE_DEFAULT_BPM, buildIntent, generateIntent } from '../src/intent.js';

describe('lexIntent', () => {
  it('extracts explicit bpm', () => {
    expect(lexIntent('a beat at 90 bpm').bpm).toBe(90);
    expect(lexIntent('90bpm groove').bpm).toBe(90);
    expect(lexIntent('no tempo here').bpm).toBeNull();
  });

  it('maps genre keywords', () => {
    expect(lexIntent('glitchy lo-fi hip hop beat').genre).toBe('lofi_hiphop');
    expect(lexIntent('dark techno banger').genre).toBe('techno');
    expect(lexIntent('random words').genre).toBeNull();
  });

  it('collects textures', () => {
    expect(lexIntent('glitchy dusty beat').textures).toEqual(expect.arrayContaining(['glitch', 'dusty']));
    expect(lexIntent('plain beat').textures).toEqual([]);
  });

  it('maps instrument nouns to pillar hints', () => {
    expect(lexIntent('rhodes piano chords').layerHints).toContain('melody');
    expect(lexIntent('acid 303 line').layerHints).toContain('bass');
    expect(lexIntent('crunchy hats').layerHints).toContain('percussion');
  });

  it('does not match genre/texture keywords inside larger words', () => {
    expect(lexIntent('warehouse party').genre).toBeNull();
    expect(lexIntent('an environment recording').textures).not.toContain('metallic');
  });
});

describe('vocabulary', () => {
  it('moodVocabulary is sorted, unique, lowercase, non-empty', () => {
    const vocab = moodVocabulary();
    expect(vocab.length).toBeGreaterThan(20);
    expect(vocab).toEqual([...new Set(vocab)].sort());
    expect(vocab.every(t => t === t.toLowerCase())).toBe(true);
  });

  it('every genre has a default bpm', () => {
    for (const g of GENRES) expect(GENRE_DEFAULT_BPM[g]).toBeGreaterThan(50);
  });

  it('keys and scales are Strudel-compatible', () => {
    expect(KEYS).toContain('F#');
    expect(SCALES).toContain('phrygian');
  });
});

function ollamaResponse(text) {
  return { ok: true, json: async () => ({ message: { content: text } }) };
}

function mockIntentFetch(intent) {
  global.fetch = vi.fn().mockResolvedValue(ollamaResponse(JSON.stringify(intent)));
}

const LLM_INTENT = {
  genre: 'techno', bpm: 130, key: 'A', scale: 'minor', energy: 'mid',
  moods: ['dark', 'hypnotic'], textures: [], layers: [{ pillar: 'drums', character: 'four on the floor' }],
};

describe('generateIntent', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns parsed intent on valid response', async () => {
    mockIntentFetch(LLM_INTENT);
    const result = await generateIntent('dark hypnotic techno');
    expect(result.genre).toBe('techno');
    expect(result.moods).toContain('dark');
  });

  it('returns null on HTTP error', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    expect(await generateIntent('anything')).toBeNull();
  });

  it('sends a JSON schema with genre enum in format', async () => {
    mockIntentFetch(LLM_INTENT);
    await generateIntent('techno');
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.format.properties.genre.enum).toContain('lofi_hiphop');
    expect(body.format.additionalProperties).toBe(false);
  });
});

describe('buildIntent', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('lexer-locked genre overrides LLM genre', async () => {
    mockIntentFetch(LLM_INTENT); // LLM says techno
    const intent = await buildIntent('lo-fi hip hop with rhodes'); // lexer says lofi
    expect(intent.genre).toBe('lofi_hiphop');
  });

  it('explicit bpm overrides everything', async () => {
    mockIntentFetch(LLM_INTENT);
    const intent = await buildIntent('techno at 90 bpm');
    expect(intent.bpm).toBe(90);
  });

  it('survives total LLM failure with lexer + defaults', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('down'));
    const intent = await buildIntent('glitchy lo-fi hip hop');
    expect(intent.genre).toBe('lofi_hiphop');
    expect(intent.bpm).toBe(82);          // genre default
    expect(intent.key).toBeTruthy();       // default fills
    expect(intent.textures).toContain('glitch');
  });
});
