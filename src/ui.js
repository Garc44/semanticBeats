
import { getEmotionsForPillar } from './library/emotionsLibrary.js';

const PILLAR_ICONS = {
  drums:       `<svg width="16" height="16" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="7" cy="7" r="6" stroke="#E8302A" stroke-width="1.5"/><circle cx="7" cy="7" r="2.5" fill="#E8302A"/></svg>`,
  bass:        `<svg width="16" height="16" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 10 Q3.5 2 7 7 Q10.5 12 13 4" stroke="#E8302A" stroke-width="1.5" fill="none"/></svg>`,
  percussion:  `<svg width="16" height="16" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="3" y1="2" x2="3" y2="12" stroke="#E8302A" stroke-width="1.5"/><line x1="7" y1="4" x2="7" y2="12" stroke="#E8302A" stroke-width="1.5"/><line x1="11" y1="2" x2="11" y2="12" stroke="#E8302A" stroke-width="1.5"/></svg>`,
  melody:      `<svg width="16" height="16" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="7,1 13,13 1,13" stroke="#E8302A" stroke-width="1.5" fill="none"/></svg>`,
  transitions: `<svg width="16" height="16" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="12" height="12" stroke="#E8302A" stroke-width="1.5" fill="none"/><line x1="1" y1="7" x2="13" y2="7" stroke="#E8302A" stroke-width="1"/><line x1="7" y1="1" x2="7" y2="13" stroke="#E8302A" stroke-width="1"/></svg>`,
};


// Display-only labels (internal pillar names stay drums/bass/percussion/etc.).
const PILLAR_LABELS = {
  percussion: 'PERCS',
  transitions: 'EFFECTS',
};

const statusEl = () => document.getElementById('status');

export function setStatus(text) {
  statusEl().textContent = text;
}

export function renderGlobalControls(globalState, onChange) {
  const container = document.getElementById('global-controls');
  container.innerHTML = '';

  const sliders = [
    { key: 'tempo',        label: 'BPM',       min: 40,  max: 200, step: 1,    value: globalState.tempo,        decimals: 0 },
    { key: 'masterVolume', label: 'Volume',     min: 0,   max: 1,   step: 0.05, value: globalState.masterVolume, decimals: 2 },
    { key: 'masterFilter', label: 'Filter',     min: 0,   max: 1,   step: 0.01, value: globalState.masterFilter, decimals: 2 },
    { key: 'intensity',    label: 'Intensity',  min: 0,   max: 1,   step: 0.05, value: globalState.intensity,    decimals: 2 },
  ];

  for (const s of sliders) {
    const group = document.createElement('div');
    group.className = 'slider-group';

    const label = document.createElement('label');
    const valueSpan = document.createElement('span');
    valueSpan.className = 'slider-value';
    valueSpan.textContent = s.value.toFixed(s.decimals);
    label.textContent = s.label + ' ';
    label.appendChild(valueSpan);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = s.min;
    input.max = s.max;
    input.step = s.step;
    input.value = s.value;
    input.dataset.key = s.key;
    input.addEventListener('input', () => {
      const val = parseFloat(input.value);
      valueSpan.textContent = val.toFixed(s.decimals);
      onChange(s.key, val);
    });

    group.appendChild(label);
    group.appendChild(input);
    container.appendChild(group);
  }

  const bpcGroup = document.createElement('div');
  bpcGroup.className = 'slider-group';
  const bpcLabel = document.createElement('label');
  bpcLabel.textContent = 'Beats/Cycle';
  bpcGroup.appendChild(bpcLabel);

  const bpcBtns = document.createElement('div');
  bpcBtns.className = 'bpc-buttons';
  for (const n of [2, 4, 8]) {
    const btn = document.createElement('button');
    btn.textContent = n;
    btn.className = 'btn-bpc' + (globalState.beatsPerCycle === n ? ' active' : '');
    btn.addEventListener('click', () => {
      bpcBtns.querySelectorAll('.btn-bpc').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onChange('beatsPerCycle', n);
    });
    bpcBtns.appendChild(btn);
  }
  bpcGroup.appendChild(bpcBtns);
  container.appendChild(bpcGroup);
}

export function renderPillar(pillar, { onSend, onMute, onSolo, onCodeEdit, onVizToggle, onModeToggle, onEmotion, onVolume }) {
  const card = document.createElement('div');
  card.className = 'pillar-card';
  if (!pillar.code || !pillar.code.trim()) card.classList.add('pillar--empty');
  card.dataset.pillar = pillar.name;

  const header = document.createElement('div');
  header.className = 'pillar-header';

  const titleEl = document.createElement('div');
  titleEl.className = 'pillar-title';
  titleEl.innerHTML = PILLAR_ICONS[pillar.name] ?? '';

  const nameEl = document.createElement('span');
  nameEl.className = 'pillar-name';
  nameEl.textContent = PILLAR_LABELS[pillar.name] ?? pillar.name.replace(/_/g, ' ').toUpperCase();
  titleEl.appendChild(nameEl);

  const controls = document.createElement('div');
  controls.className = 'pillar-controls';

  const muteBtn = document.createElement('button');
  muteBtn.className = 'btn-mute';
  muteBtn.textContent = 'M';
  muteBtn.title = 'Mute';
  muteBtn.addEventListener('click', onMute);

  const soloBtn = document.createElement('button');
  soloBtn.className = 'btn-solo';
  soloBtn.textContent = 'S';
  soloBtn.title = 'Solo';
  soloBtn.addEventListener('click', onSolo);

  const vizBtn = document.createElement('button');
  vizBtn.className = 'btn-viz';
  vizBtn.textContent = 'OFF';
  vizBtn.title = 'Toggle visualization';
  vizBtn.addEventListener('click', onVizToggle);

  const modeBtn = document.createElement('button');
  modeBtn.className = 'btn-mode';
  modeBtn.textContent = 'GEN';
  modeBtn.title = 'Toggle Generation / Transformation mode';
  modeBtn.addEventListener('click', onModeToggle);

  controls.appendChild(muteBtn);
  controls.appendChild(soloBtn);
  controls.appendChild(vizBtn);
  controls.appendChild(modeBtn);
  header.appendChild(titleEl);
  header.appendChild(controls);

  const codeEl = document.createElement('div');
  codeEl.className = 'pillar-code';
  codeEl.contentEditable = 'true';
  codeEl.spellcheck = false;
  codeEl.textContent = pillar.code;
  codeEl.addEventListener('blur', () => onCodeEdit(codeEl.textContent.trim()));

  const volRow = document.createElement('div');
  volRow.className = 'pillar-vol-row';

  const volLabel = document.createElement('label');
  volLabel.className = 'pillar-vol-label';
  const volValue = document.createElement('span');
  volValue.className = 'slider-value';
  volValue.textContent = pillar.knobs.gain.toFixed(2);
  volLabel.textContent = 'VOL ';
  volLabel.appendChild(volValue);

  const volInput = document.createElement('input');
  volInput.type = 'range';
  volInput.className = 'pillar-vol-slider';
  volInput.min = 0;
  volInput.max = 1;
  volInput.step = 0.05;
  volInput.value = pillar.knobs.gain;
  volInput.addEventListener('input', () => {
    const val = parseFloat(volInput.value);
    volValue.textContent = val.toFixed(2);
    onVolume(val);
  });

  volRow.appendChild(volLabel);
  volRow.appendChild(volInput);

  const chatEl = document.createElement('div');
  chatEl.className = 'pillar-chat';

  const vizCanvas = document.createElement('canvas');
  vizCanvas.className = 'pillar-viz-canvas';
  vizCanvas.id = `viz-canvas-${pillar.name}`;
  vizCanvas.style.display = 'none';

  const inputRow = document.createElement('div');
  inputRow.className = 'pillar-input-row';

  const promptInput = document.createElement('input');
  promptInput.type = 'text';
  promptInput.className = 'pillar-prompt';
  promptInput.placeholder = 'describe changes...';
  promptInput.autocomplete = 'off';

  const sendBtn = document.createElement('button');
  sendBtn.className = 'btn-send';
  sendBtn.textContent = '→';

  const doSend = () => {
    const text = promptInput.value.trim();
    if (!text) return;
    promptInput.value = '';
    sendBtn.disabled = true;
    onSend(text).finally(() => { sendBtn.disabled = false; });
  };

  sendBtn.addEventListener('click', doSend);
  promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
  });

  inputRow.appendChild(promptInput);
  inputRow.appendChild(sendBtn);

  chatEl.appendChild(vizCanvas);

  // Mode-aware chip row: GEN shows sound chips (populated by setGenChips from
  // app.js so cohesion marks stay live), TRX shows emotion chips.
  const chipsEl = document.createElement('div');
  chipsEl.className = 'pillar-chips';

  const genChips = document.createElement('div');
  genChips.className = 'chips-gen'; // visible by default (mode starts as generation)

  const trxChips = document.createElement('div');
  trxChips.className = 'chips-trx';
  trxChips.style.display = 'none';

  for (const recipe of getEmotionsForPillar(pillar.name)) {
    const btn = document.createElement('button');
    btn.className = 'chip-btn';
    btn.textContent = recipe.label;
    if (recipe.description) btn.title = recipe.description;
    btn.addEventListener('click', () => {
      btn.disabled = true;
      Promise.resolve(onEmotion(recipe.id)).finally(() => { btn.disabled = false; });
    });
    trxChips.appendChild(btn);
  }

  chipsEl.appendChild(genChips);
  chipsEl.appendChild(trxChips);

  card.appendChild(header);
  card.appendChild(codeEl);
  card.appendChild(volRow);
  card.appendChild(chatEl);
  card.appendChild(chipsEl);
  card.appendChild(inputRow);

  return card;
}

export function updatePillarCode(name, code) {
  const card = document.querySelector(`.pillar-card[data-pillar="${name}"]`);
  if (!card) return;
  const codeEl = card.querySelector('.pillar-code');
  codeEl.textContent = code;
  card.classList.toggle('pillar--empty', !code || !code.trim());
}

export function setPillarMuted(name, muted) {
  const card = document.querySelector(`.pillar-card[data-pillar="${name}"]`);
  if (!card) return;
  card.classList.toggle('pillar--muted', muted);
  card.querySelector('.btn-mute').classList.toggle('active', muted);
}

export function setPillarSoloed(soloedName, allNames) {
  for (const name of allNames) {
    const card = document.querySelector(`.pillar-card[data-pillar="${name}"]`);
    if (!card) continue;
    const isSoloed = name === soloedName;
    card.classList.toggle('pillar--soloed', isSoloed);
    card.classList.toggle('pillar--dimmed', soloedName !== null && !isSoloed);
    card.querySelector('.btn-solo').classList.toggle('active', isSoloed);
  }
}

const VIZ_LABELS = { grid: 'GRID', spectrum: 'SPEC' };

export function updatePillarViz(name, vizType) {
  const card = document.querySelector(`.pillar-card[data-pillar="${name}"]`);
  if (!card) return;
  const canvas = card.querySelector('.pillar-viz-canvas');
  const btn = card.querySelector('.btn-viz');
  btn.classList.toggle('active', !!vizType);
  btn.textContent = VIZ_LABELS[vizType] ?? 'OFF';
  if (vizType) {
    const chat = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = (chat?.offsetWidth || 280) * dpr;
    canvas.height = (chat?.offsetHeight || 300) * dpr;
    canvas.style.display = '';
  } else {
    canvas.style.display = 'none';
  }
}

export function updatePillarMode(name, mode) {
  const card = document.querySelector(`.pillar-card[data-pillar="${name}"]`);
  if (!card) return;
  const btn = card.querySelector('.btn-mode');
  if (!btn) return;
  btn.textContent = mode === 'transformation' ? 'TRX' : 'GEN';
  btn.classList.toggle('active', mode === 'transformation');
  const prompt = card.querySelector('.pillar-prompt');
  if (prompt) {
    prompt.placeholder = mode === 'transformation'
      ? 'add reverb, make it glitchy...'
      : 'describe changes...';
  }
  const chips = card.querySelector('.pillar-chips');
  if (chips) {
    const gen = chips.querySelector('.chips-gen');
    const trx = chips.querySelector('.chips-trx');
    if (gen) gen.style.display = mode === 'transformation' ? 'none' : 'flex';
    if (trx) trx.style.display = mode === 'transformation' ? 'flex' : 'none';
  }
}

export function addPillarMessage(name, type, text) {
  const card = document.querySelector(`.pillar-card[data-pillar="${name}"]`);
  if (!card) return;
  const chatEl = card.querySelector('.pillar-chat');
  const el = document.createElement('div');
  el.className = `msg msg-${type}`;
  el.textContent = type === 'error' ? `Error: ${text}` : text;
  chatEl.appendChild(el);
  chatEl.scrollTop = chatEl.scrollHeight;
}

export function addPillarPreviewMessage(name, code, onApply, onDismiss) {
  const card = document.querySelector(`.pillar-card[data-pillar="${name}"]`);
  if (!card) return;
  const chatEl = card.querySelector('.pillar-chat');

  const wrapper = document.createElement('div');
  wrapper.className = 'msg msg-preview';

  const label = document.createElement('div');
  label.className = 'preview-label';
  label.textContent = 'Preview:';

  const pre = document.createElement('pre');
  pre.className = 'preview-code';
  pre.textContent = code;

  const actions = document.createElement('div');
  actions.className = 'preview-actions';

  const applyBtn = document.createElement('button');
  applyBtn.textContent = 'Apply';
  applyBtn.className = 'btn-apply';

  const dismissBtn = document.createElement('button');
  dismissBtn.textContent = '✕';
  dismissBtn.className = 'btn-dismiss';

  applyBtn.addEventListener('click', async () => {
    applyBtn.disabled = true;
    dismissBtn.disabled = true;
    try {
      await onApply();
      wrapper.remove();
    } catch {
      applyBtn.disabled = false;
      dismissBtn.disabled = false;
    }
  });

  dismissBtn.addEventListener('click', () => {
    onDismiss();
    wrapper.remove();
  });

  actions.appendChild(applyBtn);
  actions.appendChild(dismissBtn);
  wrapper.appendChild(label);
  wrapper.appendChild(pre);
  wrapper.appendChild(actions);
  chatEl.appendChild(wrapper);
  chatEl.scrollTop = chatEl.scrollHeight;
}

// Populate a pillar's GEN sound chips from a cohesion-ranked list.
// ranked: [{ pattern, fits }] from rankSoundsByCohesion. Clicking a chip seeds
// the pillar's prompt with the pattern name (LLM still runs on send).
export function setGenChips(pillarName, ranked) {
  const card = document.querySelector(`.pillar-card[data-pillar="${pillarName}"]`);
  if (!card) return;
  const gen = card.querySelector('.chips-gen');
  if (!gen) return;
  gen.innerHTML = '';
  for (const { pattern, fits } of ranked) {
    const btn = document.createElement('button');
    btn.className = 'chip-btn' + (fits ? ' chip--fits' : '');
    btn.textContent = pattern.name;
    btn.title = pattern.tags.join(', ');
    btn.addEventListener('click', () => {
      const input = card.querySelector('.pillar-prompt');
      if (input) { input.value = pattern.name; input.focus(); }
    });
    gen.appendChild(btn);
  }
}
