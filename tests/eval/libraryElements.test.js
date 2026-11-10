import { describe, it, expect } from 'vitest';
import { TECHNO_DRUMS } from '../../src/library/techno/drums.js';

// Unambiguous drum sounds → the element tag a v2 kit must carry (S3–S5 ID-F1 uses these tags).
const SOUND_ELEMENT = [[/\b(hh|oh)\b/, 'hats'], [/\bcp\b/, 'clap'], [/\b(cb|rim)\b/, 'percussion']];
const soundsOf = code => [...code.matchAll(/s\("([^"]*)"\)/g)].map(m => m[1]).join(' ');

describe('v2 drum kits tag the elements they play', () => {
  it.each(TECHNO_DRUMS.map(p => [p.id, p]))('%s', (_id, p) => {
    const sounds = soundsOf(p.code);
    for (const [re, tag] of SOUND_ELEMENT) if (re.test(sounds)) expect(p.tags, `${tag} (${sounds})`).toContain(tag);
  });
});
