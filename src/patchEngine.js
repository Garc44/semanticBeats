import { ALLOWED_OPERATIONS, OPERATION_HANDLERS } from './operations.js';

const DEFAULT_SEED = 's("bd ~ sn ~")';

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

function applyOperation(code, { type, amount = 0.3 }) {
  const handler = OPERATION_HANDLERS[type];
  if (!handler) return code;
  return handler(code, amount);
}
