export const STYLE_LIBRARY = {
  techno: {
    global: [
      { type: 'lock_to_scale',      amount: 1.0 },
      { type: 'increase_resonance', amount: 0.4 },
      { type: 'decrease_cutoff',    amount: 0.3 },
    ],
    drums: [
      { type: 'increase_density', amount: 0.4 },
      { type: 'add_distortion',   amount: 0.3 },
    ],
    bass: [
      { type: 'apply_sidechain',    amount: 0.8 },
      { type: 'lock_to_scale',      amount: 1.0 },
      { type: 'increase_resonance', amount: 0.5 },
      { type: 'adjust_lpq',         amount: 0.4 },
    ],
    melody: [
      { type: 'lock_to_scale',          amount: 1.0 },
      { type: 'increase_filter_motion', amount: 0.5 },
    ],
  },
};

const DEFAULT_STYLE = 'techno';
const DEFAULT_INTENSITY = 0.5;

export function expandStyle(style, target, intensity = DEFAULT_INTENSITY) {
  const styleEntry = STYLE_LIBRARY[style] ?? STYLE_LIBRARY[DEFAULT_STYLE];
  const ops = styleEntry[target] ?? styleEntry.global ?? [];
  return ops.map(op => ({ type: op.type, amount: op.amount * intensity }));
}
