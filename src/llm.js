import { STYLE_LIBRARY } from './library/styles.js';

const STYLES = Object.keys(STYLE_LIBRARY);
export const VOICE_TYPES = ['melody', 'bass', 'chords', 'percussion'];

const TRANSFORM_SYSTEM_PROMPT = `You are a music style selector for Strudel live-coding.
Return ONLY valid JSON. No prose. No markdown. No explanation.

AVAILABLE STYLES: ${STYLES.join(', ')}

If currentCode is empty or "none" → mode = "generate".
If currentCode exists AND user wants to ADD a new layer/voice/instrument → mode = "compose".
If currentCode exists AND user wants to MODIFY existing sounds → mode = "transform".

Transform mode schema:
{"mode":"transform","style":"acid|groove|minimal|dub|breakcore","target":"bass|drums|melody|all","intensity":0.7}

Generate mode schema:
{"mode":"generate","seedCode":"s(\\"bd ~ sn ~\\")"}

Compose mode schema (use when user says add/layer/give me a/put a):
{"mode":"compose","voiceType":"melody|bass|chords|percussion","notes":"c4 e4 g4 ~","style":"acid|groove|minimal|dub|breakcore","intensity":0.7}

Rules:
- style must be one of AVAILABLE STYLES
- target must be one of: bass, drums, melody, all
- voiceType must be one of: melody, bass, chords, percussion
- intensity must be 0.1 to 1.0
- notes must be a valid Strudel mini-notation string (e.g. "c4 e4 g4 ~")
- No extra keys, no comments, no markdown`;

export async function generateTransformationPlan(currentCode, userPrompt) {
  try {
    const codeContext = currentCode?.trim() ? currentCode : 'none';
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3:latest',
        messages: [
          { role: 'system', content: TRANSFORM_SYSTEM_PROMPT },
          { role: 'user', content: `Current code:\n${codeContext}\n\nRequest: ${userPrompt}` },
        ],
        stream: false,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const raw = data.message?.content ?? '';
    const cleaned = raw.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim();
    const plan = JSON.parse(cleaned);

    if (!plan.mode || !['transform', 'generate', 'compose'].includes(plan.mode)) return null;

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

    if (plan.mode === 'compose') {
      if (!codeContext || codeContext === 'none') return null;
      if (!VOICE_TYPES.includes(plan.voiceType)) return null;
      if (typeof plan.notes !== 'string' || !plan.notes.trim()) return null;
      if (typeof plan.style !== 'string') return null;
      if (!STYLES.includes(plan.style)) return null;
      if (typeof plan.intensity !== 'number') return null;
      if (plan.intensity < 0.1 || plan.intensity > 1.0) return null;
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
        {
          role: 'user',
          content: `Code:\n${brokenCode}\n\nError: ${errorMessage}`,
        },
      ],
      stream: false,
    }),
  });

  if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);

  const data = await response.json();
  const raw = data.message?.content ?? '';
  return raw.replace(/```[\w]*\n?/g, '').trim();
}
