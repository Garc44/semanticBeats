import { describe, it, expect } from 'vitest';
import { soundLibrary, GENRE_PRESETS, GENRE_NAMES, getPatternById, getGenreCode } from '../src/library/soundLibrary.js';

const PILLAR_NAMES = ['drums', 'bass_percussion', 'melody', 'transitions'];

describe('soundLibrary', () => {
  it('exports all 4 pillars', () => {
    for (const pillar of PILLAR_NAMES) {
      expect(Array.isArray(soundLibrary[pillar])).toBe(true);
    }
  });

  it('each pillar has at least 2 patterns', () => {
    for (const pillar of PILLAR_NAMES) {
      expect(soundLibrary[pillar].length).toBeGreaterThanOrEqual(2);
    }
  });

  it('each pattern has id, name, tags, code', () => {
    for (const pillar of PILLAR_NAMES) {
      for (const p of soundLibrary[pillar]) {
        expect(typeof p.id).toBe('string');
        expect(p.id.length).toBeGreaterThan(0);
        expect(typeof p.name).toBe('string');
        expect(Array.isArray(p.tags)).toBe(true);
        expect(p.tags.length).toBeGreaterThan(0);
        expect(typeof p.code).toBe('string');
        expect(p.code.length).toBeGreaterThan(0);
      }
    }
  });

  it('all IDs are unique within each pillar', () => {
    for (const pillar of PILLAR_NAMES) {
      const ids = soundLibrary[pillar].map(p => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('all code strings have balanced parentheses', () => {
    for (const pillar of PILLAR_NAMES) {
      for (const p of soundLibrary[pillar]) {
        let depth = 0;
        for (const ch of p.code) {
          if (ch === '(') depth++;
          else if (ch === ')') depth--;
        }
        expect(depth).toBe(0);
      }
    }
  });

  it('all tags arrays contain only strings', () => {
    for (const pillar of PILLAR_NAMES) {
      for (const p of soundLibrary[pillar]) {
        for (const tag of p.tags) {
          expect(typeof tag).toBe('string');
        }
      }
    }
  });
});

describe('GENRE_PRESETS', () => {
  it('has at least one genre', () => {
    expect(Object.keys(GENRE_PRESETS).length).toBeGreaterThan(0);
  });

  it('techno preset exists', () => {
    expect(GENRE_PRESETS.techno).toBeDefined();
  });

  it('each genre preset has all 4 pillars', () => {
    for (const [, preset] of Object.entries(GENRE_PRESETS)) {
      for (const pillar of PILLAR_NAMES) {
        expect(typeof preset[pillar]).toBe('string');
      }
    }
  });

  it('all preset IDs reference existing soundLibrary entries', () => {
    for (const [, preset] of Object.entries(GENRE_PRESETS)) {
      for (const [pillar, id] of Object.entries(preset)) {
        const found = soundLibrary[pillar]?.find(p => p.id === id);
        expect(found).toBeDefined();
      }
    }
  });
});

describe('GENRE_NAMES', () => {
  it('matches keys of GENRE_PRESETS', () => {
    expect(GENRE_NAMES).toEqual(Object.keys(GENRE_PRESETS));
  });

  it('includes techno', () => {
    expect(GENRE_NAMES).toContain('techno');
  });
});

describe('getPatternById', () => {
  it('returns pattern for valid id', () => {
    const p = getPatternById('drums', 'kick_sine_44');
    expect(p).not.toBeNull();
    expect(p.id).toBe('kick_sine_44');
  });

  it('returns pattern object with all required fields', () => {
    const p = getPatternById('bass_percussion', 'rumble_acid');
    expect(p).toHaveProperty('id');
    expect(p).toHaveProperty('name');
    expect(p).toHaveProperty('tags');
    expect(p).toHaveProperty('code');
  });

  it('returns null for unknown id', () => {
    expect(getPatternById('drums', 'nonexistent_id')).toBeNull();
  });

  it('returns null for unknown pillar', () => {
    expect(getPatternById('unknown_pillar', 'kick_sine_44')).toBeNull();
  });
});

describe('getGenreCode', () => {
  it('returns code strings for all 4 pillars for techno genre', () => {
    const result = getGenreCode('techno');
    expect(result).not.toBeNull();
    for (const pillar of PILLAR_NAMES) {
      expect(typeof result[pillar]).toBe('string');
      expect(result[pillar].length).toBeGreaterThan(0);
    }
  });

  it('returns null for unknown genre', () => {
    expect(getGenreCode('unknown_genre')).toBeNull();
  });

  it('returned code strings match base pattern code', () => {
    const result = getGenreCode('techno');
    const preset = GENRE_PRESETS.techno;
    for (const pillar of PILLAR_NAMES) {
      const expected = getPatternById(pillar, preset[pillar])?.code;
      expect(result[pillar]).toBe(expected);
    }
  });
});
