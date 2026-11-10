// Usage: npm run eval:analyze -- <run.jsonl> [<more.jsonl> ...] [--take S0,S1@<other.jsonl>]
// Files given plainly contribute all stages; --take adds only the listed stages of a file.
// Output files are named after the first plain path.
import { writeFileSync } from 'node:fs';
import { parseAnalyzeArgs, loadRuns, summarize, toMarkdown, toCsv } from './analysis.js';
import { EVAL_CONFIG, THRESHOLDS, BOOTSTRAP, EXTRA_COMPARISONS } from './config.js';

let args;
try { args = parseAnalyzeArgs(process.argv.slice(2)); } catch (e) {
  console.error(`${e.message}\nusage: npm run eval:analyze -- <run.jsonl> [more.jsonl ...] [--take S0,S1@<path>]`);
  process.exit(1);
}
const { paths, stagesByPath, stem } = args;

const records = loadRuns(paths, { stagesByPath });
const summary = summarize(records, { stages: EVAL_CONFIG.stages, thresholds: THRESHOLDS, bootstrap: BOOTSTRAP, extraComparisons: EXTRA_COMPARISONS });
writeFileSync(`${stem}.summary.json`, JSON.stringify(summary, null, 2) + '\n');
writeFileSync(`${stem}.summary.md`, toMarkdown(summary));
writeFileSync(`${stem}.csv`, toCsv(records) + '\n');
console.log(toMarkdown(summary));
