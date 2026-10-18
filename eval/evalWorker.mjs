// Worker entry: evaluates Strudel code off the main thread so a hang or OOM
// can be killed by the parent. Not a security boundary (see validity.js).
import { parentPort } from 'node:worker_threads';
import { evaluatePattern } from './strudelHeadless.js';

const num = t => Number(t?.valueOf?.());

function cloneSafe(value) {
  try { structuredClone(value); return value; } catch {
    try { return JSON.parse(JSON.stringify(value)); } catch { return String(value); }
  }
}

const serialize = haps => haps.map(h => ({
  value: cloneSafe(h.value),
  whole: h.whole ? { begin: num(h.whole.begin), end: num(h.whole.end) } : null,
}));

// haps = bar 0 (validity window), hapsAll = bars [0, cycles) (content window).
parentPort.on('message', async ({ id, code, cycles = 1, ping }) => {
  if (ping !== undefined) return parentPort.postMessage({ pong: ping });
  try {
    const pattern = await evaluatePattern(code);
    const haps = pattern.queryArc(0, 1);
    const hapsAll = cycles > 1 ? pattern.queryArc(0, cycles) : haps;
    parentPort.postMessage({ id, ok: true, haps: serialize(haps), hapsAll: serialize(hapsAll) });
  } catch (err) {
    parentPort.postMessage({
      id, ok: false,
      error: { message: String(err?.message ?? err), name: err?.name ?? 'Error', code: err?.code },
    });
  }
});
