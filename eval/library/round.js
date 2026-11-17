// Tagging rounds for the v2 patterns. Round 1 = the first 85 patterns, a later round = patterns added
// afterwards (e.g. to close coverage gaps after consensus). Each round has its own number → id key,
// blind pass B, consensus file and browser store: pages opened from file:// share one localStorage,
// so a shared store would restore round-1 ticks onto round-2 numbers.
export function roundFiles(round) {
  const sfx = round > 1 ? `-${round}` : '';
  const store = round > 1 ? `-r${round}` : '';
  return {
    keys: `tag-sheet-keys${sfx}.json`, b: `tags-B${sfx}.json`, consensus: `tags-consensus${sfx}.json`,
    sheetStore: `library-tagging-v2${store}`, consensusStore: `library-consensus-v2${store}`,
  };
}

export function parseRound(args) {
  const i = args.indexOf('--round');
  if (i < 0) return 1;
  const n = Number(args[i + 1]);
  if (!Number.isInteger(n) || n < 1) throw new Error('--round expects a positive integer');
  return n;
}

// Patterns per pillar that no earlier round's key covers.
export function patternsForRound(newPatterns, earlierIds) {
  return Object.fromEntries(Object.entries(newPatterns).map(([p, list]) => [p, list.filter(x => !earlierIds.has(x.id))]));
}
