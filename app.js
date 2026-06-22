import { init, play, stop, stopViz } from './src/strudel.js';
import { generateTransformationPlan } from './src/llm.js';
import { generateTransformPatch } from './src/llm.js';
import { warmUpModel } from './src/llm.js';
import { PILLAR_NAMES, makePillars, rebuildStack } from './src/pillars.js';
import { compileTrack } from './src/compiler.js';
import { mergeLlmTransformPatch, applyEmotionRecipe } from './src/library/transformationsLibrary.js';
import { getEmotionsForPillar } from './src/library/emotionsLibrary.js';
import { rankSoundsByCohesion } from './src/library/cohesion.js';
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
  setGenChips,
} from './src/ui.js';
import { maybeStartOnboarding, startOnboarding } from './src/onboarding.js';

const pillars = makePillars();
const pillarModes = Object.fromEntries(
  PILLAR_NAMES.map(name => [name, 'generation'])
);

// Cross-pillar snapshot: { pillarName: selectedId | null }. Used both for the
// LLM cohesion context and for ranking GEN browse chips.
function tracksSnapshot() {
  return Object.fromEntries(pillars.map(p => [p.name, p.selectedId ?? null]));
}

// Cap GEN chips so the browse menu stays scannable; ranking is cohesion-first,
// so the top slice surfaces the sounds that fit the current mix.
const GEN_CHIP_COUNT = 5;
function genChipsFor(name) {
  return rankSoundsByCohesion(name, tracksSnapshot()).slice(0, GEN_CHIP_COUNT);
}

// Recompute every pillar's GEN chips so cohesion marks/order reflect the
// current mix. Cheap; only GEN-mode rows are visible at any time.
function refreshAllGenChips() {
  for (const p of pillars) setGenChips(p.name, genChipsFor(p.name));
}

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

// Reflect transport state into the DOM so CSS can drive beat-synced motion.
function setPlaying(playing) {
  globalState.isPlaying = playing;
  playBtn.textContent = playing ? '■ Stop' : '▶ Play';
  document.body.classList.toggle('is-playing', playing);
}

// Expose beat duration (seconds) as a CSS var so pulse animations stay in time.
function syncBeatDuration() {
  const beatSec = 60 / globalState.tempo;
  document.documentElement.style.setProperty('--beat-dur', `${beatSec}s`);
  document.documentElement.style.setProperty('--bar-dur', `${beatSec * globalState.beatsPerCycle}s`);
}
syncBeatDuration();

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
    setPlaying(false);
    setStatus('Play error — stopped');
  }
}

playBtn.addEventListener('click', async () => {
  if (!globalState.isPlaying) {
    const stack = rebuildStack(pillars, globalState);
    if (!stack) { setStatus('No active pillars'); return; }
    try {
      await play(stack);
      setPlaying(true);
      setStatus('Playing');
    } catch (e) {
      setStatus('Play error');
    }
  } else {
    stop();
    setPlaying(false);
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
  if (key === 'tempo' || key === 'beatsPerCycle') syncBeatDuration();
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
      addPillarMessage(pillarName, 'error', 'No matching effect — try rephrasing.');
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
        refreshAllGenChips();
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
  const currentTracksState = tracksSnapshot();

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
          setPlaying(true);
        }
      }
      setStatus('Applied');
      refreshAllGenChips();
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

// ── Emotion Recipe (TRX chips) ────────────────────────────
// Deterministic, offline: an emotion chip applies a curated recipe directly, bypassing
// the LLM/parseDirectCommand path. Replace semantics + the existing preview/revert flow.
async function handleEmotion(pillarName, recipeId) {
  const pillar = pillars.find(p => p.name === pillarName);
  const recipe = getEmotionsForPillar(pillarName).find(r => r.id === recipeId);
  if (!recipe) {
    addPillarMessage(pillarName, 'error', 'Unknown emotion.');
    setStatus('Error');
    return;
  }
  addPillarMessage(pillarName, 'user', recipe.label);
  setStatus('Thinking...');

  const prevTransforms = { ...pillar.transforms };
  applyEmotionRecipe(pillar, recipe);
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
          setPlaying(true);
        }
      }
      setStatus('Applied');
      refreshAllGenChips();
    },
    () => {
      pillar.transforms = prevTransforms;
      setStatus('Ready');
    }
  );
  setStatus('Preview ready');
}

// ── Per-Pillar Volume ─────────────────────────────────────
// Live mixer fader: writes the gain knob and recompiles the pillar code so the
// baked .gain(...) updates, then rebuilds the running stack (debounced).
function handleVolume(pillarName, val) {
  const pillar = pillars.find(p => p.name === pillarName);
  pillar.knobs.gain = val;
  if (!pillar.code.trim()) return;
  const newCode = compileTrack({ selectedId: pillar.selectedId, modifications: pillar.lastMods }, pillarName, pillar);
  if (!newCode) return;
  pillar.code = newCode;
  updatePillarCode(pillarName, newCode);
  debouncedRebuild();
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
      if (pillarModes[pillar.name] === 'generation') {
        setGenChips(pillar.name, genChipsFor(pillar.name));
      }
    },
    onCodeEdit: (newCode) => {
      if (newCode === pillar.code) return;
      pillar.code = newCode;
      rebuildAndPlay();
    },
    onEmotion: (recipeId) => handleEmotion(pillar.name, recipeId),
    onVolume: (val) => handleVolume(pillar.name, val),
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

// Initial GEN chip population (all channels empty -> original order).
refreshAllGenChips();

// ── Onboarding ────────────────────────────────────────────
const helpBtn = document.getElementById('help-btn');
if (helpBtn) helpBtn.addEventListener('click', () => startOnboarding());
maybeStartOnboarding();

// ── Init ──────────────────────────────────────────────────

(async () => {
  setStatus('Loading...');
  try {
    await init();
    warmUpModel(); // preload LLM into RAM so first generative prompt is warm
    setStatus('Ready');
  } catch (e) {
    setStatus('Engine failed');
    console.error(e);
  }
})();
