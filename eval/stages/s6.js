import { callOllamaDetailed } from '../../src/llm.js';
import { buildIntent } from '../../src/intent.js';
import { retrieveGraph, subgenreContextText } from '../graph/graphRag.js';
import { FORM_SCHEMA, S6_SYSTEM } from '../s6/form.js';
import { compileForm } from '../s6/compiler.js';
import { makeCallLog, llmOptions } from './common.js';

export function parseForm(raw) {
  try {
    const form = JSON.parse(raw);
    return form && typeof form === 'object' && !Array.isArray(form) ? form : null;
  } catch {
    return null;
  }
}

// S6 — form + compiler (spec Rev. 2 §2.3). Keeps S5's intent call, graph knowledge and
// reasoning field; replaces catalogue selection with a structured form. Second deliberate
// change of output form (after S2 → S3).
export const S6 = {
  id: 'S6',
  tagSource: 'code',
  async run(prompt, opts) {
    const { log, onCall } = makeCallLog();
    const llm = llmOptions(opts, onCall);
    const intent = await buildIntent(prompt, llm);
    const system = `${S6_SYSTEM}\n\nKnowledge graph context:\n${subgenreContextText(retrieveGraph(prompt, intent))}`;
    const { raw } = await callOllamaDetailed(system, prompt, { ...llm, schema: FORM_SCHEMA });
    const form = parseForm(raw);
    if (!form) return { code: null, selectedIds: null, intent, plans: [], form: null, fallbacks: [], llm: log };
    const { code, fallbacks } = compileForm(form);
    return { code, selectedIds: null, intent, plans: [], form, fallbacks, llm: log };
  },
};
