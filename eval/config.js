// Every experiment constant lives here so the thesis can cite one file.
// Commit this file BEFORE the first full measurement run — thresholds are set, not fitted.
export const EVAL_CONFIG = {
  model: 'qwen2.5:7b',
  temperature: 0.7,          // > 0 so repeated runs can differ (diversity axis); constant across stages
  numPredict: 1024,          // identical cap for all stages — S0–S2 write whole stacks, S4/S5 add reasoning
  reps: 10,
  seedBase: 1000,            // seed = seedBase + rep → same seed per rep across stages (paired design)
  stages: ['S0', 'S1', 'S2', 'S3', 'S4', 'S5'],
  maxConsecutiveCrashes: 3,
};

// Minimum |paired median difference| for a substantial effect between adjacent stages.
export const THRESHOLDS = {
  validity: 0.05,     // share of valid runs
  f1: 0.05,
  f1Code: 0.05,       // uniform code-lexicon F1 (robustness check)
  entropy: 0.05,
  latencyMs: 500,     // Liu & Heer 2014: +500 ms already changes interaction behaviour
};

export const BOOTSTRAP = { iterations: 10000, alpha: 0.05, seed: 20261012 };
