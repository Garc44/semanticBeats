import { initStrudel, samples, evaluate as _evaluate, hush } from '@strudel/web';

let initialized = false;

export async function init() {
  try {
    await initStrudel({
      prebake: () => Promise.all([
        samples('https://raw.githubusercontent.com/felixroos/dough-samples/main/tidal-drum-machines.json'),
        samples('github:tidalcycles/dirt-samples')
      ])
    });
    initialized = true;
    console.log("Strudel sample packs baked successfully.");
  } catch (error) {
    console.error("Failed to preload Strudel sample packs:", error);
    throw error;
  }
}

export async function play(code) {
  if (!initialized) throw new Error('Strudel not initialized');
  await _evaluate(code, true, false);
}

export function stop() {
  hush();
}

function setcpm(cpm) {
  if (typeof window !== 'undefined' && typeof window.setcpm === 'function') {
    window.setcpm(cpm);
  } else {
    console.warn('setcpm: window.setcpm not available');
  }
}
