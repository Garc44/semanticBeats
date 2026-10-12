import { describe, it, expect, beforeEach, vi } from 'vitest';
import { S4 } from '../../eval/stages/s4.js';
import { mockOllama, bodies, isIntentCall, isPlanCall, intentJson, firstChoicePlan } from './helpers.js';

describe('S4 musical chain-of-thought', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('every plan call demands reasoning first; plans carry it', async () => {
    mockOllama(b => (isIntentCall(b) ? intentJson(['drums', 'bass']) : firstChoicePlan(b, { reasoning: 'Techno needs a steady pulse.' })));
    const r = await S4.run('dark techno', { temperature: 0.7, seed: 1 });
    expect(S4).toMatchObject({ id: 'S4', tagSource: 'ids' });
    const planBodies = bodies().filter(isPlanCall);
    expect(planBodies).toHaveLength(2);
    for (const b of planBodies) {
      expect(Object.keys(b.format.properties)[0]).toBe('reasoning');
      expect(b.format.required).toContain('reasoning');
    }
    expect(r.plans.every(p => p.plan.reasoning === 'Techno needs a steady pulse.')).toBe(true);
    expect(r.selectedIds).toHaveLength(2);
  });
});
