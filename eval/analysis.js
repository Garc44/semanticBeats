import { readFileSync } from 'node:fs';
import { prf1, normalizedEntropy, distinctRatio, median, percentile, mean, bootstrapCI, pairedDiffCI, millerBand } from './metrics.js';
import { LANE_FIELDS } from './s6/form.js';

export function loadRecords(path) {
  const out = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* partial trailing line */ }
  }
  return out;
}

const groupBy = (xs, keyFn) => xs.reduce((m, x) => m.set(keyFn(x), [...(m.get(keyFn(x)) ?? []), x]), new Map());
const harmonyOf = (r, key) => (r.harmony && Number.isFinite(r.harmony[key]) ? r.harmony[key] : NaN);

export function perPrompt(records) {
  const out = new Map();
  for (const [key, runs] of groupBy(records, r => `${r.stage}|${r.promptId}`)) {
    const executing = runs.filter(r => r.executes);
    const valid = runs.filter(r => r.errorClass === null);
    // No expected tags (open-ended prompt) → no fidelity; NaN drops out of medians and paired CIs.
    const scored = executing.filter(r => r.expected?.length);
    const fid = scored.map(r => prf1(r.expected, r.tags));
    const withFallbacks = runs.filter(r => Array.isArray(r.fallbacks));
    const withForm = valid.filter(r => r.form && typeof r.form === 'object');
    out.set(key, {
      stage: runs[0].stage, promptId: runs[0].promptId, category: runs[0].category, n: runs.length,
      validityRate: valid.length / runs.length,
      f1: mean(fid.map(x => x.f1)),
      precision: mean(fid.map(x => x.precision)),
      recall: mean(fid.map(x => x.recall)),
      f1Code: mean(scored.map(r => prf1(r.expected, r.tagsFromCode).f1)),
      entropy: valid.length ? normalizedEntropy(valid.map(r => r.tags)) : NaN,
      distinct: valid.length ? distinctRatio(valid.map(r => r.tags)) : NaN,
      inKey: mean(executing.map(r => harmonyOf(r, 'inKey'))),
      clashRate: mean(executing.map(r => harmonyOf(r, 'clashRate'))),
      lowCrowding: mean(executing.map(r => harmonyOf(r, 'lowCrowding'))),
      fallbackRate: withFallbacks.length ? withFallbacks.filter(r => r.fallbacks.length > 0).length / withFallbacks.length : NaN,
      laneEntropy: withForm.length
        ? Object.fromEntries(LANE_FIELDS.map(f => [f, normalizedEntropy(withForm.map(r => [String(r.form[f] ?? '')]))]))
        : null,
      latencyMedian: median(runs.map(r => r.latencyMs)),
    });
  }
  return out;
}

const COMPARED = [
  ['validity', 'validityRate', 'validity'],
  ['f1', 'f1', 'f1'],
  ['f1Code', 'f1Code', 'f1Code'],
  ['entropy', 'entropy', 'entropy'],
  ['inKey', 'inKey', 'inKey'],
  ['clashRate', 'clashRate', 'clashRate'],
  ['lowCrowding', 'lowCrowding', 'lowCrowding'],
  ['latencyMs', 'latencyMedian', 'latencyMs'],
];

function comparisonPairs(present, extra) {
  const pairs = [];
  const seen = new Set();
  const add = (from, to) => {
    const k = `${from}>${to}`;
    if (seen.has(k) || !present.includes(from) || !present.includes(to)) return;
    seen.add(k);
    pairs.push([from, to]);
  };
  for (let i = 1; i < present.length; i++) add(present[i - 1], present[i]);
  for (const [from, to] of extra) add(from, to);
  return pairs;
}

export function summarize(records, { stages, thresholds, bootstrap, extraComparisons = [] }) {
  const pp = perPrompt(records);
  const promptIds = [...new Set(records.map(r => r.promptId))].sort();
  const series = (stage, field) => promptIds.map(id => pp.get(`${stage}|${id}`)?.[field] ?? NaN);
  const ci = (stage, field) => bootstrapCI(series(stage, field), median, bootstrap);

  const summary = { stages: {}, comparisons: [], byCategory: {} };
  for (const stage of stages) {
    const runs = records.filter(r => r.stage === stage);
    if (!runs.length) continue;
    const lat = runs.map(r => r.latencyMs);
    const errorCounts = {};
    for (const r of runs) if (r.errorClass) errorCounts[r.errorClass] = (errorCounts[r.errorClass] ?? 0) + 1;
    const lanes = promptIds.map(id => pp.get(`${stage}|${id}`)?.laneEntropy).filter(Boolean);
    summary.stages[stage] = {
      n: runs.length,
      errorCounts,
      validity: ci(stage, 'validityRate'),
      f1: ci(stage, 'f1'), precision: ci(stage, 'precision'), recall: ci(stage, 'recall'),
      f1Code: ci(stage, 'f1Code'),
      entropy: ci(stage, 'entropy'),
      distinct: median(series(stage, 'distinct')),
      inKey: ci(stage, 'inKey'),
      clashRate: ci(stage, 'clashRate'),
      lowCrowding: ci(stage, 'lowCrowding'),
      fallbackRate: median(series(stage, 'fallbackRate')),
      laneEntropy: lanes.length ? Object.fromEntries(LANE_FIELDS.map(f => [f, median(lanes.map(l => l[f]))])) : null,
      latency: {
        median: median(lat), p95: percentile(lat, 95), ci: ci(stage, 'latencyMedian'),
        bandMedian: millerBand(median(lat)), bandP95: millerBand(percentile(lat, 95)),
        shareWithin2s: lat.filter(x => x <= 2000).length / lat.length,
        shareWithin10s: lat.filter(x => x <= 10000).length / lat.length,
      },
      tokens: { promptMedian: median(runs.map(r => r.llm.promptTokens)), evalMedian: median(runs.map(r => r.llm.evalTokens)) },
    };
    summary.byCategory[stage] = {};
    for (const [category, cRuns] of groupBy(runs, r => r.category)) {
      const ids = new Set(cRuns.map(r => r.promptId));
      const stats = [...ids].map(id => pp.get(`${stage}|${id}`));
      summary.byCategory[stage][category] = {
        validity: median(stats.map(s => s.validityRate)),
        f1: median(stats.map(s => s.f1)),
        f1Code: median(stats.map(s => s.f1Code)),
        entropy: median(stats.map(s => s.entropy)),
        inKey: median(stats.map(s => s.inKey)),
        latencyMedian: median(cRuns.map(r => r.latencyMs)),
      };
    }
  }

  const present = stages.filter(s => summary.stages[s]);
  for (const [from, to] of comparisonPairs(present, extraComparisons)) {
    for (const [metric, field, thresholdKey] of COMPARED) {
      const d = pairedDiffCI(series(from, field), series(to, field), median, bootstrap);
      const threshold = thresholds[thresholdKey];
      const excludesZero = d.n > 0 && (d.lower > 0 || d.upper < 0);
      summary.comparisons.push({ from, to, metric, ...d, threshold, substantial: excludesZero && Math.abs(d.estimate) >= threshold });
    }
  }
  return summary;
}

const f = (x, digits = 3) => (Number.isFinite(x) ? x.toFixed(digits) : '–');
const fci = c => `${f(c.estimate)} [${f(c.lower)}, ${f(c.upper)}]`;

export function toMarkdown(summary) {
  const lines = [
    '| Stage | n | Validity | F1 (ids/code) | F1 (code lexicon) | Entropy | Latency median / p95 (ms) | Miller median / p95 |',
    '|---|---|---|---|---|---|---|---|',
  ];
  for (const [stage, s] of Object.entries(summary.stages)) {
    lines.push(`| ${stage} | ${s.n} | ${fci(s.validity)} | ${fci(s.f1)} | ${fci(s.f1Code)} | ${fci(s.entropy)} | ${f(s.latency.median, 0)} / ${f(s.latency.p95, 0)} | ${s.latency.bandMedian} / ${s.latency.bandP95} |`);
  }
  lines.push('', '| Stage | In key | Clash rate | Low crowding |', '|---|---|---|---|');
  for (const [stage, s] of Object.entries(summary.stages)) {
    lines.push(`| ${stage} | ${fci(s.inKey)} | ${fci(s.clashRate)} | ${fci(s.lowCrowding)} |`);
  }
  const formStages = Object.entries(summary.stages).filter(([, s]) => s.laneEntropy || Number.isFinite(s.fallbackRate));
  if (formStages.length) {
    lines.push('', '| Stage | Fallback rate | Lane entropy (bassA / bassB / hat / openhat / clap / stab) |', '|---|---|---|');
    for (const [stage, s] of formStages) {
      const le = s.laneEntropy ? ['bassA', 'bassB', 'hat', 'openhat', 'clap', 'stab'].map(k => f(s.laneEntropy[k], 2)).join(' / ') : '–';
      lines.push(`| ${stage} | ${f(s.fallbackRate)} | ${le} |`);
    }
  }
  lines.push('', '| From → To | Metric | Δ median [95% CI] | n | Threshold | Substantial |', '|---|---|---|---|---|---|');
  for (const c of summary.comparisons) {
    lines.push(`| ${c.from} → ${c.to} | ${c.metric} | ${fci(c)} | ${c.n} | ${c.threshold} | ${c.substantial ? 'yes' : 'no'} |`);
  }
  lines.push('', '| Stage | Error classes |', '|---|---|');
  for (const [stage, s] of Object.entries(summary.stages)) {
    lines.push(`| ${stage} | ${Object.entries(s.errorCounts).map(([k, v]) => `${k}: ${v}`).join(', ') || '–'} |`);
  }
  return lines.join('\n') + '\n';
}

const csvCell = v => {
  const s = Array.isArray(v) ? v.join(' ') : String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(records) {
  const header = ['stage', 'promptId', 'category', 'rep', 'seed', 'errorClass', 'executes', 'latencyMs', 'promptTokens', 'evalTokens', 'tags', 'tagsFromCode', 'expected', 'inKey', 'clashRate', 'lowCrowding', 'fallbacks'];
  const rows = records.map(r => [
    r.stage, r.promptId, r.category, r.rep, r.seed, r.errorClass, r.executes, Math.round(r.latencyMs), r.llm.promptTokens, r.llm.evalTokens,
    r.tags, r.tagsFromCode, r.expected, r.harmony?.inKey, r.harmony?.clashRate, r.harmony?.lowCrowding, r.fallbacks,
  ].map(csvCell).join(','));
  return [header.join(','), ...rows].join('\n');
}
