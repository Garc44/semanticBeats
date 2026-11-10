import { describe, it, expect } from 'vitest';
import { blindItems, renderTagSheet, unblind } from '../../eval/library/tagSheet.js';

const lib = {
  drums: [{ id: 'drums_acid_kit' }, { id: 'drums_dub_kit' }],
  bass: [{ id: 'bass_detroit_line' }],
  melody: [{ id: 'melody_minimal_blip' }],
};
const link = (pillar, id) => `https://strudel.cc/#${pillar.length}${id.length}`;

describe('blind tag sheet', () => {
  it('numbers every pattern once, in a seeded order', () => {
    const items = blindItems(lib, 7);
    expect(items.map(i => i.key)).toEqual(['#1', '#2', '#3', '#4']);
    expect(items.map(i => i.id).sort()).toEqual(['bass_detroit_line', 'drums_acid_kit', 'drums_dub_kit', 'melody_minimal_blip']);
    expect(blindItems(lib, 7)).toEqual(items);
  });

  it('page source carries no pattern id', () => {
    const html = renderTagSheet(blindItems(lib, 7), link);
    for (const p of Object.values(lib).flat()) expect(html).not.toContain(p.id);
    expect(html).toContain('#4');
  });

  it('unblind maps the exported numbers back to ids', () => {
    const items = blindItems(lib, 7);
    const exported = Object.fromEntries(items.map(i => [i.key, [i.id.split('_')[1]]]));
    const byId = unblind(exported, items);
    expect(byId.drums_acid_kit).toEqual(['acid']);
    expect(byId.bass_detroit_line).toEqual(['detroit']);
  });
});
