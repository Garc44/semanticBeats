import { describe, it, expect } from 'vitest';
import { ALL_TAGS, LIBRARY_TAG_MAP, canonicalTags, normalizeLibraryTags, tagsForPatternIds, patternById } from '../../eval/vocabulary.js';
import { soundLibrary } from '../../src/library/soundLibrary.js';

const allPatterns = Object.entries(soundLibrary).flatMap(([pillar, ps]) => ps.map(p => ({ pillar, p })));

describe('vocabulary', () => {
  it('has no duplicate tags across facets', () => {
    expect(new Set(ALL_TAGS).size).toBe(ALL_TAGS.length);
  });

  it('maps every library tag explicitly (empty list = deliberately dropped)', () => {
    const libTags = new Set(allPatterns.flatMap(({ p }) => p.tags));
    const missing = [...libTags].filter(t => !(t in LIBRARY_TAG_MAP));
    expect(missing).toEqual([]);
  });

  it('maps only into the vocabulary', () => {
    for (const targets of Object.values(LIBRARY_TAG_MAP)) for (const t of targets) expect(ALL_TAGS).toContain(t);
  });

  it('pattern ids are unique across pillars', () => {
    const ids = allPatterns.map(({ p }) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('canonicalTags filters, dedupes and sorts', () => {
    expect(canonicalTags(['techno', 'dark', 'nonsense', 'dark'])).toEqual(['dark', 'techno']);
  });

  it('normalises library tags', () => {
    expect(normalizeLibraryTags(['303', 'squelch', 'hihat', '909'])).toEqual(['acid', 'hats']);
  });

  it('tagsForPatternIds unions pillar element + library tags', () => {
    expect(patternById('basic_kick').pillar).toBe('drums');
    expect(tagsForPatternIds(['basic_kick'])).toEqual(['kick', 'techno']);
    expect(tagsForPatternIds(['basic_kick', 'unknown_id'])).toEqual(['kick', 'techno']);
    expect(tagsForPatternIds([])).toEqual([]);
  });

  it('every library pattern yields at least one tag', () => {
    for (const { p } of allPatterns) expect(tagsForPatternIds([p.id]).length).toBeGreaterThan(0);
  });
});
