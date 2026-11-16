import { describe, it, expect } from 'vitest';
import { selectionBaselines } from '../../eval/library/baselines.js';

// Two pillars: one drums pattern, two bass patterns → two combinations.
const pillars = [[['kick', 'dub']], [['bass'], ['bass', 'dark']]];

describe('selectionBaselines', () => {
  it('random = exact mean over all one-per-pillar combinations', () => {
    const { random } = selectionBaselines(['dub', 'dark'], pillars);
    // {kick,dub,bass}: P 1/3, R 1/2, F1 0.4 · {kick,dub,bass,dark}: P 1/2, R 1, F1 2/3
    expect(random.precision).toBeCloseTo((1 / 3 + 1 / 2) / 2);
    expect(random.recall).toBeCloseTo((1 / 2 + 1) / 2);
    expect(random.f1).toBeCloseTo((0.4 + 2 / 3) / 2);
  });

  it('best = highest F1 of any combination', () => {
    expect(selectionBaselines(['dub', 'dark'], pillars).best.f1).toBeCloseTo(2 / 3);
  });

  it('counts each combination once (duplicate tags inside a combination do not matter)', () => {
    const { random } = selectionBaselines(['kick'], [[['kick']], [['kick']]]);
    expect(random.f1).toBe(1);
  });
});
