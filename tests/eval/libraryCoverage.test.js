import { describe, it, expect } from 'vitest';
import { libraryCoverage, coverageGaps } from '../../eval/library/coverage.js';
import { LIBRARY_COVERAGE } from '../../eval/config.js';
import { ALL_TAGS, LIBRARY_TAG_MAP } from '../../eval/vocabulary.js';

const mini = { drums: [{ tags: ['kick', 'dub'] }], bass: [], melody: [] };

describe('libraryCoverage', () => {
  it('counts normalised tags per pillar', () => {
    expect(libraryCoverage(mini).drums.dub).toBe(1);
    expect(libraryCoverage(mini).drums.kick).toBe(1);
  });
});

describe('coverageGaps', () => {
  it('lists missing subgenre counts against the target', () => {
    expect(coverageGaps(mini)).toContainEqual({ pillar: 'drums', tag: 'dub', have: 1, need: 4 });
    expect(coverageGaps(mini)).toContainEqual({ pillar: 'bass', tag: 'warm', have: 0, need: 2 });
  });

  it('skips exempt pairs', () => {
    for (const [pillar, tags] of Object.entries(LIBRARY_COVERAGE.exempt))
      for (const tag of tags) expect(coverageGaps(mini)).not.toContainEqual(expect.objectContaining({ pillar, tag }));
  });

  it('does not require element tags', () => {
    expect(coverageGaps(mini).map(g => g.tag)).not.toContain('kick');
  });
});

describe('LIBRARY_TAG_MAP identity entries', () => {
  it('maps every vocabulary tag to itself', () => {
    for (const t of ALL_TAGS) expect(LIBRARY_TAG_MAP[t], t).toContain(t);
  });
});
