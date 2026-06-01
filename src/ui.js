const statusEl = () => document.getElementById('status');

export function setStatus(text) {
  statusEl().textContent = text;
}

export function renderGlobalControls(globalState, onChange) {
  const container = document.getElementById('global-controls');
  container.innerHTML = '';

  const sliders = [
    { key: 'tempo',        label: 'Tempo',    min: 0.2, max: 3.0, step: 0.05, value: globalState.tempo },
    { key: 'masterVolume', label: 'Volume',   min: 0,   max: 1,   step: 0.05, value: globalState.masterVolume },
    { key: 'masterFilter', label: 'Filter',   min: 0,   max: 1,   step: 0.01, value: globalState.masterFilter },
    { key: 'intensity',    label: 'Intensity', min: 0,  max: 1,   step: 0.05, value: globalState.intensity },
  ];

  for (const s of sliders) {
    const group = document.createElement('div');
    group.className = 'slider-group';

    const label = document.createElement('label');
    const valueSpan = document.createElement('span');
    valueSpan.className = 'slider-value';
    valueSpan.textContent = s.value.toFixed(2);
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
      valueSpan.textContent = val.toFixed(2);
      onChange(s.key, val);
    });

    group.appendChild(label);
    group.appendChild(input);
    container.appendChild(group);
  }
}

export function renderPillar(pillar, { onSend, onMute, onSolo, onCodeEdit }) {
  const card = document.createElement('div');
  card.className = 'pillar-card';
  card.dataset.pillar = pillar.name;

  const header = document.createElement('div');
  header.className = 'pillar-header';

  const nameEl = document.createElement('span');
  nameEl.className = 'pillar-name';
  nameEl.textContent = pillar.name.replace(/_/g, ' ').toUpperCase();

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

  controls.appendChild(muteBtn);
  controls.appendChild(soloBtn);
  header.appendChild(nameEl);
  header.appendChild(controls);

  const codeEl = document.createElement('div');
  codeEl.className = 'pillar-code';
  codeEl.contentEditable = 'true';
  codeEl.spellcheck = false;
  codeEl.textContent = pillar.code;
  codeEl.addEventListener('blur', () => onCodeEdit(codeEl.textContent.trim()));

  const chatEl = document.createElement('div');
  chatEl.className = 'pillar-chat';

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

  card.appendChild(header);
  card.appendChild(codeEl);
  card.appendChild(chatEl);
  card.appendChild(inputRow);

  return card;
}

export function updatePillarCode(name, code) {
  const card = document.querySelector(`.pillar-card[data-pillar="${name}"]`);
  if (!card) return;
  const codeEl = card.querySelector('.pillar-code');
  codeEl.textContent = code;
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
