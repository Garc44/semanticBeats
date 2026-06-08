import { init, play, stop, setcpm } from './src/strudel.js';
import { generateTransformationPlan } from './src/llm.js';
import { PILLAR_NAMES, makePillars, rebuildStack } from './src/pillars.js';
import { compileTrack } from './src/compiler.js';
import { GENRE_NAMES, getGenreCode } from './src/library/soundLibrary.js';
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
  if (key === 'tempo') { setcpm(value * 60); return; }
  debouncedRebuild();
});

// ── Per-Pillar Send ───────────────────────────────────────

async function handlePillarSend(pillarName, prompt) {
  const pillar = pillars.find(p => p.name === pillarName);
  addPillarMessage(pillarName, 'user', prompt);
  setStatus('Selecting...');

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
    onKnobChange: (key, value) => {
      pillar.knobs[key] = value;
      if (pillar.selectedId) {
        pillar.code = compileTrack(
          { selectedId: pillar.selectedId, modifications: pillar.lastMods ?? {} },
          pillar.name,
          pillar
        );
        updatePillarCode(pillar.name, pillar.code);
      }
      debouncedRebuild();
    },
  });
  pillarsRow.appendChild(card);
}

// ── Genre Loader ──────────────────────────────────────────

function loadGenre(genreName) {
  const genre = getGenreCode(genreName);
  if (!genre) return;
  for (const pillar of pillars) {
    pillar.code = genre[pillar.name] ?? '';
    updatePillarCode(pillar.name, pillar.code);
  }
  rebuildAndPlay();
  setStatus(`Loaded: ${genreName}`);
}

const genreBar = document.getElementById('genre-bar');
for (const name of GENRE_NAMES) {
  const btn = document.createElement('button');
  btn.className = 'btn-genre';
  btn.textContent = name.replace('_', ' ');
  btn.addEventListener('click', () => loadGenre(name));
  genreBar.appendChild(btn);
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
