const STUB = new URL('./kabelsalat-stub.mjs', import.meta.url).href;

export async function resolve(specifier, context, next) {
  if (specifier === '@kabelsalat/web') return { url: STUB, shortCircuit: true };
  return next(specifier, context);
}
