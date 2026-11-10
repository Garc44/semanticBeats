import { describe, it, expect, afterAll } from 'vitest';
import { soundLibrary } from '../../src/library/soundLibrary.js';
import { compileTrack } from '../../src/compiler.js';
import { makePillars } from '../../src/pillars.js';
import { LIBRARY_TAG_MAP } from '../../eval/vocabulary.js';
import { LIBRARY_COVERAGE } from '../../eval/config.js';
import { checkValidity, closeValidityWorker } from '../../eval/validity.js';

afterAll(() => closeValidityWorker());

const pillars = makePillars();
const checked = LIBRARY_COVERAGE.pillars.flatMap(pillar => soundLibrary[pillar].map(p => ({ pillar, p })));

describe('library patterns (drums, bass, melody)', () => {
  // Review Focus 3: an unmapped tag silently carries no eval tags.
  it('every tag is a LIBRARY_TAG_MAP key', () => {
    const missing = checked.flatMap(({ p }) => p.tags.filter(t => !(t.toLowerCase() in LIBRARY_TAG_MAP)).map(t => `${p.id}:${t}`));
    expect(missing).toEqual([]);
  });

  // Review Focus 4: patternById would return the wrong pattern.
  it('ids are unique across all pillars', () => {
    const ids = Object.values(soundLibrary).flat().map(p => p.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  // Review Focus 1, 2: known sounds only, and own stack() survives LLM slow/fast mods.
  it.each(checked.map(({ pillar, p }) => [pillar, p.id]))('%s/%s runs headless with speed 2, slowdown 2', async (pillar, id) => {
    const code = compileTrack({ selectedId: id, modifications: { speed: 2, slowdown: 2 } }, pillar, pillars.find(p => p.name === pillar));
    const r = await checkValidity(code, { cycles: 4 });
    expect(r.errorClass, r.unknownSounds?.join(',')).toBe(null);
  }, 15000);
});
