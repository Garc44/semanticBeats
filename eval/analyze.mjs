// Usage: npm run eval:analyze -- eval/results/full-2026-11-01.jsonl
import { writeFileSync } from 'node:fs';
import { loadRecords, summarize, toMarkdown, toCsv } from './analysis.js';
import { EVAL_CONFIG, THRESHOLDS, BOOTSTRAP } from './config.js';

const path = process.argv[2];
if (!path) { console.error('usage: npm run eval:analyze -- <run.jsonl>'); process.exit(1); }

const records = loadRecords(path);
const summary = summarize(records, { stages: EVAL_CONFIG.stages, thresholds: THRESHOLDS, bootstrap: BOOTSTRAP });
const stem = path.replace(/\.jsonl$/, '');
writeFileSync(`${stem}.summary.json`, JSON.stringify(summary, null, 2) + '\n');
writeFileSync(`${stem}.summary.md`, toMarkdown(summary));
writeFileSync(`${stem}.csv`, toCsv(records) + '\n');
console.log(toMarkdown(summary));
