// Library v2 (techno): melody patterns. Tags from EVAL_VOCAB plus 'techno'; ids prefixed 'melody_'.
// Written without looking at eval/corpus or eval/results (plan 2026-11-10, Task 4–6).
export const TECHNO_MELODY = [
  // — Detroit: warm minor-7th stabs, string-like pads —
  { id: "melody_detroit_minor7_stabs", name: "Detroit Minor-7 Stabs", tags: ["techno", "detroit", "warm", "chords"],
    code: `note("[~ [c3,eb3,g3,bb3]] [~ ~ [c3,eb3,g3,bb3] ~] [~ [f3,ab3,c4,eb4]] [~ ~ ~ [c3,eb3,g3,bb3]]").s("sawtooth").attack(0.005).decay(0.18).sustain(0).lpf(1100).lpq(3).room(0.4).sz(0.6)`,
    initialTransforms: { echo: 0.25 } },

  { id: "melody_detroit_string_pad", name: "Detroit String Pad", tags: ["techno", "detroit", "warm", "spacious", "pad"],
    code: `note("<[a2,c3,e3,g3] [f2,a2,c3,e3] [d2,f2,a2,c3] [e2,g2,b2,d3]>").s("supersaw").attack(0.6).decay(1.2).sustain(0.6).release(1).lpf(sine.slow(16).range(600, 1400)).room(0.7).sz(0.9).gain(0.55)`,
    initialTransforms: {} },

  { id: "melody_detroit_soul_arp", name: "Detroit Soul Arp", tags: ["techno", "detroit", "dub", "evolving", "arp"],
    code: `note("<[c3,eb3,g3,bb3] [ab2,c3,eb3,g3]>").arp("0 1 2 3 2 1 3 2").fast(2).s("triangle").decay(0.12).sustain(0).lpf(sine.slow(8).range(800, 2200)).delay(0.3).delaytime(0.375).room(0.4)`,
    initialTransforms: {} },

  { id: "melody_detroit_deep_chord_drift", name: "Deep Chord Drift", tags: ["techno", "detroit", "warm", "chords"],
    code: `note("<[d3,f3,a3,c4] ~ [bb2,d3,f3,a3] ~>").s("sawtooth").attack(0.02).decay(0.35).sustain(0.2).lpf(sine.slow(8).range(400, 900)).lpq(2).room(0.6).sz(0.8).delay(0.4).delaytime(0.5)`,
    initialTransforms: {} },

  { id: "melody_detroit_rising_lead", name: "Detroit Rising Lead", tags: ["techno", "dub", "driving", "gritty", "lead"],
    code: `note("[g4 ~ bb4 ~] [c5 ~ bb4 g4] [~ f4 ~ g4] [bb4 ~ d5 c5]").s("square").decay(0.1).sustain(0).lpf(1600).lpq(2).delay(0.25).delaytime(0.375).room(0.3)`,
    initialTransforms: {} },

  // — Dub: offbeat chord stabs drenched in delay —
  { id: "melody_dub_offbeat_stab", name: "Dub Offbeat Stab", tags: ["techno", "detroit", "spacious", "chords"],
    code: `note("[~ [a2,c3,e3,g3]] ~ [~ [a2,c3,e3,g3]] ~").s("sawtooth").decay(0.14).sustain(0).lpf(700).lpq(4).delay(0.7).delaytime(0.375).delayfeedback(0.65).room(0.6).sz(0.9)`,
    initialTransforms: {} },

  { id: "melody_dub_echo_chamber", name: "Echo Chamber Chords", tags: ["techno", "dub", "warm", "chords"],
    code: `note("[~ ~ [d3,f3,a3] ~] [~ ~ ~ ~] [~ [d3,f3,a3] ~ ~] [~ ~ ~ ~]").s("triangle").decay(0.2).sustain(0).lpf(sine.slow(16).range(500, 1200)).delay(0.75).delaytime(0.5).delayfeedback(0.7).room(0.7).sz(0.95)`,
    initialTransforms: {} },

  { id: "melody_dub_fog_pad", name: "Dub Fog Pad", tags: ["techno", "dub", "spacious", "deep", "pad"],
    code: `note("<[c2,g2,eb3] [c2,g2,d3]>").s("sawtooth").attack(0.8).decay(1.5).sustain(0.5).release(1.2).lpf(sine.slow(32).range(250, 700)).lpq(3).room(0.8).sz(0.95).delay(0.5).delaytime(0.75).delayfeedback(0.5).gain(0.5)`,
    initialTransforms: {} },

  // — Industrial: harsh, metallic, dissonant stabs —
  { id: "melody_industrial_tritone_stab", name: "Industrial Tritone Stab", tags: ["techno", "industrial", "dark", "dissonant", "chords"],
    code: `note("[[c3,fs3] ~ ~ [c3,fs3]] [~ ~ [cs3,g3] ~] [[c3,fs3] ~ [c3,fs3] ~] [~ [b2,f3] ~ ~]").s("sawtooth").decay(0.09).sustain(0).lpf(1400).lpq(6).shape(0.6).room(0.3)`,
    initialTransforms: {} },

  { id: "melody_industrial_metal_ring", name: "Metal Ring Sequence", tags: ["techno", "industrial", "metallic", "dissonant", "lead"],
    code: `note("[e4 ~ f4 ~] [~ e4 ~ bb4] [e4 ~ ~ f4] [~ ~ b3 ~]").s("square").fm(6).fmh(1.41).decay(0.08).sustain(0).hpf(300).lpf(2500).room(0.35).sz(0.5)`,
    initialTransforms: {} },

  { id: "melody_industrial_grinder", name: "Warehouse Grinder", tags: ["techno", "industrial", "driving", "evolving", "lead"],
    code: `note("d2*8").add(note("<0 0 1 0 0 6 0 1>")).s("sawtooth").decay(0.07).sustain(0).lpf(saw.slow(4).range(400, 1600)).lpq(8).distort(0.5).crush(8)`,
    initialTransforms: {} },

  { id: "melody_industrial_cluster_hits", name: "Cluster Hits", tags: ["techno", "industrial", "dissonant", "chords"],
    code: `note("[[a2,bb2,e3] ~ ~ ~] [~ ~ ~ [a2,bb2,e3]] [~ ~ [a2,bb2,e3] ~] [~ ~ ~ ~]").s("square").fm(3).fmh(2.7).decay(0.12).sustain(0).lpf(1800).shape(0.4).room(0.5).sz(0.8)`,
    initialTransforms: {} },

  { id: "melody_industrial_glitch_sirens", name: "Glitch Sirens", tags: ["techno", "industrial", "spacious", "metallic", "lead"],
    code: `note("[f4 fs4 f4 ~] [~ c5 ~ fs4] [f4 ~ fs4 f4] [~ ~ c5 b4]").s("pulse").fm(4).decay(0.05).sustain(0).degradeBy(0.25).coarse(4).hpf(500).lpf(3000).delay(0.2).delaytime(0.1875)`,
    initialTransforms: {} },

  // — Peak-time: driving big leads and stabs —
  { id: "melody_peak_supersaw_stab", name: "Peak-Time Supersaw Stab", tags: ["techno", "peak-time", "dense", "evolving", "chords"],
    code: `note("[~ [a3,c4,e4]] [~ [a3,c4,e4]] [~ [g3,c4,e4]] [~ [f3,a3,c4]]").s("supersaw").decay(0.15).sustain(0).lpf(sine.slow(8).range(1200, 3000)).lpq(2).room(0.4).sz(0.6)`,
    initialTransforms: {} },

  { id: "melody_peak_anthem_lead", name: "Anthem Lead", tags: ["techno", "peak-time", "driving", "lead"],
    code: `note("[e4 e4 ~ g4] [~ e4 a4 ~] [e4 ~ b4 a4] [g4 ~ e4 d4]").s("sawtooth").decay(0.14).sustain(0.1).lpf(2200).lpq(3).shape(0.3).delay(0.3).delaytime(0.375).room(0.35)`,
    initialTransforms: {} },

  { id: "melody_peak_rave_arp", name: "Rave Arp Engine", tags: ["techno", "peak-time", "driving", "warm", "arp"],
    code: `note("<[a2,c3,e3,a3] [f2,a2,c3,f3] [g2,b2,d3,g3] [e2,g2,b2,e3]>").arp("0 1 2 3 1 2 3 2 0 2 1 3 2 1 3 0").s("square").decay(0.08).sustain(0).lpf(saw.slow(4).range(800, 3000)).lpq(5).room(0.3)`,
    initialTransforms: {} },

  { id: "melody_peak_hoover_lead", name: "Hoover Lead", tags: ["techno", "peak-time", "gritty", "spacious", "lead"],
    code: `note("[d4 ~ d4 f4] [~ d4 ~ c4] [d4 ~ a4 ~] [g4 f4 ~ c4]").s("supersaw").decay(0.2).sustain(0.2).lpf(1800).lpq(4).distort(0.4).room(0.4).sz(0.7).gain(0.7)`,
    initialTransforms: {} },

  { id: "melody_peak_climb_stab", name: "Climbing Peak Stab", tags: ["techno", "peak-time", "driving", "chords"],
    code: `note("[[c3,eb3,g3] ~ [c3,eb3,g3] ~]*2").add(note("<0 0 3 5>")).s("sawtooth").decay(0.1).sustain(0).lpf(sine.slow(16).range(700, 2600)).lpq(4).shape(0.3).room(0.3)`,
    initialTransforms: {} },

  // — Dub (more) —
  { id: "melody_dub_skank_echo", name: "Dub Skank Echo", tags: ["techno", "detroit", "driving", "warm", "sparse", "chords"],
    code: `note("~ [~ [g2,bb2,d3,f3]] ~ ~").s("square").decay(0.1).sustain(0).lpf(600).lpq(5).hpf(150).delay(0.8).delaytime(0.75).delayfeedback(0.72).room(0.7).sz(0.9)`,
    initialTransforms: {} },

  { id: "melody_dub_drift_lead", name: "Dub Drift Lead", tags: ["techno", "minimal", "deep", "lead"],
    code: `note("[~ e3 ~ ~] [~ ~ g3 ~] [~ ~ ~ e3] [~ b2 ~ ~]").s("sine").decay(0.15).sustain(0).lpf(900).degradeBy(0.3).delay(0.7).delaytime(0.375).delayfeedback(0.6).room(0.6).sz(0.85).pan(sine.slow(8).range(0.2, 0.8))`,
    initialTransforms: {} },

  // — Acid: resonant 303 lines —
  { id: "melody_acid_squelch_line", name: "Squelch Line", tags: ["techno", "acid", "dense", "lead"],
    code: `note("[c2 c3 ~ c2] [eb2 ~ c2 g2] [c2 ~ bb2 c3] [~ c2 f2 ~]").s("sawtooth").decay(0.12).sustain(0).lpf(sine.slow(8).range(300, 2800)).lpq(18).shape(0.4)`,
    initialTransforms: {} },

  { id: "melody_acid_slide_acid", name: "Phrygian Acid Slide", tags: ["techno", "acid", "dark", "gritty", "lead"],
    code: `note("[e2 ~ f2 e2] [~ e3 ~ g2] [e2 f2 ~ e2] [b2 ~ e2 ~]").s("square").decay(0.14).sustain(0.05).lpf(saw.slow(16).range(250, 2000)).lpq(14).room(0.25)`,
    initialTransforms: {} },

  { id: "melody_acid_glitch_bubbles", name: "Acid Bubbles", tags: ["techno", "acid", "glitchy", "lead"],
    code: `note("[a2 ~ a3 ~] [~ c3 ~ a2] [~ ~ e3 ~] [a2 ~ ~ g3]").s("sawtooth").decay(0.06).sustain(0).lpf(sine.fast(3).range(400, 3200)).lpq(20).degradeBy(0.2).delay(0.3).delaytime(0.1875)`,
    initialTransforms: {} },

  // — Hypnotic: repeating arps with slow filter movement —
  { id: "melody_hypnotic_loop_arp", name: "Endless Loop Arp", tags: ["techno", "dub", "warm", "evolving", "arp"],
    code: `note("[d3,f3,a3,c4]").arp("0 2 1 3 2 0 3 1").fast(2).s("triangle").decay(0.07).sustain(0).lpf(sine.slow(32).range(400, 1500)).lpq(3).delay(0.35).delaytime(0.375).room(0.4)`,
    initialTransforms: {} },

  { id: "melody_hypnotic_metal_pulse", name: "Hypnotic Metal Pulse", tags: ["techno", "hypnotic", "spacious", "arp"],
    code: `note("[g3 bb3 d4 g3 bb3 d4 g3 a3]").s("sine").fm(2).fmh(3.5).decay(0.06).sustain(0).lpf(sine.slow(16).range(600, 2000)).pan(sine.slow(4).range(0.25, 0.75)).delay(0.4).delaytime(0.375).room(0.5)`,
    initialTransforms: {} },

  // — Minimal: sparse blips —
  { id: "melody_minimal_single_blip", name: "Single Blip", tags: ["techno", "minimal", "spacious", "deep", "lead"],
    code: `note("[~ ~ c4 ~] ~ [~ ~ ~ c4] ~").s("sine").decay(0.05).sustain(0).lpf(1000).delay(0.45).delaytime(0.375).delayfeedback(0.5).room(0.4)`,
    initialTransforms: {} },
];
