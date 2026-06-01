// src/library/soundLibrary.js

export const soundLibrary = {
  kick: [
    { id: "kick_sine_44",    name: "Sine Kick 4/4",    tags: ["kick", "pounding", "heavy", "hypnotic", "techno"],      code: `s("bd:0*4").bank("RolandTR909").decay(0.12).gain(0.82)` },
    { id: "kick_square_44",  name: "Square Kick 4/4",  tags: ["kick", "industrial", "harsh", "distort", "aggressive"], code: `s("bd:2*4").bank("RolandTR909").decay(0.08).distort(0.7).gain(0.9)` },
    { id: "kick_acid_44",    name: "Acid Kick 4/4",    tags: ["kick", "acid", "punch", "heavy", "303"],                code: `s("bd:1*4").bank("RolandTR909").decay(0.1).gain(0.85)` },
    { id: "kick_dub_deep",   name: "Deep Dub Kick",    tags: ["kick", "dub", "deep", "sub", "soft", "minimal", "warm"],code: `s("bd:0*4").bank("RolandTR808").decay(0.18).lpf(180).gain(0.88)` },
    { id: "kick_hardgroove", name: "Hardgroove 909",   tags: ["kick", "driving", "hardgroove", "punchy", "rave", "909"],code: `s("bd:3*4").bank("RolandTR909").decay(0.1).gain(0.92)` },
    { id: "kick_schranz",    name: "Schranz Dist Kick",tags: ["kick", "hardcore", "schranz", "distorted", "extreme"],  code: `s("bd:2*4").bank("RolandTR909").decay(0.11).distort(0.95).lpf(850).gain(0.75)` }
  ],
  rumble_bass: [
    { id: "rumble_hypnotic",    name: "Hypnotic Rumble",    tags: ["bass", "drone", "hypnotic", "minimal", "pad", "sidechain"], code: `stack(
  note("c1 ~ c1 ~").s("moog").decay(0.08).sustain(0).gain("0.1 1 1 1"),
  note("[c2,g2,bb2]").s("bass").slow(4).decay(3).sustain(0).gain(0.2)
)` },
    { id: "rumble_acid",        name: "Acid Rumble",        tags: ["bass", "drone", "acid", "303", "filter", "resonant"],      code: `stack(
  note("c1 eb1 g1 ~").s("bass").lpf(800).lpq(8).decay(0.15).sustain(0).gain("0.1 1 1 1"),
  note("[c2,eb2]").s("bass").slow(4).decay(2).sustain(0).gain(0.15)
)` },
    { id: "rumble_industrial",  name: "Industrial Rumble",  tags: ["bass", "drone", "industrial", "harsh", "distort"],         code: `stack(
  note("c1 ~ ~ c1").s("bass").distort(0.4).decay(0.1).sustain(0).gain("0.1 1 1 1"),
  note("c2").s("bass").slow(8).decay(4).sustain(0).gain(0.1)
)` },
    { id: "rumble_dub",         name: "Deep Dub Chug",      tags: ["bass", "drone", "dub", "deep", "sub", "warm", "spacey"],   code: `stack(
  note("c1 ~ ~ c1").s("bass").decay(0.25).sustain(0).gain(0.9),
  note("[f2,c3]").s("moog").lpf(350).lpq(3).slow(6).decay(2.5).gain(0.14)
)` },
    { id: "rumble_hardgroove",  name: "Rolling 16th Bass",  tags: ["bass", "drone", "rolling", "groove", "driving", "16th"],   code: `stack(
  note("~ c1 c1 ~ c1 c1 ~ c1").s("bass").lpf(160).decay(0.07).sustain(0).gain(0.85),
  note("c1").s("bass").lpf(110).slow(4).decay(2).gain(0.2)
)` },
    { id: "rumble_schranz",     name: "Schranz Noise Wall", tags: ["bass", "drone", "schranz", "distort", "heavy", "noisy"],   code: `stack(
  note("c1*4").s("fm").distort(0.6).decay(0.09).lpf(140).gain(0.8),
  note("c1*8").s("white").hp(120).lpf(300).gain(0.15)
)` }
  ],
  groove: [
    { id: "perc_minimal_hats",    name: "Minimal Hi-Hats",      tags: ["hats", "groove", "subtle", "minimal", "hypnotic"],    code: `s("hh*8").bank("RolandTR909").decay(0.03).gain(0.25)` },
    { id: "perc_acid_backbeat",   name: "Acid Backbeat",         tags: ["snare", "acid", "backbeat", "groove"],                code: `s("~ sd ~ sd").bank("RolandTR909").decay(0.05).gain(0.3)` },
    { id: "perc_industrial_fast", name: "Industrial Rapid Hats", tags: ["hats", "industrial", "harsh", "aggressive", "fast"], code: `s("hh*16").bank("RolandTR909").decay(0.02).gain(0.2)` },
    { id: "perc_dub_openhat",     name: "Classic Open Hi-Hat",   tags: ["hats", "groove", "open", "dub", "offbeat", "909"],    code: `s("~ oh").bank("RolandTR808").decay(0.14).gain(0.24)` },
    { id: "perc_hardgroove_ride", name: "Sizzling Rave Ride",    tags: ["hats", "groove", "ride", "cymbal", "hardgroove"],     code: `s("~ hh*4").bank("RolandTR909").decay(0.22).gain(0.15)` },
    { id: "perc_schranz_shaker",  name: "Driving Rapid Shaker",  tags: ["percussion", "groove", "shaker", "schranz", "fast"], code: `s("cp*4").bank("RolandTR909").decay(0.02).gain(0.35).stack(s("~ hh*16").bank("RolandTR909").decay(0.01).gain(0.1))` }
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
    // --- NEW EXPANSIONS ---
    { id: "synthfx_dub",        name: "Dub Echo Chord Stab", tags: ["melody", "fx", "dub", "chord", "stab", "echo", "spacey"],      code: `stack(
  note("[c3,eb3,g3,bb3]*2").s("sawtooth").lpf(650).lpq(4).decay(0.08).sustain(0).slow(2).gain(0.4),
  note("c6").s("white").slow(4).decay(1.8).hp(800).gain(0.1)
)` },
    { id: "synthfx_hardgroove", name: "Peak Time Rave Hook", tags: ["melody", "fx", "rave", "hardgroove", "energetic", "hook"],     code: `stack(
  note("c4 g3 c4 eb4").s("square").decay(0.11).sustain(0).fast(2).gain(0.18),
  note("~ ~ c3 ~").s("triangle").decay(0.05).gain(0.3)
)` },
    { id: "synthfx_schranz",     name: "Talking Glitch Engine",tags: ["melody", "fx", "schranz", "glitch", "vocal", "talking"],     code: `stack(
  note("c3*8").s("square").distort(0.7).decay(0.05).hp(500).lpf(2000).gain(0.2),
  note("~ c2 ~ c2").s("sawtooth").lpq(10).lpf("800 1400").decay(0.08).gain(0.25)
)` }
  ],
};

export const GENRE_PRESETS = {
  techno: {
    kick:        "kick_sine_44",
    rumble_bass: "rumble_hypnotic",
    groove:      "perc_minimal_hats",
    synth_fx:    "synthfx_hypnotic",
  },
  dub_techno: {
    kick:        "kick_dub_deep",
    rumble_bass: "rumble_dub",
    groove:      "perc_dub_openhat",
    synth_fx:    "synthfx_dub",
  },
  hardgroove: {
    kick:        "kick_hardgroove",
    rumble_bass: "rumble_hardgroove",
    groove:      "perc_hardgroove_ride",
    synth_fx:    "synthfx_hardgroove",
  },
  schranz: {
    kick:        "kick_schranz",
    rumble_bass: "rumble_schranz",
    groove:      "perc_schranz_shaker",
    synth_fx:    "synthfx_schranz",
  }
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