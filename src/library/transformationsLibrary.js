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
  drums:            ['shape', 'crush', 'distort', 'reverb', 'lopass', 'hipass', 'reverse'],
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

// Apply a curated emotion recipe. Unlike mergeLlmTransformPatch (which merges a partial
// patch), this REPLACES the pillar's transform state with the recipe — each emotion is a
// clean, known sound. The recipe is copied so later mutations don't leak back into it.
export function applyEmotionRecipe(pillar, recipe) {
  pillar.transforms = { ...recipe.transforms };
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
  lopass: 'lopass', lowpass: 'lopass', 'low pass': 'lopass', lpf: 'lopass',
  hipass: 'hipass', highpass: 'hipass', 'high pass': 'hipass', hpf: 'hipass',
  filter: 'dj_filter', djf: 'dj_filter',
  resonance: 'lopass_q', lpq: 'lopass_q',
  degrade: 'degrade',
  vowel: 'vowel', formant: 'vowel',
  phaser: 'psy_swirl', swirl: 'psy_swirl',
  glitch: 'robot_glitch', coarse: 'robot_glitch',
  size: 'room_size',
  speed: 'speed_up', faster: 'speed_up',
  slow: 'slow_down', slower: 'slow_down',
  iter: 'iter', ply: 'ply',
  widen: 'jux_rev', stereo: 'jux_rev',
  reverse: 'reverse',
  palindrome: 'palindrome',
  press: 'press',
};

// "Add this effect" values for bare-name commands that name an effect but give no
// number ("add vowel filter", "reverse it"). Keeps named adds deterministic + offline
// instead of leaning on the local model to invent a value. Numeric defaults are musical
// (note crush/dj_filter are inverted — lower = stronger).
const ADD_DEFAULTS = {
  lopass: 800, hipass: 2000, lopass_q: 8, degrade: 0.3, dj_filter: 0.3,
  reverb: 0.4, room_size: 4, echo: 0.4,
  robot_glitch: 8, crush: 6, shape: 0.3, distort: 0.4, vowel: 'a', psy_swirl: 1.5,
  speed_up: 2, slow_down: 2, iter: 4, ply: 2,
  reverse: true, palindrome: true, jux_rev: true, press: true,
};

function addValueFor(id) {
  if (id in ADD_DEFAULTS) return ADD_DEFAULTS[id];
  const t = TRANSFORMS[id];
  if (!t) return undefined;
  if (t.type === 'boolean') return true;
  if (t.type === 'enum') return t.values[0];
  return undefined; // numeric with no defined default → defer to LLM
}

// Effects where a HIGHER number means LESS audible effect (so "more X" must step DOWN).
const INVERTED = new Set(['crush']);
// Relative-direction keywords. Order matters: removal is checked before these.
const UP_RE   = /\b(more|up|raise|increase|boost|stronger|harder|heavier|deeper|wetter|brighter|louder|extra)\b/;
const DOWN_RE = /\b(less|down|lower|reduce|decrease|weaker|softer|gentler|subtle|subtler|drier|lighter|pull back|ease)\b/;

const clamp  = (t, v) => Math.max(t.min, Math.min(t.max, v));
const round3 = v => Math.round(v * 1000) / 1000;

// Deterministic, offline command parser. `current` = the effect's live effective values
// (pattern.initialTransforms merged with pillar.transforms) so relative tweaks ("more
// reverb") step from where the effect actually IS. Returns a patch object or null (= defer to LLM).
export function parseDirectCommand(pillarName, prompt, current = {}) {
  const allowed = PILLAR_TRANSFORMS[pillarName] ?? [];
  const text = String(prompt).toLowerCase().trim();
  const names = Object.keys(NAME_ALIASES).join('|');

  // removal: "remove reverb", "turn off the reverb", "no reverb", "kill the echo", "without delay"
  const rm = text.match(new RegExp(`\\b(?:remove|turn off|kill|disable|clear|no|without|strip)\\s+(?:the\\s+)?(${names})\\b`));
  if (rm) {
    const id = NAME_ALIASES[rm[1]];
    if (allowed.includes(id)) return { [id]: null };
  }

  // Anchor on the first effect the user names. No name → it's a vibe prompt; defer to LLM.
  const nameMatch = text.match(new RegExp(`\\b(${names})\\b`));
  if (!nameMatch) return null;
  const id = NAME_ALIASES[nameMatch[1]];
  if (!allowed.includes(id)) return null;
  const t = TRANSFORMS[id];

  // enum (e.g. vowel): explicit value letter wins, else the add-default.
  if (t.type === 'enum') {
    const v = text.match(new RegExp(`\\b(${t.values.join('|')})\\b`));
    return { [id]: v ? v[1] : addValueFor(id) };
  }

  // boolean (e.g. reverse): naming it turns it on.
  if (t.type === 'boolean') return { [id]: true };

  // numeric. Explicit number ANYWHERE after the name wins — tolerates filler like
  // "turn the reverb up to 0.9" or "change the value of reverb to 0.9".
  const after = text.slice(nameMatch.index + nameMatch[0].length);
  const num = after.match(/-?\d*\.?\d+/);
  if (num) return { [id]: clamp(t, parseFloat(num[0])) };

  // relative tweak: step 20% of the range from the current value (inverted effects flip).
  const step = (t.max - t.min) * 0.2;
  const cur = typeof current[id] === 'number' ? current[id]
            : typeof t.default === 'number' ? t.default
            : (t.min + t.max) / 2;
  if (UP_RE.test(text) || DOWN_RE.test(text)) {
    let dir = UP_RE.test(text) ? 1 : -1;
    if (INVERTED.has(id)) dir = -dir;
    return { [id]: round3(clamp(t, cur + dir * step)) };
  }

  // bare name, no number, no direction: "add reverb" → musical default.
  const val = addValueFor(id);
  return val === undefined ? null : { [id]: val };
}
