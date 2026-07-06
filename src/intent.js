import { soundLibrary } from './library/soundLibrary.js';

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

// Deterministic pre-parse. Anything found here is LOCKED — buildIntent lets these
// values override whatever the LLM classifier says.
export function lexIntent(prompt) {
  const text = String(prompt).toLowerCase();

  const bpmMatch = text.match(/(\d{2,3})\s*bpm/);
  const bpm = bpmMatch ? parseInt(bpmMatch[1], 10) : null;

  let genre = null;
  for (const [kw, g] of Object.entries(GENRE_LEXICON)) {
    if (text.includes(kw)) { genre = g; break; }
  }

  const textures = [...new Set(
    Object.entries(TEXTURE_LEXICON).filter(([kw]) => text.includes(kw)).map(([, t]) => t)
  )];

  const layerHints = [...new Set(
    Object.entries(INSTRUMENT_LEXICON)
      .filter(([kw]) => new RegExp(`\\b${kw}\\b`).test(text))
      .map(([, pillar]) => pillar)
  )];

  return { bpm, genre, textures, layerHints };
}
