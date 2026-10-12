export function prf1(expected, got) {
  const E = new Set(expected);
  const G = new Set(got);
  const tp = [...G].filter(t => E.has(t)).length;
  const precision = G.size ? tp / G.size : 0;
  const recall = E.size ? tp / E.size : 0;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  return { precision, recall, f1 };
}

const outcomeKey = tags => [...new Set(tags)].sort().join('|');

// Shannon entropy over tag-set outcomes, normalised by ln(n) (max when all n runs differ).
export function normalizedEntropy(tagSets) {
  const n = tagSets.length;
  if (n <= 1) return 0;
  const counts = new Map();
  for (const tags of tagSets) counts.set(outcomeKey(tags), (counts.get(outcomeKey(tags)) ?? 0) + 1);
  let h = 0;
  for (const c of counts.values()) { const p = c / n; h -= p * Math.log(p); }
  return h / Math.log(n);
}

export function distinctRatio(tagSets) {
  if (!tagSets.length) return 0;
  return new Set(tagSets.map(outcomeKey)).size / tagSets.length;
}

const finite = xs => xs.filter(x => Number.isFinite(x));

export function mean(xs) {
  const v = finite(xs);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : NaN;
}

export function percentile(xs, p) {
  const v = finite(xs).sort((a, b) => a - b);
  if (!v.length) return NaN;
  const h = (v.length - 1) * (p / 100);
  const lo = Math.floor(h);
  return v[lo] + (h - lo) * ((v[lo + 1] ?? v[lo]) - v[lo]);
}

export const median = xs => percentile(xs, 50);

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function percentileInterval(samples, alpha) {
  return { lower: percentile(samples, (alpha / 2) * 100), upper: percentile(samples, (1 - alpha / 2) * 100) };
}

export function bootstrapCI(values, stat = median, { iterations, alpha, seed }) {
  const v = finite(values);
  if (!v.length) return { estimate: NaN, lower: NaN, upper: NaN, n: 0 };
  const rand = mulberry32(seed);
  const samples = [];
  for (let i = 0; i < iterations; i++) {
    const resample = v.map(() => v[Math.floor(rand() * v.length)]);
    samples.push(stat(resample));
  }
  return { estimate: stat(v), ...percentileInterval(samples, alpha), n: v.length };
}

// Paired by index (= by prompt): resample prompts, statistic of per-prompt differences.
export function pairedDiffCI(a, b, stat = median, opts) {
  const diffs = a.map((x, i) => b[i] - x).filter(d => Number.isFinite(d));
  return bootstrapCI(diffs, stat, opts);
}

// Miller 1968: ≤2 s keeps conversational flow; ≤10 s keeps attention on the task.
export function millerBand(ms) {
  if (ms <= 2000) return '≤2s';
  if (ms <= 10000) return '≤10s';
  return '>10s';
}
