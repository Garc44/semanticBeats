import { initStrudel, evaluate as _evaluate, hush } from '@strudel/web';

let initialized = false;

export async function init() {
  await initStrudel({});
  initialized = true;
}

export async function play(code) {
  if (!initialized) throw new Error('Strudel not initialized');
  await _evaluate(code, true);
}

export function stop() {
  hush();
}

export function setcpm(cpm) {
  if (typeof window !== 'undefined' && typeof window.setcpm === 'function') {
    window.setcpm(cpm);
  }
}
