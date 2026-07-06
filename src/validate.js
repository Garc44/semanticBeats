import { soundLibrary } from './library/soundLibrary.js';
import { SAMPLE_NAMES } from './library/strudelDocs.js';

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

// Everything mini-notation may contain. Anything outside this set is treated as
// injection/hallucination — the mininotation string is the ONLY free-text field
// the LLM controls, so this charset is the security boundary.
const MININOTATION_CHARSET = /^[a-zA-Z0-9\s~\[\]<>(),*/!@.|-]*$/;
const NOTE_RE = /^[a-g](?:s|b)?\d$/;

// Split notation into atoms by stripping structural syntax. `bd*4` → ['bd','4'];
// bare numbers are structural (repeat counts, euclid args) and skipped by callers.
function miniAtoms(mini) {
  return mini.replace(/[\[\]<>(),*/!@|]/g, ' ').split(/\s+/).filter(Boolean);
}

const isNumber = a => /^\d+(\.\d+)?$/.test(a);

export function validateMiniNotation(mini, kind) {
  const errors = [];
  if (!mini || !mini.trim()) return { valid: false, errors: ['Mini-notation is empty'] };
  if (!MININOTATION_CHARSET.test(mini)) errors.push('Illegal characters in mini-notation');

  const closers = { ']': '[', '>': '<', ')': '(' };
  const stack = [];
  for (const ch of mini) {
    if ('[<('.includes(ch)) stack.push(ch);
    else if (ch in closers && stack.pop() !== closers[ch]) { errors.push('Unbalanced brackets'); break; }
  }
  if (stack.length) errors.push('Unbalanced brackets');

  for (const atom of miniAtoms(mini)) {
    if (atom === '~' || isNumber(atom)) continue;
    if (kind === 'sample' && !SAMPLE_NAMES.includes(atom)) errors.push(`Unknown sample: ${atom}`);
    if (kind === 'note' && !NOTE_RE.test(atom)) errors.push(`Bad note: ${atom}`);
  }

  return { valid: errors.length === 0, errors };
}

// Approximate density check: counts non-rest atoms, ignoring *N multipliers and
// euclid expansion (both only ADD events, so this is a safe lower bound).
export function countMiniEvents(mini) {
  return miniAtoms(mini).filter(a => a !== '~' && !isNumber(a)).length;
}
