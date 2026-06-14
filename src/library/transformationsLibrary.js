export const TRANSFORMS = {
  // — Filtering —
  lopass:     { method: 'lpf',       type: 'numeric', min: 100,  max: 18000, default: null, description: 'Low-pass cutoff Hz. Pick when user wants: darker, muddier, muffled, warmer, underwater, remove highs. LOWER = more effect: ~400 very dark, ~16000 barely affects.' },
  hipass:     { method: 'hpf',       type: 'numeric', min: 0,    max: 8000,  default: null, description: 'High-pass cutoff Hz. Pick when user wants: thinner, airier, tinny, radio/phone, remove bass/weight. HIGHER = more effect: ~4000 very thin, ~200 subtle.' },
  lopass_q:   { method: 'lpq',       type: 'numeric', min: 0,    max: 40,    default: null, description: 'Low-pass resonance peak. Pick when user wants: nasal, squelchy, acid, aggressive sweep. Use WITH lopass. ~5 mild, ~25 screaming.' },
  degrade:    { method: 'degradeBy', type: 'numeric', min: 0,    max: 0.9,   default: null, description: 'Randomly drop hits. Pick when user wants: sparser, glitchy, broken, stuttering, less busy, thinned out. ~0.2 subtle, ~0.7 very sparse.' },
  dj_filter: { method: 'djf', type: 'numeric', min: 0, max: 1, default: 0.5, description: 'Single DJ filter knob for build-ups/sweeps. 0.5 = clean/off. BELOW 0.5 = muffled mud (~0.2 deep mud). ABOVE 0.5 = thin air (~0.8 bright/airy).' },

  // — Space —
  reverb:     { method: 'room',      type: 'numeric', min: 0,    max: 1,     default: null, description: 'Reverb wetness. Pick when user wants: spacious, distant, ambient, washed-out, big-room, dreamy. ~0.2 subtle space, ~0.8 drowning/cavernous.' },
  room_size:  { method: 'size',      type: 'numeric', min: 0.1,  max: 10,    default: null, description: 'Reverb decay length. Use WITH reverb. Pick when user wants: bigger space, longer tail. ~2 small room, ~8 huge hall.' },
  echo:       { method: 'delay',     type: 'numeric', min: 0,    max: 1,     default: null, description: 'Delay/echo feedback. Pick when user wants: repeats, dub, trailing echoes, spacey bounces. ~0.3 few repeats, ~0.7 long feedback trails.' },

  // — Distortion / Texture —
  robot_glitch: { method: 'coarse', type: 'numeric', min: 1, max: 32, default: null, description: 'Sample-rate crush. Pick when user wants: robotic, pixelated, 8-bit, gritty digital, chiptune. 1 = clean, ~8 chunky, ~24 destroyed.' },
  crush:      { method: 'crush',     type: 'numeric', min: 1,    max: 16,    default: null, description: 'Bit-depth crush = DIGITAL lo-fi (vs shape=warm, distort=harsh). Pick when user wants: lo-fi, crunchy, retro, dirty. INVERTED: 16 subtle, ~4 heavy, 1 destroyed.' },
  shape:      { method: 'shape',     type: 'numeric', min: 0,    max: 0.9,   default: null, description: 'Warm saturation/drive = SOFT grit (vs distort=harsh, crush=digital). Pick when user wants: warmer, fatter, analog, gentle push. ~0.2 subtle, ~0.6 thick.' },
  distort:    { method: 'distort',   type: 'numeric', min: 0,    max: 1,     default: null, description: 'Hard clipping = HARSH (vs shape=warm, crush=digital). Pick when user wants: aggressive, gnarly, screaming, broken-speaker. ~0.3 edgy, ~0.8 brutal.' },
  vowel:      { method: 'vowel',     type: 'enum',    values: ['a','e','i','o','u'], default: null, description: "Formant/vowel filter — makes sound 'talk'. Pick when user wants: vocal, talking, wah, vowel-like character." },
  psy_swirl: { method: 'phaser', type: 'numeric', min: 0, max: 5, default: null, description: 'Phaser sweep. Pick when user wants: swirling, watery, psychedelic, moving/sweeping synth. ~1 gentle, ~4 intense swirl.' },

  // — Rhythm / Timing —
  speed_up:   { method: 'fast',      type: 'numeric', min: 0.25, max: 8,     default: null, description: 'Rhythmic density multiplier. Pick when user wants: faster, busier, double-time, more energy. 2 = double, 4 = quadruple.' },
  slow_down:  { method: 'slow',      type: 'numeric', min: 2,    max: 8,     default: null, description: 'Rhythmic stretch. Pick when user wants: slower, sparser, half-time, laid-back. 2 = half-speed, 4 = quarter.' },
  iter:       { method: 'iter',      type: 'numeric', min: 2,    max: 8,     default: null, description: 'Rotate pattern start each cycle. Pick when user wants: evolving, phasing, shifting variation. 4 common.' },
  ply:        { method: 'ply',       type: 'numeric', min: 2,    max: 4,     default: null, description: 'Repeat each hit N times. Pick when user wants: rolls, stutters, thicker/rapid hits. 2 = doubled, 4 = rapid roll.' },

  // — Structural —
  reverse:    { method: 'rev',       type: 'boolean', compiled: 'rev()',         default: false, description: 'Play pattern backwards. Pick when user wants: reversed, backwards feel.' },
  palindrome: { method: 'palindrome',type: 'boolean', compiled: 'palindrome()',  default: false, description: 'Forward then backward each cycle. Pick when user wants: back-and-forth, bouncing, to-and-fro motion.' },
  jux_rev:    { method: 'jux',       type: 'boolean', compiled: 'jux(rev)',      default: false, description: 'Stereo split — right channel reversed. Pick when user wants: wide, stereo, spacious split.' },
  press:      { method: 'press',     type: 'boolean', compiled: 'press()',       default: false, description: 'Shift hits to offbeat. Pick when user wants: swing, syncopation, bouncy, off-grid groove.' },
};

export const PILLAR_TRANSFORMS = {
  drums:            ['shape', 'crush', 'distort', 'reverb', 'ply', 'lopass', 'hipass', 'reverse'],
  bass:             ['lopass', 'lopass_q', 'reverb', 'room_size', 'echo', 'speed_up', 'slow_down', 'shape', 'distort', 'crush', 'press', 'reverse', 'palindrome', 'robot_glitch'],
  bass_percussion:  ['lopass', 'lopass_q', 'reverb', 'room_size', 'echo', 'speed_up', 'slow_down', 'shape', 'distort', 'crush', 'press', 'reverse', 'palindrome', 'robot_glitch'],
  percussion:       ['crush', 'distort', 'reverb', 'degrade', 'iter', 'ply', 'reverse', 'jux_rev', 'lopass', 'robot_glitch', 'dj_filter'],
  melody:           ['lopass', 'lopass_q', 'hipass', 'reverb', 'room_size', 'echo', 'vowel', 'jux_rev', 'speed_up', 'slow_down', 'shape', 'degrade', 'psy_swirl', 'robot_glitch', 'dj_filter'],
  transitions:      ['lopass', 'hipass', 'reverb', 'room_size', 'echo', 'speed_up', 'slow_down', 'iter', 'reverse', 'dj_filter'],
};

export function getTransformsForPillar(pillarName) {
  return (PILLAR_TRANSFORMS[pillarName] ?? []).map(id => ({ id, ...TRANSFORMS[id] }));
}

const METHOD_TO_ID = Object.fromEntries(
  Object.entries(TRANSFORMS).map(([id, t]) => [t.method, id])
);

// Small models pad patches with unrelated keys set to 0 (the universal "off" token),
// which then clobber active effects and emit junk like .distort(0).room(0).
// Treat 0 as removal everywhere EXCEPT dj_filter, where 0 is a meaningful value (full mud).
const ZERO_MEANINGFUL = new Set(['dj_filter']);

export function mergeLlmTransformPatch(pillar, llmPatch) {
  const allowed = PILLAR_TRANSFORMS[pillar.name] ?? [];
  for (const [rawKey, value] of Object.entries(llmPatch)) {
    const id = METHOD_TO_ID[rawKey] ?? rawKey;
    if (!allowed.includes(id)) {
      console.warn(`LLM attempted invalid transform "${rawKey}" (resolved: "${id}") on "${pillar.name}". Ignored.`);
      continue;
    }
    if (value === null || value === false) { delete pillar.transforms[id]; continue; }
    if (value === 0 && !ZERO_MEANINGFUL.has(id)) { delete pillar.transforms[id]; continue; }
    pillar.transforms[id] = value;
  }
}

// — A: deterministic direct-command parser —
// Explicit commands ("set crush to 16", "remove reverb") bypass the LLM entirely:
// no hallucination, no padding, no latency. Returns a patch object or null (= defer to LLM).
const NAME_ALIASES = {
  reverb: 'reverb', room: 'reverb', space: 'reverb',
  crush: 'crush', bitcrush: 'crush',
  distort: 'distort', distortion: 'distort',
  shape: 'shape', drive: 'shape', saturation: 'shape',
  echo: 'echo', delay: 'echo',
  lopass: 'lopass', lowpass: 'lopass', lpf: 'lopass',
  hipass: 'hipass', highpass: 'hipass', hpf: 'hipass',
  filter: 'dj_filter', djf: 'dj_filter',
  resonance: 'lopass_q', lpq: 'lopass_q',
  degrade: 'degrade',
  vowel: 'vowel',
  phaser: 'psy_swirl', swirl: 'psy_swirl',
  glitch: 'robot_glitch', coarse: 'robot_glitch',
  size: 'room_size',
  speed: 'speed_up',
  iter: 'iter', ply: 'ply',
  reverse: 'reverse',
  palindrome: 'palindrome',
  press: 'press',
};

export function parseDirectCommand(pillarName, prompt) {
  const allowed = PILLAR_TRANSFORMS[pillarName] ?? [];
  const text = String(prompt).toLowerCase().trim();
  const names = Object.keys(NAME_ALIASES).join('|');

  // removal: "remove reverb", "turn off the reverb", "no reverb", "kill the echo"
  const rm = text.match(new RegExp(`\\b(?:remove|turn off|kill|disable|clear|no)\\s+(?:the\\s+)?(${names})\\b`));
  if (rm) {
    const id = NAME_ALIASES[rm[1]];
    if (allowed.includes(id)) return { [id]: null };
  }

  // set numeric: "set crush to 16", "crush 16", "reverb to 0.8", "make the shape 0.5"
  const m = text.match(new RegExp(`\\b(?:set|turn|put|make|change)?\\s*(?:the\\s+)?(${names})\\s*(?:to|=|at|:)?\\s*(-?\\d*\\.?\\d+)\\b`));
  if (m) {
    const id = NAME_ALIASES[m[1]];
    if (!allowed.includes(id)) return null;
    const t = TRANSFORMS[id];
    if (t.type !== 'numeric') return null;
    const val = Math.max(t.min, Math.min(t.max, parseFloat(m[2]))); // clamp to range
    return { [id]: val };
  }

  return null;
}
