import { init, play, stop } from './src/strudel.js';
import { generateTransformationPlan, autoFixCode } from './src/llm.js';
import { applyTransformation, generateSeed } from './src/patchEngine.js';
import { expandStyle } from './src/library/styles.js';
import { validateCode } from './src/validate.js';
import { PILLAR_NAMES, makePillars, rebuildStack } from './src/pillars.js';
import {
  setStatus,
  renderGlobalControls,
  renderPillar,
  updatePillarCode,
  setPillarMuted,
  setPillarSoloed,
  addPillarMessage,
  addPillarPreviewMessage,
} from './src/ui.js';

const pillars = makePillars();

const globalState = {
  tempo: 1.0,
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
  } catch (e) {
    setStatus('Fixing...');
    try {
      const fixed = await autoFixCode(stack, e.message);
      await play(fixed);
      setStatus('Playing (auto-fixed)');
    } catch {
      stop();
      globalState.isPlaying = false;
      playBtn.textContent = '▶ Play';
      setStatus('Error — stopped');
    }
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

// ── Per-Pillar Send ───────────────────────────────────────

async function handlePillarSend(pillarName, prompt) {
  const pillar = pillars.find(p => p.name === pillarName);
  addPillarMessage(pillarName, 'user', prompt);
  setStatus('Planning...');

  const plan = await generateTransformationPlan(
    pillar.code,
    prompt,
    pillar.history,
    globalState.intensity,
    pillarName
  );

  if (!plan) {
    addPillarMessage(pillarName, 'error', 'Could not plan transformation. Try rephrasing.');
    setStatus('Error');
    return;
  }

  if (plan.mode === 'generate' && pillar.code.trim()) {
    addPillarMessage(pillarName, 'error', 'Generate mode returned for existing code. Try a more specific request.');
    setStatus('Error');
    return;
  }

  let newCode;
  if (plan.mode === 'transform') {
    newCode = applyTransformation(pillar.code, {
      operations: expandStyle(plan.style, plan.target, plan.intensity),
    });
  } else {
    newCode = generateSeed(plan);
  }

  const validation = validateCode(newCode);
  if (!validation.valid) {
    addPillarMessage(pillarName, 'error', `Validation failed: ${validation.errors.join(', ')}`);
    setStatus('Error');
    return;
  }

  const prevCode = pillar.code;
  addPillarPreviewMessage(
    pillarName,
    newCode,
    async () => {
      pillar.code = newCode;
      updatePillarCode(pillarName, newCode);
      pillar.history.push(
        { role: 'user', content: `Current code:\n${prevCode}\n\nRequest: ${prompt}` },
        { role: 'assistant', content: newCode }
      );
      await rebuildAndPlay();
      setStatus('Applied');
    },
    () => setStatus('Ready')
  );

  setStatus('Preview ready');
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

for (const pillar of pillars) {
  const card = renderPillar(pillar, {
    onSend: (prompt) => handlePillarSend(pillar.name, prompt),
    onMute: () => handleMute(pillar.name),
    onSolo: () => handleSolo(pillar.name),
    onCodeEdit: (newCode) => {
      if (newCode === pillar.code) return;
      pillar.code = newCode;
      rebuildAndPlay();
    },
  });
  pillarsRow.appendChild(card);
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
