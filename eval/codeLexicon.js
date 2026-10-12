import { noteToMidi } from '@strudel/core';
import { canonicalTags } from './vocabulary.js';
import { isKnownSound, BUILTIN_SYNTHS } from './knownSounds.js';

// Deterministic code → tag lexicon (thesis: methodological contribution).
// Thresholds are fixed constants — change them only before the corpus is frozen.
const KICK = new Set(['bd', 'kick', 'clubkick']);
const HATS = new Set(['hh', 'oh', 'hat', 'hihat', 'rd', 'ride', 'cr', 'crash']);
const CLAP = new Set(['cp', 'clap']);
const PERC = new Set(['rim', 'rs', 'sd', 'snare', 'lt', 'mt', 'ht', 'tom', 'click', 'perc', 'cb', 'shaker']);
const SYNTHS = new Set(BUILTIN_SYNTHS);
const ACID_SOURCES = new Set(['saw', 'sawtooth', 'square']);
const FOUR_ON_FLOOR = [0, 0.25, 0.5, 0.75];

const DENSE_MIN_EVENTS = 24;
const SPARSE_MAX_EVENTS = 6;
const DARK_CUTOFF_HZ = 800;

const baseName = s => (s === undefined || s === null ? undefined : String(s).split(':')[0]);

function midiOf(value) {
  if (typeof value.note === 'number') return value.note;
  if (typeof value.note === 'string') {
    try { return noteToMidi(value.note); } catch { return null; }
  }
  return null;
}

// Works with real Hap objects and with serialized haps ({ value, whole: { begin, end } }).
export function tagsFromCode(code, haps = []) {
  const tags = new Set();
  const pitchedOnsets = new Map();
  const kickOnsets = new Set();
  let knownEvents = 0;

  for (const hap of haps) {
    const v = hap.value;
    if (!v || typeof v !== 'object') continue;
    if (!isKnownSound(v)) continue;
    const sound = baseName(v.s);
    const onset = hap.whole ? hap.whole.begin.valueOf() : null;
    knownEvents++;

    if (sound && KICK.has(sound)) { tags.add('kick'); if (onset !== null) kickOnsets.add(onset); }
    if (sound && HATS.has(sound)) tags.add('hats');
    if (sound && CLAP.has(sound)) tags.add('clap');
    if (sound && PERC.has(sound)) tags.add('percussion');

    const midi = midiOf(v);
    if (midi !== null && (sound === undefined || SYNTHS.has(sound))) {
      if (midi < 48) tags.add('bass');
      if (midi < 36) tags.add('sub');
      if (midi >= 48) {
        tags.add('lead');
        if (onset !== null) pitchedOnsets.set(onset, (pitchedOnsets.get(onset) ?? 0) + 1);
      }
    }

    if (typeof v.cutoff === 'number' && v.cutoff < DARK_CUTOFF_HZ) tags.add('dark');
    if ((v.room ?? 0) >= 0.4 || (v.delay ?? 0) >= 0.4) tags.add('spacious');
    const crushed = typeof v.crush === 'number' && v.crush <= 8;
    if ((v.shape ?? 0) >= 0.3 || (v.distort ?? 0) >= 0.2 || crushed || (v.coarse ?? 0) >= 4) tags.add('gritty');
    if (crushed) tags.add('lofi');
    if ((v.resonance ?? 0) >= 10 && ACID_SOURCES.has(sound)) tags.add('acid');
  }

  if ([...pitchedOnsets.values()].some(n => n >= 3)) tags.add('chords');
  if (FOUR_ON_FLOOR.every(t => kickOnsets.has(t))) tags.add('techno');
  if (knownEvents >= DENSE_MIN_EVENTS) tags.add('dense');
  if (knownEvents > 0 && knownEvents <= SPARSE_MAX_EVENTS) tags.add('sparse');

  const src = String(code ?? '');
  if (/\.degradeBy\(|\.sometimes|\.rarely|[\w~\]]\?/.test(src)) tags.add('glitchy');
  if (/scale\(\s*["'][^"']*:(minor|phrygian|locrian|aeolian)/i.test(src)) tags.add('dark');

  return canonicalTags([...tags]);
}
