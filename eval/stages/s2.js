import { callOllamaDetailed } from '../../src/llm.js';
import { buildIntent } from '../../src/intent.js';
import { rankPatternsByIntent } from '../../src/promptEngine.js';
import { S1_SYSTEM } from './s1.js';
import { extractCode, makeCallLog, llmOptions, trackPillars } from './common.js';

export const EXAMPLES_PER_PILLAR = 3;

const oneLine = code => code.replace(/\s+/g, ' ').trim();

// Similarity-selected few-shot examples: top-k library patterns per intent pillar.
export function buildExamplesBlock(intent) {
  const examples = trackPillars(intent).flatMap(pillar =>
    rankPatternsByIntent(pillar, intent)
      .slice(0, EXAMPLES_PER_PILLAR)
      .map(({ pattern }) => `[${pillar}] ${pattern.id} (tags: ${pattern.tags.join(', ')}): ${oneLine(pattern.code)}`));

  return `
Example patterns that match this request (adapt or combine them; one layer per part, combined with stack(...)):
${examples.join('\n')}`;
}

// S2 — S1 + few-shot examples. The intent call starts here: example choice depends on it.
export const S2 = {
  id: 'S2',
  tagSource: 'code',
  async run(prompt, opts) {
    const { log, onCall } = makeCallLog();
    const llm = llmOptions(opts, onCall);
    const intent = await buildIntent(prompt, llm);
    const system = `${S1_SYSTEM}\n${buildExamplesBlock(intent)}`;
    const { raw } = await callOllamaDetailed(system, prompt, llm);
    return { code: extractCode(raw), selectedIds: null, intent, plans: [], llm: log };
  },
};
