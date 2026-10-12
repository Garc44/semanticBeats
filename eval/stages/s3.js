import { runSelectionStage } from './common.js';

// S3 — constraint: JSON selection of pattern ids (schema) + deterministic compiler.
// This is the existing prototype pipeline. Same retrieval as S2, but the model no longer writes code.
export const S3 = {
  id: 'S3',
  tagSource: 'ids',
  run: (prompt, opts) => runSelectionStage(prompt, opts),
};
