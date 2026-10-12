import { parse } from 'acorn';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { isKnownSound, soundLabel } from './knownSounds.js';

export const ERROR_CLASSES = ['empty', 'syntax', 'forbidden', 'unknown_function', 'runtime', 'no_pattern', 'silent', 'unknown_sound'];
export const EXECUTING_CLASSES = [null, 'unknown_sound', 'silent'];

// LLM code is evaluated in Node with full process rights — this AST check is the
// security boundary (the worker below shares process rights; it only isolates
// hangs and memory blowups). Strudel code never needs any of these.
const FORBIDDEN_NAMES = new Set([
  'process', 'globalThis', 'global', 'window', 'document', 'require', 'module',
  'eval', 'Function', 'fetch', 'setTimeout', 'setInterval',
  'constructor', '__proto__', 'prototype',
  'Reflect', 'Object', 'Proxy', 'Symbol', 'arguments', 'Atomics', 'WebAssembly',
  'Buffer', 'queueMicrotask', 'setImmediate',
]);
const LOOP_TYPES = new Set(['WhileStatement', 'DoWhileStatement', 'ForStatement', 'ForInStatement', 'ForOfStatement']);
const MODULE_TYPES = new Set(['ImportExpression', 'ImportDeclaration', 'ExportNamedDeclaration', 'ExportDefaultDeclaration', 'MetaProperty']);

function findForbidden(node) {
  if (LOOP_TYPES.has(node.type)) return `loop statement (${node.type})`;
  if (MODULE_TYPES.has(node.type)) return `module access (${node.type})`;
  if (node.type === 'Identifier' && FORBIDDEN_NAMES.has(node.name)) return `identifier ${node.name}`;
  if (node.type === 'ThisExpression') return 'this';
  if (node.type === 'MemberExpression' && node.computed
      && !(node.property.type === 'Literal' && typeof node.property.value === 'number')) {
    return 'computed member access';
  }
  for (const value of Object.values(node)) {
    for (const child of Array.isArray(value) ? value : [value]) {
      if (child && typeof child === 'object' && typeof child.type === 'string') {
        const hit = findForbidden(child);
        if (hit) return hit;
      }
    }
  }
  return null;
}

export const EVAL_TIMEOUT_MS = 5000;
const PING_TIMEOUT_MS = 500;
const WORKER_URL = new URL('./evalWorker.mjs', import.meta.url);
const REGISTER_URL = new URL('./node-hooks/register.mjs', import.meta.url);

let worker = null;
let nextId = 0;

function getWorker() {
  if (!worker) {
    worker = new Worker(fileURLToPath(WORKER_URL), {
      execArgv: ['--no-warnings', '--import', fileURLToPath(REGISTER_URL)],
      stdout: true, stderr: true, // swallow Strudel's load banner; real failures arrive via 'error'/'exit'
      resourceLimits: { maxOldGenerationSizeMb: 512 },
    });
    worker.stdout.resume(); worker.stderr.resume();
    worker.unref();
  }
  return worker;
}

export async function closeValidityWorker() {
  const w = worker;
  worker = null;
  if (w) await w.terminate();
}

class WorkerFailure extends Error {}

function evaluateInWorker(code) {
  return new Promise((resolve, reject) => {
    const w = getWorker();
    const id = nextId++;
    const done = () => {
      clearTimeout(timer);
      w.off('message', onMessage); w.off('error', onError); w.off('exit', onExit);
    };
    const kill = msg => {
      done();
      if (worker === w) worker = null;
      w.terminate();
      reject(new WorkerFailure(msg));
    };
    let pendingHaps = null;
    let timer = setTimeout(() => kill(`timeout after ${EVAL_TIMEOUT_MS} ms`), EVAL_TIMEOUT_MS);
    const onMessage = m => {
      if (m.pong === id) { done(); return resolve(pendingHaps); }
      if (m.id !== id) return;
      if (m.ok) {
        // Code may have left a runaway microtask loop behind that starves the worker:
        // confirm it is still responsive before trusting (and reusing) it.
        pendingHaps = m.haps;
        clearTimeout(timer);
        timer = setTimeout(() => kill(`timeout after ${EVAL_TIMEOUT_MS} ms (worker unresponsive after evaluation)`), PING_TIMEOUT_MS);
        return w.postMessage({ ping: id });
      }
      done();
      const err = new Error(m.error.message);
      err.name = m.error.name;
      err.code = m.error.code;
      reject(err);
    };
    const onError = e => kill(`worker crashed: ${e?.message ?? e}`);
    const onExit = c => kill(`worker crashed: exit code ${c}`);
    w.on('message', onMessage); w.on('error', onError); w.on('exit', onExit);
    w.postMessage({ id, code });
  });
}

function classifyThrow(err) {
  if (err?.code === 'NO_PATTERN') return 'no_pattern';
  const msg = String(err?.message ?? err);
  if (msg.startsWith('[mini]')) return 'syntax';
  if (err instanceof ReferenceError || /is not a function|is not defined/.test(msg)) return 'unknown_function';
  return 'runtime';
}

const isAudible = v => v && typeof v === 'object' && ('s' in v || 'note' in v || 'n' in v);

function fail(errorClass, detail, extra = {}) {
  return {
    valid: false,
    executes: EXECUTING_CLASSES.includes(errorClass),
    errorClass, detail, haps: [], unknownSounds: [], ...extra,
  };
}

export async function checkValidity(code) {
  if (typeof code !== 'string' || !code.trim()) return fail('empty', 'no code');

  let ast;
  try {
    ast = parse(code, { ecmaVersion: 'latest', sourceType: 'module', allowAwaitOutsideFunction: true });
  } catch (err) {
    return fail('syntax', err.message);
  }
  const forbidden = findForbidden(ast);
  if (forbidden) return fail('forbidden', forbidden);

  let haps;
  try {
    haps = await evaluateInWorker(code);
  } catch (err) {
    if (err instanceof WorkerFailure) return fail('runtime', err.message);
    return fail(classifyThrow(err), String(err?.message ?? err));
  }

  const audible = haps.filter(h => isAudible(h.value));
  if (!audible.length) return fail('silent', 'no audible events in cycle 0..1', { haps });

  const unknownSounds = [...new Set(audible.map(h => h.value).filter(v => !isKnownSound(v)).map(soundLabel))];
  if (unknownSounds.length) return fail('unknown_sound', unknownSounds.join(', '), { haps, unknownSounds });

  return { valid: true, executes: true, errorClass: null, detail: null, haps, unknownSounds: [] };
}
