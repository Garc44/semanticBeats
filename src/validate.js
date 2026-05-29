export const ALLOWED_STRUDEL_FUNCTIONS = new Set([
  'sound', 's', 'note', 'n', 'stack', 'cat', 'seq',
  'lpf', 'hpf', 'delay', 'room', 'size', 'gain', 'pan',
  'fast', 'slow', 'speed', 'crush', 'shape', 'distort',
  'resonance', 'cutoff', 'vowel', 'decay', 'sustain', 'penv', 'lpq', 'quantise', 'scale',
  'jux', 'rev', 'iter', 'every', 'sometimes', 'rarely', 'often',
  'degradeBy', 'degrade', 'segment', 'struct', 'mask', 'euclid',
  'palindrome', 'ply', 'press', 'zoom', 'linger', 'stretch',
]);

export function validateCode(code) {
  const errors = [];

  if (!code || !code.trim()) {
    errors.push('Code is empty');
    return { valid: false, errors };
  }

  if (/```/.test(code)) {
    errors.push('Code contains markdown fences');
  }

  let depth = 0;
  let unbalanced = false;
  for (const ch of code) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (depth < 0) { unbalanced = true; break; }
  }
  if (unbalanced || depth !== 0) {
    errors.push('Unbalanced parentheses');
  }

  const methodCalls = [...code.matchAll(/\.([a-zA-Z]+)\s*\(/g)].map((m) => m[1]);
  for (const fn of methodCalls) {
    if (!ALLOWED_STRUDEL_FUNCTIONS.has(fn)) {
      errors.push(`Unknown function: ${fn}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
