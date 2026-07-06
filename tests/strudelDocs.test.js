import { describe, it, expect } from 'vitest';
import { METHOD_CARDS, PILLAR_METHODS, PILLAR_KINDS, SAMPLE_NAMES, BANKS, SYNTHS, MIN_EVENTS } from '../src/library/strudelDocs.js';
import { PILLAR_NAMES } from '../src/pillars.js';

describe('METHOD_CARDS', () => {
  it('every numeric card has min < max and an example', () => {
    for (const [name, card] of Object.entries(METHOD_CARDS)) {
      expect(card.sig, name).toBeTruthy();
      expect(card.note, name).toBeTruthy();
      if (card.type === 'numeric') expect(card.min, name).toBeLessThan(card.max);
      if (card.type === 'enum') expect(card.values.length, name).toBeGreaterThan(0);
    }
  });
});

describe('PILLAR_METHODS / PILLAR_KINDS', () => {
  it('covers every pillar', () => {
    for (const p of PILLAR_NAMES) {
      expect(PILLAR_METHODS[p], p).toBeDefined();
      expect(PILLAR_KINDS[p], p).toBeDefined();
      expect(MIN_EVENTS[p], p).toBeGreaterThanOrEqual(1);
    }
  });

  it('every pillar method id exists in METHOD_CARDS', () => {
    for (const [pillar, ids] of Object.entries(PILLAR_METHODS))
      for (const id of ids) expect(METHOD_CARDS[id], `${pillar}:${id}`).toBeDefined();
  });

  it('drums and percussion are sample-only; bass/melody/transitions note-only', () => {
    expect(PILLAR_KINDS.drums).toEqual(['sample']);
    expect(PILLAR_KINDS.percussion).toEqual(['sample']);
    expect(PILLAR_KINDS.bass).toEqual(['note']);
    expect(PILLAR_KINDS.melody).toEqual(['note']);
    expect(PILLAR_KINDS.transitions).toEqual(['note']);
  });

  it('vocab includes samples/banks/synths actually used in the library', () => {
    for (const s of ['bd', 'hh', 'oh', 'cp', 'rim', 'ride', 'clubkick']) expect(SAMPLE_NAMES).toContain(s);
    expect(BANKS).toContain('RolandTR909');
    for (const s of ['sine', 'square', 'triangle', 'saw', 'sawtooth']) expect(SYNTHS).toContain(s);
  });
});
