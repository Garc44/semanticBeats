export const STYLE_LIBRARY = {
  acid: {
    global: [
      { type: 'increase_resonance', amount: 0.8 },
      { type: 'decrease_cutoff', amount: 0.5 },
    ],
    bass: [
      { type: 'increase_resonance', amount: 0.8 },
      { type: 'decrease_cutoff', amount: 0.5 },
      { type: 'add_distortion', amount: 0.4 },
      { type: 'increase_filter_motion', amount: 0.5 },
    ],
    melody: [
      { type: 'increase_filter_motion', amount: 0.6 },
      { type: 'increase_resonance', amount: 0.5 },
    ],
  },

  groove: {
    global: [
      { type: 'increase_density', amount: 0.3 },
      { type: 'add_delay', amount: 0.2 },
    ],
    drums: [
      { type: 'increase_density', amount: 0.3 },
      { type: 'add_delay', amount: 0.25 },
    ],
    bass: [
      { type: 'add_delay', amount: 0.3 },
      { type: 'increase_reverb', amount: 0.2 },
    ],
  },

  minimal: {
    global: [
      { type: 'simplify_pattern', amount: 1 },
      { type: 'reduce_reverb', amount: 0.4 },
    ],
    all: [
      { type: 'simplify_pattern', amount: 1 },
      { type: 'reduce_reverb', amount: 0.4 },
    ],
  },

  dub: {
    global: [
      { type: 'add_delay', amount: 0.6 },
      { type: 'increase_reverb', amount: 0.5 },
    ],
    bass: [
      { type: 'add_delay', amount: 0.7 },
      { type: 'increase_reverb', amount: 0.6 },
    ],
    drums: [
      { type: 'add_delay', amount: 0.5 },
      { type: 'reduce_reverb', amount: 0.2 },
    ],
  },

  breakcore: {
    global: [
      { type: 'increase_density', amount: 0.8 },
      { type: 'add_distortion', amount: 0.5 },
    ],
    drums: [
      { type: 'increase_density', amount: 0.9 },
      { type: 'add_distortion', amount: 0.4 },
    ],
    all: [
      { type: 'increase_density', amount: 0.8 },
      { type: 'add_distortion', amount: 0.6 },
    ],
  },
};

const DEFAULT_STYLE = 'minimal';
const DEFAULT_INTENSITY = 0.5;

export function expandStyle(style, target, intensity = DEFAULT_INTENSITY) {
  const styleEntry = STYLE_LIBRARY[style] ?? STYLE_LIBRARY[DEFAULT_STYLE];
  const ops = styleEntry[target] ?? styleEntry.global ?? [];
  return ops.map(op => ({ type: op.type, amount: op.amount * intensity }));
}
