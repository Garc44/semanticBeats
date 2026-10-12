import { callOllamaDetailed } from '../../src/llm.js';
import { METHOD_CARDS, BANKS } from '../../src/library/strudelDocs.js';
import { S0_SYSTEM } from './s0.js';
import { extractCode, makeCallLog, llmOptions } from './common.js';

// Only names present in BOTH banks (the 808 has no rd) — asserted in tests.
export const SPEC_SOUNDS = {
  banked: ['bd', 'sd', 'cp', 'hh', 'oh', 'rim', 'lt', 'mt', 'ht'],
  banks: BANKS,
  synths: ['sine', 'square', 'triangle', 'sawtooth'],
};

export const CORE_FUNCTIONS = ['s', 'note', 'n', 'stack', 'cat', 'seq', 'bank', 'scale', 'fast', 'slow', 'gain'];

const range = card => (card.type === 'enum' ? card.values.join('|') : `${card.min}–${card.max}`);

// Formal target-language specification (Text2DSL-style): static, identical for every prompt.
export function buildSpecBlock() {
  const methods = Object.entries(METHOD_CARDS).map(([name, card]) => `- ${name}${card.sig}: ${range(card)} — ${card.note}`);
  return `
Allowed sound sources (use nothing else):
- Drum samples, always with .bank(${SPEC_SOUNDS.banks.map(b => `"${b}"`).join(' or ')}): ${SPEC_SOUNDS.banked.join(', ')}
- Synths for note(...).s(...): ${SPEC_SOUNDS.synths.join(', ')}

Core functions: ${CORE_FUNCTIONS.join(', ')}

Effect functions (stay inside the ranges):
${methods.join('\n')}`;
}

export const S1_SYSTEM = `${S0_SYSTEM}\n${buildSpecBlock()}`;

// S1 — S0 + specification of allowed sounds and functions. No intent: the spec is prompt-independent.
export const S1 = {
  id: 'S1',
  tagSource: 'code',
  async run(prompt, opts) {
    const { log, onCall } = makeCallLog();
    const { raw } = await callOllamaDetailed(S1_SYSTEM, prompt, llmOptions(opts, onCall));
    return { code: extractCode(raw), selectedIds: null, intent: null, plans: [], llm: log };
  },
};
