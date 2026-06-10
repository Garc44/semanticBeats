export const PILLAR_NAMES = ['drums', 'bass', 'percussion', 'melody', 'transitions'];

const KNOB_DEFAULTS = {
  drums:       { gain: 0.8, drive: 0.0, decay: 0.12 },
  bass:        { gain: 0.7, cutoff: 1.0, stutter: 0.0 },
  percussion:  { gain: 0.6, decay: 0.12 },
  melody:      { gain: 0.5, cutoff: 0.6, resonance: 0.1, space: 0.2 },
  transitions: { gain: 0.4, hpf: 0.0, size: 0.5 },
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
    vizType: null,
  }));
}

export function rebuildStack(pillars, globalState) {
  const { soloedPillar, tempo, beatsPerCycle = 4, masterVolume, masterFilter, intensity } = globalState;

  const active = pillars.filter(p => {
    if (soloedPillar) return p.name === soloedPillar && p.code.trim();
    return !p.muted && p.code.trim();
  });

  if (!active.length) return null;

  const withViz = (p) => {
    if (!p.vizType) return p.code;
    const colored = `${p.code}.color('#E8302A')`;
    if (p.vizType === 'spectrum') {
      return `${colored}.spectrum({ctx:window.__pillarVizCtx['${p.name}'],id:'spec-${p.name}'})`;
    }
    if (p.vizType === 'scope') {
      return `${colored}.analyze('scop-${p.name}').draw(window.__vizDraw('${p.name}','scope'),{id:'scop-${p.name}'})`;
    }
    return `${colored}.draw(window.__vizDraw('${p.name}','grid'),{id:'viz-${p.name}',lookbehind:1,lookahead:1})`;
  };

  const inner = active.length === 1
    ? withViz(active[0])
    : `stack(\n${active.map(p => withViz(p)).join(',\n')}\n)`;

  const filterHz = Math.round(masterFilter * 18000 + 200);
  const cps = Math.round((tempo / (60 * beatsPerCycle)) * 1000) / 1000;
  return `${inner}.cps(${cps}).gain(${masterVolume}).lpf(${filterHz}).shape(${intensity}).room(${Math.round(intensity * 0.4 * 100) / 100})`;
}
