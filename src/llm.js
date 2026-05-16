import { ALLOWED_OPERATIONS } from './operations.js';

const TRANSFORM_SYSTEM_PROMPT = `You are a music transformation planner for Strudel live-coding.
Return ONLY valid JSON. No prose. No markdown. No explanation.

ALLOWED_OPERATIONS: ${ALLOWED_OPERATIONS.join(', ')}

If currentCode is empty or "none" → mode = "generate".
If currentCode exists → mode = "transform".

Transform mode schema:
{"mode":"transform","target":"bass|drums|melody|all","operations":[{"type":"<op>","amount":0.1}],"preserve":["rhythm"]}

Generate mode schema:
{"mode":"generate","seedCode":"s(\\"bd ~ sn ~\\")","operations":[]}

Rules:
- Only use operations from ALLOWED_OPERATIONS
- amount must be 0.1 to 1.0
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

    if (!plan.mode || !['transform', 'generate'].includes(plan.mode)) return null;
    if (plan.mode === 'transform' && !Array.isArray(plan.operations)) return null;
    if (plan.mode === 'generate' && typeof plan.seedCode !== 'string') return null;

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
