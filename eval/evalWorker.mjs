// Worker entry: evaluates Strudel code off the main thread so a hang or OOM
// can be killed by the parent. Not a security boundary (see validity.js).
import { parentPort } from 'node:worker_threads';
import { queryCycle } from './strudelHeadless.js';

const num = t => Number(t?.valueOf?.());

function cloneSafe(value) {
  try { structuredClone(value); return value; } catch {
    try { return JSON.parse(JSON.stringify(value)); } catch { return String(value); }
  }
}

parentPort.on('message', async ({ id, code, ping }) => {
  if (ping !== undefined) return parentPort.postMessage({ pong: ping });
  try {
    const haps = await queryCycle(code);
    parentPort.postMessage({
      id, ok: true,
      haps: haps.map(h => ({
        value: cloneSafe(h.value),
        whole: h.whole ? { begin: num(h.whole.begin), end: num(h.whole.end) } : null,
      })),
    });
  } catch (err) {
    parentPort.postMessage({
      id, ok: false,
      error: { message: String(err?.message ?? err), name: err?.name ?? 'Error', code: err?.code },
    });
  }
});
