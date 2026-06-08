import { describe, it, expect } from 'vitest';
import { soundLibrary, getPatternById } from '../src/library/soundLibrary.js';

const PILLAR_NAMES = ['drums', 'bass', 'percussion', 'melody', 'transitions'];

describe('soundLibrary', () => {
  it('exports all 5 pillars', () => {
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

  it('bass pillar contains only rumble_* patterns', () => {
    for (const p of soundLibrary.bass) {
      expect(p.id).toMatch(/^rumble_/);
    }
  });

  it('percussion pillar contains only perc_* patterns', () => {
    for (const p of soundLibrary.percussion) {
      expect(p.id).toMatch(/^perc_/);
    }
  });
});

describe('getPatternById', () => {
  it('returns pattern for valid id', () => {
    const p = getPatternById('drums', 'kick_sine_44');
    expect(p).not.toBeNull();
    expect(p.id).toBe('kick_sine_44');
  });

  it('returns pattern object with all required fields', () => {
    const p = getPatternById('bass', 'rumble_acid');
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
