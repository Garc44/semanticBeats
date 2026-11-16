import { describe, it, expect } from 'vitest';
import { consensusRows, renderConsensusSheet } from '../../eval/library/consensusSheet.js';

const keys = { '#1': 'drums_acid_kit', '#2': 'bass_dub_line' };
const A = { drums_acid_kit: ['acid', 'driving'], bass_dub_line: ['dub', 'deep'] };
const B = { '#1': ['acid', 'spacious', 'kick'], '#2': [] };
const link = (pillar, id) => `https://strudel.cc/#${pillar}${id.length}`;

describe('consensus sheet', () => {
  it('splits tags into both / only A / only B, vocabulary terms only', () => {
    const rows = consensusRows(keys, A, B);
    expect(rows[0]).toMatchObject({ key: '#1', pillar: 'drums', both: ['acid'], onlyA: ['driving'], onlyB: ['spacious'] });
    expect(rows[1]).toMatchObject({ key: '#2', pillar: 'bass', both: [], onlyA: ['dub', 'deep'], onlyB: [] });
  });

  it('rows follow the sheet numbers numerically', () => {
    const many = { '#10': 'melody_x', '#2': 'drums_y', '#1': 'bass_z' };
    const rows = consensusRows(many, { melody_x: [], drums_y: [], bass_z: [] }, {});
    expect(rows.map(r => r.key)).toEqual(['#1', '#2', '#10']);
  });

  it('page pre-ticks tags both chose and nothing else', () => {
    const html = renderConsensusSheet(consensusRows(keys, A, B), link);
    expect(html).toMatch(/data-key="#1" value="acid" checked/);
    expect(html).not.toMatch(/data-key="#1" value="driving" checked/);
    expect(html).not.toMatch(/data-key="#1" value="spacious" checked/);
  });

  it('page carries no pattern id or name and keeps ticks across reloads', () => {
    const html = renderConsensusSheet(consensusRows(keys, A, B), link);
    for (const id of Object.values(keys)) expect(html).not.toContain(id);
    expect(html).toContain('localStorage.setItem');
    expect(html).toContain('tags-consensus.json');
  });
});
