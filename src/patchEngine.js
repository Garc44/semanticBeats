import { ALLOWED_OPERATIONS, OPERATION_HANDLERS } from './operations.js';

// Fallback seed for generate mode when LLM omits seedCode
const DEFAULT_SEED = 's("bd ~ sn ~")';

const VOICE_SOUNDS = {
  melody: 'sine',
  bass: 'sawtooth',
  chords: 'square',
};

export function applyTransformation(code, plan) {
  const { operations = [] } = plan;
  if (!Array.isArray(operations)) return code;
  return operations
    .filter((op) => ALLOWED_OPERATIONS.includes(op.type))
    .reduce((acc, op) => applyOperation(acc, op), code);
}

export function generateSeed(plan) {
  const { seedCode = DEFAULT_SEED, operations = [] } = plan;
  return applyTransformation(seedCode, { operations });
}

export function buildVoiceCode(voiceType, notes, operations = []) {
  const sound = VOICE_SOUNDS[voiceType] ?? 'sine';
  const base =
    voiceType === 'percussion'
      ? `s("${notes}").gain(0.7)`
      : `note("${notes}").sound("${sound}").gain(0.5)`;
  return applyTransformation(base, { operations });
}

function applyOperation(code, { type, amount = 0.3 }) {
  const handler = OPERATION_HANDLERS[type];
  if (!handler) return code;
  return handler(code, amount);
}
