import { noteToMidi } from '@strudel/core';
import { canonicalTags } from './vocabulary.js';
import { isKnownSound, BUILTIN_SYNTHS } from './knownSounds.js';

// Deterministic code → tag lexicon (thesis: methodological contribution; spec Rev. 2 §4.2).
// Thresholds are fixed constants — change them only before the corpus is frozen.
const KICK = new Set(['bd', 'kick', 'clubkick']);
const HATS = new Set(['hh', 'oh', 'hat', 'hihat', 'rd', 'ride', 'cr', 'crash']);
const CLAP = new Set(['cp', 'clap']);
const PERC = new Set(['rim', 'rs', 'sd', 'snare', 'lt', 'mt', 'ht', 'tom', 'click', 'perc', 'cb', 'shaker']);
const SYNTHS = new Set(BUILTIN_SYNTHS);
const ACID_SOURCES = new Set(['saw', 'sawtooth', 'square']);
const QUARTERS = [0, 0.25, 0.5, 0.75];
const OFFBEATS = [0.125, 0.375, 0.625, 0.875];

const DENSE_MIN_EVENTS_PER_BAR = 24;
const SPARSE_MAX_EVENTS_PER_BAR = 6;
const DARK_CUTOFF_HZ = 800;
const WARM_CUTOFF_HZ = 1200;
const BASS_MAX_MIDI = 48;
const DEFAULT_BPM = 120;            // Strudel default: 0.5 cycles/s, one cycle = one 4/4 bar
const HYPNOTIC_MIN_REPEATS = 3;

const baseName = s => (s === undefined || s === null ? undefined : String(s).split(':')[0]);
const num = t => Number(t?.valueOf?.() ?? t);
const step = x => Math.round(x * 16) / 16;                 // snap to the 16th grid (float noise)
const posInBar = x => step(((x % 1) + 1) % 1);

function midiOf(value) {
  if (typeof value.note === 'number') return value.note;
  if (typeof value.note === 'string') {
    try { return noteToMidi(value.note); } catch { return null; }
  }
  return null;
}

// BPM from setcpm(x) (cycles per minute, 1 cycle = 4 beats) or setcps(x).
// Accepts a number or "a/b" / "a*b"; anything else → default.
export function parseBpm(code) {
  const m = String(code ?? '').match(/set(cpm|cps)\(\s*([^)]*)\)/i);
  if (!m) return DEFAULT_BPM;
  const arith = m[2].trim().match(/^(\d*\.?\d+)\s*(?:([*/])\s*(\d*\.?\d+))?$/);
  if (!arith) return DEFAULT_BPM;
  let value = Number(arith[1]);
  if (arith[2] === '/') value /= Number(arith[3]);
  if (arith[2] === '*') value *= Number(arith[3]);
  const bpm = m[1].toLowerCase() === 'cpm' ? value * 4 : value * 240;
  return Number.isFinite(bpm) && bpm >= 40 && bpm <= 300 ? Math.round(bpm) : DEFAULT_BPM;
}

// Works with real Hap objects and with serialized haps ({ value, whole: { begin, end } }).
export function tagsFromCode(code, haps = [], { cycles = 1 } = {}) {
  const tags = new Set();
  const chordOnsets = new Map();          // onset → { count, warm }
  const kickPositions = new Set();
  const hatPositions = new Set();
  const bassBars = new Map();             // bar index → ["pos:midi", …]
  let knownEvents = 0;

  for (const hap of haps) {
    const v = hap.value;
    if (!v || typeof v !== 'object') continue;
    if (!isKnownSound(v)) continue;
    const sound = baseName(v.s);
    const onset = hap.whole ? num(hap.whole.begin) : null;
    knownEvents++;

    if (sound && KICK.has(sound)) { tags.add('kick'); if (onset !== null) kickPositions.add(posInBar(onset)); }
    if (sound && HATS.has(sound)) { tags.add('hats'); if (onset !== null) hatPositions.add(posInBar(onset)); }
    if (sound && CLAP.has(sound)) tags.add('clap');
    if (sound && PERC.has(sound)) tags.add('percussion');

    const midi = midiOf(v);
    if (midi !== null && (sound === undefined || SYNTHS.has(sound))) {
      if (midi < BASS_MAX_MIDI) {
        tags.add('bass');
        if (onset !== null) {
          const bar = Math.floor(onset + 1e-9);
          bassBars.set(bar, [...(bassBars.get(bar) ?? []), `${posInBar(onset)}:${Math.round(midi)}`]);
        }
      }
      if (midi < 36) tags.add('sub');
      if (midi >= BASS_MAX_MIDI) {
        tags.add('lead');
        if (onset !== null) {
          const key = step(onset);
          const entry = chordOnsets.get(key) ?? { count: 0, warm: false };
          entry.count++;
          if (typeof v.cutoff === 'number' && v.cutoff >= WARM_CUTOFF_HZ) entry.warm = true;
          chordOnsets.set(key, entry);
        }
      }
    }

    if (typeof v.cutoff === 'number' && v.cutoff < DARK_CUTOFF_HZ) tags.add('dark');
    if ((v.room ?? 0) >= 0.4 || (v.delay ?? 0) >= 0.4) tags.add('spacious');
    const crushed = typeof v.crush === 'number' && v.crush <= 8;
    if ((v.shape ?? 0) >= 0.3 || (v.distort ?? 0) >= 0.2 || crushed || (v.coarse ?? 0) >= 4) tags.add('gritty');
    if ((v.resonance ?? 0) >= 10 && ACID_SOURCES.has(sound)) tags.add('acid');
  }

  const bars = Math.max(1, cycles);
  const perBar = knownEvents / bars;
  if (perBar >= DENSE_MIN_EVENTS_PER_BAR) tags.add('dense');
  if (knownEvents > 0 && perBar <= SPARSE_MAX_EVENTS_PER_BAR) tags.add('sparse');

  const chordEntries = [...chordOnsets.values()].filter(e => e.count >= 3);
  const chords = chordEntries.length > 0;
  if (chords) tags.add('chords');
  if (chordEntries.some(e => e.warm)) tags.add('warm');

  const src = String(code ?? '');
  if (/\.degradeBy\(|\.sometimes|\.rarely|[\w~\]]\?/.test(src)) tags.add('glitchy');
  if (/scale\(\s*["'][^"']*:(minor|phrygian|locrian|aeolian)/i.test(src)) tags.add('dark');

  const fourOnFloor = QUARTERS.every(p => kickPositions.has(p));
  if (fourOnFloor && OFFBEATS.every(p => hatPositions.has(p))) tags.add('driving');

  const bpm = parseBpm(src);
  if (chords && tags.has('spacious')) tags.add('dub');
  if (tags.has('gritty') && bpm >= 135) tags.add('industrial');
  if (bpm >= 130 && bpm <= 134 && tags.has('dense')) tags.add('peak-time');
  if (tags.has('sparse') && !chords) tags.add('minimal');
  if (chords && tags.has('warm') && bpm >= 125 && bpm <= 132) tags.add('detroit');

  if (cycles >= 4) {
    const signatures = new Map();
    for (const events of bassBars.values()) {
      const sig = [...events].sort().join('|');
      signatures.set(sig, (signatures.get(sig) ?? 0) + 1);
    }
    if ([...signatures.values()].some(n => n >= HYPNOTIC_MIN_REPEATS)) tags.add('hypnotic');
  }

  return canonicalTags([...tags]);
}
