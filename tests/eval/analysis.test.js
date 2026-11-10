import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { perPrompt, summarize, toMarkdown, toCsv, loadRuns } from '../../eval/analysis.js';

const rec = (stage, promptId, rep, o = {}) => ({
  stage, promptId, category: 'direct_hit', rep, seed: 1000 + rep,
  errorClass: null, executes: true, tags: ['a'], tagsFromCode: ['a'], expected: ['a', 'b'],
  latencyMs: 1000, llm: { calls: 1, promptTokens: 100, evalTokens: 20, llmMs: 900 }, ...o,
});
const thresholds = { validity: 0.05, f1: 0.05, f1Code: 0.05, entropy: 0.05, inKey: 0.05, clashRate: 0.05, lowCrowding: 0.05, latencyMs: 500 };
const opts = { stages: ['S0', 'S1'], thresholds, bootstrap: { iterations: 200, alpha: 0.05, seed: 1 } };

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

  it('open-ended prompt (no expected tags) → fidelity NaN, other metrics kept', () => {
    const stats = perPrompt([rec('S0', 'p1', 0, { expected: [] }), rec('S0', 'p1', 1, { expected: [], tags: ['b'] })]).get('S0|p1');
    for (const k of ['f1', 'precision', 'recall', 'f1Code']) expect(stats[k]).toBeNaN();
    expect(stats.validityRate).toBe(1);
    expect(stats.entropy).toBe(1);
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
    expect(csv[0]).toBe('stage,promptId,category,rep,seed,errorClass,executes,latencyMs,promptTokens,evalTokens,tags,tagsFromCode,expected,inKey,clashRate,lowCrowding,fallbacks');
    expect(csv).toHaveLength(17);
  });
});

describe('harmony and S6', () => {
  const h = (inKey, clashRate, lowCrowding) => ({ pitched: 8, inKey, clashRate, lowCrowding });
  const records = [];
  for (const p of ['p1', 'p2', 'p3', 'p4']) for (const rep of [0, 1]) {
    records.push(rec('S2', p, rep, { harmony: h(0.6, 0.3, 0.2) }));
    records.push(rec('S5', p, rep, { harmony: h(0.7, 0.2, 0.1) }));
    records.push(rec('S6', p, rep, {
      harmony: h(1, 0.05, 0), fallbacks: rep ? ['stab'] : [],
      form: { bassA: rep ? '0...............' : '1...............', hat: '..x...x...x...x.', bassB: 'a', openhat: 'b', clap: 'c', stab: 'd' },
    }));
  }
  const s = summarize(records, { ...opts, stages: ['S2', 'S5', 'S6'], extraComparisons: [['S2', 'S6'], ['S5', 'S6']] });

  it('per-stage harmony', () => {
    expect(s.stages.S6.inKey.estimate).toBe(1);
    expect(s.stages.S2.clashRate.estimate).toBeCloseTo(0.3, 10);
  });

  it('S6 fallback rate and lane entropy; other stages null', () => {
    expect(s.stages.S6.fallbackRate).toBe(0.5);
    expect(s.stages.S6.laneEntropy.hat).toBe(0);
    expect(s.stages.S6.laneEntropy.bassA).toBe(1);
    expect(s.stages.S2.laneEntropy).toBeNull();
    expect(s.stages.S2.fallbackRate).toBeNaN();
  });

  it('extra comparisons S2→S6 and S5→S6 next to adjacent ones', () => {
    const pairs = new Set(s.comparisons.map(c => `${c.from}>${c.to}`));
    expect(pairs).toEqual(new Set(['S2>S5', 'S5>S6', 'S2>S6']));
    const inKey = s.comparisons.find(c => c.from === 'S2' && c.to === 'S6' && c.metric === 'inKey');
    expect(inKey).toMatchObject({ estimate: 0.4, substantial: true });
  });

  it('markdown has harmony and S6 tables', () => {
    const md = toMarkdown(s);
    expect(md).toContain('In key');
    expect(md).toContain('Fallback rate');
  });

  // Review Focus 5
  it('schema-1 records without harmony/form/fallbacks do not break the analysis', () => {
    const old = [rec('S0', 'p1', 0), rec('S0', 'p2', 0)];
    const res = summarize(old, { ...opts, stages: ['S0'] });
    expect(res.stages.S0.inKey.estimate).toBeNaN();
    expect(res.stages.S0.laneEntropy).toBeNull();
    expect(toCsv(old).split('\n')).toHaveLength(3);
  });
});

describe('fidelity lift over shuffled prompts', () => {
  const exp = { p1: ['a'], p2: ['b'], p3: ['c'], p4: ['d'] };
  const records = [];
  for (const [p, expected] of Object.entries(exp)) for (const rep of [0, 1]) {
    // S2: same tags whatever the prompt; S3: exactly the expected tags.
    records.push(rec('S2', p, rep, { expected, tags: ['a'], tagsFromCode: ['a'] }));
    records.push(rec('S3', p, rep, { expected, tags: expected, tagsFromCode: expected }));
  }
  const s = summarize(records, { ...opts, stages: ['S2', 'S3'] });

  it('prompt-independent tags → lift 0', () => {
    expect(s.stages.S2.liftF1Code.estimate).toBe(0);
    expect(s.stages.S2.liftF1.estimate).toBe(0);
  });

  it('prompt-following tags → lift > 0', () => {
    expect(s.stages.S3.liftF1Code.estimate).toBeGreaterThan(0);
    expect(s.stages.S3.liftF1.estimate).toBeGreaterThan(0);
  });

  it('markdown has the lift table', () => expect(toMarkdown(s)).toContain('Treue über Zufall'));
});

describe('pooled rates', () => {
  it('fallback rate pooled over all runs next to the per-prompt median', () => {
    const records = [];
    for (const p of ['p1', 'p2', 'p3', 'p4']) for (let rep = 0; rep < 10; rep++)
      records.push(rec('S6', p, rep, { fallbacks: p === 'p1' && rep === 0 ? ['stab'] : [] }));
    const s = summarize(records, { ...opts, stages: ['S6'] });
    expect(s.stages.S6.pooled.fallbackRate).toBe(0.025);
    expect(s.stages.S6.fallbackRate).toBe(0);
    expect(s.stages.S6.pooled.validity).toBe(1);
  });
});

describe('loadRuns', () => {
  const dir = mkdtempSync(join(tmpdir(), 'loadruns-'));
  const write = (name, recs) => {
    const path = join(dir, name);
    writeFileSync(path, recs.map(r => JSON.stringify(r)).join('\n') + '\n');
    return path;
  };
  const a = write('a.jsonl', [rec('S0', 'd01', 0), rec('S2', 'd01', 0)]);
  const b = write('b.jsonl', [rec('S2', 'd01', 0), rec('S3', 'd01', 0)]);

  // Review Focus 5
  it('throws on a run present in two files', () => {
    expect(() => loadRuns([a, b])).toThrow(/duplicate run S2\|d01\|0/);
  });

  it('stagesByPath takes only the listed stages from a file', () => {
    const runs = loadRuns([b, a], { stagesByPath: { [a]: ['S0'] } });
    expect(runs.map(r => r.stage).sort()).toEqual(['S0', 'S2', 'S3']);
  });
});
