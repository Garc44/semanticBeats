import { soundLibrary } from './library/soundLibrary.js';
import { getTransformsForPillar, parseDirectCommand } from './library/transformationsLibrary.js';
import { getPatternById } from './library/soundLibrary.js';

const TRACK_ROLES = {
  drums:       'rhythmic foundation — kicks',
  bass:        'low-end movement — bass lines, sub, rumble',
  percussion:  'rhythmic texture — hi-hats, rides, claps, shakers',
  melody:      'harmonic content — synths, arps, leads',
  transitions: 'atmosphere and tension — sweeps, fx, build/drop triggers',
};

// temperature 0 + fixed seed → same prompt yields same output (kills random drift/hallucination)
const DETERMINISTIC_OPTIONS = { temperature: 0, seed: 42 };

// Ollama structured-output schema for the pattern-selection plan.
// selectedId enum-locked to the catalog → model cannot invent a pattern id.
function buildPlanSchema(catalog) {
  return {
    type: 'object',
    properties: {
      selectedId: { type: 'string', enum: catalog.map(p => p.id) },
      explanation: { type: 'string' },
      modifications: {
        type: 'object',
        properties: {
          speed: { type: 'number', minimum: 0.25, maximum: 4.0 },
          slowdown: { type: 'integer', minimum: 1 },
        },
        additionalProperties: false,
      },
    },
    required: ['selectedId'],
    additionalProperties: false,
  };
}

// Ollama structured-output schema for a transform patch.
// Keys locked to this pillar's allowed ids; numeric ranges + enum values enforced.
// null allowed everywhere (= remove transform). additionalProperties:false blocks hallucinated keys.
function buildPatchSchema(available) {
  const properties = {};
  for (const t of available) {
    if (t.type === 'numeric') {
      properties[t.id] = { type: ['number', 'null'], minimum: t.min, maximum: t.max };
    } else if (t.type === 'enum') {
      properties[t.id] = { enum: [...t.values, null] };
    } else if (t.type === 'boolean') {
      properties[t.id] = { type: ['boolean', 'null'] };
    }
  }
  return { type: 'object', properties, additionalProperties: false };
}

export async function generateTransformationPlan(pillarName, userPrompt, currentTracksState = {}) {
  try {
    const catalog = soundLibrary[pillarName] ?? [];
    const catalogSummary = catalog.map(p => ({ id: p.id, name: p.name, tags: p.tags }));

    const otherTracks = Object.entries(currentTracksState)
      .filter(([name]) => name !== pillarName)
      .map(([name, id]) => `- ${name}: ${id || '(empty)'}`)
      .join('\n');

    const systemPrompt = `You are an AI DJ selector for a techno live-coding system.
You are selecting a ${TRACK_ROLES[pillarName] ?? pillarName} pattern.

Other active channels:
${otherTracks || '(none)'}
Choose a pattern that fits musically with these.

Catalog:
${JSON.stringify(catalogSummary, null, 2)}

Return ONLY valid JSON. No prose. No markdown.
Schema: {"selectedId":"string","explanation":"string","modifications":{"speed":1.0,"slowdown":1}}
- selectedId: MUST be one of the IDs listed above
- explanation: one sentence
- speed: float 0.25–4.0 — ALWAYS use 1.0 unless the user EXPLICITLY says to play faster or slower
- slowdown: integer >= 1 — ALWAYS use 1 unless the user EXPLICITLY says to slow down`;

    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2:3b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
        format: buildPlanSchema(catalog),
        options: DETERMINISTIC_OPTIONS,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const raw = data.message?.content ?? '';
    const cleaned = raw.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim();
    const plan = JSON.parse(cleaned);

    if (typeof plan.selectedId !== 'string' || !plan.selectedId) return null;
    if (!catalog.find(p => p.id === plan.selectedId)) return null;

    const mods = plan.modifications ?? {};
    if (mods.speed !== undefined && (typeof mods.speed !== 'number' || mods.speed < 0.25 || mods.speed > 4.0)) return null;
    if (mods.slowdown !== undefined && (!Number.isInteger(mods.slowdown) || mods.slowdown < 1)) return null;

    const tempoRequested = /faster|slower|speed|slow|fast|half|double|tempo|bpm/i.test(userPrompt);
    const safeMods = tempoRequested ? mods : { ...mods, speed: 1.0, slowdown: 1 };

    return { selectedId: plan.selectedId, explanation: plan.explanation ?? '', modifications: safeMods };
  } catch {
    return null;
  }
}

export async function generateTransformPatch(pillarName, userPrompt, pillar) {
  // A: explicit command ("set crush to 16") → deterministic parse, skip the LLM entirely.
  const direct = parseDirectCommand(pillarName, userPrompt);
  if (direct) return direct;

  try {
    const available = getTransformsForPillar(pillarName);
    const lookupName = pillarName === 'bass_percussion' ? 'bass' : pillarName;
    const pattern = getPatternById(lookupName, pillar.selectedId);

    const systemPrompt = `You are controlling live audio effects for a techno track's ${pillarName} channel.

Active pattern: ${pattern?.name ?? 'unknown'} — tags: ${(pattern?.tags ?? []).join(', ')}

Current active transforms:
${JSON.stringify(pillar.transforms ?? {}, null, 2)}

Available transforms for this channel:
${JSON.stringify(available.map(t => ({
  id: t.id,
  type: t.type,
  ...(t.type === 'numeric' ? { min: t.min, max: t.max } : {}),
  ...(t.type === 'enum' ? { values: t.values } : {}),
  description: t.description,
})), null, 2)}

Return ONLY valid JSON — a flat object where each key is EXACTLY the transform's "id" field above.
- Set a numeric value within [min, max] to activate/update a transform
- Set a value to null to remove a transform
- Omit transforms you don't want to change
- No prose. No markdown. No extra keys.`;

    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2:3b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
        format: buildPatchSchema(available),
        options: DETERMINISTIC_OPTIONS,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const raw = data.message?.content ?? '';
    const cleaned = raw.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim();
    const patch = JSON.parse(cleaned);

    if (typeof patch !== 'object' || Array.isArray(patch) || patch === null) return null;

    return patch;
  } catch {
    return null;
  }
}

export async function autoFixCode(brokenCode, errorMsg) {
  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.2:3b',
      messages: [
        { role: 'system', content: 'Fix the Strudel code. Return only the corrected code, no markdown.' },
        { role: 'user', content: `Error: ${errorMsg}\n\nCode:\n${brokenCode}` },
      ],
      stream: false,
    }),
  });
  if (!response.ok) throw new Error(`autoFixCode HTTP ${response.status}`);
  const data = await response.json();
  const raw = data.message?.content ?? '';
  return raw.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim();
}
