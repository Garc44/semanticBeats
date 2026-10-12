import { describe, it, expect } from 'vitest';
import { isKnownSound, soundLabel } from '../../eval/knownSounds.js';
import { queryCycle } from '../../eval/strudelHeadless.js';
import { soundLibrary } from '../../src/library/soundLibrary.js';

describe('isKnownSound', () => {
  it('accepts banked drum machine samples', () => {
    expect(isKnownSound({ s: 'bd', bank: 'RolandTR909' })).toBe(true);
    expect(isKnownSound({ s: 'rd', bank: 'RolandTR909' })).toBe(true);
  });
  it('rejects names missing from the bank', () => {
    expect(isKnownSound({ s: 'ride', bank: 'RolandTR909' })).toBe(false);
  });
  it('accepts plain dirt samples and rejects unknown plain names', () => {
    expect(isKnownSound({ s: 'clubkick' })).toBe(true);
    expect(isKnownSound({ s: 'oh' })).toBe(false);
    expect(isKnownSound({ s: 'zzzkick' })).toBe(false);
  });
  it('accepts built-in synths and note() without s', () => {
    expect(isKnownSound({ s: 'sawtooth', note: 'c2' })).toBe(true);
    expect(isKnownSound({ s: 'saw' })).toBe(true);
    expect(isKnownSound({ note: 'c2' })).toBe(true);
  });
  it('strips sample index suffixes', () => {
    expect(isKnownSound({ s: 'bd:3' })).toBe(true);
  });
  it('labels banked sounds with their bank', () => {
    expect(soundLabel({ s: 'ride', bank: 'RolandTR909' })).toBe('RolandTR909_ride');
    expect(soundLabel({ s: 'zzz' })).toBe('zzz');
  });
});

describe('sound library integrity (headless)', () => {
  const all = Object.entries(soundLibrary).flatMap(([pillar, pats]) => pats.map(p => [pillar, p]));
  it.each(all.map(([pillar, p]) => [`${pillar}/${p.id}`, p]))('%s plays only known sounds', async (_, p) => {
    const haps = await queryCycle(p.code);
    expect(haps.length).toBeGreaterThan(0);
    const unknown = haps.map(h => h.value).filter(v => !isKnownSound(v)).map(soundLabel);
    expect([...new Set(unknown)]).toEqual([]);
  });
});
