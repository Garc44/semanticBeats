import { soundLibrary } from './library/soundLibrary.js';

export const PILLAR_NAMES = ['kick', 'rumble_bass', 'groove', 'synth_fx'];

export function makePillars() {
  return PILLAR_NAMES.map(name => ({ name, code: '', muted: false, history: [] }));
}

export function assembleCode(plan, pillarName) {
  const catalog = soundLibrary[pillarName] ?? [];
  const pattern = catalog.find(p => p.id === plan.selectedId) ?? catalog[0];
  if (!pattern) return '';

  const mods = plan.modifications ?? {};
  let code = pattern.code;
  if (mods.slowdown !== undefined && mods.slowdown > 1) code += `.slow(${mods.slowdown})`;
  if (mods.speed !== undefined && mods.speed !== 1.0) code += `.speed(${mods.speed})`;
  if (mods.gain !== undefined && mods.gain !== 1.0) code += `.gain(${mods.gain})`;
  return code;
}

export function rebuildStack(pillars, globalState) {
  const { soloedPillar, tempo, masterVolume, masterFilter, intensity } = globalState;

  const active = pillars.filter(p => {
    if (soloedPillar) return p.name === soloedPillar && p.code.trim();
    return !p.muted && p.code.trim();
  });

  if (!active.length) return null;

  const inner = active.length === 1
    ? active[0].code
    : `stack(\n${active.map(p => p.code).join(',\n')}\n)`;

  const filterHz = Math.round(masterFilter * 18000 + 200);
  return `${inner}.cps(${tempo}).gain(${masterVolume}).lpf(${filterHz}).shape(${intensity}).room(${Math.round(intensity * 0.4 * 100) / 100})`;
}
