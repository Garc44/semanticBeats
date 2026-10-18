// Every experiment constant lives here so the thesis can cite one file.
// Commit this file BEFORE the first full measurement run — thresholds are set, not fitted.
export const EVAL_CONFIG = {
  model: 'qwen2.5:7b',
  temperature: 0.7,          // > 0 so repeated runs can differ (diversity axis); constant across stages
  numPredict: 1024,          // identical cap for all stages — S0–S2 write whole stacks, S4–S6 add reasoning
  reps: 10,
  seedBase: 1000,            // seed = seedBase + rep → same seed per rep across stages (paired design)
  stages: ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
  contentCycles: 4,          // lexicon + harmony window (A-A-A-B bass, chord changes); validity uses bar 0
  maxConsecutiveCrashes: 3,
};

// Minimum |paired median difference| for a substantial effect.
export const THRESHOLDS = {
  validity: 0.05,     // share of valid runs
  f1: 0.05,           // per-stage tag source (reported alongside)
  f1Code: 0.05,       // main fidelity measure: code lexicon for all stages
  entropy: 0.05,
  inKey: 0.05,        // harmony: share of notes in the best-fitting diatonic set
  clashRate: 0.05,    // harmony: share of simultaneous pairs at interval class 1 or 6
  lowCrowding: 0.05,  // harmony: share of simultaneous pairs below C3 closer than an octave
  latencyMs: 500,     // Liu & Heer 2014: +500 ms already changes interaction behaviour
};

// Besides adjacent stages: best free-code and best selection stage against the form.
export const EXTRA_COMPARISONS = [['S2', 'S6'], ['S5', 'S6']];

export const BOOTSTRAP = { iterations: 10000, alpha: 0.05, seed: 20261012 };
