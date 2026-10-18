import { SUBGENRES } from '../graph/knowledgeGraph.js';

// S6 form (spec Rev. 2 §2.3). The model fills this; eval/s6/compiler.js turns it into Strudel.
export const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const SCALES = ['minor', 'phrygian', 'dorian'];
export const EFFECTS = ['filter_sweep', 'delay_throw', 'reverb_wash', 'none'];
export const BASS_SOUNDS = ['sawtooth', 'square', 'sine'];
export const STAB_SOUNDS = ['sawtooth', 'square', 'triangle'];
export const LANE_FIELDS = ['bassA', 'bassB', 'hat', 'openhat', 'clap', 'stab'];

const lane = { type: 'string', minLength: 16, maxLength: 16 };

export const FORM_SCHEMA = {
  type: 'object',
  properties: {
    reasoning: { type: 'string' },
    subgenre: { type: 'string', enum: SUBGENRES },
    key: { type: 'string', enum: KEYS },
    scale: { type: 'string', enum: SCALES },
    bassA: lane,
    bassB: lane,
    hat: lane,
    openhat: lane,
    clap: lane,
    stab: lane,
    bassSound: { type: 'string', enum: BASS_SOUNDS },
    bassCutoff: { type: 'integer', minimum: 200, maximum: 1500 },
    bassResonance: { type: 'integer', minimum: 0, maximum: 20 },
    stabSound: { type: 'string', enum: STAB_SOUNDS },
    effect: { type: 'string', enum: EFFECTS },
    effectAmount: { type: 'integer', minimum: 0, maximum: 10 },
  },
};
FORM_SCHEMA.required = Object.keys(FORM_SCHEMA.properties);

export const FORM_EXAMPLE = {
  reasoning: 'Dark rolling techno: a steady offbeat bass that shifts once every four bars, sparse stabs, slow filter movement.',
  subgenre: 'hypnotic', key: 'F', scale: 'minor',
  bassA: '..0...0...0.0.0.', bassB: '..0...0...3.0.0.',
  hat: '..x...x...x...x.', openhat: '..............x.', clap: '....x.......x...',
  stab: '......0.......0.',
  bassSound: 'sawtooth', bassCutoff: 450, bassResonance: 10, stabSound: 'sawtooth',
  effect: 'filter_sweep', effectAmount: 6,
};

export const S6_SYSTEM = `You are a techno producer. The kick is always a straight 4/4 and the tempo follows the subgenre; both are added automatically. You fill in a form for a one-bar loop of 16 sixteenth steps.

Start with "reasoning": 2-4 sentences about subgenre, groove and mood.
Lanes are exactly 16 characters:
- hat, openhat, clap: "x" = hit, "." = silent.
- bassA, bassB, stab: a digit 0-7 = SCALE DEGREE (0 root, 2 third, 4 fifth, 7 octave), "." = rest.
Structure: the bass plays bar A three times, then bar B once (A A A B). B is A with 1-3 small changes, so the groove stays hypnotic but shifts.
The bass avoids the kick: put bass notes between the kicks (kicks are on steps 1, 5, 9, 13).
stab: short chord hits, use only 2-5 steps.
effect: exactly one movement effect; effectAmount 0-10 is its strength.

Example for "dark rolling techno":
${JSON.stringify(FORM_EXAMPLE)}

Do not copy the example. Fit the request. Answer with JSON only.`;
