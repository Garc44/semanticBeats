// Library v2 (techno): bass patterns. Tags from EVAL_VOCAB plus 'techno'; ids prefixed 'bass_'.
// Written without looking at eval/corpus or eval/results (plan 2026-11-10, Task 4–6).
export const TECHNO_BASS = [

  // — Acid: 303-style resonant saw/square with filter movement —
  { id: "bass_acid_303_sweep_run", name: "303 Sweep Run", tags: ["techno", "acid", "metallic", "bass"],
    code: `note("c2 c2 c3 c2 eb2 c2 [c2 c3] g1").s("sawtooth").lpf(sine.slow(8).range(300, 1800)).lpq(18).decay(0.12).sustain(0).shape(0.2)`,
    initialTransforms: {} },

  { id: "bass_acid_accent_slide", name: "Acid Accent Line", tags: ["techno", "acid", "gritty", "bass"],
    code: `note("a1 ~ a1 a2 ~ a1 c2 ~ a1 a1 ~ g1 a2 ~ e2 a1").s("sawtooth").lpf("<400 600 900 650>").lpq(22).decay(0.1).sustain(0.1).gain("1 0.8 1 1.2 0.8 1 1.1 0.8")`,
    initialTransforms: {} },

  { id: "bass_acid_gritty_square", name: "Gritty Square Acid", tags: ["techno", "acid", "gritty", "evolving", "bass"],
    code: `note("[d2 ~ d2 d3] [~ d2 f2 ~] [d2 d2 ~ c3] [~ d2 a1 ~]").s("square").lpf(sine.slow(4).range(350, 1400)).lpq(16).decay(0.09).sustain(0).distort(0.4)`,
    initialTransforms: { lopass_q: 12 } },

  { id: "bass_acid_dense_sixteenths", name: "Dense Acid Sixteenths", tags: ["techno", "acid", "glitchy", "evolving", "bass"],
    code: `note("e1 e2 e1 g1 e1 e1 e2 d2 e1 g1 e1 e2 e1 b1 e1 e2").s("sawtooth").lpf(saw.slow(4).range(250, 1400)).lpq(15).decay(0.07).sustain(0)`,
    initialTransforms: { shape: 0.2 } },

  // — Detroit: warm, melodic, soulful —
  { id: "bass_detroit_warm_minor7", name: "Warm Minor-7 Line", tags: ["techno", "detroit", "evolving", "bass"],
    code: `note("[f1 ~ ~ f2] [~ ab1 ~ c2] [~ eb2 ~ f1] [~ ~ c2 ~]").s("sawtooth").lpf(650).lpq(3).attack(0.005).decay(0.18).sustain(0.2).shape(0.15).room(0.25)`,
    initialTransforms: {} },

  { id: "bass_detroit_soulful_walk", name: "Soulful Walking Bass", tags: ["techno", "detroit", "dense", "bass"],
    code: `note("<[c2 ~ eb2 g1 ~ bb1 c2 ~] [ab1 ~ c2 eb2 ~ g1 ab1 ~]>").s("square").lpf(700).lpq(2).decay(0.14).sustain(0.15).shape(0.2)`,
    initialTransforms: {} },

  { id: "bass_detroit_deep_pulse", name: "Detroit Deep Pulse", tags: ["techno", "detroit", "spacious", "deep", "bass", "sub"],
    code: `stack(
      note("[~ g1]*4").s("sine").decay(0.25).sustain(0.1).lpf(250),
      note("<[~ ~ d2 ~] [~ ~ bb1 ~] [~ ~ c2 ~] [~ ~ f2 ~]>").s("triangle").decay(0.2).sustain(0).lpf(800).delay(0.35).delaytime(0.375).room(0.4)
    )`,
    initialTransforms: {} },

  { id: "bass_detroit_evolving_dyad", name: "Evolving Dyad Bass", tags: ["techno", "detroit", "warm", "bass"],
    code: `note("<[a1,e2] [f1,c2] [d1,a1] [e1,b1]>").struct("[~ x] [~ x] [x ~] [~ x]").s("sawtooth").lpf(sine.slow(16).range(350, 900)).lpq(4).decay(0.16).sustain(0.1).room(0.2)`,
    initialTransforms: { shape: 0.15 } },

  // — Dub: deep sub with delay and space —
  { id: "bass_dub_echo_sub", name: "Dub Echo Sub", tags: ["techno", "minimal", "spacious", "deep", "bass", "sub"],
    code: `note("[~ c1] ~ [~ c1] [~ ~ eb1 ~]").s("sine").decay(0.3).sustain(0.1).lpf(220).delay(0.5).delaytime(0.375).delayfeedback(0.55).room(0.4).sz(0.8)`,
    initialTransforms: {} },

  { id: "bass_dub_chord_echo", name: "Dub Chord Echo Bass", tags: ["techno", "minimal", "warm", "bass"],
    code: `note("<[~ [g1,d2,bb2] ~ ~] [~ [f1,c2,ab2] ~ ~]>*2").s("triangle").lpf(420).decay(0.18).sustain(0).delay(0.6).delaytime(0.375).delayfeedback(0.6).room(0.5).sz(0.9)`,
    initialTransforms: {} },

  { id: "bass_dub_sparse_drop", name: "Sparse Dub Drop", tags: ["techno", "dub", "dark", "evolving", "bass", "sub"],
    code: `note("d1 ~ ~ ~ ~ ~ [~ d1] ~ ~ ~ ~ ~ f1 ~ ~ ~").s("sine").decay(0.35).sustain(0.05).lpf(200).shape(0.15).delay(0.45).delaytime(0.5).delayfeedback(0.5).room(0.5)`,
    initialTransforms: {} },

  { id: "bass_dub_drifting_tape", name: "Drifting Tape Dub", tags: ["techno", "dub", "dissonant", "evolving", "bass"],
    code: `note("[~ a1 ~ ~] [~ ~ a1 ~] [~ a1 ~ ~] [~ ~ ~ c2]").s("triangle").decay(0.2).sustain(0.05).lpf(sine.slow(16).range(180, 500)).delay(0.55).delaytime(0.375).delayfeedback(sine.slow(8).range(0.35, 0.65)).room(0.45).sz(0.9)`,
    initialTransforms: {} },

  // — Industrial: distorted, gritty, metallic —
  { id: "bass_industrial_distort_stomp", name: "Distorted Stomp Bass", tags: ["techno", "industrial", "gritty", "bass"],
    code: `note("c1*8").s("sawtooth").lpf(500).lpq(4).decay(0.09).sustain(0).distort(0.6).gain("1 0.8 0.9 0.8")`,
    initialTransforms: {} },

  { id: "bass_industrial_fm_clang", name: "FM Clang Bass", tags: ["techno", "industrial", "dark", "metallic", "dissonant", "bass"],
    code: `note("[c1 ~ c1 cs1] [~ c1 ~ ~] [c1 ~ fs1 ~] [~ c1 cs1 ~]").s("square").fm(3).fmh(1.414).lpf(900).decay(0.1).sustain(0).shape(0.4).room(0.25)`,
    initialTransforms: {} },

  { id: "bass_industrial_crushed_grind", name: "Crushed Grind Bass", tags: ["techno", "industrial", "gritty", "bass"],
    code: `note("[e1 e1 ~ e1] [~ e1 f1 ~] [e1 ~ e1 e1] [~ ~ e1 ~]").s("sawtooth").lpf(700).decay(0.08).sustain(0).crush(5).coarse(6).degradeBy(0.2)`,
    initialTransforms: { shape: 0.3 } },

  { id: "bass_industrial_dense_clank", name: "Dense Clank Bass", tags: ["techno", "industrial", "dark", "dense", "bass"],
    code: `note("g0 g0 g1 g0 g0 ab0 g0 g1 g0 g0 g1 g0 db1 g0 g0 g1").s("square").fm(2).fmh(2.71).lpf(650).lpq(5).decay(0.06).sustain(0).distort(0.3)`,
    initialTransforms: {} },

  // — Peak-time: driving, rolling offbeat bass —
  { id: "bass_peaktime_rolling_offbeat", name: "Peak-Time Rolling Offbeat", tags: ["techno", "industrial", "dark", "driving", "dissonant", "bass"],
    code: `note("[~ a1 a1 a1]*4").s("sawtooth").lpf(520).lpq(3).decay(0.1).sustain(0).gain("[0 1 0.8 0.9]*4").shape(0.25)`,
    initialTransforms: {} },

  { id: "bass_peaktime_offbeat_sub", name: "Peak-Time Offbeat Sub", tags: ["techno", "bass", "sub"],
    code: `stack(
      note("[~ f1]*4").s("sine").decay(0.2).sustain(0).lpf(240).shape(0.3),
      note("[~ f2]*4").s("triangle").decay(0.08).sustain(0).lpf(600).gain(0.5)
    )`,
    initialTransforms: {} },

  { id: "bass_peaktime_dense_gallop", name: "Dense Gallop Bass", tags: ["techno", "industrial", "dark", "dense", "bass"],
    code: `note("[~ e1 e1 ~ e1 e1 e2 e1]*2").s("sawtooth").lpf(600).lpq(5).decay(0.07).sustain(0).distort(0.35).gain("[0 1 0.8 0 1 0.8 1 0.8]*2")`,
    initialTransforms: {} },

  { id: "bass_peaktime_metallic_drive", name: "Metallic Drive Bass", tags: ["techno", "industrial", "driving", "metallic", "bass"],
    code: `note("[~ d1 ~ d1] [~ d1 ~ d2] [~ d1 ~ d1] [~ d1 eb1 d1]").s("square").fm(1.5).fmh(3.5).lpf(750).decay(0.09).sustain(0).shape(0.35)`,
    initialTransforms: {} },

  { id: "bass_peaktime_evolving_roller", name: "Evolving Peak Roller", tags: ["techno", "peak-time", "dense", "evolving", "bass"],
    code: `note("[~ c1 c2 c1]*4").s("sawtooth").lpf(saw.slow(16).range(300, 1100)).lpq(sine.slow(8).range(2, 8)).decay(0.09).sustain(0).shape(0.25)`,
    initialTransforms: {} },

  // — Minimal: sparse, clicky —
  { id: "bass_minimal_click_blip", name: "Minimal Click Blip", tags: ["techno", "minimal", "sparse", "dissonant", "bass"],
    code: `note("~ ~ [~ c2] ~ ~ [c2 ~] ~ ~").s("sine").attack(0.001).decay(0.05).sustain(0).lpf(900).sometimesBy(0.3, x => x.ply(2)).pan(0.45)`,
    initialTransforms: { degrade: 0.15 } },

  { id: "bass_minimal_sparse_dot", name: "Minimal Sub Dot", tags: ["techno", "minimal", "bass", "sub"],
    code: `note("[~ ~ g0 ~] ~ [~ ~ ~ g0] ~").s("sine").attack(0.003).decay(0.22).sustain(0).lpf(180).shape(0.2)`,
    initialTransforms: {} },

  { id: "bass_minimal_glitch_sub", name: "Minimal Glitch Sub", tags: ["techno", "minimal", "glitchy", "dissonant", "bass", "sub"],
    code: `note("[~ b0] [~ ~ b0 ~] [~ b0] [~ c1 ~ ~]").s("sine").decay(0.12).sustain(0).lpf(260).degradeBy(0.25).sometimesBy(0.2, x => x.ply(3)).shape(0.2)`,
    initialTransforms: {} },

  // — Hypnotic: repetitive, rolling —
  { id: "bass_hypnotic_euclid_roll", name: "Hypnotic Euclid Roll", tags: ["techno", "hypnotic", "dark", "deep", "bass"],
    code: `note("g1(5,8,<0 2>)").s("sawtooth").lpf(sine.slow(8).range(300, 600)).lpq(3).decay(0.1).sustain(0).shape(0.2)`,
    initialTransforms: {} },

  { id: "bass_hypnotic_metallic_loop", name: "Metallic Hypnotic Loop", tags: ["techno", "hypnotic", "dark", "evolving", "bass"],
    code: `note("[~ f1 f1 ~] [f1 ~ f1 gb1]").s("triangle").fm(2).fmh(1.5).lpf(700).decay(0.1).sustain(0).pan(sine.slow(4).range(0.4, 0.6))`,
    initialTransforms: { reverb: 0.2 } },

  { id: "bass_hypnotic_dense_drone", name: "Dense Hypnotic Drone Line", tags: ["techno", "acid", "evolving", "bass"],
    code: `note("d1*16").add(note("<0 0 0 1>")).s("sawtooth").lpf(sine.slow(32).range(200, 700)).lpq(6).decay(0.08).sustain(0.05).gain("0.9 0.7 0.8 0.7")`,
    initialTransforms: {} },

  { id: "bass_hypnotic_glitch_stepper", name: "Glitch Hypnotic Stepper", tags: ["techno", "acid", "gritty", "sparse", "bass"],
    code: `note("[~ a0 a1 a0]*2").s("square").lpf(480).decay(0.08).sustain(0).coarse(4).degradeBy(0.15).shape(0.3)`,
    initialTransforms: { iter: 4 } },

  { id: "bass_detroit_sparse_soul", name: "Sparse Soul Bass", tags: ["techno", "warm", "sparse", "bass"],
    code: `note("<[c2 ~ ~ ~ ~ ~ eb2 ~] [~ ~ bb1 ~ ~ ~ g1 ~]>").s("triangle").attack(0.01).decay(0.25).sustain(0.15).lpf(600).shape(0.2).room(0.3).sz(0.6)`,
    initialTransforms: {} },

  // — coverage fill (dub, peak-time) —
  { id: "bass_dub_deep_echo_pulse", name: "Dub Deep Echo Pulse", tags: ["techno", "dub", "deep", "bass", "sub"],
    code: `note("<[~ g0 ~ ~] [~ ~ g0 ~] [~ g0 ~ ~] [~ ~ ~ bb0]>*2").s("sine").attack(0.01).decay(0.35).sustain(0.15).lpf(180).delay(0.55).delaytime(0.375).delayfeedback(0.6).room(0.6).sz(0.95)`,
    initialTransforms: {} },

  { id: "bass_dub_chord_space_stab", name: "Dub Space Stab Bass", tags: ["techno", "dub", "spacious", "bass", "sub"],
    code: `stack(
      note("[c1 ~ ~ ~] ~ [~ ~ c1 ~] ~").s("sine").attack(0.01).decay(0.4).sustain(0.2).lpf(160),
      note("<[~ [c2,eb2,g2] ~ ~] [~ ~ [bb1,d2,f2] ~]>").s("triangle").decay(0.15).sustain(0).lpf(450).delay(0.65).delaytime(0.375).delayfeedback(0.65).room(0.7).sz(0.95).gain(0.6)
    )`,
    initialTransforms: {} },

  { id: "bass_peaktime_main_room_roll", name: "Peak-Time Main Room Roll", tags: ["techno", "peak-time", "driving", "bass"],
    code: `stack(
      note("[~ a1 a1 a1]*4").s("sawtooth").lpf(950).lpq(3).decay(0.09).sustain(0).gain("[0 1.1 0.85 0.95]*4").shape(0.35),
      note("[~ a0]*4").s("sine").decay(0.15).sustain(0).lpf(200).gain(0.9)
    )`,
    initialTransforms: {} },

  { id: "bass_peaktime_octave_pump", name: "Peak-Time Octave Pump", tags: ["techno", "peak-time", "driving", "evolving", "bass"],
    code: `note("[~ e1 e2 e1]*4").s("sawtooth").lpf(sine.slow(8).range(700, 1200)).lpq(2).decay(0.08).sustain(0).gain("[0 1.1 0.9 1]*4").shape(0.4)`,
    initialTransforms: {} },

  { id: "bass_peaktime_gritty_stomper", name: "Peak-Time Gritty Stomper", tags: ["techno", "peak-time", "gritty", "bass"],
    code: `note("[~ f1 ~ f1] [~ f1 f1 f1] [~ f1 ~ f1] [~ f1 ab1 f1]").s("square").lpf(1000).lpq(2).decay(0.09).sustain(0).distort(0.45).gain(1.05)`,
    initialTransforms: {} },

  { id: "bass_peaktime_dense_rush", name: "Peak-Time Dense Rush", tags: ["techno", "peak-time", "dense", "bass"],
    code: `stack(
      note("[~ d1 d1 d2 ~ d1 d1 d1]*2").s("sawtooth").lpf(saw.slow(4).range(600, 1200)).lpq(3).decay(0.07).sustain(0).gain("[0 1 0.8 1 0 1 0.85 0.95]*2").shape(0.3),
      note("[~ d1]*4").s("sine").decay(0.12).sustain(0).lpf(180).gain(0.85)
    )`,
    initialTransforms: {} },
];
