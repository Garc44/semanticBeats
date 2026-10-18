import { noteToMidi } from '@strudel/core';
import { BUILTIN_SYNTHS } from './knownSounds.js';

// Harmonic coherence (spec Rev. 2 §4): theory-based, track-agnostic, so it applies to
// free code (S0–S2) exactly like to compiled tracks (S3–S6).
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
// Each diatonic pitch-class set covers its major key and all its modes (minor, dorian, phrygian, …).
export const DIATONIC_SETS = Array.from({ length: 12 }, (_, root) => MAJOR.map(s => (s + root) % 12));
const CLASH_INTERVAL_CLASSES = new Set([1, 6]);
const LOW_MIDI = 48;
const SYNTHS = new Set(BUILTIN_SYNTHS);

const num = t => Number(t?.valueOf?.() ?? t);
const pc = midi => ((Math.round(midi) % 12) + 12) % 12;

function midiOf(value) {
  if (typeof value.note === 'number') return value.note;
  if (typeof value.note === 'string') {
    try { return noteToMidi(value.note); } catch { return null; }
  }
  return null;
}

function pitchedEvents(haps) {
  const out = [];
  for (const h of haps ?? []) {
    const v = h?.value;
    if (!v || typeof v !== 'object' || !h.whole) continue;
    if (v.s !== undefined && !SYNTHS.has(String(v.s).split(':')[0])) continue;
    const midi = midiOf(v);
    if (midi === null || !Number.isFinite(midi)) continue;
    out.push({ midi, begin: num(h.whole.begin), end: num(h.whole.end) });
  }
  return out;
}

export function harmonyMetrics(haps) {
  const events = pitchedEvents(haps);
  const pitched = events.length;

  let inKey = NaN;
  if (pitched >= 2) {
    inKey = Math.max(...DIATONIC_SETS.map(set => {
      const s = new Set(set);
      return events.filter(e => s.has(pc(e.midi))).length / pitched;
    }));
  }

  let pairs = 0, clashes = 0, crowded = 0;
  for (let i = 0; i < pitched; i++) {
    for (let j = i + 1; j < pitched; j++) {
      const a = events[i], b = events[j];
      if (!(a.begin < b.end && b.begin < a.end)) continue;
      pairs++;
      const dist = Math.abs(Math.round(a.midi) - Math.round(b.midi));
      const ic = Math.min(dist % 12, 12 - (dist % 12));
      if (CLASH_INTERVAL_CLASSES.has(ic)) clashes++;
      if (Math.min(a.midi, b.midi) < LOW_MIDI && dist < 12) crowded++;
    }
  }

  return {
    pitched,
    inKey,
    clashRate: pairs ? clashes / pairs : NaN,
    lowCrowding: pairs ? crowded / pairs : NaN,
  };
}
