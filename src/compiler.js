import { soundLibrary } from './library/soundLibrary.js';
import { TRANSFORMS } from './library/transformationsLibrary.js';

const DETERMINISTIC_AUDIO_CHAIN = [
  // 1. Structural / Rhythmic
  'speed_up', 'slow_down', 'iter', 'ply', 'reverse', 'palindrome', 'jux_rev', 'press',
  // 2. Timbre / Distortion
  'crush', 'shape', 'distort', 'vowel',
  // 3. Filters & Drops
  'lopass', 'lopass_q', 'hipass', 'degrade',
  // 4. Spatial (always last)
  'reverb', 'room_size', 'echo',
];

export function compileTrack(plan, pillarName, pillar) {
  // bass_percussion is the unified pillar name; fall back to 'bass' catalog for backward compat
  const catalogKey = pillarName === 'bass_percussion' ? 'bass' : pillarName;
  const catalog = soundLibrary[catalogKey] ?? soundLibrary[pillarName] ?? [];
  const pattern = catalog.find(p => p.id === plan?.selectedId) ?? catalog[0];
  if (!pattern) return '';

  const mods = plan?.modifications ?? {};
  let code = `(${pattern.code})`;

  if (mods.slowdown > 1)               code += `.slow(${mods.slowdown})`;
  if (mods.speed && mods.speed !== 1.0) code += `.fast(${mods.speed})`;

  const effectiveGain = pillar.muted ? 0 : pillar.knobs.gain;
  code = applyKnobs(code, pillarName, pillar.knobs, effectiveGain);
  code = applyTransforms(code, pillar.transforms ?? {});

  return code;
}

function applyKnobs(code, pillarName, knobs, effectiveGain) {
  switch (pillarName) {
    case 'drums':
      return `${code}.gain(${effectiveGain}).distort(${round(knobs.drive * 0.4)}).decay(${knobs.decay})`;
    case 'bass_percussion':
      return `${code}.gain(${effectiveGain}).lpf(${Math.max(80, round(knobs.cutoff * 1200))}).degradeBy(${round(knobs.stutter * 0.4)})`;
    case 'melody':
      return `${code}.gain(${effectiveGain}).lpf(${Math.max(150, round(knobs.cutoff * 4000))}).lpq(${round(knobs.resonance * 15)}).room(${round(knobs.space * 0.85)}).delay(${round(knobs.space * 0.5)})`;
    case 'transitions':
      return `${code}.gain(${effectiveGain}).hpf(${round(knobs.hpf * 2500)}).room(0.7).size(${knobs.size})`;
    default:
      return `${code}.gain(${effectiveGain})`;
  }
}

function applyTransforms(code, transforms) {
  for (const id of DETERMINISTIC_AUDIO_CHAIN) {
    const value = transforms[id];
    if (value === undefined || value === null || value === false) continue;
    const t = TRANSFORMS[id];
    if (!t) continue;
    if (t.type === 'numeric') code += `.${t.method}(${value})`;
    if (t.type === 'enum')    code += `.${t.method}("${value}")`;
    if (t.type === 'boolean' && value === true) code += `.${t.compiled}`;
  }
  return code;
}

function round(v) {
  return Math.round(v * 100) / 100;
}
