import { prf1 } from '../metrics.js';

// Reference points for ID-derived fidelity (S3–S5 pick one pattern per pillar).
// pillars: one array per pillar, each holding the canonical tag list of every pattern.
// random = exact expectation of a uniform pick per pillar (mean over all combinations),
// best   = highest F1 any combination reaches (ceiling of the selection step).
export function selectionBaselines(expected, pillars) {
  let n = 0;
  const sum = { precision: 0, recall: 0, f1: 0 };
  let best = 0;
  const walk = (i, acc) => {
    if (i === pillars.length) {
      const s = prf1(expected, acc);
      sum.precision += s.precision; sum.recall += s.recall; sum.f1 += s.f1;
      if (s.f1 > best) best = s.f1;
      n++;
      return;
    }
    for (const tags of pillars[i]) walk(i + 1, acc.concat(tags));
  };
  walk(0, []);
  return {
    random: { precision: sum.precision / n, recall: sum.recall / n, f1: sum.f1 / n },
    best: { f1: best },
    combinations: n,
  };
}
