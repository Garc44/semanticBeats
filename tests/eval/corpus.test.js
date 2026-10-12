import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateCorpus, corpusHash, assertFrozen, CATEGORIES } from '../../eval/corpus/corpus.js';
import { cohensKappa, meanJaccard } from '../../eval/corpus/agreement.js';

function fixture() {
  const prompts = CATEGORIES.flatMap((category, c) =>
    Array.from({ length: 10 }, (_, i) => ({ id: `${category[0]}${String(i + 1).padStart(2, '0')}`, category, text: `prompt ${c}-${i}`, expected: ['techno', 'kick'] })));
  return { version: 1, prompts };
}

describe('validateCorpus', () => {
  it('accepts 4×10 well-formed prompts', () => expect(validateCorpus(fixture())).toEqual([]));

  it('reports count, duplicate id, unknown tag, empty text/expected, bad category', () => {
    const c = fixture();
    c.prompts[1].id = c.prompts[0].id;
    c.prompts[2].expected = ['nonsense'];
    c.prompts[3].text = ' ';
    c.prompts[4].expected = [];
    c.prompts[5].category = 'other';
    c.prompts.pop();
    const errors = validateCorpus(c).join('\n');
    expect(errors).toMatch(/duplicate id/);
    expect(errors).toMatch(/unknown tag "nonsense"/);
    expect(errors).toMatch(/empty text/);
    expect(errors).toMatch(/no expected tags/);
    expect(errors).toMatch(/unknown category "other"/);
    expect(errors).toMatch(/expected 10 prompts in "underspecified"/);
  });
});

describe('corpusHash / assertFrozen', () => {
  it('is independent of prompt order, key order and tag order', () => {
    const a = fixture();
    const b = fixture();
    b.prompts.reverse();
    b.prompts[0] = { expected: [...b.prompts[0].expected].reverse(), text: b.prompts[0].text, category: b.prompts[0].category, id: b.prompts[0].id };
    expect(corpusHash(a)).toBe(corpusHash(b));
  });

  it('changes when an expectation changes', () => {
    const a = fixture();
    const b = fixture();
    b.prompts[0].expected = ['house'];
    expect(corpusHash(a)).not.toBe(corpusHash(b));
  });

  it('assertFrozen throws when missing or different, passes when equal', () => {
    const dir = mkdtempSync(join(tmpdir(), 'corpus-'));
    const hashPath = join(dir, 'FROZEN.sha256');
    expect(() => assertFrozen(fixture(), hashPath)).toThrow(/not frozen/);
    writeFileSync(hashPath, 'deadbeef\n');
    expect(() => assertFrozen(fixture(), hashPath)).toThrow(/changed since freeze/);
    writeFileSync(hashPath, corpusHash(fixture()) + '\n');
    expect(() => assertFrozen(fixture(), hashPath)).not.toThrow();
  });
});

describe('agreement', () => {
  const vocab = ['a', 'b'];
  it('perfect agreement → kappa 1', () => expect(cohensKappa({ p: ['a'] }, { p: ['a'] }, ['p'], vocab)).toBe(1));
  it('total disagreement → kappa -1', () => expect(cohensKappa({ p: ['a'] }, { p: ['b'] }, ['p'], vocab)).toBe(-1));
  it('degenerate (all same, all agree) → 1', () => expect(cohensKappa({ p: [] }, { p: [] }, ['p'], vocab)).toBe(1));
  it('jaccard', () => {
    expect(meanJaccard({ p: ['a', 'b'], q: ['a'] }, { p: ['a'], q: ['a'] }, ['p', 'q'])).toBe(0.75);
    expect(meanJaccard({ p: [] }, { p: [] }, ['p'])).toBe(1);
  });
});
