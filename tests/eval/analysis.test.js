import { describe, it, expect } from 'vitest';
import { perPrompt, summarize, toMarkdown, toCsv } from '../../eval/analysis.js';

const rec = (stage, promptId, rep, o = {}) => ({
  stage, promptId, category: 'direct_hit', rep, seed: 1000 + rep,
  errorClass: null, executes: true, tags: ['a'], tagsFromCode: ['a'], expected: ['a', 'b'],
  latencyMs: 1000, llm: { calls: 1, promptTokens: 100, evalTokens: 20, llmMs: 900 }, ...o,
});
const opts = { stages: ['S0', 'S1'], thresholds: { validity: 0.05, f1: 0.05, f1Code: 0.05, entropy: 0.05, latencyMs: 500 }, bootstrap: { iterations: 200, alpha: 0.05, seed: 1 } };

describe('perPrompt', () => {
  it('validity over all runs, F1 over executing runs, entropy over valid runs', () => {
    const stats = perPrompt([
      rec('S0', 'p1', 0),
      rec('S0', 'p1', 1, { errorClass: 'syntax', executes: false, tags: [], tagsFromCode: [] }),
    ]).get('S0|p1');
    expect(stats.validityRate).toBe(0.5);
    expect(stats.f1).toBeCloseTo(2 / 3, 10);
    expect(stats.entropy).toBe(0);
    expect(stats.n).toBe(2);
  });

  it('no executing run → F1 NaN', () => {
    const stats = perPrompt([rec('S0', 'p1', 0, { errorClass: 'empty', executes: false, tags: [] })]).get('S0|p1');
    expect(stats.f1).toBeNaN();
  });
});

describe('summarize', () => {
  const records = [];
  for (const p of ['p1', 'p2', 'p3', 'p4']) for (const rep of [0, 1]) {
    records.push(rec('S0', p, rep, { errorClass: 'syntax', executes: false, tags: [], tagsFromCode: [], latencyMs: 800 }));
    records.push(rec('S1', p, rep, { tags: rep ? ['a', 'b'] : ['a'], latencyMs: 2500 }));
  }
  const s = summarize(records, opts);

  it('stage summaries', () => {
    expect(s.stages.S0.validity.estimate).toBe(0);
    expect(s.stages.S1.validity.estimate).toBe(1);
    expect(s.stages.S0.errorCounts).toEqual({ syntax: 8 });
    expect(s.stages.S1.entropy.estimate).toBe(1);
    expect(s.stages.S1.latency).toMatchObject({ median: 2500, bandMedian: '≤10s', shareWithin2s: 0, shareWithin10s: 1 });
    expect(s.stages.S0.latency.bandMedian).toBe('≤2s');
  });

  it('adjacent paired comparisons flag substantial differences', () => {
    const v = s.comparisons.find(c => c.from === 'S0' && c.to === 'S1' && c.metric === 'validity');
    expect(v).toMatchObject({ estimate: 1, lower: 1, upper: 1, substantial: true, n: 4 });
    const lat = s.comparisons.find(c => c.metric === 'latencyMs');
    expect(lat).toMatchObject({ estimate: 1700, substantial: true });
    const f1 = s.comparisons.find(c => c.metric === 'f1');
    expect(f1.n).toBe(0);
    expect(f1.substantial).toBe(false);
  });

  it('by category', () => expect(s.byCategory.S1.direct_hit.validity).toBe(1));

  it('markdown + csv', () => {
    expect(toMarkdown(s)).toContain('| S1 |');
    const csv = toCsv(records).split('\n');
    expect(csv[0]).toBe('stage,promptId,category,rep,seed,errorClass,executes,latencyMs,promptTokens,evalTokens,tags,tagsFromCode,expected');
    expect(csv).toHaveLength(17);
  });
});
