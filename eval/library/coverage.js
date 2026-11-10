import { EVAL_VOCAB, normalizeLibraryTags } from '../vocabulary.js';
import { LIBRARY_COVERAGE } from '../config.js';

// Patterns per pillar and canonical tag (library v2 coverage target, plan Task 1).
export function libraryCoverage(library, pillars = LIBRARY_COVERAGE.pillars) {
  const coverage = {};
  for (const pillar of pillars) {
    coverage[pillar] = {};
    for (const p of library[pillar] ?? [])
      for (const tag of normalizeLibraryTags(p.tags)) coverage[pillar][tag] = (coverage[pillar][tag] ?? 0) + 1;
  }
  return coverage;
}

// Every pillar × subgenre/character pair below its minimum, exempt pairs skipped.
export function coverageGaps(library, target = LIBRARY_COVERAGE) {
  const coverage = libraryCoverage(library, target.pillars);
  const needs = [
    ...EVAL_VOCAB.subgenre.map(tag => [tag, target.minPerSubgenre]),
    ...EVAL_VOCAB.character.map(tag => [tag, target.minPerCharacter]),
  ];
  const gaps = [];
  for (const pillar of target.pillars)
    for (const [tag, need] of needs) {
      if (target.exempt[pillar]?.includes(tag)) continue;
      const have = coverage[pillar][tag] ?? 0;
      if (have < need) gaps.push({ pillar, tag, have, need });
    }
  return gaps;
}
