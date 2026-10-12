import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(new URL('./data/knownSounds.json', import.meta.url), 'utf8'));
const BANKED = new Set(data.banked);
const PLAIN = new Set(data.plain);

// superdough built-ins (no sample needed).
export const BUILTIN_SYNTHS = [
  'sine', 'square', 'triangle', 'sawtooth', 'saw', 'supersaw', 'pulse',
  'white', 'pink', 'brown', 'crackle',
];
const SYNTHS = new Set(BUILTIN_SYNTHS);

const baseName = s => String(s).split(':')[0];

// Can the app's sample setup resolve this hap value to a sound?
export function isKnownSound(value) {
  if (value?.s === undefined || value?.s === null) return true; // note() without s → default synth
  const name = baseName(value.s);
  if (SYNTHS.has(name)) return true;
  if (value.bank) return BANKED.has(`${value.bank}_${name}`);
  return PLAIN.has(name);
}

export function soundLabel(value) {
  return value?.bank ? `${value.bank}_${baseName(value.s)}` : baseName(value?.s);
}
