import { soundLibrary } from './library/soundLibrary.js';
import { callOllama } from './llm.js';
import { PILLAR_NAMES } from './pillars.js';

// — Controlled vocabularies. These feed both the lexer and the LLM JSON schema, so
//   intent vocabulary and retrieval vocabulary (library tags) stay one space. —
export const GENRES = ['techno', 'house', 'lofi_hiphop', 'ambient', 'industrial', 'trance', 'dub', 'minimal'];
export const KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'A#', 'C#', 'D#', 'F#', 'G#'];
export const SCALES = ['minor', 'phrygian', 'dorian'];
export const TEXTURES = ['glitch', 'dusty', 'warm', 'metallic', 'airy', 'driving', 'hypnotic'];

export const GENRE_DEFAULT_BPM = {
  techno: 130, house: 124, lofi_hiphop: 82, ambient: 70,
  industrial: 135, trance: 138, dub: 75, minimal: 126,
};

// Harvest the library's tags — the retrieval scorer matches intent moods against these.
export function moodVocabulary() {
  const tags = new Set();
  for (const patterns of Object.values(soundLibrary))
    for (const p of patterns)
      for (const t of p.tags) tags.add(t.toLowerCase());
  return [...tags].sort();
}

const GENRE_LEXICON = {
  'lo-fi': 'lofi_hiphop', 'lofi': 'lofi_hiphop', 'lo fi': 'lofi_hiphop',
  'hip hop': 'lofi_hiphop', 'hip-hop': 'lofi_hiphop', 'hiphop': 'lofi_hiphop',
  'techno': 'techno', 'house': 'house', 'ambient': 'ambient',
  'industrial': 'industrial', 'trance': 'trance', 'dub': 'dub', 'minimal': 'minimal',
};

const TEXTURE_LEXICON = {
  'glitchy': 'glitch', 'glitch': 'glitch', 'broken': 'glitch', 'stutter': 'glitch',
  'dusty': 'dusty', 'vinyl': 'dusty', 'tape': 'dusty', 'crackle': 'dusty',
  'warm': 'warm', 'analog': 'warm', 'mellow': 'warm',
  'metallic': 'metallic', 'iron': 'metallic', 'clang': 'metallic',
  'airy': 'airy', 'light': 'airy', 'breathy': 'airy',
  'driving': 'driving', 'pumping': 'driving', 'relentless': 'driving',
  'hypnotic': 'hypnotic', 'trippy': 'hypnotic', 'rolling': 'hypnotic',
};

const INSTRUMENT_LEXICON = {
  'rhodes': 'melody', 'piano': 'melody', 'keys': 'melody', 'chord': 'melody',
  'synth': 'melody', 'lead': 'melody', 'arp': 'transitions', 'sweep': 'transitions',
  '303': 'bass', 'acid': 'bass', 'sub': 'bass', 'bass': 'bass',
  'kick': 'drums', 'drum': 'drums', 'beat': 'drums',
  'hat': 'percussion', 'hats': 'percussion', 'clap': 'percussion',
  'shaker': 'percussion', 'rim': 'percussion', 'ride': 'percussion',
};

// Word-boundary matching to avoid false positives (e.g. "warehouse" contains "house").
const hasWord = (text, kw) => new RegExp(`\\b${kw}\\b`).test(text);

// Deterministic pre-parse. Anything found here is LOCKED — buildIntent lets these
// values override whatever the LLM classifier says.
export function lexIntent(prompt) {
  const text = String(prompt).toLowerCase();

  const bpmMatch = text.match(/(\d{2,3})\s*bpm/);
  const bpm = bpmMatch ? parseInt(bpmMatch[1], 10) : null;

  let genre = null;
  for (const [kw, g] of Object.entries(GENRE_LEXICON)) {
    if (hasWord(text, kw)) { genre = g; break; }
  }

  const textures = [...new Set(
    Object.entries(TEXTURE_LEXICON).filter(([kw]) => hasWord(text, kw)).map(([, t]) => t)
  )];

  const layerHints = [...new Set(
    Object.entries(INSTRUMENT_LEXICON)
      .filter(([kw]) => hasWord(text, kw))
      .map(([, pillar]) => pillar)
  )];

  return { bpm, genre, textures, layerHints };
}

export const DEFAULT_INTENT = {
  genre: 'techno', bpm: null, key: 'A', scale: 'minor', energy: 'mid',
  moods: ['dark', 'minimal'], textures: [], layers: [],
};

function buildIntentSchema() {
  return {
    type: 'object',
    properties: {
      genre: { type: 'string', enum: GENRES },
      bpm: { type: 'integer', minimum: 60, maximum: 200 },
      key: { type: 'string', enum: KEYS },
      scale: { type: 'string', enum: SCALES },
      energy: { type: 'string', enum: ['low', 'mid', 'high'] },
      moods: { type: 'array', items: { type: 'string', enum: moodVocabulary() }, maxItems: 5 },
      textures: { type: 'array', items: { type: 'string', enum: TEXTURES }, maxItems: 3 },
      layers: {
        type: 'array', maxItems: 5,
        items: {
          type: 'object',
          properties: {
            pillar: { type: 'string', enum: PILLAR_NAMES },
            character: { type: 'string' },
          },
          required: ['pillar', 'character'],
          additionalProperties: false,
        },
      },
    },
    required: ['genre', 'key', 'scale', 'energy', 'moods'],
    additionalProperties: false,
  };
}

// One classification call. Small local models are good at this; keep it to
// classification only — no code, no notation, just controlled-vocabulary JSON.
export async function generateIntent(prompt, llm = {}) {
  try {
    const systemPrompt = `You are a music producer's assistant. Classify the user's request into a musical intent object.

Rules:
- genre/key/scale/energy/moods: pick the closest match from the allowed values.
- bpm: only set if the user implies a tempo; otherwise omit.
- layers: one entry per musical part the user asked for (drums, bass, percussion, melody, transitions). character = one short phrase describing that part.
- Output ONLY the JSON object.

Examples:
"glitchy lo-fi hip hop beat with rhodes chords" -> {"genre":"lofi_hiphop","key":"A","scale":"minor","energy":"low","moods":["warm","minimal"],"textures":["glitch","dusty"],"layers":[{"pillar":"drums","character":"loose swung boom-bap"},{"pillar":"melody","character":"warm rhodes 7th chords"}]}
"dark driving techno" -> {"genre":"techno","key":"D","scale":"phrygian","energy":"high","moods":["dark","driving"],"textures":["driving"],"layers":[{"pillar":"drums","character":"pounding four on the floor"},{"pillar":"bass","character":"rolling dark bassline"}]}`;

    const cleaned = await callOllama(systemPrompt, prompt, { ...llm, schema: buildIntentSchema() });
    const intent = JSON.parse(cleaned);
    if (!intent || typeof intent !== 'object') return null;
    return intent;
  } catch {
    return null;
  }
}

// Drop null/empty values so spreading doesn't clobber earlier layers.
function compact(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) =>
    v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0)));
}

// Total function: defaults ← LLM ← lexer (rightmost wins). Never returns null.
export async function buildIntent(prompt, llm = {}) {
  const lexed = lexIntent(prompt);
  const llmIntent = await generateIntent(prompt, llm);
  const intent = { ...DEFAULT_INTENT, ...compact(llmIntent ?? {}), ...compact({ bpm: lexed.bpm, genre: lexed.genre, textures: lexed.textures }) };
  intent.layers = [...(intent.layers ?? [])];
  if (!intent.bpm) intent.bpm = GENRE_DEFAULT_BPM[intent.genre] ?? 126;
  // Ensure lexer's instrument hints are represented as layers.
  const covered = new Set(intent.layers.map(l => l.pillar));
  for (const pillar of lexed.layerHints) {
    if (!covered.has(pillar)) intent.layers.push({ pillar, character: prompt });
  }
  return intent;
}
