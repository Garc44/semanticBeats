// Library v2 (techno): drums patterns. Tags from EVAL_VOCAB plus 'techno'; ids prefixed 'drums_'.
// Written without looking at eval/corpus or eval/results (plan 2026-11-10, Task 4–6).
export const TECHNO_DRUMS = [

  // — acid: straight 909 kits that leave room for a 303 line —
  { id: "drums_acid_909_straight", name: "Acid 909 Straight Kit", tags: ["techno", "dub", "spacious", "kick", "hats", "clap"],
    code: `stack(
  s("bd*4").bank("RolandTR909").shape(0.3).lpf(900).gain(1.1),
  s("[~ hh]*4").bank("RolandTR909").hpf(6000).gain(0.55),
  s("~ cp ~ cp").bank("RolandTR909").room(0.25).gain(0.7)
)`,
    initialTransforms: {} },

  { id: "drums_acid_909_ride_shuffle", name: "Acid 909 Ride Shuffle", tags: ["techno", "acid", "gritty", "kick", "hats", "percussion"],
    code: `stack(
  s("bd*4").bank("RolandTR909").shape(0.45).lpf(700).gain(1.1),
  s("hh*16").bank("RolandTR909").gain("[0.35 0.2 0.5 0.2]*4").hpf(7000),
  s("~ ~ rd ~").bank("RolandTR909").gain(0.35).hpf(4000),
  s("~ ~ ~ ~ ~ ~ rim ~ ~ ~ ~ rim ~ ~ ~ ~").bank("RolandTR909").gain(0.5)
)`,
    initialTransforms: {} },

  { id: "drums_acid_808_cowbell_jack", name: "Acid 808 Cowbell Jack", tags: ["techno", "detroit", "warm", "metallic", "kick", "hats", "clap", "percussion"],
    code: `stack(
  s("bd*4").bank("RolandTR808").lpf(500).gain(1.2),
  s("[~ hh]*4").bank("RolandTR808").gain(0.5),
  s("~ cp ~ cp").bank("RolandTR808").room(0.3).gain(0.65),
  s("~ ~ cb ~ ~ cb ~ ~").bank("RolandTR808").lpf(1500).gain(0.3)
)`,
    initialTransforms: {} },

  { id: "drums_acid_sparse_tick", name: "Acid Sparse Tick", tags: ["techno", "acid", "hypnotic", "evolving", "kick", "hats"],
    code: `stack(
  s("bd ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~ bd ~ bd ~").bank("RolandTR909").shape(0.25).lpf(600).gain(1.1),
  s("~ ~ hh ~").bank("RolandTR909").fast(4).hpf(8000).decay(0.05).gain(0.5)
)`,
    initialTransforms: {} },

  // — detroit: swung, soulful 808/909 grooves —
  { id: "drums_detroit_swung_909", name: "Detroit Swung 909", tags: ["techno", "hypnotic", "warm", "evolving", "kick", "hats", "clap"],
    code: `stack(
  s("bd*4").bank("RolandTR909").lpf(800).gain(1.1),
  s("hh*8").bank("RolandTR909").swingBy(1/6, 4).gain("[0.4 0.6]*4"),
  s("~ oh ~ oh").bank("RolandTR909").gain(0.35).decay(0.2),
  s("~ cp ~ cp").bank("RolandTR909").room(0.35).sz(0.6).gain(0.7)
)`,
    initialTransforms: {} },

  { id: "drums_detroit_808_soul", name: "Detroit 808 Soul Groove", tags: ["techno", "hypnotic", "warm", "metallic", "kick", "hats", "clap", "percussion"],
    code: `stack(
  s("bd ~ ~ ~ bd ~ ~ bd ~ ~ bd ~ bd ~ ~ ~").bank("RolandTR808").lpf(400).gain(1.2),
  s("hh*16").bank("RolandTR808").swingBy(1/8, 4).gain("[0.3 0.15 0.45 0.15]*4"),
  s("~ cp ~ cp").bank("RolandTR808").room(0.4).gain(0.6),
  s("~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ lt ~").bank("RolandTR808").gain(0.5)
)`,
    initialTransforms: {} },

  { id: "drums_detroit_conga_shuffle", name: "Detroit Conga Shuffle", tags: ["techno", "detroit", "deep", "kick", "hats", "percussion"],
    code: `stack(
  s("bd*4").bank("RolandTR909").lpf(500).shape(0.2).gain(1.15),
  s("[~ hh]*4").bank("RolandTR707").swingBy(1/6, 4).gain(0.45),
  s("~ mt ~ ~ ht ~ mt ~").bank("RolandTR808").swingBy(1/6, 4).lpf(1200).room(0.3).gain(0.45),
  s("~ ~ ~ ~ rim ~ ~ ~ ~ ~ rim ~ ~ ~ ~ ~").bank("RolandTR808").gain(0.4)
)`,
    initialTransforms: {} },

  { id: "drums_detroit_late_night", name: "Detroit Late Night Kit", tags: ["techno", "detroit", "warm", "kick", "hats", "clap"],
    code: `stack(
  s("bd*4").bank("RolandTR909").lpf(650).gain(1.1),
  s("~ oh ~ oh ~ oh ~ oh").bank("RolandTR909").gain(0.3).decay(0.15),
  s("~ ~ ~ ~ cp ~ ~ ~ ~ ~ ~ ~ cp ~ ~ cp").bank("RolandTR909").room(0.6).sz(0.9).delay(0.25).delaytime(0.375).gain(0.6)
)`,
    initialTransforms: {} },

  // — dub: deep kick, delayed rim and percussion —
  { id: "drums_dub_rim_echo", name: "Dub Rim Echo", tags: ["techno", "dub", "deep", "kick", "hats", "percussion"],
    code: `stack(
  s("bd*4").bank("RolandTR909").lpf(250).lpq(2).room(0.4).sz(0.8).gain(1.2),
  s("~ ~ ~ rim ~ ~ rim ~ ~ ~ ~ rim ~ ~ ~ ~").bank("RolandTR808").delay(0.55).delaytime(0.375).delayfeedback(0.5).room(0.5).gain(0.55),
  s("[~ hh]*4").bank("RolandTR808").hpf(7000).gain(0.25)
)`,
    initialTransforms: {} },

  { id: "drums_dub_chord_space_kit", name: "Dub Space Kit", tags: ["techno", "dub", "spacious", "kick", "hats", "clap"],
    code: `stack(
  s("bd*4").bank("RolandTR808").lpf(300).gain(1.25),
  s("~ ~ ~ ~ cp ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~").bank("RolandTR909").room(0.7).sz(0.95).delay(0.5).delaytime(0.375).delayfeedback(0.55).lpf(1800).gain(0.5),
  s("~ hh ~ hh").bank("RolandTR909").lpf(5000).delay(0.3).delaytime(0.1875).gain(0.3)
)`,
    initialTransforms: {} },

  { id: "drums_dub_deep_sparse", name: "Dub Deep Sparse", tags: ["techno", "dub", "gritty", "kick", "percussion"],
    code: `stack(
  s("bd ~ ~ ~ ~ ~ ~ ~ bd ~ ~ ~ ~ ~ ~ ~").bank("RolandTR909").lpf(220).shape(0.2).room(0.5).sz(0.9).gain(1.25),
  s("~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ rim ~ ~").bank("RolandTR909").delay(0.6).delaytime(0.375).delayfeedback(0.6).room(0.6).gain(0.5),
  s("~ ~ lt ~ ~ ~ ~ ~").bank("RolandTR808").lpf(600).delay(0.4).delaytime(0.75).room(0.6).gain(0.4)
)`,
    initialTransforms: {} },

  { id: "drums_dub_shaker_haze", name: "Dub Shaker Haze", tags: ["techno", "dub", "spacious", "evolving", "kick", "hats", "percussion"],
    code: `stack(
  s("bd*4").bank("RolandTR909").lpf(280).gain(1.2),
  s("sh*8").bank("RolandTR808").gain("[0.2 0.35]*4").lpf(4000).room(0.5),
  s("~ ~ ~ ~ ~ ~ ~ cb ~ ~ ~ ~ ~ ~ ~ ~").bank("RolandTR808").lpf(900).delay(0.5).delaytime(0.375).delayfeedback(0.5).room(0.4).gain(0.35),
  s("~ oh ~ ~").bank("RolandTR909").lpf(3500).gain(0.25)
)`,
    initialTransforms: {} },

  // — hypnotic: rolling, repetitive percussion —
  { id: "drums_hypnotic_rolling_toms", name: "Hypnotic Rolling Toms", tags: ["techno", "dub", "driving", "deep", "kick", "hats", "percussion"],
    code: `stack(
  s("bd*4").bank("RolandTR909").lpf(450).shape(0.3).gain(1.15),
  s("hh*16").bank("RolandTR909").gain("[0.2 0.3 0.45 0.3]*4").hpf(7000),
  s("lt(5,16)").bank("RolandTR909").lpf(700).room(0.3).gain(0.45),
  s("mt(3,16,2)").bank("RolandTR909").lpf(900).room(0.3).gain(0.35)
)`,
    initialTransforms: {} },

  { id: "drums_hypnotic_euclid_loop", name: "Hypnotic Euclid Loop", tags: ["techno", "dub", "dark", "evolving", "kick", "hats", "percussion"],
    code: `stack(
  s("bd*4").bank("RolandTR909").lpf(380).lpq(2).gain(1.15),
  s("[~ hh]*4").bank("RolandTR909").gain(0.4),
  s("rim(7,16)").bank("RolandTR909").lpf(2500).gain(0.35).pan(0.35),
  s("cb(3,8,1)").bank("RolandTR808").lpf(1000).gain(0.25).pan(0.65)
)`,
    initialTransforms: {} },

  { id: "drums_hypnotic_filter_drift", name: "Hypnotic Filter Drift", tags: ["techno", "hypnotic", "spacious", "evolving", "kick", "hats", "percussion"],
    code: `stack(
  s("bd*4").bank("RolandTR909").lpf(420).gain(1.15),
  s("hh*16").bank("RolandTR909").lpf(sine.slow(8).range(2500, 9000)).gain(sine.slow(4).range(0.2, 0.45)),
  s("~ ~ perc ~").bank("RolandTR808").fast(2).lpf(sine.slow(16).range(600, 2000)).room(0.4).gain(0.35)
)`,
    initialTransforms: {} },

  { id: "drums_hypnotic_shaker_trance", name: "Hypnotic Shaker Trance", tags: ["techno", "hypnotic", "evolving", "kick", "hats", "clap", "percussion"],
    code: `stack(
  s("bd*4").bank("RolandTR909").lpf(400).shape(0.2).gain(1.15),
  s("sh*16").bank("RolandTR808").gain("[0.15 0.25 0.35 0.25]*4").pan(sine.slow(8).range(0.3, 0.7)),
  s("~ ~ ~ ~ cp ~ ~ ~ ~ ~ ~ ~ cp ~ ~ ~").bank("RolandTR909").room(0.65).sz(0.9).gain(0.5),
  s("ht(3,8)").bank("RolandTR808").lpf(800).delay(0.3).delaytime(0.375).gain(0.3)
)`,
    initialTransforms: {} },

  // — industrial: distorted, metallic —
  { id: "drums_industrial_metal_hammer", name: "Industrial Metal Hammer", tags: ["techno", "industrial", "dark", "kick", "percussion"],
    code: `stack(
  s("bd*4").bank("RolandTR909").distort(0.4).lpf(600).gain(1.0),
  s("metal(5,16)").hpf(1500).room(0.3).gain(0.4),
  s("~ ~ ~ ~ industrial ~ ~ ~").lpf(2500).shape(0.3).room(0.4).gain(0.5)
)`,
    initialTransforms: {} },

  { id: "drums_industrial_crushed_clang", name: "Industrial Crushed Clang", tags: ["techno", "industrial", "dark", "evolving", "kick", "hats", "clap", "percussion"],
    code: `stack(
  s("bd*4").bank("RolandTR909").shape(0.55).lpf(500).gain(1.05),
  s("hh*16").bank("RolandTR909").crush(6).hpf(5000).gain("[0.25 0.15 0.35 0.15]*4"),
  s("~ cp ~ cp").bank("RolandTR909").crush(5).room(0.5).sz(0.8).gain(0.55),
  s("~ ~ ~ cb ~ ~ cb ~").bank("RolandTR808").crush(7).hpf(800).gain(0.3)
)`,
    initialTransforms: {} },

  { id: "drums_industrial_warehouse_dense", name: "Industrial Warehouse Dense", tags: ["techno", "industrial", "dense", "evolving", "kick", "hats", "clap", "percussion"],
    code: `stack(
  s("bd*4, ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ bd ~").bank("RolandTR909").distort(0.3).lpf(550).gain(1.0),
  s("hh*16").bank("RolandTR909").gain("[0.3 0.2 0.45 0.2]*4").hpf(6000),
  s("~ oh ~ oh").bank("RolandTR909").hpf(3000).gain(0.3),
  s("~ cp ~ cp").bank("RolandTR909").shape(0.3).room(0.4).gain(0.55),
  s("lt(3,8,2)").bank("RolandTR909").distort(0.2).lpf(800).gain(0.4)
)`,
    initialTransforms: {} },

  { id: "drums_industrial_glitch_grind", name: "Industrial Glitch Grind", tags: ["techno", "industrial", "driving", "kick", "hats", "percussion"],
    code: `stack(
  s("bd ~ bd ~ bd ~ bd [bd bd]").bank("RolandTR909").distort(0.35).lpf(500).gain(1.0),
  s("hh*16").bank("RolandTR909").degradeBy(0.35).crush(5).hpf(5000).gain(0.35),
  s("glitch(3,8,1)").hpf(1000).room(0.2).gain(0.35),
  s("~ ~ ~ [metal metal]").lpf(4000).gain(0.3)
)`,
    initialTransforms: {} },

  // — peak-time: driving 909, claps, open hats —
  { id: "drums_peaktime_909_main_room", name: "Peak-Time 909 Main Room", tags: ["techno", "peak-time", "spacious", "dense", "kick", "hats", "clap"],
    code: `stack(
  s("bd*4").bank("RolandTR909").shape(0.35).lpf(900).gain(1.15),
  s("[~ oh]*4").bank("RolandTR909").gain(0.45).decay(0.2),
  s("hh*16").bank("RolandTR909").gain("[0.2 0.15 0.3 0.15]*4").hpf(8000),
  s("~ cp ~ cp").bank("RolandTR909").room(0.35).sz(0.7).gain(0.75)
)`,
    initialTransforms: {} },

  { id: "drums_peaktime_clap_stack", name: "Peak-Time Clap Stack", tags: ["techno", "peak-time", "driving", "gritty", "kick", "hats", "clap"],
    code: `stack(
  s("bd*4").bank("RolandTR909").distort(0.25).lpf(800).gain(1.1),
  s("[~ oh]*4").bank("RolandTR909").hpf(2500).gain(0.4),
  s("~ [cp,sd] ~ [cp,sd]").bank("RolandTR909").room(0.4).sz(0.8).gain(0.65),
  s("~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ cp").bank("RolandTR909").room(0.5).gain(0.4)
)`,
    initialTransforms: {} },

  { id: "drums_peaktime_ride_rush", name: "Peak-Time Ride Rush", tags: ["techno", "peak-time", "metallic", "kick", "hats", "clap", "percussion"],
    code: `stack(
  s("bd*4").bank("RolandTR909").shape(0.3).lpf(850).gain(1.15),
  s("[~ rd]*4").bank("RolandTR909").hpf(3000).gain(0.4),
  s("[~ oh]*4").bank("RolandTR909").gain(0.35),
  s("~ cp ~ cp").bank("RolandTR909").room(0.3).gain(0.7),
  s("~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ cr").bank("RolandTR909").slow(2).hpf(2000).gain(0.25)
)`,
    initialTransforms: {} },

  { id: "drums_peaktime_build_roll", name: "Peak-Time Snare Build", tags: ["techno", "peak-time", "driving", "kick", "hats", "clap", "percussion"],
    code: `stack(
  s("bd*4").bank("RolandTR909").shape(0.3).lpf(850).gain(1.15),
  s("[~ oh]*4").bank("RolandTR909").gain(0.4),
  s("~ cp ~ cp").bank("RolandTR909").room(0.35).gain(0.65),
  s("sd*16").bank("RolandTR909").gain(saw.slow(4).range(0, 0.45)).hpf(saw.slow(4).range(300, 2500))
)`,
    initialTransforms: {} },

  // — minimal: sparse clicks, lots of rests —
  { id: "drums_minimal_click_pulse", name: "Minimal Click Pulse", tags: ["techno", "minimal", "warm", "sparse", "kick", "hats", "percussion"],
    code: `stack(
  s("bd*4").bank("RolandTR909").lpf(350).decay(0.2).gain(1.1),
  s("~ ~ click ~").fast(4).hpf(4000).decay(0.04).gain(0.35),
  s("~ ~ ~ ~ ~ ~ rim ~ ~ ~ ~ ~ ~ ~ ~ ~").bank("RolandTR808").gain(0.4)
)`,
    initialTransforms: {} },

  { id: "drums_minimal_glitch_ticks", name: "Minimal Glitch Ticks", tags: ["techno", "minimal", "sparse", "kick", "percussion"],
    code: `stack(
  s("bd ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~").bank("RolandTR909").lpf(380).gain(1.1),
  s("click*16").degradeBy(0.7).hpf(5000).decay(0.03).pan(sine.fast(3).range(0.2, 0.8)).gain(0.35),
  s("~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ [glitch glitch] ~ ~ ~ ~").hpf(2000).gain(0.25)
)`,
    initialTransforms: {} },

  { id: "drums_minimal_rim_offbeat", name: "Minimal Rim Offbeat", tags: ["techno", "minimal", "driving", "kick", "hats", "percussion"],
    code: `stack(
  s("bd*4").bank("RolandTR808").lpf(300).gain(1.2),
  s("[~ hh]*4").bank("RolandTR808").hpf(8000).decay(0.04).gain(0.35),
  s("~ ~ ~ rim ~ ~ ~ ~ ~ rim ~ ~ ~ ~ ~ ~").bank("RolandTR909").room(0.3).gain(0.4)
)`,
    initialTransforms: {} },

  { id: "drums_minimal_micro_shift", name: "Minimal Micro Shift", tags: ["techno", "minimal", "dark", "deep", "kick", "hats", "percussion"],
    code: `stack(
  s("bd*4").bank("RolandTR909").lpf(360).lpq(2).gain(1.1),
  s("hh*8").bank("RolandTR909").hpf(7000).decay(0.03).gain("<0.3 0.25 0.35 0.2>").degradeBy("<0 0.2 0.4 0.2>"),
  s("<[~ ~ rim ~] [~ rim ~ ~] [~ ~ ~ rim] [rim ~ ~ ~]>").bank("RolandTR808").fast(2).room(0.4).gain(0.35)
)`,
    initialTransforms: {} },

  // — extra coverage —
  { id: "drums_acid_glitch_stutter", name: "Acid Glitch Stutter", tags: ["techno", "acid", "spacious", "dense", "kick", "hats", "clap"],
    code: `stack(
  s("bd*4").bank("RolandTR909").shape(0.3).lpf(750).gain(1.1),
  s("hh*16").bank("RolandTR909").sometimesBy(0.25, x => x.ply(2)).hpf(7000).gain("[0.25 0.2 0.4 0.2]*4"),
  s("~ cp ~ [cp ~ ~ cp]").bank("RolandTR909").room(0.3).gain(0.6)
)`,
    initialTransforms: {} },

  { id: "drums_peaktime_808_tribal_drive", name: "Peak-Time Tribal Drive", tags: ["techno", "peak-time", "driving", "dense", "kick", "hats", "clap", "percussion"],
    code: `stack(
  s("bd*4").bank("RolandTR909").shape(0.3).lpf(800).gain(1.15),
  s("[~ oh]*4").bank("RolandTR909").gain(0.35),
  s("~ cp ~ cp").bank("RolandTR909").room(0.35).gain(0.65),
  s("[~ lt] [mt ~] [~ lt] [ht lt]").bank("RolandTR808").lpf(1200).room(0.3).gain(0.45)
)`,
    initialTransforms: {} },

  // — coverage fill (acid, detroit, glitchy) —
  { id: "drums_acid_stutter_chopper", name: "Acid Stutter Chopper", tags: ["techno", "acid", "gritty", "glitchy", "kick", "hats", "clap", "percussion"],
    code: `stack(
  s("<[bd bd bd bd] [bd bd bd [bd*4]] [bd bd [bd*3] bd] [bd [~ bd] bd [bd*8]]>").bank("RolandTR909").shape(0.35).lpf(800).gain(1.1),
  s("hh*16").bank("RolandTR909").sometimesBy(0.4, x => x.ply(4)).degradeBy(0.3).hpf(7000).gain("[0.3 0.2 0.45 0.2]*4"),
  s("~ cp ~ [cp*4]").bank("RolandTR909").crush(6).room(0.25).gain(0.6),
  s("rim(5,16)").bank("RolandTR909").sometimesBy(0.5, x => x.ply(3)).crush(7).hpf(1500).gain(0.4)
)`,
    initialTransforms: {} },

  { id: "drums_acid_909_ride_driver", name: "Acid 909 Ride Driver", tags: ["techno", "acid", "driving", "kick", "hats", "clap", "percussion"],
    code: `stack(
  s("bd*4").bank("RolandTR909").shape(0.4).lpf(850).gain(1.15),
  s("hh*16").bank("RolandTR909").hpf(7500).gain("[0.25 0.15 0.5 0.15]*4"),
  s("[~ oh]*4").bank("RolandTR909").decay(0.12).gain(0.35),
  s("rd*8").bank("RolandTR909").hpf(4000).gain(0.25),
  s("~ cp ~ cp").bank("RolandTR909").room(0.2).gain(0.65),
  s("~ ~ ~ rim ~ ~ rim ~ ~ ~ ~ rim ~ ~ ~ rim").bank("RolandTR909").gain(0.45)
)`,
    initialTransforms: {} },

  { id: "drums_detroit_broken_swing", name: "Detroit Broken Swing", tags: ["techno", "acid", "glitchy", "kick", "hats", "clap", "percussion"],
    code: `stack(
  s("<[bd*4] [bd bd ~ bd] [bd*4] [bd ~ bd [bd*4]]>").bank("RolandTR808").lpf(450).gain(1.2),
  s("hh*16").bank("RolandTR808").swingBy(1/6, 4).sometimesBy(0.35, x => x.ply(3)).degradeBy(0.3).gain("[0.3 0.15 0.45 0.15]*4"),
  s("~ cp ~ <cp [cp*3] cp [cp cp cp cp]>").bank("RolandTR808").room(0.35).gain(0.6),
  s("~ ~ cb ~ ~ [cb*4] ~ ~").bank("RolandTR808").degradeBy(0.25).lpf(1500).gain(0.3)
)`,
    initialTransforms: {} },

  { id: "drums_detroit_cowbell_soul", name: "Detroit Cowbell Soul", tags: ["techno", "detroit", "warm", "gritty", "kick", "hats", "clap", "percussion"],
    code: `stack(
  s("bd*4").bank("RolandTR808").lpf(450).gain(1.2),
  s("hh*8").bank("RolandTR808").swingBy(1/6, 4).gain("[0.35 0.55]*4"),
  s("~ cp ~ cp").bank("RolandTR808").room(0.4).sz(0.6).gain(0.6),
  s("~ ~ cb ~ ~ ~ cb ~").bank("RolandTR808").swingBy(1/6, 4).lpf(1400).gain(0.3),
  s("~ ~ ~ ~ ~ ~ ~ ~ ~ ~ mt ~ ~ ~ lt ~").bank("RolandTR808").lpf(900).gain(0.45)
)`,
    initialTransforms: {} },

  { id: "drums_minimal_micro_cut", name: "Minimal Micro Cut", tags: ["techno", "minimal", "glitchy", "kick", "hats", "percussion"],
    code: `stack(
  s("<[bd ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~] [bd ~ ~ ~ bd ~ [bd bd bd] ~ ~ ~ ~ ~ bd ~ ~ ~] [bd ~ ~ ~ ~ ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~] [bd ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~ [bd*8] ~ ~ ~]>").bank("RolandTR909").lpf(400).gain(1.1),
  s("click*16").sometimesBy(0.5, x => x.ply(4)).degradeBy(0.4).hpf(4000).decay(0.03).pan(sine.fast(4).range(0.15, 0.85)).gain(0.4),
  s("~ ~ [glitch*4] ~ ~ ~ ~ [glitch glitch]").degradeBy(0.2).hpf(1500).gain(0.3),
  s("[~ hh]*4").bank("RolandTR909").hpf(8000).degradeBy(0.35).decay(0.03).gain(0.3),
  s("~ ~ ~ ~ ~ ~ rim ~ ~ ~ ~ ~ ~ [rim*3] ~ ~").bank("RolandTR808").crush(6).gain(0.4)
)`,
    initialTransforms: {} },

];
