// Per-pillar emotion recipes. Each recipe is a curated, fixed combination of effects
// at tuned values. Clicking an emotion chip REPLACES the pillar's transforms with this
// recipe (see applyEmotionRecipe). All effect ids are constrained to the pillar's
// PILLAR_TRANSFORMS; all numeric values fall within the effect's TRANSFORMS min/max.
// Note: crush is inverted (lower = stronger), still within 1–16.

export const EMOTION_RECIPES = {
  drums: [
    { id: 'dark',       label: 'Dark',       description: 'heavy, ominous, underwater',  transforms: { lopass: 600, shape: 0.3 } },
    { id: 'gritty',     label: 'Gritty',     description: 'dirty, aggressive overdrive', transforms: { distort: 0.5, crush: 6, shape: 0.4 } },
    { id: 'industrial', label: 'Industrial', description: 'brutal, metallic machine',    transforms: { distort: 0.8, crush: 4, shape: 0.6 } },
    { id: 'dreamy',     label: 'Dreamy',     description: 'soft, floating, ambient',     transforms: { reverb: 0.5, lopass: 1200 } },
    { id: 'vintage',    label: 'Vintage',    description: 'dusty, lo-fi, old tape',      transforms: { crush: 8, hipass: 800 } },
  ],
  bass: [
    { id: 'dark',       label: 'Dark',       description: 'heavy, ominous, underwater',  transforms: { lopass: 500, slow_down: 2, shape: 0.3 } },
    { id: 'gritty',     label: 'Gritty',     description: 'dirty, aggressive overdrive', transforms: { distort: 0.5, crush: 6, shape: 0.4 } },
    { id: 'industrial', label: 'Industrial', description: 'brutal, metallic machine',    transforms: { distort: 0.8, robot_glitch: 8, shape: 0.6 } },
    { id: 'liquid',     label: 'Liquid',     description: 'squelchy, modular, acid',     transforms: { lopass: 800, lopass_q: 15 } },
    { id: 'bouncy',     label: 'Bouncy',     description: 'syncopated, playful groove',  transforms: { press: true, palindrome: true } },
    { id: 'broken',     label: 'Broken',     description: 'glitchy, fragmented',         transforms: { robot_glitch: 12, reverse: true } },
  ],
  percussion: [
    { id: 'frantic',    label: 'Frantic',    description: 'fast, busy, panicked',        transforms: { degrade: 0.3, ply: 3, iter: 4 } },
    { id: 'broken',     label: 'Broken',     description: 'glitchy, fragmented',         transforms: { degrade: 0.5, robot_glitch: 12, reverse: true } },
    { id: 'hypnotic',   label: 'Hypnotic',   description: 'trancey, looping, evolving',  transforms: { iter: 4, ply: 2 } },
    { id: 'gritty',     label: 'Gritty',     description: 'dirty, aggressive overdrive', transforms: { distort: 0.5, crush: 6 } },
    { id: 'spacey',     label: 'Spacey',     description: 'wide, distant, cosmic',       transforms: { reverb: 0.7, jux_rev: true } },
  ],
  melody: [
    { id: 'dreamy',     label: 'Dreamy',     description: 'soft, floating, ambient',     transforms: { reverb: 0.6, echo: 0.4, lopass: 2000 } },
    { id: 'spacey',     label: 'Spacey',     description: 'wide, distant, cosmic hall',  transforms: { reverb: 0.8, room_size: 7, jux_rev: true, echo: 0.4 } },
    { id: 'hypnotic',   label: 'Hypnotic',   description: 'trancey, looping, evolving',  transforms: { psy_swirl: 2, echo: 0.4, slow_down: 2 } },
    { id: 'liquid',     label: 'Liquid',     description: 'squelchy, modular, acid',     transforms: { lopass: 800, lopass_q: 18, psy_swirl: 1.5 } },
    { id: 'airy',       label: 'Airy',       description: 'weightless, thin, bright',    transforms: { hipass: 3000, dj_filter: 0.8, reverb: 0.3 } },
    { id: 'frantic',    label: 'Frantic',    description: 'fast, busy, panicked',        transforms: { speed_up: 2, degrade: 0.3 } },
  ],
  transitions: [
    { id: 'dreamy',     label: 'Dreamy',     description: 'soft, floating, ambient',     transforms: { reverb: 0.6, echo: 0.4, lopass: 2000 } },
    { id: 'spacey',     label: 'Spacey',     description: 'wide, distant, cosmic hall',  transforms: { reverb: 0.8, room_size: 7, echo: 0.4 } },
    { id: 'airy',       label: 'Airy',       description: 'weightless, thin, bright',    transforms: { hipass: 3000, dj_filter: 0.8, reverb: 0.3 } },
    { id: 'hypnotic',   label: 'Hypnotic',   description: 'trancey, looping, evolving',  transforms: { iter: 4, echo: 0.4 } },
    { id: 'frantic',    label: 'Frantic',    description: 'fast, busy, panicked',        transforms: { speed_up: 2, iter: 4 } },
  ],
};

export function getEmotionsForPillar(name) {
  return EMOTION_RECIPES[name] ?? [];
}
