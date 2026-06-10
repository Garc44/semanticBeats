import { initStrudel, samples, evaluate as _evaluate, hush } from '@strudel/web';
import { cleanupDraw, __pianoroll } from '@strudel/draw';
import { drawTimeScope } from '@strudel/webaudio/scope.mjs';
import { analysers } from 'superdough';
import '@strudel/webaudio/spectrum.mjs';
import '@strudel/webaudio/scope.mjs';

window.__vizDraw = (name, vizType) => (haps, time) => {
  const ctx = window.__pillarVizCtx?.[name];
  if (!ctx) return;

  if (vizType === 'scope') {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const id = `scop-${name}`;
    drawTimeScope(analysers[id], {
      ctx,
      id,
      color: haps[0]?.value?.color || '#E8302A',
      pos: 0.5,
      scale: 0.4,
      thickness: 3,
    });
    return;
  }

  const isGrid = vizType === 'grid';
  const cycles = isGrid ? 2 : 4;
  const fold = isGrid ? 1 : 0;
  const autorange = isGrid ? 0 : 1;
  const playhead = 0.5;
  const from = -cycles * playhead;
  const to = cycles * (1 - playhead);
  __pianoroll({
    ctx, time,
    haps: haps.filter(h => h.isWithinTime(time + from, time + to)),
    cycles, playhead, fold, autorange,
    background: 'transparent',
  });
};

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

export function stopViz(pillarName) {
  cleanupDraw(false, `viz-${pillarName}`);
  cleanupDraw(false, `spec-${pillarName}`);
  cleanupDraw(false, `scop-${pillarName}`);
  const ctx = window.__pillarVizCtx?.[pillarName];
  if (ctx) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function setcpm(cpm) {
  if (typeof window !== 'undefined' && typeof window.setcpm === 'function') {
    window.setcpm(cpm);
  } else {
    console.warn('setcpm: window.setcpm not available');
  }
}
