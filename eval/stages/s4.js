import { runSelectionStage } from './common.js';

// S4 — S3 + musical chain-of-thought: a reasoning field the schema forces BEFORE selectedId.
export const S4 = {
  id: 'S4',
  tagSource: 'ids',
  run: (prompt, opts) => runSelectionStage(prompt, opts, { planOptionsFor: () => ({ reasoning: true }) }),
};
