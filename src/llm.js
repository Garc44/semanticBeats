import { soundLibrary } from './library/soundLibrary.js';
import { getTransformsForPillar } from './library/transformationsLibrary.js';
import { getPatternById } from './library/soundLibrary.js';

const TRACK_ROLES = {
  drums:       'rhythmic foundation — kicks, claps, hats',
  bass:        'low-end movement — bass lines, sub, rumble',
  percussion:  'rhythmic texture — hi-hats, rides, shakers',
  melody:      'harmonic content — synths, arps, leads',
  transitions: 'atmosphere and tension — sweeps, fx, build/drop triggers',
};

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
  method: t.method,
  type: t.type,
  ...(t.type === 'numeric' ? { min: t.min, max: t.max } : {}),
  ...(t.type === 'enum' ? { values: t.values } : {}),
  description: t.description,
})), null, 2)}

Return ONLY valid JSON — a flat object of { transformId: value } pairs.
- Set a value within its valid range to activate/update a transform
- Set a value to null to deactivate a transform
- Omit transforms you don't want to change
- No prose. No markdown.`;

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
