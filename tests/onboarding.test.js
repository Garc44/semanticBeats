import { describe, it, expect } from 'vitest';
import { shouldShowOnboarding, TOUR_STEPS } from '../src/onboarding.js';

function fakeStorage(initial = {}) {
  const map = { ...initial };
  return {
    getItem: (k) => (k in map ? map[k] : null),
    setItem: (k, v) => { map[k] = String(v); },
  };
}

describe('shouldShowOnboarding', () => {
  it('returns true when the flag is unset', () => {
    expect(shouldShowOnboarding(fakeStorage())).toBe(true);
  });

  it('returns false when the flag is set', () => {
    expect(shouldShowOnboarding(fakeStorage({ sb_onboarded: '1' }))).toBe(false);
  });
});

describe('TOUR_STEPS', () => {
  it('has exactly four steps', () => {
    expect(TOUR_STEPS).toHaveLength(4);
  });

  it('every step has a non-empty selector, title, and body', () => {
    for (const step of TOUR_STEPS) {
      expect(step.selector.trim().length).toBeGreaterThan(0);
      expect(step.title.trim().length).toBeGreaterThan(0);
      expect(step.body.trim().length).toBeGreaterThan(0);
    }
  });
});
