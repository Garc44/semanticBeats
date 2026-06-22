import { soundLibrary, getPatternById } from './soundLibrary.js';

// Rank a pillar's catalog by cohesion with patterns active in OTHER pillars.
// fits = the candidate shares >=1 tag with any pattern currently selected on
// another channel. Fitting sounds sort first; original library order is kept
// within each group. Pure: no DOM, tolerant of null/unknown ids.
export function rankSoundsByCohesion(pillarName, currentTracksState = {}) {
  const catalog = soundLibrary[pillarName] ?? [];
  if (!catalog.length) return [];

  const otherTags = new Set();
  for (const [name, id] of Object.entries(currentTracksState)) {
    if (name === pillarName || !id) continue;
    const pattern = getPatternById(name, id);
    if (!pattern) continue;
    for (const tag of pattern.tags) otherTags.add(tag);
  }

  return catalog
    .map((pattern, i) => ({
      pattern,
      fits: otherTags.size > 0 && pattern.tags.some(t => otherTags.has(t)),
      i,
    }))
    .sort((a, b) => (b.fits - a.fits) || (a.i - b.i))
    .map(({ pattern, fits }) => ({ pattern, fits }));
}
