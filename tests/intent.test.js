import { describe, it, expect } from 'vitest';
import { lexIntent, moodVocabulary, GENRES, KEYS, SCALES, GENRE_DEFAULT_BPM } from '../src/intent.js';

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
