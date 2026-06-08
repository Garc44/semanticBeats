import { soundLibrary } from './library/soundLibrary.js';

const ALLOWED_STRUDEL_FUNCTIONS = new Set([
  'sound', 's', 'note', 'n', 'stack', 'cat', 'seq',
  'bank', 'lpf', 'hpf', 'delay', 'room', 'size', 'gain', 'pan',
  'fast', 'slow', 'speed', 'crush', 'shape', 'distort',
  'resonance', 'cutoff', 'vowel', 'decay', 'sustain', 'attack', 'release', 'penv',
  'lpq', 'hp', 'hpq', 'cps', 'filter', 'quantise', 'scale',
  'jux', 'rev', 'iter', 'every', 'sometimes', 'rarely', 'often',
  'degradeBy', 'degrade', 'segment', 'struct', 'mask', 'euclid',
  'palindrome', 'ply', 'press', 'zoom', 'linger', 'stretch',
]);

export function validatePlan(plan, pillarName) {
  const errors = [];
  if (!plan || typeof plan !== 'object') {
    return { valid: false, errors: ['Plan is not an object'] };
  }

  const catalog = soundLibrary[pillarName] ?? [];
  if (typeof plan.selectedId !== 'string' || !plan.selectedId) {
    errors.push('selectedId missing or not a string');
  } else if (!catalog.find(p => p.id === plan.selectedId)) {
    errors.push(`selectedId "${plan.selectedId}" not in catalog for pillar "${pillarName}"`);
  }

  const mods = plan.modifications ?? {};
  if (mods.gain !== undefined && (typeof mods.gain !== 'number' || mods.gain < 0 || mods.gain > 1.2)) {
    errors.push('gain out of range [0, 1.2]');
  }
  if (mods.speed !== undefined && (typeof mods.speed !== 'number' || mods.speed <= 0)) {
    errors.push('speed must be a positive number');
  }
  if (mods.slowdown !== undefined && (!Number.isInteger(mods.slowdown) || mods.slowdown < 1)) {
    errors.push('slowdown must be an integer >= 1');
  }

  return { valid: errors.length === 0, errors };
}

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
