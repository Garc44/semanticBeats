export const soundLibrary = {
  drums: [
    { id: "kick_sine_44",       name: "Sine Kick 4/4",           tags: ["kick", "pounding", "heavy", "hypnotic"],     code: `s("bd:0*4").bank("RolandTR909")` },
    { id: "kick_square_44",     name: "Square Kick 4/4",         tags: ["kick", "industrial", "harsh", "aggressive"], code: `s("bd:2*4").bank("RolandTR909")` },
    { id: "kick_acid_44",       name: "Acid Kick 4/4",           tags: ["kick", "acid", "punch", "303"],              code: `s("bd:1*4").bank("RolandTR909")` },
    { id: "kick_dub_deep",      name: "Deep Dub Kick",           tags: ["kick", "dub", "deep", "sub", "minimal"],     code: `s("bd:0*4").bank("RolandTR808").lpf(180)` },
    { id: "kick_hardgroove",    name: "Hardgroove 909",          tags: ["kick", "driving", "hardgroove", "rave"],     code: `s("bd:3*4").bank("RolandTR909")` },
    { id: "kick_schranz",       name: "Schranz Dist Kick",       tags: ["kick", "hardcore", "schranz", "extreme"],    code: `s("bd:2*4").bank("RolandTR909").lpf(850)` },
    { id: "perc_acid_backbeat", name: "Acid Backbeat Claps",     tags: ["snare", "claps", "backbeat"],                code: `s("~ sd ~ sd").bank("RolandTR909")` },
    { id: "kick_lofi_crush",    name: "Bitcrushed Lo-Fi Kick",   tags: ["kick", "industrial", "lofi", "crush"],       code: `s("bd:1*4").bank("RolandTR909").crush(4).gain(0.9)` },
    { id: "kick_dub_space",     name: "Space Dub Kick",          tags: ["kick", "dub-techno", "echo", "deep"],        code: `s("bd:0*4").bank("RolandTR909").lpf(300).delay(0.3).delaytime(0.33)` },
  ],
  bass: [
    { id: "rumble_hypnotic",   name: "Hypnotic Rumble",      tags: ["bass", "drone", "hypnotic", "minimal"],  code: `stack(note("c1 ~ c1 ~").s("moog").sustain(0).gain("0.1 1 1 1"), )` },
    { id: "rumble_acid",       name: "Acid Rumble Line",     tags: ["bass", "drone", "acid", "303"],          code: `stack(note("c1 eb1 g1 ~").s("bass").lpq(8).sustain(0).gain("0.1 1 1 1"), note("[c2,eb2]").s("bass").slow(4).sustain(0).gain(0.15))` },
    { id: "rumble_industrial", name: "Industrial Rumble",    tags: ["bass", "drone", "industrial", "harsh"],  code: `stack(note("c1 ~ ~ c1").s("bass").sustain(0).gain("0.1 1 1 1"), note("c2").s("bass").slow(8).sustain(0).gain(0.1))` },
    { id: "rumble_dub",        name: "Deep Dub Chug",        tags: ["bass", "drone", "dub", "deep", "sub"],   code: `stack(note("c1 ~ ~ c1").s("bass").sustain(0).gain(0.9), note("[f2,c3]").s("moog").lpf(350).lpq(3).slow(6).gain(0.14))` },
    { id: "rumble_hardgroove", name: "Rolling 16th Bass",    tags: ["bass", "rolling", "groove", "driving"],  code: `stack(note("~ c1 c1 ~ c1 c1 ~ c1").s("bass").lpf(160).sustain(0).gain(0.85), note("c1").s("bass").lpf(110).slow(4).gain(0.2))` },
    { id: "rumble_schranz",    name: "Schranz Noise Bass",   tags: ["bass", "drone", "schranz", "heavy"],     code: `stack(note("c1*4").s("fm").lpf(140).gain(0.8), note("c1*8").s("white").hp(120).lpf(300).gain(0.15))` },
  ],
  percussion: [
    { id: "perc_minimal_hats",    name: "Minimal Hi-Hats",       tags: ["hats", "percussion", "subtle"],         code: `s("hh*8").bank("RolandTR909")` },
    { id: "perc_industrial_fast", name: "Rapid Industrial Hats", tags: ["hats", "percussion", "fast"],           code: `s("hh*16").bank("RolandTR909")` },
    { id: "perc_dub_openhat",     name: "Classic Open Hi-Hat",   tags: ["hats", "open", "offbeat"],              code: `s("~ oh").bank("RolandTR808")` },
    { id: "perc_hardgroove_ride", name: "Sizzling Rave Ride",    tags: ["percussion", "ride", "groove"],         code: `s("~ hh*4").bank("RolandTR909")` },
    { id: "perc_schranz_shaker",  name: "Rapid Shaker Engine",   tags: ["percussion", "shaker", "fast"],         code: `stack(s("cp*4").bank("RolandTR909").gain(0.35), s("~ hh*16").bank("RolandTR909").gain(0.1))` },
  ],
  melody: [
    { id: "synthfx_hypnotic",   name: "Hypnotic Synth Arp",      tags: ["melody", "minor", "subtle"],          code: `stack(note("c3 eb3 g3 bb3").s("arpy").sustain(0).slow(2).gain(0.3), note("~ ~ ~ c1").s("fm").sustain(0).gain(0.35))` },
    { id: "synthfx_acid",       name: "Acid Synth Squelch",      tags: ["melody", "acid", "303", "resonance"], code: `stack(note("c3 ~ eb3 ~ g3 ~ bb3 ~").s("bass").sustain(0).gain(0.35), note("c2*2").s("fm").sustain(0).gain(0.30))` },
    { id: "synthfx_industrial", name: "Industrial Melodic Line", tags: ["melody", "industrial", "harsh"],      code: `stack(note("c3 c3 eb3 c3").s("fm").sustain(0).gain(0.25), note("~ ~ ~ c1").s("fm").sustain(0).gain(0.4))` },
    { id: "synthfx_hardgroove", name: "Peak Time Rave Hook",     tags: ["melody", "rave", "energetic"],        code: `stack(note("c4 g3 c4 eb4").s("juno").sustain(0).fast(2).gain(0.18), note("~ ~ c3 ~").s("arpy").gain(0.3))` },
  ],
  transitions: [
    { id: "synthfx_dub",     name: "Dub Echo Pad Stab",   tags: ["atmosphere", "dub", "chord", "spacey"],   code: `stack(note("[c3,eb3,g3,bb3]*2").s("juno").sustain(0).slow(2).gain(0.4), note("c6").s("pad").slow(4).gain(0.1))` },
    { id: "synthfx_schranz", name: "Talking Glitch Wall", tags: ["atmosphere", "glitch", "vocal", "noisy"], code: `stack(note("c3*8").s("fm").sustain(0).gain(0.2), note("~ c2 ~ c2").s("bass").sustain(0).gain(0.25))` },
  ],
};

export function getPatternById(pillarName, id) {
  return soundLibrary[pillarName]?.find(p => p.id === id) ?? null;
}
