export const ALLOWED_OPERATIONS = [
  'increase_resonance',
  'decrease_cutoff',
  'add_delay',
  'add_distortion',
  'increase_density',
  'simplify_pattern',
  'increase_reverb',
  'reduce_reverb',
  'increase_filter_motion',
  'change_waveform',
  'adjust_decay',
  'adjust_lpq',
];

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function round2(v) {
  return Math.round(v * 100) / 100;
}

// Finds `.method(N)` and adjusts N by delta. Appends with default+delta if absent.
function adjustMethod(code, method, delta, { min, max, defaultVal }) {
  const regex = new RegExp(`\\.${method}\\(\\s*([\\d.]+)\\s*\\)`);
  const match = code.match(regex);
  if (match) {
    const next = clamp(parseFloat(match[1]) + delta, min, max);
    return code.replace(regex, `.${method}(${round2(next)})`);
  }
  return code.trimEnd() + `\n  .${method}(${round2(clamp(defaultVal + delta, min, max))})`;
}


function removeLastEffect(code) {
  return code.replace(/\n?\s*\.[a-zA-Z_][a-zA-Z0-9_]*\([^)]*\)\s*$/, '').trimEnd();
}

function setMethodPattern(code, method, pattern) {
  const regex = new RegExp(`\\.${method}\\([^)]*\\)`);
  if (code.match(regex)) return code.replace(regex, `.${method}(${pattern})`);
  return code.trimEnd() + `\n  .${method}(${pattern})`;
}

export const OPERATION_HANDLERS = {
  increase_reverb:        (code, amt) => adjustMethod(code, 'room',      amt,         { min: 0,   max: 0.9,  defaultVal: 0 }),
  reduce_reverb:          (code, amt) => adjustMethod(code, 'room',      -amt,        { min: 0,   max: 0.9,  defaultVal: 0 }),
  increase_resonance:     (code, amt) => adjustMethod(code, 'resonance', amt * 10,    { min: 0,   max: 20,   defaultVal: 0 }),
  decrease_cutoff:        (code, amt) => adjustMethod(code, 'lpf',       -amt * 2000, { min: 200, max: 4000, defaultVal: 4000 }),
  add_delay:              (code, amt) => adjustMethod(code, 'delay',   amt, { min: 0, max: 1, defaultVal: 0 }),
  add_distortion:         (code, amt) => adjustMethod(code, 'distort', amt, { min: 0, max: 1, defaultVal: 0 }),
  increase_density:       (code, amt) => adjustMethod(code, 'fast',      amt * 2,     { min: 0.5, max: 8,   defaultVal: 1 }),
  simplify_pattern:       (code, _)   => removeLastEffect(code),
  increase_filter_motion: (code, _)   => setMethodPattern(code, 'lpf', '"<400 800 200 600>"'),
  change_waveform: (code, amt) => {
    const waves = ['sine', 'triangle', 'sawtooth', 'square'];
    const index = Math.min(waves.length - 1, Math.floor(amt * 4));
    const target = waves[index];
    return code.replace(/\.s\("(sine|triangle|sawtooth|square)"\)/g, `.s("${target}")`);
  },
  adjust_decay: (code, amt) =>
    adjustMethod(code, 'decay', amt, { min: 0.01, max: 4.0, defaultVal: 0.1 }),
  adjust_lpq: (code, amt) =>
    adjustMethod(code, 'lpq', amt * 10, { min: 0, max: 40, defaultVal: 0 }),
};
