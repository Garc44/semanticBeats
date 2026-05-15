import { init, play, stop } from './src/strudel.js';
import { generateCode } from './src/llm.js';
import {
  setStatus,
  updateCodePanel,
  addUserMessage,
  addErrorMessage,
  addPreviewMessage,
} from './src/ui.js';

// Shared state
let conversationHistory = [];
let currentCode = `stack(
  s("bd ~ bd ~"),
  s("~ sd ~ sd").room(0.3),
  s("hh*8").gain(0.5)
)`;
let isPlaying = false;

const playBtn = document.getElementById('play-btn');
const promptInput = document.getElementById('prompt');
const sendBtn = document.getElementById('send-btn');
const codePanel = document.getElementById('code-panel');

// Init Strudel
(async () => {
  setStatus('Loading...');
  try {
    await init();
    setStatus('Ready');
    updateCodePanel(currentCode);
  } catch (e) {
    setStatus('Engine failed');
    console.error(e);
  }
})();

// Play / Stop
playBtn.addEventListener('click', async () => {
  if (!isPlaying) {
    try {
      await play(currentCode);
      isPlaying = true;
      playBtn.textContent = '■ Stop';
      setStatus('Playing');
    } catch (e) {
      setStatus('Play error');
      addErrorMessage(e.message);
    }
  } else {
    stop();
    isPlaying = false;
    playBtn.textContent = '▶ Play';
    setStatus('Stopped');
  }
});

// Manual code edit sync
codePanel.addEventListener('blur', async () => {
  const edited = codePanel.textContent.trim();
  if (edited === currentCode) return;
  if (isPlaying) {
    try {
      await play(edited);
      currentCode = edited;
    } catch (e) {
      addErrorMessage(e.message);
      updateCodePanel(currentCode); // revert display
    }
  } else {
    currentCode = edited;
  }
});

// Send prompt to LLM
async function handleSend() {
  const prompt = promptInput.value.trim();
  if (!prompt) return;
  promptInput.value = '';

  addUserMessage(prompt);
  setStatus('Thinking...');
  sendBtn.disabled = true;

  try {
    const newCode = await generateCode(conversationHistory, currentCode, prompt);

    // Add to history
    conversationHistory.push({ role: 'user', content: `Current code:\n${currentCode}\n\nRequest: ${prompt}` });
    conversationHistory.push({ role: 'assistant', content: newCode });

    addPreviewMessage(
      newCode,
      // onApply
      async () => {
        try {
          if (isPlaying) await play(newCode);
          currentCode = newCode;
          updateCodePanel(newCode);
          setStatus('Applied');
        } catch (e) {
          addErrorMessage(e.message);
          updateCodePanel(currentCode);
          setStatus('Error — reverted');
        }
      },
      // onDismiss
      () => {
        setStatus('Ready');
      }
    );

    setStatus('Preview ready');
  } catch (e) {
    const msg = e.message.includes('fetch')
      ? 'Ollama unreachable. Start with: OLLAMA_ORIGINS="*" ollama serve'
      : e.message;
    addErrorMessage(msg);
    setStatus('Error');
  } finally {
    sendBtn.disabled = false;
  }
}

sendBtn.addEventListener('click', handleSend);
promptInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});
