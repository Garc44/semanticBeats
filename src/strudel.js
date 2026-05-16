import { initStrudel, evaluate as _evaluate, hush, samples } from '@strudel/web';

let initialized = false;

export async function init() {
  await initStrudel({
    prebake: () => samples('github:tidalcycles/dirt-samples'),
  });
  initialized = true;
}

export async function play(code) {
  if (!initialized) throw new Error('Strudel not initialized');
  await _evaluate(code, true);
}

export function stop() {
  hush();
}
