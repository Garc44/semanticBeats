// Usage: npm run eval:analyze -- <run.jsonl> [<more.jsonl> ...] [--take S0,S1@<other.jsonl>]
// Files given plainly contribute all stages; --take adds only the listed stages of a file.
// Output files are named after the first path.
import { writeFileSync } from 'node:fs';
import { loadRuns, summarize, toMarkdown, toCsv } from './analysis.js';
import { EVAL_CONFIG, THRESHOLDS, BOOTSTRAP, EXTRA_COMPARISONS } from './config.js';

const args = process.argv.slice(2);
const paths = [];
const stagesByPath = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--take') {
    const [stages, path] = (args[++i] ?? '').split('@');
    if (!stages || !path) { console.error('--take expects S0,S1@<path>'); process.exit(1); }
    stagesByPath[path] = stages.split(',');
    paths.push(path);
  } else paths.push(args[i]);
}
if (!paths.length) { console.error('usage: npm run eval:analyze -- <run.jsonl> [more.jsonl ...] [--take S0,S1@<path>]'); process.exit(1); }

const records = loadRuns(paths, { stagesByPath });
const summary = summarize(records, { stages: EVAL_CONFIG.stages, thresholds: THRESHOLDS, bootstrap: BOOTSTRAP, extraComparisons: EXTRA_COMPARISONS });
const stem = paths[0].replace(/\.jsonl$/, '');
writeFileSync(`${stem}.summary.json`, JSON.stringify(summary, null, 2) + '\n');
writeFileSync(`${stem}.summary.md`, toMarkdown(summary));
writeFileSync(`${stem}.csv`, toCsv(records) + '\n');
console.log(toMarkdown(summary));
