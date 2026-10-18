import { SUBGENRES, SUBGENRE_BPM } from '../graph/knowledgeGraph.js';
import { KEYS, SCALES, EFFECTS, BASS_SOUNDS, STAB_SOUNDS } from './form.js';

// Deterministic form → Strudel compiler (S6). Emits only its own templates plus
// whitelisted characters from the form: digits 0-7, "x" and rests. Never throws.
const DEFAULTS = { subgenre: 'hypnotic', key: 'A', scale: 'minor', bassSound: 'sawtooth', stabSound: 'sawtooth', effect: 'none' };
const BASS_FALLBACK = '~ ~ 0 ~ ~ ~ 0 ~ ~ ~ 0 ~ ~ ~ 0 ~'.split(' ');
const STAB_FALLBACK = '~ ~ ~ ~ ~ ~ 0 ~ ~ ~ ~ ~ ~ ~ ~ ~'.split(' ');
const MIN_BASS_NOTES = 3;

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(Number(x)) ? Number(x) : lo));
const pick = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback);
const lane = s => String(typeof s === 'string' ? s : '').padEnd(16, '.').slice(0, 16).split('');
const hits = (s, name) => lane(s).map(c => (c === 'x' || c === 'X' ? name : '~')).join(' ');
const degrees = s => lane(s).map(c => (/^[0-7]$/.test(c) ? c : '~'));
const noteCount = steps => steps.filter(c => c !== '~').length;
const fixed = (x, digits = 2) => x.toFixed(digits);

export function compileForm(input) {
  const f = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const subgenre = pick(f.subgenre, SUBGENRES, DEFAULTS.subgenre);
  const key = pick(f.key, KEYS, DEFAULTS.key);
  const scale = pick(f.scale, SCALES, DEFAULTS.scale);
  const effect = pick(f.effect, EFFECTS, DEFAULTS.effect);
  const bassSound = pick(f.bassSound, BASS_SOUNDS, DEFAULTS.bassSound);
  const stabSound = pick(f.stabSound, STAB_SOUNDS, DEFAULTS.stabSound);
  const bpm = SUBGENRE_BPM[subgenre];
  const cutoff = Math.round(clamp(f.bassCutoff, 200, 1500));
  const resonance = Math.round(clamp(f.bassResonance, 0, 20));
  const amount = clamp(f.effectAmount, 0, 10) / 10;

  const fallbacks = [];
  let bassA = degrees(f.bassA);
  let bassB = degrees(f.bassB);
  if (noteCount(bassA) < MIN_BASS_NOTES) { bassA = BASS_FALLBACK; fallbacks.push('bass'); }
  if (noteCount(bassB) < MIN_BASS_NOTES) bassB = bassA;
  let stab = degrees(f.stab);
  if (noteCount(stab) < 1) { stab = STAB_FALLBACK; fallbacks.push('stab'); }

  const A = `[${bassA.join(' ')}]`;
  const B = `[${bassB.join(' ')}]`;
  const stabChords = stab.map(c => (c === '~' ? '~' : `[${c},${+c + 2},${+c + 4}]`)).join(' ');
  const delayTime = fixed((60 / bpm) * 0.75, 3); // dotted eighth

  const bassLpf = effect === 'filter_sweep'
    ? `.lpf(sine.range(${Math.round(cutoff * (1 - 0.6 * amount))}, ${Math.round(cutoff * (1 + 2 * amount))}).slow(8))`
    : `.lpf(${cutoff})`;
  const stabFx = effect === 'delay_throw'
    ? `.delay(${fixed(0.3 + 0.4 * amount)}).delaytime(${delayTime}).delayfeedback(${fixed(0.35 + 0.3 * amount)})`
    : effect === 'reverb_wash'
      ? `.room(${fixed(0.4 + 0.5 * amount)}).size(${fixed(0.5 + 0.4 * amount)})`
      : '.room(0.2)';

  const layers = [
    's("bd*4").bank("RolandTR909")',
    `s("${hits(f.hat, 'hh')}").bank("RolandTR909").gain(perlin.range(0.3, 0.5))`,
    `s("${hits(f.openhat, 'oh')}").bank("RolandTR909").gain(0.3)`,
    `s("${hits(f.clap, 'cp')}").bank("RolandTR909").gain(0.55).room(0.15)`,
    // Bass A A A B in octave 1, stab triads in octave 3: shared key, separate registers.
    `n("<${A} ${A} ${A} ${B}>").scale("${key}1:${scale}").s("${bassSound}")${bassLpf}.lpq(${resonance}).decay(0.16).sustain(0.2).gain(0.75)`,
    `n("${stabChords}").scale("${key}3:${scale}").s("${stabSound}").lpf(1600).decay(0.12).sustain(0).gain(0.3)${stabFx}`,
  ];
  const code = `setcpm(${bpm}/4)\n\nstack(\n  ${layers.join(',\n  ')}\n)`;
  return { code, fallbacks, subgenre, key, scale, bpm, effect };
}
