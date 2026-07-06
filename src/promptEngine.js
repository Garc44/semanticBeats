import { soundLibrary } from './library/soundLibrary.js';

// Lexical retrieval over the pattern library. 58 patterns — tag overlap beats
// embeddings at this scale. Genre hit counts double; mood/texture hits count once.
export function rankPatternsByIntent(pillarName, intent) {
  const catalogKey = pillarName === 'bass_percussion' ? 'bass' : pillarName;
  const catalog = soundLibrary[catalogKey] ?? [];
  const wanted = new Set(
    [...(intent.moods ?? []), ...(intent.textures ?? [])].map(s => s.toLowerCase())
  );
  const genre = (intent.genre ?? '').toLowerCase();

  return catalog
    .map(pattern => {
      let score = 0;
      for (const tag of pattern.tags) {
        const t = tag.toLowerCase();
        if (t === genre) score += 2;
        else if (wanted.has(t)) score += 1;
      }
      return { pattern, score };
    })
    .sort((a, b) => b.score - a.score);
}
