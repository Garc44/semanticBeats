import { soundLibrary } from './library/soundLibrary.js';

export const PILLAR_NAMES = ['drums', 'bass_percussion', 'melody', 'transitions'];

const KNOB_DEFAULTS = {
  drums:           { gain: 0.8, drive: 0.0, decay: 0.12 },
  bass_percussion: { gain: 0.7, cutoff: 1.0, stutter: 0.0 },
  melody:          { gain: 0.5, cutoff: 0.6, resonance: 0.1, space: 0.2 },
  transitions:     { gain: 0.4, hpf: 0.0, size: 0.5 },
};

export function makePillars() {
  return PILLAR_NAMES.map(name => ({
    name,
    code: '',
    muted: false,
    history: [],
    selectedId: null,
    lastMods: {},
    knobs: { ...KNOB_DEFAULTS[name] },
  }));
}

export function rebuildStack(pillars, globalState) {
  const { soloedPillar, tempo, masterVolume, masterFilter, intensity } = globalState;

  // Muted tracks compile to gain(0) — only filter by solo and empty code
  const active = pillars.filter(p => {
    if (soloedPillar) return p.name === soloedPillar && p.code.trim();
    return p.code.trim();
  });

  if (!active.length) return null;

  const inner = active.length === 1
    ? active[0].code
    : `stack(\n${active.map(p => p.code).join(',\n')}\n)`;

  const filterHz = Math.round(masterFilter * 18000 + 200);
  return `${inner}.cps(${tempo}).gain(${masterVolume}).lpf(${filterHz}).shape(${intensity}).room(${Math.round(intensity * 0.4 * 100) / 100})`;
}
