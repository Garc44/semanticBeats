export const PILLAR_NAMES = ['foundation', 'bassline', 'percussion', 'melody', 'atmosphere', 'fx'];

export function makePillars() {
  return PILLAR_NAMES.map(name => ({ name, code: '', muted: false, history: [] }));
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
  return `${inner}.cps(${tempo}).gain(${masterVolume}).lpf(${filterHz}).shape(${intensity})`;
}
