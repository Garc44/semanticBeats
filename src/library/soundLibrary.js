export const soundLibrary = {
  kick: [
    { id: "kick_sine_44",    name: "Sine Kick 4/4",    tags: ["kick", "pounding", "heavy", "hypnotic", "techno"],      code: `note("c1*4").s("sine").penv("4 0").decay(0.12).sustain(0).gain(0.82)` },
    { id: "kick_square_44",  name: "Square Kick 4/4",  tags: ["kick", "industrial", "harsh", "distort", "aggressive"], code: `note("c1*4").s("square").decay(0.08).sustain(0).distort(0.7).gain(0.9)` },
    { id: "kick_acid_44",    name: "Acid Kick 4/4",    tags: ["kick", "acid", "punch", "heavy", "303"],                code: `note("c1*4").s("sine").penv("5 0").decay(0.1).sustain(0).gain(0.85)` },
  ],
  rumble_bass: [
    { id: "rumble_hypnotic",    name: "Hypnotic Rumble",    tags: ["bass", "drone", "hypnotic", "minimal", "pad", "sidechain"], code: `stack(
  note("c1 ~ c1 ~").s("sawtooth").decay(0.08).sustain(0).gain("0.1 1 1 1"),
  note("[c2,g2,bb2]").s("sine").slow(4).decay(3).sustain(0).gain(0.2)
)` },
    { id: "rumble_acid",        name: "Acid Rumble",        tags: ["bass", "drone", "acid", "303", "filter", "resonant"],      code: `stack(
  note("c1 eb1 g1 ~").s("sawtooth").lpf(800).lpq(8).decay(0.15).sustain(0).gain("0.1 1 1 1"),
  note("[c2,eb2]").s("sine").slow(4).decay(2).sustain(0).gain(0.15)
)` },
    { id: "rumble_industrial",  name: "Industrial Rumble",  tags: ["bass", "drone", "industrial", "harsh", "distort"],         code: `stack(
  note("c1 ~ ~ c1").s("sawtooth").distort(0.4).decay(0.1).sustain(0).gain("0.1 1 1 1"),
  note("c2").s("sine").slow(8).decay(4).sustain(0).gain(0.1)
)` },
  ],
  groove: [
    { id: "perc_minimal_hats",    name: "Minimal Hi-Hats",      tags: ["hats", "groove", "subtle", "minimal", "hypnotic"],    code: `note("c6*8").s("white").decay(0.03).sustain(0).hp(450).hpq(0.3).gain(0.25)` },
    { id: "perc_acid_backbeat",   name: "Acid Backbeat",         tags: ["snare", "acid", "backbeat", "groove"],                code: `note("~ c6 ~ c6").s("white").decay(0.05).sustain(0).hp(450).hpq(0.3).gain(0.3)` },
    { id: "perc_industrial_fast", name: "Industrial Rapid Hats", tags: ["hats", "industrial", "harsh", "aggressive", "fast"], code: `note("c6*16").s("white").decay(0.02).sustain(0).hp(450).hpq(0.3).gain(0.2)` },
  ],
  synth_fx: [
    { id: "synthfx_hypnotic",   name: "Hypnotic Synth FX",   tags: ["melody", "fx", "hypnotic", "minor", "accent", "subtle"],       code: `stack(
  note("c3 eb3 g3 bb3").s("triangle").decay(0.3).sustain(0).slow(2).hp(450).hpq(0.3).gain(0.3),
  note("~ ~ ~ c1").s("square").decay(0.08).sustain(0).distort(0.7).gain(0.35)
)` },
    { id: "synthfx_acid",       name: "Acid Synth FX",       tags: ["melody", "fx", "acid", "303", "filter", "squelch", "burst"],   code: `stack(
  note("c3 ~ eb3 ~ g3 ~ bb3 ~").s("sawtooth").lpf(1200).lpq(4).decay(0.2).sustain(0).hp(450).hpq(0.3).gain(0.35),
  note("c2*2").s("square").decay(0.08).sustain(0).distort(0.7).gain(0.3)
)` },
    { id: "synthfx_industrial", name: "Industrial Synth FX", tags: ["melody", "fx", "industrial", "harsh", "distort", "slam"],      code: `stack(
  note("c3 c3 eb3 c3").s("square").distort(0.5).decay(0.15).sustain(0).hp(450).hpq(0.3).gain(0.25),
  note("~ ~ ~ c1").s("square").decay(0.08).sustain(0).distort(0.9).gain(0.4)
)` },
  ],
};

export const GENRE_PRESETS = {
  techno: {
    kick:        "kick_sine_44",
    rumble_bass: "rumble_hypnotic",
    groove:      "perc_minimal_hats",
    synth_fx:    "synthfx_hypnotic",
  },
};

export const GENRE_NAMES = Object.keys(GENRE_PRESETS);

export function getPatternById(pillarName, id) {
  return soundLibrary[pillarName]?.find(p => p.id === id) ?? null;
}

export function getGenreCode(genreName) {
  const preset = GENRE_PRESETS[genreName];
  if (!preset) return null;
  return Object.fromEntries(
    Object.entries(preset).map(([pillar, id]) => [pillar, getPatternById(pillar, id)?.code ?? ''])
  );
}
