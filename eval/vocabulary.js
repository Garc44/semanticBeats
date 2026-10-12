import { soundLibrary } from '../src/library/soundLibrary.js';

// Shared evaluation vocabulary. Corpus expectations, ID-derived tags (S3–S5) and
// code-derived tags (all stages) are all expressed in exactly these terms.
export const EVAL_VOCAB = {
  genre: ['techno', 'house', 'minimal', 'industrial', 'dub', 'ambient', 'trance', 'lofi', 'acid', 'detroit'],
  character: ['dark', 'hypnotic', 'driving', 'warm', 'gritty', 'spacious', 'glitchy', 'sparse', 'dense', 'metallic', 'deep', 'dissonant', 'evolving'],
  element: ['kick', 'bass', 'sub', 'hats', 'clap', 'percussion', 'lead', 'chords', 'arp', 'pad', 'fx'],
};
export const ALL_TAGS = Object.values(EVAL_VOCAB).flat();
const VOCAB = new Set(ALL_TAGS);

// Every library tag → canonical tags. [] = deliberately dropped (technical or not semantic).
export const LIBRARY_TAG_MAP = {
  'dark': ['dark'], 'minimal': ['minimal'], 'bass': ['bass'], 'techno': ['techno'], 'melody': ['lead'],
  'perc': ['percussion'], 'kick': ['kick'], '909': [], 'hihat': ['hats'], 'industrial': ['industrial'],
  'sparse': ['sparse'], 'hypnotic': ['hypnotic'], 'chromatic': ['dissonant'], 'synth': ['lead'],
  'transition': ['fx'], 'groove': [], 'acid': ['acid'], 'saw': [], 'minor': ['dark'], 'filter': [],
  'sub': ['sub'], 'sine': [], 'chord': ['chords'], 'phrygian': ['dark'], 'generative': ['evolving'],
  'tritone': ['dissonant'], 'dissonant': ['dissonant'], 'arp': ['arp'], '303': ['acid'],
  'distorted': ['gritty'], '4x4': ['kick'], '4*4': ['kick'], 'house': ['house'], 'syncopated': [],
  'euclidean': [], 'rolling': ['hypnotic'], 'offbeat': [], 'stereo': ['spacious'], 'driving': ['driving'],
  'delay': ['spacious'], 'atmospheric': ['spacious'], 'square': [], 'clap': ['clap'], 'lo-fi': ['lofi'],
  'squelch': ['acid'], 'bleep': ['lead'], 'descending': [], 'basic': [], 'foundation': ['kick'],
  'dirt': [], 'club': [], 'warm': ['warm'], 'rhythmic': [], 'two-bar': [], 'dynamic': [],
  'accented': ['driving'], 'progressive': ['evolving'], 'slinker': [], 'tribal': ['percussion'],
  'tom': ['percussion'], 'percussive': ['percussion'], 'classic': [], 'deep': ['deep'],
  'resonance': ['acid'], 'dub': ['dub'], 'metallic': ['metallic'], 'modulation': ['evolving'],
  'panning': ['spacious'], 'hats': ['hats'], 'ambient': ['ambient'], 'probability': ['glitchy'],
  'ghostly': ['spacious'], 'tape-drift': ['lofi'], 'pitch-modulation': ['evolving'], 'warp': ['glitchy'],
  'rimshot': ['percussion'], 'warehouse': ['industrial'], 'detroit': ['detroit'], 'toms': ['percussion'],
  'modulated': ['evolving'], 'rim': ['percussion'], 'degrading': ['glitchy'], 'sequence': ['arp'],
  'trance': ['trance'], 'shimmer': ['pad'], 'polyrhythmic': [], 'psychedelic': ['hypnotic'],
  'complex': ['dense'], 'modular': ['evolving'], 'glitch': ['glitchy'], 'overdrive': ['gritty'],
  'sh101': ['lead'], 'raw': ['gritty'], 'dyad': ['chords'], 'upper': [], 'pan': ['spacious'],
  'ascending': [], 'minor7': ['chords'], 'stutter': ['glitchy'], 'tension': ['dissonant'],
};

// The pillar itself says what kind of element a pattern is.
export const PILLAR_ELEMENT = { drums: 'kick', bass: 'bass', percussion: 'percussion', melody: 'lead', transitions: 'fx' };

export function canonicalTags(tags) {
  return [...new Set(tags)].filter(t => VOCAB.has(t)).sort();
}

export function normalizeLibraryTags(tags) {
  return canonicalTags(tags.flatMap(t => LIBRARY_TAG_MAP[t.toLowerCase()] ?? []));
}

export function patternById(id) {
  for (const [pillar, patterns] of Object.entries(soundLibrary)) {
    const pattern = patterns.find(p => p.id === id);
    if (pattern) return { pillar, pattern };
  }
  return null;
}

// Exposé: from S2 on, tags come from the selected ids. Unknown ids contribute nothing.
export function tagsForPatternIds(ids) {
  const tags = [];
  for (const id of ids ?? []) {
    const hit = patternById(id);
    if (!hit) continue;
    tags.push(PILLAR_ELEMENT[hit.pillar], ...normalizeLibraryTags(hit.pattern.tags));
  }
  return canonicalTags(tags);
}
