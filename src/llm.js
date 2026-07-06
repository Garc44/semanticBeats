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

// — Ollama config (local: no key, no quota, runs offline) —
// Use a 7-8B instruct model — far more capable than the old 3B at intent mapping.
// Pull it first:  ollama pull qwen2.5:7b   (or set VITE_OLLAMA_MODEL).
const OLLAMA_MODEL = import.meta.env?.VITE_OLLAMA_MODEL ?? 'qwen2.5:7b';
const OLLAMA_URL = import.meta.env?.VITE_OLLAMA_URL ?? 'http://localhost:11434/api/chat';

// Single Ollama call. Returns fence-stripped response text.
// `schema` → Ollama's `format` (JSON Schema) for constrained output. Omit for free-text (autoFix).
// Throws on HTTP error — callers that must degrade gracefully wrap in try/catch.
export async function callOllama(systemPrompt, userPrompt, { schema = null } = {}) {
  const body = {
    model: OLLAMA_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    stream: false,
    keep_alive: '30m',                                   // pin model in RAM — no cold reload between prompts
    options: { temperature: 0, seed: 42, num_predict: 200 }, // deterministic + cap output (JSON is small)
  };
  if (schema) body.format = schema;

  const response = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);
  const data = await response.json();
  const raw = data.message?.content ?? '';
  return raw.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim();
}

// Ollama supports full JSON Schema in `format` — so we enforce key set, enums, numeric
// ranges, and additionalProperties:false at the model level (stronger than a cloud subset).
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

function buildPatchSchema(available) {
  const properties = {};
  for (const t of available) {
    if (t.type === 'numeric')      properties[t.id] = { type: ['number', 'null'], minimum: t.min, maximum: t.max };
    else if (t.type === 'enum')    properties[t.id] = { enum: [...t.values, null] };
    else if (t.type === 'boolean') properties[t.id] = { type: ['boolean', 'null'] };
  }
  return { type: 'object', properties, additionalProperties: false };
}

// Fire-and-forget on app boot: loads model into RAM so the first real prompt is warm.
// keep_alive holds it; empty messages just triggers the load.
export function warmUpModel() {
  fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: OLLAMA_MODEL, messages: [], keep_alive: '30m' }),
  }).catch(() => {}); // best-effort — ignore failures (Ollama not running yet, etc.)
}

export async function generateTransformationPlan(pillarName, userPrompt, currentTracksState = {}) {
  try {
    const catalog = soundLibrary[pillarName] ?? [];
    const catalogSummary = catalog.map(p => ({ id: p.id, name: p.name, tags: p.tags }));

    const otherTracks = Object.entries(currentTracksState)
      .filter(([name]) => name !== pillarName)
      .map(([name, id]) => {
        if (!id) return `- ${name}: (empty)`;
        const pat = getPatternById(name, id);
        if (!pat) return `- ${name}: ${id}`;
        return `- ${name}: ${pat.name} [${pat.tags.join(', ')}]`;
      })
      .join('\n');

    const systemPrompt = `You are a techno producer choosing the ${TRACK_ROLES[pillarName] ?? pillarName} pattern for a live set.

The user describes a vibe in plain language. Pick the catalog pattern whose name/tags best match that vibe AND that locks in with the other playing channels.

Other active channels:
${otherTracks || '(none)'}

Catalog (choose selectedId from these only):
${JSON.stringify(catalogSummary, null, 2)}

Rules:
- selectedId MUST be one of the catalog ids above.
- explanation: one short sentence on why this pattern fits the request.
- modifications.speed (0.25–4.0) and modifications.slowdown (integer ≥ 1): keep both at 1 UNLESS the user explicitly asks to change tempo. Speed up → speed 2.0; slow down → slowdown 2.
- Output ONLY the JSON object. No prose, no markdown.

Examples (ids are illustrative — always pick a real id from the catalog above):
"something darker and hypnotic"   -> {"selectedId":"<dark/hypnotic id>","explanation":"deep rolling pattern matches the dark mood","modifications":{"speed":1.0,"slowdown":1}}
"give me something more driving"  -> {"selectedId":"<punchy id>","exlaplanation":"punchy pattern adds drive","modifications":{"speed":1.0,"slowdown":1}}
"same energy but faster"          -> {"selectedId":"<current-style id>","explanation":"keeps the feel, doubles the pace","modifications":{"speed":2.0,"slowdown":1}}`;

    const cleaned = await callOllama(systemPrompt, userPrompt, { schema: buildPlanSchema(catalog) });
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
  const lookupName = pillarName === 'bass_percussion' ? 'bass' : pillarName;
  const pattern = getPatternById(lookupName, pillar.selectedId);
  // Live effective effect values: pattern defaults overlaid with the user's tweaks.
  // Both the deterministic parser (relative tweaks) and the LLM need these to know
  // where each effect currently sits — not just what the user has manually changed.
  const effective = { ...(pattern?.initialTransforms ?? {}), ...(pillar.transforms ?? {}) };
  const available = getTransformsForPillar(pillarName);

  // LLM leads. It reads the live effect values and decides what to change. The
  // deterministic parser is only an airbag (below) for when the local model whiffs.
  let llmPatch = null;
  try {
    const systemPrompt = `You are a techno producer tweaking live audio effects on the ${pillarName} channel.

The user describes a feeling or change in plain, non-technical language. Translate it into the SMALLEST set of effect changes that delivers it — usually ONE, occasionally two. Producers are surgical: a single well-chosen effect beats a pile of them.

Active pattern: ${pattern?.name ?? 'unknown'} — tags: ${(pattern?.tags ?? []).join(', ')}

Currently active effects with their live values (already on — only touch these if the request implies changing/removing them):
${JSON.stringify(effective, null, 2)}

Available effects on THIS channel — use ONLY these ids, respect each [min, max]:
${JSON.stringify(available.map(t => ({
  id: t.id,
  type: t.type,
  ...(t.type === 'numeric' ? { min: t.min, max: t.max } : {}),
  ...(t.type === 'enum' ? { values: t.values } : {}),
  description: t.description,
})), null, 2)}

Rules:
- Set ONLY the effects the request implies. OMIT every other key — do not pad the object.
- Numeric values must sit inside that effect's [min, max].
- To remove an active effect, set it to null.
- If the request maps to no available effect (e.g. pitch/"higher"), return {} — an empty object. Never guess random effects.
- Output ONLY a flat JSON object of effect ids. No prose, no markdown.

Examples (illustrative — map to ids that actually exist on THIS channel):
"make it darker"          -> {"lopass": 600}
"spooky and far away"     -> {"reverb": 0.7, "echo": 0.5}
"more aggressive"         -> {"distort": 0.6}
"underwater / muffled"    -> {"lopass": 400}
"add a little grit"       -> {"shape": 0.3}
"make it talk / a vowel"  -> {"vowel": "a"}
"a bit more reverb"       -> nudge UP from its live value (e.g. 0.5 -> 0.7)
"take the reverb off"     -> {"reverb": null}
"make it sound higher"    -> {}`;

    const cleaned = await callOllama(systemPrompt, userPrompt, { schema: buildPatchSchema(available) });
    const patch = JSON.parse(cleaned);
    if (patch && typeof patch === 'object' && !Array.isArray(patch)) llmPatch = patch;
  } catch {
    llmPatch = null;
  }

  // LLM produced a usable change → it wins.
  if (llmPatch && Object.keys(llmPatch).length > 0) return llmPatch;

  // Airbag: LLM errored or returned {}. Catch clear named/numeric/relative requests
  // the model whiffed on ("add vowel", "reverb 0.9", "more reverb").
  const direct = parseDirectCommand(pillarName, userPrompt, effective);
  if (direct) return direct;

  // Nothing maps (e.g. "make it higher") → null so the caller surfaces an error.
  return null;
}

export async function autoFixCode(brokenCode, errorMsg) {
  // Free-text code out (not JSON) → no schema. Throws on failure (caller reverts).
  return callOllama(
    'Fix the Strudel code. Return only the corrected code, no markdown.',
    `Error: ${errorMsg}\n\nCode:\n${brokenCode}`,
  );
}
