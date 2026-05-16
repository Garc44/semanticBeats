import { STYLE_LIBRARY } from './library/styles.js';

const STYLES = Object.keys(STYLE_LIBRARY);

function makeSystemPrompt(pillarName, intensityHint) {
  return `You are editing the ${pillarName} layer of a Strudel live-coding track.
Return ONLY valid JSON. No prose. No markdown. No explanation.

AVAILABLE STYLES: ${STYLES.join(', ')}

If currentCode is empty or "none" → mode = "generate".
If currentCode exists → mode = "transform".

Transform mode schema:
{"mode":"transform","style":"acid|groove|minimal|dub|breakcore","target":"bass|drums|melody|all","intensity":${intensityHint}}

Generate mode schema:
{"mode":"generate","seedCode":"s(\\"bd ~ sn ~\\")"}

Rules:
- style must be one of AVAILABLE STYLES
- target must be one of: bass, drums, melody, all
- intensity must be ${intensityHint}
- No extra keys, no comments, no markdown`;
}

export async function generateTransformationPlan(
  currentCode,
  prompt,
  history = [],
  intensityHint = 0.5,
  pillarName = 'pattern'
) {
  try {
    const codeContext = currentCode?.trim() ? currentCode : 'none';
    const systemMsg = { role: 'system', content: makeSystemPrompt(pillarName, intensityHint) };
    const userMsg = { role: 'user', content: `Current code:\n${codeContext}\n\nRequest: ${prompt}` };

    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3:latest',
        messages: [systemMsg, ...history, userMsg],
        stream: false,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const raw = data.message?.content ?? '';
    const cleaned = raw.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim();
    const plan = JSON.parse(cleaned);

    if (!plan.mode || !['transform', 'generate'].includes(plan.mode)) return null;

    if (plan.mode === 'transform') {
      if (typeof plan.style !== 'string') return null;
      if (!STYLES.includes(plan.style)) return null;
      if (typeof plan.intensity !== 'number') return null;
      if (plan.intensity < 0.1 || plan.intensity > 1.0) return null;
      if (!['bass', 'drums', 'melody', 'all'].includes(plan.target)) return null;
    }

    if (plan.mode === 'generate') {
      if (typeof plan.seedCode !== 'string') return null;
    }

    return plan;
  } catch {
    return null;
  }
}

export async function autoFixCode(brokenCode, errorMessage) {
  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3:latest',
      messages: [
        {
          role: 'system',
          content: 'Fix the Strudel JS syntax error. Return only corrected code. No markdown. No explanation.',
        },
        { role: 'user', content: `Code:\n${brokenCode}\n\nError: ${errorMessage}` },
      ],
      stream: false,
    }),
  });

  if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);

  const data = await response.json();
  const raw = data.message?.content ?? '';
  return raw.replace(/```[\w]*\n?/g, '').trim();
}
