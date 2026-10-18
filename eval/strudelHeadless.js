// Headless Strudel: evaluate code and query one cycle — no WebAudio, no DOM.
// Emulates the few REPL-level features @strudel/web adds on top of @strudel/core,
// so code that plays in the app is not misclassified as broken here.

const REPL_NOOP_FUNCTIONS = ['setcps', 'setcpm', 'setCps', 'setCpm', 'hush', 'samples'];
const VIZ_METHODS = [
  'pianoroll', 'punchcard', 'scope', 'spectrum', 'spiral', 'draw', 'analyze', 'fft',
  '_pianoroll', '_punchcard', '_scope', '_spectrum', '_spiral',
];

let ready = null;
let labelled = [];

export function loadStrudel() {
  if (!ready) {
    ready = (async () => {
      const core = await import('@strudel/core');
      const mini = await import('@strudel/mini');
      const tonal = await import('@strudel/tonal');
      const { transpiler } = await import('@strudel/transpiler');
      await core.evalScope(core, mini, tonal);
      // evalScope exposes string-eval helpers globally; generated code must not reach them.
      for (const name of ['evaluate', 'evalScope', 'strudelScope']) delete globalThis[name];

      for (const name of REPL_NOOP_FUNCTIONS) globalThis[name] = async () => {};
      for (const name of VIZ_METHODS) {
        if (typeof core.Pattern.prototype[name] !== 'function') {
          core.Pattern.prototype[name] = function () { return this; };
        }
      }
      // `$: pat` transpiles to pat.p('$'); muted labels start with '_'.
      core.Pattern.prototype.p = function (id) {
        if (!String(id).startsWith('_')) labelled.push(this);
        return this;
      };
      return { core, transpiler };
    })();
  }
  return ready;
}

// Throws whatever Strudel throws. Returns the evaluated pattern (labelled `$:` blocks stacked).
export async function evaluatePattern(code) {
  const { core, transpiler } = await loadStrudel();
  labelled = [];
  const { pattern } = await core.evaluate(code, transpiler);
  const result = labelled.length ? core.stack(...labelled) : pattern;
  if (!result || typeof result.queryArc !== 'function') {
    const err = new Error('Expression did not evaluate to a pattern');
    err.code = 'NO_PATTERN';
    throw err;
  }
  return result;
}

// Haps of bars [0, cycles).
export async function queryCycles(code, cycles = 1) {
  return (await evaluatePattern(code)).queryArc(0, cycles);
}

// Haps of bar 0 — the validity window.
export async function queryCycle(code) {
  return queryCycles(code, 1);
}
