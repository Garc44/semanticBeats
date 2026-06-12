export const TRANSFORMS = {
  // — Filtering —
  lopass:     { method: 'lpf',       type: 'numeric', min: 100,  max: 18000, default: null, description: 'low-pass filter cutoff Hz — lower = darker/muddier' },
  hipass:     { method: 'hpf',       type: 'numeric', min: 0,    max: 8000,  default: null, description: 'high-pass filter cutoff Hz — higher = thinner/airier' },
  lopass_q:   { method: 'lpq',       type: 'numeric', min: 0,    max: 40,    default: null, description: 'low-pass resonance — higher = more nasal/aggressive peak' },
  degrade:    { method: 'degradeBy', type: 'numeric', min: 0,    max: 0.9,   default: null, description: 'randomly drop events — higher = more sparse/glitchy' },

  // — Space —
  reverb:     { method: 'room',      type: 'numeric', min: 0,    max: 1,     default: null, description: 'reverb amount — higher = wetter/more spatial' },
  room_size:  { method: 'size',      type: 'numeric', min: 0.1,  max: 10,    default: null, description: 'reverb decay size — higher = larger acoustic space' },
  echo:       { method: 'delay',     type: 'numeric', min: 0,    max: 1,     default: null, description: 'delay/echo feedback amount' },

  // — Distortion / Texture —
  crush:      { method: 'crush',     type: 'numeric', min: 1,    max: 16,    default: null, description: 'bit crush depth — lower = more destroyed/lo-fi' },
  shape:      { method: 'shape',     type: 'numeric', min: 0,    max: 0.9,   default: null, description: 'waveshaper saturation — adds harmonic warmth/drive' },
  distort:    { method: 'distort',   type: 'numeric', min: 0,    max: 1,     default: null, description: 'hard clipping distortion' },
  vowel:      { method: 'vowel',     type: 'enum',    values: ['a','e','i','o','u'], default: null, description: 'formant filter — vowel shape applied to sound' },

  // — Rhythm / Timing —
  speed_up:   { method: 'fast',      type: 'numeric', min: 0.25, max: 8,     default: null, description: 'speed multiplier — doubles/quadruples rhythmic density' },
  slow_down:  { method: 'slow',      type: 'numeric', min: 2,    max: 8,     default: null, description: 'slow multiplier — halves/quarters rhythmic density' },
  iter:       { method: 'iter',      type: 'numeric', min: 2,    max: 8,     default: null, description: 'iterate pattern n times with offset — creates phasing' },
  ply:        { method: 'ply',       type: 'numeric', min: 2,    max: 4,     default: null, description: 'repeat each event n times — thickens pattern' },

  // — Structural —
  reverse:    { method: 'rev',       type: 'boolean', compiled: 'rev()',         default: false, description: 'reverse pattern direction' },
  palindrome: { method: 'palindrome',type: 'boolean', compiled: 'palindrome()',  default: false, description: 'play pattern forward then backward' },
  jux_rev:    { method: 'jux',       type: 'boolean', compiled: 'jux(rev)',      default: false, description: 'left channel normal, right reversed — wide stereo' },
  press:      { method: 'press',     type: 'boolean', compiled: 'press()',       default: false, description: 'push events to offbeat — syncopation/swing' },
};

export const PILLAR_TRANSFORMS = {
  drums:       ['crush', 'distort', 'shape', 'reverb', 'degrade', 'iter', 'ply', 'reverse', 'palindrome', 'jux_rev', 'press'],
  bass:        ['lopass', 'lopass_q', 'reverb', 'room_size', 'echo', 'degrade', 'speed_up', 'slow_down', 'shape', 'distort', 'crush'],
  percussion:  ['crush', 'distort', 'reverb', 'degrade', 'iter', 'ply', 'reverse', 'jux_rev'],
  melody:      ['lopass', 'lopass_q', 'hipass', 'reverb', 'room_size', 'echo', 'vowel', 'jux_rev', 'speed_up', 'slow_down', 'shape', 'degrade'],
  transitions: ['lopass', 'hipass', 'reverb', 'room_size', 'echo', 'speed_up', 'slow_down', 'iter', 'reverse'],
};

export function getTransformsForPillar(pillarName) {
  return (PILLAR_TRANSFORMS[pillarName] ?? []).map(id => ({ id, ...TRANSFORMS[id] }));
}

export function mergeLlmTransformPatch(pillar, llmPatch) {
  const allowed = PILLAR_TRANSFORMS[pillar.name] ?? [];
  for (const [id, value] of Object.entries(llmPatch)) {
    if (!allowed.includes(id)) {
      console.warn(`LLM attempted invalid transform "${id}" on "${pillar.name}". Ignored.`);
      continue;
    }
    if (value === null || value === false) delete pillar.transforms[id];
    else pillar.transforms[id] = value;
  }
}
