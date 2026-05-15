const chatEl = () => document.getElementById('chat');
const codeEl = () => document.getElementById('code-panel');
const statusEl = () => document.getElementById('status');

export function setStatus(text) {
  statusEl().textContent = text;
}

export function updateCodePanel(code) {
  codeEl().textContent = code;
}

export function addUserMessage(text) {
  const el = document.createElement('div');
  el.className = 'msg msg-user';
  el.textContent = text;
  chatEl().appendChild(el);
  scrollChat();
}

export function addErrorMessage(text) {
  const el = document.createElement('div');
  el.className = 'msg msg-error';
  el.textContent = `Error: ${text}`;
  chatEl().appendChild(el);
  scrollChat();
}

export function addPreviewMessage(code, onApply, onDismiss) {
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

  const dismissBtn = document.createElement('button');
  dismissBtn.textContent = '✕';
  dismissBtn.className = 'btn-dismiss';
  dismissBtn.addEventListener('click', () => {
    onDismiss();
    wrapper.remove();
  });

  actions.appendChild(applyBtn);
  actions.appendChild(dismissBtn);
  wrapper.appendChild(label);
  wrapper.appendChild(pre);
  wrapper.appendChild(actions);
  chatEl().appendChild(wrapper);
  scrollChat();
}

function scrollChat() {
  const el = chatEl();
  el.scrollTop = el.scrollHeight;
}
