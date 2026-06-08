import { soundLibrary } from './library/soundLibrary.js';

export function compileTrack(plan, pillarName, pillar) {
  const catalog = soundLibrary[pillarName] ?? [];
  const pattern = catalog.find(p => p.id === plan?.selectedId) ?? catalog[0];
  if (!pattern) return '';

  const mods = plan?.modifications ?? {};
  let code = `(${pattern.code})`;

  if (mods.slowdown > 1)               code += `.slow(${mods.slowdown})`;
  if (mods.speed && mods.speed !== 1.0) code += `.fast(${mods.speed})`;

  const effectiveGain = pillar.muted ? 0 : pillar.knobs.gain;
  code = applyKnobs(code, pillarName, pillar.knobs, effectiveGain);

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

function round(v) {
  return Math.round(v * 100) / 100;
}
