import { callOllamaDetailed } from '../../src/llm.js';
import { extractCode, makeCallLog, llmOptions } from './common.js';

// S0 — baseline: raw prompt, direct code output. The system prompt states the task (three techno parts) and the output format.
export const S0_SYSTEM = `You are a live-coding assistant for Strudel (strudel.cc), a JavaScript pattern language for music.
Write a techno loop in Strudel for the user's request with three parts: drums (kick and hi-hats), a bassline, and a melodic part (stab or lead).
Output ONLY the Strudel code — no prose, no markdown fences, no comments.`;

export const S0 = {
  id: 'S0',
  tagSource: 'code',
  async run(prompt, opts) {
    const { log, onCall } = makeCallLog();
    const { raw } = await callOllamaDetailed(S0_SYSTEM, prompt, llmOptions(opts, onCall));
    return { code: extractCode(raw), selectedIds: null, intent: null, plans: [], llm: log };
  },
};
