import { buildIntent } from '../../src/intent.js';
import { generateTransformationPlan } from '../../src/llm.js';
import { compileTrack } from '../../src/compiler.js';
import { PILLAR_NAMES, makePillars } from '../../src/pillars.js';
import { EVAL_CONFIG } from '../config.js';

// Underspecified prompts with no recognisable part get a minimal techno track.
export const DEFAULT_TRACK_PILLARS = ['drums', 'bass'];

export function trackPillars(intent) {
  const wanted = new Set((intent?.layers ?? []).map(l => l.pillar));
  const ordered = PILLAR_NAMES.filter(p => wanted.has(p));
  return ordered.length ? ordered : DEFAULT_TRACK_PILLARS;
}

export function assembleStack(layerCodes) {
  const layers = layerCodes.filter(Boolean);
  if (!layers.length) return null;
  return layers.length === 1 ? layers[0] : `stack(\n${layers.join(',\n')}\n)`;
}

// Minimal, identical post-processing for free-code stages (S0–S2):
// first fenced block if present, else the trimmed text.
export function extractCode(raw) {
  const text = String(raw ?? '');
  const fenced = text.match(/```[\w-]*\n([\s\S]*?)```/);
  const code = (fenced ? fenced[1] : text).trim();
  return code || null;
}

export function makeCallLog() {
  const log = { calls: 0, promptTokens: 0, evalTokens: 0, llmMs: 0, outputs: [] };
  const onCall = ({ promptTokens, evalTokens, durationMs, raw }) => {
    log.calls++;
    log.promptTokens += promptTokens;
    log.evalTokens += evalTokens;
    log.llmMs += durationMs;
    log.outputs.push(raw);
  };
  return { log, onCall };
}

export function llmOptions({ temperature, seed }, onCall) {
  return { temperature, seed, numPredict: EVAL_CONFIG.numPredict, onCall };
}

// S3–S5: the prototype's selection pipeline. One plan call per intent pillar, sequential,
// earlier picks passed as cohesion context — exactly like app.js. planOptionsFor adds the
// stage's mechanism (reasoning, graph context) without touching anything else.
export async function runSelectionStage(prompt, opts, { planOptionsFor = () => ({}) } = {}) {
  const { log, onCall } = makeCallLog();
  const llm = llmOptions(opts, onCall);
  const intent = await buildIntent(prompt, llm);
  const pillars = makePillars();
  const tracksState = {};
  const layers = [];
  const selectedIds = [];
  const plans = [];

  for (const pillarName of trackPillars(intent)) {
    const plan = await generateTransformationPlan(pillarName, prompt, tracksState, intent, {
      llm, ...planOptionsFor(pillarName, intent),
    });
    plans.push({ pillar: pillarName, plan });
    if (!plan) continue;
    tracksState[pillarName] = plan.selectedId;
    selectedIds.push(plan.selectedId);
    layers.push(compileTrack(plan, pillarName, pillars.find(p => p.name === pillarName)));
  }

  return { code: assembleStack(layers), selectedIds, intent, plans, llm: log };
}
