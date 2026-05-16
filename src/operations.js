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
];

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function round2(v) {
  return Math.round(v * 100) / 100;
}

// Finds `.method(N)` and adjusts N by delta. Appends with default+delta if absent.
function adjustMethod(code, method, delta, { min, max, defaultVal }) {
  const regex = new RegExp(`\\.${method}\\(([\\d.]+)\\)`);
  const match = code.match(regex);
  if (match) {
    const next = clamp(parseFloat(match[1]) + delta, min, max);
    return code.replace(regex, `.${method}(${round2(next)})`);
  }
  return code.trimEnd() + `\n  .${method}(${round2(clamp(defaultVal + delta, min, max))})`;
}

function appendIfMissing(code, method, value) {
  if (code.includes(`.${method}(`)) return code;
  return code.trimEnd() + `\n  .${method}(${value})`;
}

function removeLastEffect(code) {
  return code.replace(/\n?\s*\.[a-zA-Z]+\([^)]*\)\s*$/, '').trimEnd();
}

function setMethodPattern(code, method, pattern) {
  const regex = new RegExp(`\\.${method}\\([^)]*\\)`);
  if (code.match(regex)) return code.replace(regex, `.${method}(${pattern})`);
  return code.trimEnd() + `\n  .${method}(${pattern})`;
}

export const OPERATION_HANDLERS = {
  increase_reverb:        (code, amt) => adjustMethod(code, 'room',      amt,         { min: 0,   max: 0.9,  defaultVal: 0 }),
  reduce_reverb:          (code, amt) => adjustMethod(code, 'room',      -amt,        { min: 0,   max: 0.9,  defaultVal: 0.5 }),
  increase_resonance:     (code, amt) => adjustMethod(code, 'resonance', amt * 10,    { min: 0,   max: 20,   defaultVal: 0 }),
  decrease_cutoff:        (code, amt) => adjustMethod(code, 'lpf',       -amt * 2000, { min: 200, max: 4000, defaultVal: 4000 }),
  add_delay:              (code, amt) => appendIfMissing(code, 'delay',  round2(amt).toString()),
  add_distortion:         (code, amt) => appendIfMissing(code, 'distort', round2(amt).toString()),
  increase_density:       (code, amt) => adjustMethod(code, 'fast',      amt * 2,     { min: 0.5, max: 8,   defaultVal: 1 }),
  simplify_pattern:       (code, _)   => removeLastEffect(code),
  increase_filter_motion: (code, _)   => setMethodPattern(code, 'lpf', '"<400 800 200 600>"'),
};
