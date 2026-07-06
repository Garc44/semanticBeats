// src/library/strudelDocs.js
// Single source of truth for what the generative pipeline may emit.
// Feeds: (a) LayerSpec JSON schema ranges, (b) prompt method-card injection,
// (c) AST argument-range validation, (d) the IR compiler's effect ordering.

export const METHOD_CARDS = {
  // — envelope —
  decay:     { sig: '(seconds)', type: 'numeric', min: 0.03, max: 0.4, note: 'shorter = punchier; keep under 0.2 for minimal styles', ex: '.decay(0.08)' },
  sustain:   { sig: '(level)',   type: 'numeric', min: 0,    max: 0.3, note: 'sustain level after decay', ex: '.sustain(0.05)' },
  attack:    { sig: '(seconds)', type: 'numeric', min: 0,    max: 0.1, note: 'soften the hit onset', ex: '.attack(0.02)' },
  // — timbre —
  crush:     { sig: '(bits)',    type: 'numeric', min: 2,    max: 16,  note: 'bit crush, INVERTED: lower = heavier lo-fi', ex: '.crush(6)' },
  coarse:    { sig: '(factor)',  type: 'numeric', min: 1,    max: 32,  note: 'sample-rate crush — robotic/8-bit', ex: '.coarse(8)' },
  shape:     { sig: '(amount)',  type: 'numeric', min: 0,    max: 0.7, note: 'warm saturation; 0.2 subtle, 0.6 thick', ex: '.shape(0.3)' },
  distort:   { sig: '(amount)',  type: 'numeric', min: 0,    max: 0.8, note: 'hard clipping — harsh/aggressive', ex: '.distort(0.4)' },
  vowel:     { sig: '("a".."u")',type: 'enum', values: ['a', 'e', 'i', 'o', 'u'], note: 'formant filter — vocal character', ex: '.vowel("a")' },
  // — filter —
  lpf:       { sig: '(hz)',      type: 'numeric', min: 100,  max: 5000, note: '200–800 dark, >1200 bright — stay dark', ex: '.lpf(600)' },
  lpq:       { sig: '(q)',       type: 'numeric', min: 0,    max: 30,   note: 'resonance; use WITH lpf; ~5 mild, ~20 acid scream', ex: '.lpq(8)' },
  hpf:       { sig: '(hz)',      type: 'numeric', min: 100,  max: 8000, note: 'thin/airy; hats live above 2000', ex: '.hpf(3000)' },
  // — rhythm/structure —
  degradeBy: { sig: '(prob)',    type: 'numeric', min: 0,    max: 0.7, note: 'random dropout — glitch feel', ex: '.degradeBy(0.3)' },
  ply:       { sig: '(n)',       type: 'numeric', min: 2,    max: 4,   note: 'repeat each hit — rolls/stutters', ex: '.ply(2)' },
  iter:      { sig: '(n)',       type: 'numeric', min: 2,    max: 8,   note: 'rotate pattern start each cycle — evolving', ex: '.iter(4)' },
  // — space/stereo —
  pan:       { sig: '(0..1)',    type: 'numeric', min: 0,    max: 1,   note: '0 left, 1 right', ex: '.pan(0.3)' },
  room:      { sig: '(wet)',     type: 'numeric', min: 0,    max: 1,   note: 'reverb send; 0.3–0.7 for depth', ex: '.room(0.5)' },
  size:      { sig: '(size)',    type: 'numeric', min: 0.1,  max: 10,  note: 'reverb decay length; use WITH room', ex: '.size(0.8)' },
  delay:     { sig: '(wet)',     type: 'numeric', min: 0,    max: 0.9, note: 'delay send', ex: '.delay(0.5)' },
  delaytime: { sig: '(seconds)', type: 'numeric', min: 0.05, max: 1,   note: '0.375 = dotted 8th at 120bpm', ex: '.delaytime(0.375)' },
};

export const PILLAR_METHODS = {
  drums:       ['shape', 'crush', 'distort', 'room', 'size', 'lpf', 'hpf'],
  bass:        ['lpf', 'lpq', 'decay', 'sustain', 'shape', 'distort', 'crush', 'room', 'delay'],
  percussion:  ['crush', 'distort', 'room', 'degradeBy', 'iter', 'ply', 'lpf', 'hpf', 'pan'],
  melody:      ['lpf', 'lpq', 'hpf', 'room', 'size', 'delay', 'delaytime', 'vowel', 'shape', 'degradeBy', 'decay', 'sustain', 'attack', 'pan'],
  transitions: ['lpf', 'hpf', 'room', 'size', 'delay', 'delaytime', 'decay', 'pan', 'iter'],
};
PILLAR_METHODS.bass_percussion = PILLAR_METHODS.bass; // legacy alias

export const PILLAR_KINDS = {
  drums: ['sample'], percussion: ['sample'],
  bass: ['note'], melody: ['note'], transitions: ['note'],
};
PILLAR_KINDS.bass_percussion = PILLAR_KINDS.bass;

// Minimum non-rest events per cycle so generated layers can't be silent.
export const MIN_EVENTS = { drums: 2, bass: 2, percussion: 2, melody: 2, transitions: 1 };
MIN_EVENTS.bass_percussion = MIN_EVENTS.bass;

export const SAMPLE_NAMES = ['bd', 'sd', 'cp', 'hh', 'oh', 'rim', 'click', 'ride', 'lt', 'mt', 'ht', 'clubkick'];
export const BANKS = ['RolandTR909', 'RolandTR808'];
export const SYNTHS = ['sine', 'square', 'triangle', 'saw', 'sawtooth'];
