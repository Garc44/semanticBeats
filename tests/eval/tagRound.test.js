import { describe, it, expect } from 'vitest';
import { roundFiles, parseRound, patternsForRound } from '../../eval/library/round.js';
import { renderTagSheet, blindItems } from '../../eval/library/tagSheet.js';
import { renderConsensusSheet } from '../../eval/library/consensusSheet.js';

describe('tagging rounds', () => {
  it('round 1 keeps the existing file names and browser store', () => {
    expect(roundFiles(1)).toEqual({
      keys: 'tag-sheet-keys.json', b: 'tags-B.json', consensus: 'tags-consensus.json',
      sheetStore: 'library-tagging-v2', consensusStore: 'library-consensus-v2',
    });
  });

  it('round 2 gets its own files and its own browser store (file:// pages share localStorage)', () => {
    expect(roundFiles(2)).toEqual({
      keys: 'tag-sheet-keys-2.json', b: 'tags-B-2.json', consensus: 'tags-consensus-2.json',
      sheetStore: 'library-tagging-v2-r2', consensusStore: 'library-consensus-v2-r2',
    });
  });

  it('parses --round, default 1', () => {
    expect(parseRound([])).toBe(1);
    expect(parseRound(['--round', '2'])).toBe(2);
    expect(() => parseRound(['--round', 'x'])).toThrow();
  });

  it('a later round only holds patterns no earlier round covered', () => {
    const lib = { drums: [{ id: 'drums_a' }, { id: 'drums_new' }], bass: [{ id: 'bass_b' }], melody: [] };
    expect(patternsForRound(lib, new Set(['drums_a', 'bass_b']))).toEqual({ drums: [{ id: 'drums_new' }], bass: [], melody: [] });
  });

  it('sheets use the store and export name they are given', () => {
    const items = blindItems({ drums: [{ id: 'drums_a' }], bass: [], melody: [] }, 1);
    const sheet = renderTagSheet(items, () => 'x', { store: 'S-r2', exportName: 'tags-B-2.json' });
    expect(sheet).toContain("'S-r2'");
    expect(sheet).toContain('tags-B-2.json');
    const cons = renderConsensusSheet([{ key: '#1', pillar: 'drums', id: 'drums_a', both: [], onlyA: [], onlyB: [] }], () => 'x',
      { store: 'C-r2', exportName: 'tags-consensus-2.json' });
    expect(cons).toContain("'C-r2'");
    expect(cons).toContain('tags-consensus-2.json');
  });
});
