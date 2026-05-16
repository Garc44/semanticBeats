import { init, play, stop } from './src/strudel.js';
import { generateTransformationPlan, autoFixCode } from './src/llm.js';
import { applyTransformation, generateSeed } from './src/patchEngine.js';
import { validateCode } from './src/validate.js';
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
  setStatus('Planning...');
  sendBtn.disabled = true;

  try {
    const plan = await generateTransformationPlan(currentCode, prompt);

    if (!plan) {
      addErrorMessage('Could not plan transformation. Try rephrasing.');
      setStatus('Error');
      return;
    }

    const newCode =
      plan.mode === 'transform'
        ? applyTransformation(currentCode, plan)
        : generateSeed(plan);

    const validation = validateCode(newCode);
    if (!validation.valid) {
      addErrorMessage(`Validation failed: ${validation.errors.join(', ')}`);
      setStatus('Error');
      return;
    }

    addPreviewMessage(
      newCode,
      async () => {
        try {
          if (isPlaying) await play(newCode);
          currentCode = newCode;
          updateCodePanel(newCode);
          conversationHistory.push({ role: 'user', content: `Current code:\n${currentCode}\n\nRequest: ${prompt}` });
          conversationHistory.push({ role: 'assistant', content: newCode });
          setStatus('Applied');
        } catch (e) {
          setStatus('Fixing...');
          try {
            const fixedCode = await autoFixCode(newCode, e.message);
            if (isPlaying) await play(fixedCode);
            currentCode = fixedCode;
            updateCodePanel(fixedCode);
            conversationHistory.push({ role: 'user', content: `Current code:\n${newCode}\n\nRequest: ${prompt}` });
            conversationHistory.push({ role: 'assistant', content: fixedCode });
            setStatus('Applied (auto-fixed)');
          } catch (fixErr) {
            addErrorMessage(fixErr.message);
            updateCodePanel(currentCode);
            setStatus('Error — reverted');
          }
        }
      },
      () => setStatus('Ready')
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
