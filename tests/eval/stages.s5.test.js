import { describe, it, expect, beforeEach, vi } from 'vitest';
import { S5 } from '../../eval/stages/s5.js';
import { STAGES } from '../../eval/stages/index.js';
import { EVAL_CONFIG, THRESHOLDS, EXTRA_COMPARISONS } from '../../eval/config.js';
import { mockOllama, bodies, isIntentCall, isPlanCall, intentJson, firstChoicePlan } from './helpers.js';

describe('S5 GraphRAG', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('keeps reasoning, injects graph context and graph-ranked catalog for all three parts', async () => {
    mockOllama(b => (isIntentCall(b) ? intentJson(['drums']) : firstChoicePlan(b, { reasoning: 'r' })));
    const r = await S5.run('a Motor City style groove', { temperature: 0.7, seed: 1 });
    expect(S5).toMatchObject({ id: 'S5', tagSource: 'ids' });
    const plans = bodies().filter(isPlanCall);
    expect(plans).toHaveLength(3);
    for (const plan of plans) {
      expect(Object.keys(plan.format.properties)[0]).toBe('reasoning');
      expect(plan.messages[0].content).toContain('Knowledge graph context');
      expect(plan.messages[0].content).toContain('detroit');
      expect(plan.format.properties.selectedId.enum).toHaveLength(8);
    }
    expect(r.selectedIds).toHaveLength(3);
  });

  it('registry exposes all seven stages in order, matching EVAL_CONFIG', () => {
    expect(Object.keys(STAGES)).toEqual(['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6']);
    expect(Object.keys(STAGES)).toEqual(EVAL_CONFIG.stages);
    for (const [id, s] of Object.entries(STAGES)) expect(s.id).toBe(id);
    expect(Object.values(STAGES).map(s => s.tagSource)).toEqual(['code', 'code', 'code', 'ids', 'ids', 'ids', 'code']);
  });

  it('config: 4-bar content window, harmony thresholds, extra comparisons', () => {
    expect(EVAL_CONFIG.contentCycles).toBe(4);
    expect(THRESHOLDS).toMatchObject({ inKey: 0.05, clashRate: 0.05, lowCrowding: 0.05 });
    expect(EXTRA_COMPARISONS).toEqual([['S2', 'S6'], ['S5', 'S6']]);
  });
});
