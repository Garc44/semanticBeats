import { init, play, stop, stopViz } from './src/strudel.js';
import { generateTransformationPlan } from './src/llm.js';
import { generateTransformPatch } from './src/llm.js';
import { PILLAR_NAMES, makePillars, rebuildStack } from './src/pillars.js';
import { compileTrack } from './src/compiler.js';
import { mergeLlmTransformPatch } from './src/library/transformationsLibrary.js';
import {
  setStatus,
  renderGlobalControls,
  renderPillar,
  updatePillarCode,
  setPillarMuted,
  setPillarSoloed,
  addPillarMessage,
  addPillarPreviewMessage,
  updatePillarViz,
  updatePillarMode,
} from './src/ui.js';

const pillars = makePillars();
const pillarModes = Object.fromEntries(
  PILLAR_NAMES.map(name => [name, 'generation'])
);

const globalState = {
  tempo: 120,
  beatsPerCycle: 4,
  masterVolume: 0.8,
  masterFilter: 1.0,
  intensity: 0.5,
  isPlaying: false,
  soloedPillar: null,
};

// ── Playback ──────────────────────────────────────────────

const playBtn = document.getElementById('play-btn');

async function rebuildAndPlay() {
  const stack = rebuildStack(pillars, globalState);
  if (!stack) {
    if (globalState.isPlaying) { stop(); setStatus('Nothing active'); }
    return;
  }
  if (!globalState.isPlaying) return;
  try {
    await play(stack);
  } catch {
    stop();
    globalState.isPlaying = false;
    playBtn.textContent = '▶ Play';
    setStatus('Play error — stopped');
  }
}

playBtn.addEventListener('click', async () => {
  if (!globalState.isPlaying) {
    const stack = rebuildStack(pillars, globalState);
    if (!stack) { setStatus('No active pillars'); return; }
    try {
      await play(stack);
      globalState.isPlaying = true;
      playBtn.textContent = '■ Stop';
      setStatus('Playing');
    } catch (e) {
      setStatus('Play error');
    }
  } else {
    stop();
    globalState.isPlaying = false;
    playBtn.textContent = '▶ Play';
    setStatus('Stopped');
  }
});

// ── Global Sliders ────────────────────────────────────────

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

const debouncedRebuild = debounce(rebuildAndPlay, 50);

renderGlobalControls(globalState, (key, value) => {
  globalState[key] = value;
  debouncedRebuild();
});

// ── Intent Detection ──────────────────────────────────────

const TRX_INTENT_RE = /\b(shape|reverb|filter|crush|distort|echo|delay|lopass|hipass|compress|bit.?crush|saturat|darker|brighter|warmer|wetter|drier|crisper|muddier|thinner|fatter|heavier|lighter|add|apply|remove|take off|turn (up|down)|boost|cut|more|less|no more|without|kill the|strip)\b/i;

function detectMode(prompt, pillarName, pillar) {
  // If no pattern selected yet, always generate
  if (!pillar.selectedId) return 'generation';
  // Effect/transform intent → TRX regardless of mode toggle
  if (TRX_INTENT_RE.test(prompt)) return 'transformation';
  return pillarModes[pillarName];
}

// ── Per-Pillar Send ───────────────────────────────────────

async function handlePillarSend(pillarName, prompt) {
  const pillar = pillars.find(p => p.name === pillarName);
  addPillarMessage(pillarName, 'user', prompt);
  setStatus('Thinking...');

  const mode = detectMode(prompt, pillarName, pillar);

  if (mode === 'transformation') {
    const patch = await generateTransformPatch(pillarName, prompt, pillar);
    if (!patch) {
      addPillarMessage(pillarName, 'error', 'Could not generate transform. Try rephrasing.');
      setStatus('Error');
      return;
    }
    const prevTransforms = { ...pillar.transforms };
    mergeLlmTransformPatch(pillar, patch);
    const newCode = compileTrack({ selectedId: pillar.selectedId, modifications: pillar.lastMods }, pillarName, pillar);
    if (!newCode) {
      pillar.transforms = prevTransforms;
      addPillarMessage(pillarName, 'error', 'Pattern assembly failed.');
      setStatus('Error');
      return;
    }
    addPillarPreviewMessage(
      pillarName,
      newCode,
      async () => {
        pillar.code = newCode;
        updatePillarCode(pillarName, newCode);
        await rebuildAndPlay();
        if (!globalState.isPlaying) {
          const stack = rebuildStack(pillars, globalState);
          if (stack) {
            await play(stack);
            globalState.isPlaying = true;
            playBtn.textContent = '■ Stop';
          }
        }
        setStatus('Applied');
      },
      () => {
        pillar.transforms = prevTransforms;
        setStatus('Ready');
      }
    );
    setStatus('Preview ready');
    return;
  }

  // generation mode (existing flow)
  const currentTracksState = Object.fromEntries(
    pillars.map(p => [p.name, p.selectedId ?? null])
  );

  const plan = await generateTransformationPlan(pillarName, prompt, currentTracksState);

  if (!plan) {
    addPillarMessage(pillarName, 'error', 'Could not select pattern. Try rephrasing.');
    setStatus('Error');
    return;
  }

  const newCode = compileTrack(plan, pillarName, pillar);
  if (!newCode) {
    addPillarMessage(pillarName, 'error', 'Pattern assembly failed.');
    setStatus('Error');
    return;
  }

  const prevCode = pillar.code;
  const prevSelectedId = pillar.selectedId;
  const prevLastMods = pillar.lastMods;

  addPillarPreviewMessage(
    pillarName,
    newCode,
    async () => {
      pillar.selectedId = plan.selectedId;
      pillar.lastMods = plan.modifications ?? {};
      pillar.code = newCode;
      updatePillarCode(pillarName, newCode);
      await rebuildAndPlay();
      if (!globalState.isPlaying) {
        const stack = rebuildStack(pillars, globalState);
        if (stack) {
          await play(stack);
          globalState.isPlaying = true;
          playBtn.textContent = '■ Stop';
        }
      }
      setStatus('Applied');
    },
    () => {
      pillar.code = prevCode;
      pillar.selectedId = prevSelectedId;
      pillar.lastMods = prevLastMods;
      setStatus('Ready');
    }
  );

  setStatus('Preview ready');
}

// ── Viz Toggle ────────────────────────────────────────────

function handleVizToggle(pillarName) {
  const pillar = pillars.find(p => p.name === pillarName);
  const next = pillar.vizType === null ? 'grid'
             : pillar.vizType === 'grid' ? 'spectrum'
             : null;
  if (!next) stopViz(pillarName);
  pillar.vizType = next;
  updatePillarViz(pillarName, next);
  rebuildAndPlay();
}

// ── Mute / Solo ───────────────────────────────────────────

function handleMute(pillarName) {
  const pillar = pillars.find(p => p.name === pillarName);
  pillar.muted = !pillar.muted;
  setPillarMuted(pillarName, pillar.muted);
  rebuildAndPlay();
}

function handleSolo(pillarName) {
  globalState.soloedPillar = globalState.soloedPillar === pillarName ? null : pillarName;
  setPillarSoloed(globalState.soloedPillar, PILLAR_NAMES);
  rebuildAndPlay();
}

// ── Mount Pillars ─────────────────────────────────────────

const pillarsRow = document.getElementById('pillars-row');

window.__pillarVizCtx = {};

for (const pillar of pillars) {
  const card = renderPillar(pillar, {
    onSend: (prompt) => handlePillarSend(pillar.name, prompt),
    onMute: () => handleMute(pillar.name),
    onSolo: () => handleSolo(pillar.name),
    onVizToggle: () => handleVizToggle(pillar.name),
    onModeToggle: () => {
      pillarModes[pillar.name] = pillarModes[pillar.name] === 'generation' ? 'transformation' : 'generation';
      updatePillarMode(pillar.name, pillarModes[pillar.name]);
    },
    onCodeEdit: (newCode) => {
      if (newCode === pillar.code) return;
      pillar.code = newCode;
      rebuildAndPlay();
    },
  });
  pillarsRow.appendChild(card);
  const canvas = document.getElementById(`viz-canvas-${pillar.name}`);
  if (canvas) {
    const ctx = canvas.getContext('2d');
    window.__pillarVizCtx[pillar.name] = ctx;
    const ro = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      const parent = canvas.parentElement;
      canvas.width = (parent?.offsetWidth || canvas.offsetWidth) * dpr;
      canvas.height = (parent?.offsetHeight || canvas.offsetHeight) * dpr;
    });
    ro.observe(canvas.parentElement ?? canvas);
  }
}

// ── Init ──────────────────────────────────────────────────

(async () => {
  setStatus('Loading...');
  try {
    await init();
    setStatus('Ready');
  } catch (e) {
    setStatus('Engine failed');
    console.error(e);
  }
})();
