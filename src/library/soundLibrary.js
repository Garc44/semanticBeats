export const soundLibrary = {
  drums: [

    { id: "basic_kick", name: "Basic Kick", tags: ["kick", "basic", "4*4", "techno", "foundation"],
      code: `s("bd*4").bank("RolandTR909")`,
      initialTransforms: {} },

    { id: "kick_berghain_rumble", name: "Klockworks Reverb Rumble", tags: ["kick", "industrial", "distorted", "techno", "4x4"],
      code: `s("bd*4").bank("RolandTR909")`,
      initialTransforms: { shape: 0.4, reverb: 0.5, room_size: 0.8, lopass: 400, lopass_q: 2 } },

    { id: "kick_dirt_club_house", name: "Dirt Clubkick House Thump", tags: ["kick", "dirt", "club", "house", "warm"],
      code: `s("clubkick*4")`,
      initialTransforms: { lopass: 650, lopass_q: 1.5, reverb: 0.1 } },

    { id: "kick_909_offbeat", name: "909 Offbeat Minimal", tags: ["kick", "minimal", "techno", "909", "sparse"],
      code: `s("bd ~ ~ bd ~ ~ bd ~").bank("RolandTR909")`,
      initialTransforms: { shape: 0.35, lopass: 380, lopass_q: 2, reverb: 0.4, room_size: 0.7 } },

    { id: "kick_909_ghost", name: "909 Ghost Pulse", tags: ["kick", "minimal", "techno", "909", "dark"],
      code: `s("bd ~ ~ ~ bd ~ ~ ~").bank("RolandTR909")`,
      initialTransforms: { shape: 0.5, lopass: 350, lopass_q: 3, reverb: 0.7, room_size: 0.9 } },

    { id: "kick_909_syncopated", name: "909 Syncopated Knock", tags: ["kick", "syncopated", "techno", "909", "industrial"],
      code: `s("bd ~ bd ~ ~ bd ~ ~").bank("RolandTR909")`,
      initialTransforms: { shape: 0.45, lopass: 420, reverb: 0.6, room_size: 0.8 } },

    { id: "kick_909_euclidean", name: "909 Euclidean Kick", tags: ["kick", "euclidean", "techno", "909", "rhythmic"],
      code: `s("bd(3,8)").bank("RolandTR909")`,
      initialTransforms: { shape: 0.4, lopass: 400, lopass_q: 2, reverb: 0.5, room_size: 0.8 } },

    { id: "kick_909_two_bar", name: "909 Two-Bar Variation", tags: ["kick", "two-bar", "techno", "909", "dynamic"],
      code: `s("[bd ~ ~ bd ~ ~ ~ ~] [bd ~ bd ~ ~ bd ~ ~]").bank("RolandTR909")`,
      initialTransforms: { shape: 0.35, lopass: 380, reverb: 0.45, room_size: 0.7 } },

    { id: "kick_909_accented", name: "909 Accented Four-Floor", tags: ["kick", "accented", "techno", "909", "4x4"],
      code: `s("bd*4").bank("RolandTR909").gain("[1.2 0.9 1.0 0.95]")`,
      initialTransforms: { shape: 0.4, lopass: 420, reverb: 0.4, room_size: 0.75 } },

  ],


  bass: [

    { id: "bass_acid_squelch", name: "Acid Squelch Bass", tags: ["bass", "acid", "303", "techno"],
      code: `note("c1 [~ eb1] c1 [g1 bb1]").s("sawtooth").lpf(sine.range(200, 3000).fast(0.5))`,
      initialTransforms: { lopass_q: 4 } },

    { id: "bass_rolling_hypnotic", name: "Rolling Hypnotic Bass", tags: ["bass", "hypnotic", "rolling", "progressive", "techno"],
      code: `note("[~ e1 e1 e1] [~ e1 e1 f1] [~ e1 e1 e1] [~ f1 ~ ds1]").scale("E:minor").s("saw").decay(0.12)`,
      initialTransforms: { lopass: 400, shape: 0.15 } },

    { id: "bass_minimal_offbeat", name: "Minimalistic Offbeat Hook", tags: ["bass", "minimal", "offbeat", "groove", "house"],
      code: `note("[~ a1] [~ a1] [~ c2] [b1 ~ g1 ~]").scale("A:minor").s("square").decay(0.08).resonance(0.2)`,
      initialTransforms: { lopass: 600 } },

    { id: "bass_industrial_sub", name: "Industrial Sub-Slinker", tags: ["bass", "sub", "industrial", "dark", "slinker"],
      code: `note("[~ d1] [cs1 d1] [~ cs1] [d1 ~ cs1 d1]").scale("D:phrygian").s("sine").decay(0.15)`,
      initialTransforms: { shape: 0.4, lopass: 250, reverb: 0.2 } },

    { id: "bass_tribal_tom", name: "Tribal Tom-Bass Groove", tags: ["bass", "tribal", "tom", "groove", "percussive"],
      code: `note("[~ g1] [g1 ~ g1 ~] [~ bb1] [g1 ~ f1 ~]").scale("G:minor").s("triangle").decay(0.18).resonance(0.3)`,
      initialTransforms: { lopass: 350 } },

    { id: "bass_rolling_saw_driver", name: "Rolling Saw Driver", tags: ["bass", "saw", "techno", "rolling", "classic"],
      code: `note("[~ ~ c2 ~] [c2 ~ ~ c2] [~ ~ c2 ~] [c2 ~ c3 ~]").s("saw").decay(0.15).sustain(0.05)`,
      initialTransforms: { lopass: 400 } },

    { id: "bass_stereo_groove_saw", name: "Stereo Groove Saw", tags: ["bass", "saw", "groove", "hypnotic", "stereo"],
      code: `note("[~ c2 ~ c2] [~ c2 eb2 ~] [~ c2 ~ c2] [~ bb1 ~ c2]").s("saw").decay(0.15).sustain(0.05).pan("0.4 0.6")`,
      initialTransforms: { lopass: 400 } },

    { id: "bass_accented_offbeat_sub", name: "Accented Offbeat Sub", tags: ["bass", "sub", "sine", "offbeat", "deep"],
      code: `note("[~ c3]*4").s("sine").gain("[1 1.1 1 1.2]*2").attack(0.02).decay(0.2).sustain(0)`,
      initialTransforms: { lopass: 200 } },

    { id: "bass_resonant_acid_stepper", name: "Resonant Acid Stepper", tags: ["bass", "saw", "acid", "resonance", "driving"],
      code: `note("c2 c2 c3 c2  eb2 ~ c2 g2  ~ c2 c3 c2  f2 c2 ~ eb2").s("saw | sawtooth").decay(0.08).sustain(0.05).resonance(10).lpf("300 450 600 400")`,
      initialTransforms: {} },

    { id: "bass_dub_cavern_chord", name: "Dub Cavern Chord", tags: ["bass", "chord", "dub", "delay", "atmospheric"],
      code: `note("[~ [c2,eb2,g2] ~ ~]*2").s("triangle").decay(0.15).sustain(0).delaytime(0.375)`,
      initialTransforms: { lopass: 280, echo: 0.6 } },

    { id: "bass_phrygian_creep", name: "Phrygian Creep", tags: ["bass", "phrygian", "dark", "minimal", "techno"],
      code: `note("[~ d1] [~ d1] [~ f1] [cs1 ~ d1 ~]").scale("D:phrygian").s("square").decay(0.09).resonance(0.2)`,
      initialTransforms: { lopass: 500 } },

    { id: "bass_hypnotic_pulse", name: "Hypnotic Single Pulse", tags: ["bass", "minimal", "hypnotic", "sine", "dark"],
      code: `note("[~ e1 ~ ~] [~ e1 ~ e1] [~ e1 ~ ~] [~ f1 ~ e1]").s("sine").decay(0.12)`,
      initialTransforms: { lopass: 300, shape: 0.3 } },

    { id: "bass_chromatic_descent", name: "Chromatic Minor Descent", tags: ["bass", "chromatic", "minor", "dark", "square"],
      code: `note("[~ b0 ~ ~] [~ b0 ~ ~] [~ c1 ~ ~] [b0 ~ as0 b0]").s("square").decay(0.08)`,
      initialTransforms: { lopass: 550, shape: 0.15 } },

    { id: "bass_phrygian_walk", name: "B Phrygian Walk", tags: ["bass", "phrygian", "dark", "chromatic", "square"],
      code: `note("[~ b0 ~ ~] [cs1 ~ b0 ~] [~ cs1 ~ ~] [b0 ~ as0 ~]").scale("B:phrygian").s("square").decay(0.09)`,
      initialTransforms: { lopass: 480, shape: 0.15 } },

    { id: "bass_sub_sine_filter", name: "Sub Sine Moving Filter", tags: ["bass", "sub", "sine", "filter", "minimal"],
      code: `note("[~ c1 ~ ~]*4").s("sine").decay(0.15).lpf(sine.range(180, 350).slow(8))`,
      initialTransforms: { shape: 0.2 } },

    { id: "bass_minor_saw_run", name: "G Minor Saw Run", tags: ["bass", "minor", "saw", "groove", "dark"],
      code: `note("[~ g1 ~ g1] [~ ~ ab1 ~] [g1 ~ ~ f1] [~ eb1 ~ ~]").scale("G:minor").s("saw").decay(0.07).sustain(0.02)`,
      initialTransforms: { lopass: 450 } },

  ],


  percussion: [

    { id: "perc_industrial_iron", name: "Kompakt Metal Shakers", tags: ["perc", "hihat", "industrial", "metallic"],
      code: `stack(s("~ oh*4").gain(0.85), s("hh*16").gain(saw.range(0.2, 0.7).fast(4))).hpq(2)`,
      initialTransforms: { hipass: 2200, crush: 5 } },

    { id: "perc_distressed_clap", name: "Factory Floor Clap", tags: ["perc", "clap", "industrial", "lo-fi", "distorted"],
      code: `s("cp*2")`,
      initialTransforms: { shape: 0.8, crush: 8, hipass: 800, reverb: 0.5, room_size: 0.6 } },

    { id: "perc_morphing_minimalist", name: "The Morphing Minimalist", tags: ["perc", "minimal", "modulation", "filter", "panning", "hats"],
      code: `stack(
              s("hh*16").gain(sine.slow(2).range(0.2, 0.6)).lpf(sine.slow(8).range(800, 3000)).lpq(10),
              s("click(7,16)").gain(0.8).pan(sine.slow(4).range(0.2, 0.8)).room(0.4),
            )`,
      initialTransforms: {} },

    { id: "perc_breathing_ghost", name: "The Breathing Ghost", tags: ["perc", "ambient", "generative", "probability", "filter", "ghostly"],
      code: `stack(
              s("~ oh").gain(0.7).room(0.3),
              s("hh*16").degradeBy(sine.slow(8).range(0.1, 0.75)).hpf(saw.slow(6).range(1200, 6000)).hpq(4).gain(0.5),
            )`,
      initialTransforms: {} },

    { id: "perc_tape_drift_warp", name: "The Tape-Drift Warp", tags: ["perc", "lo-fi", "tape-drift", "pitch-modulation", "warp", "rimshot"],
      code: `stack(
              s("rim(5,8)").speed(sine.slow(5).range(0.7, 1.4)).pan(saw.slow(4).range(0.1, 0.9)).room(0.5).sz(0.6).gain(0.7),
              s("~ oh/2").gain(0.6),
            )`,
      initialTransforms: {} },

    { id: "perc_909_warehouse_anthem", name: "The 909 Warehouse Anthem", tags: ["perc", "909", "techno", "industrial", "warehouse", "driving"],
      code: `stack(
              s("~ cp ~ cp").gain(0.9).room(0.6).sz(0.8),
              s("~ oh ~ oh ~ oh ~ oh").gain(0.8),
              s("~ ride ~ ride ~ ride ~ ride").gain("[0.5 0.8]*2"),
            )`,
      initialTransforms: {} },

    { id: "perc_motor_city_groove", name: "The Motor City Groove", tags: ["perc", "detroit", "techno", "groove", "toms", "syncopated"],
      code: `stack(
              s("~ cp ~ cp").gain(0.8),
              s("~ oh ~ oh ~ oh ~ oh").gain(0.7),
              s("lt ~ mt ~ ~ ht lt ~").gain("[0.7 0.5]*4").room(0.3),
            )`,
      initialTransforms: {} },

    { id: "perc_sparse_open_hat", name: "Sparse Open Hat", tags: ["perc", "hihat", "minimal", "dark", "sparse"],
      code: `s("~ oh ~ ~ ~ oh ~ ~")`,
      initialTransforms: { hipass: 3000, reverb: 0.3, shape: 0.2 } },

    { id: "perc_modulated_hh", name: "Modulated Hi-Hat Fade", tags: ["perc", "hihat", "modulated", "minimal", "dark"],
      code: `s("~ hh ~ hh ~ hh ~ ~").gain(sine.slow(4).range(0.3, 0.7))`,
      initialTransforms: { hipass: 4000, reverb: 0.2 } },

    { id: "perc_rim_hat_minimal", name: "Rim and Hat Minimal", tags: ["perc", "rim", "hihat", "minimal", "dark"],
      code: `stack(s("~ rim ~ ~ ~ rim ~ ~").gain(0.8).room(0.2), s("hh ~ hh hh ~ hh hh ~").gain(0.5).hpf(5000))`,
      initialTransforms: {} },

    { id: "perc_euclidean_hh", name: "Euclidean Hi-Hat", tags: ["perc", "hihat", "euclidean", "minimal", "dark"],
      code: `s("hh(7,16)").gain(saw.range(0.3, 0.65).slow(3))`,
      initialTransforms: { hipass: 4500, reverb: 0.15 } },

    { id: "perc_clap_hat_stack", name: "Clap Hat Stack", tags: ["perc", "clap", "hihat", "minimal", "dark"],
      code: `stack(s("~ ~ cp ~").gain(0.85).room(0.4).shape(0.3), s("hh ~ ~ hh ~ ~ hh ~").gain(0.5).hpf(5000))`,
      initialTransforms: {} },

    { id: "perc_degrading_oh", name: "Degrading Open Hat", tags: ["perc", "hihat", "degrading", "generative", "dark"],
      code: `s("oh(3,8)").degradeBy(sine.slow(6).range(0, 0.5))`,
      initialTransforms: { hipass: 2800, reverb: 0.35 } },

  ],

  melody: [

    { id: "melody_ostgut_synth", name: "Dystopian FM Sequence", tags: ["melody", "synth", "hypnotic", "dark"],
      code: `note("[c3 eb3 b2 c3] [g3 c4 fis3 c3]").s("triangle").decay(0.08).lpf(sine.range(500, 1800)).delay(0.5)`,
      initialTransforms: { shape: 0.3, reverb: 0.5 } },

    { id: "melody_acid_sequence", name: "Underground Acid Morph", tags: ["melody", "acid", "303", "squelch", "sequence"],
      code: `note("c2 [~ eb2] c2 [f2 g2] bb1 c2 [~ c3] c2").s("sawtooth").lpf(sine.range(200, 4000).fast(0.125)).decay(0.12)`,
      initialTransforms: { lopass_q: 4, shape: 0.3 } },

    { id: "melody_shimmering_trance", name: "Shimmering Trance-Inducer", tags: ["melody", "synth", "trance", "shimmer", "hypnotic"],
      code: `note("[e4 ~ b4 ~] [g4 ~ e4 ~] [b4 ~ c5 ~] [b4 ~ g4 ~]").scale("E:minor").decay(0.25).lpf(sine.range(1000, 3000))`,
      initialTransforms: { echo: 0.4, reverb: 0.6 } },

    { id: "melody_acid_chirp", name: "Minimalist Acid Chirp", tags: ["melody", "synth", "acid", "minimal", "squelch"],
      code: `note("[~ a4 ~ ~] [~ bb4 ~ c5] [~ a4 ~ ~] [~ bb4 ~ ~]").scale("A:phrygian").s("saw").decay(0.05).resonance(0.5).lpf(saw.range(300, 1500))`,
      initialTransforms: { shape: 0.2 } },

    { id: "melody_brain_melter", name: "Polyrhythmic Brain Melter", tags: ["melody", "synth", "polyrhythmic", "psychedelic", "complex"],
      code: `note("[fs4 ~ a4 fs4] [~ b4 ~ cs5] [~ ~ ~ ~] [~ ~ ~ ~]").scale("F#:minor").s("square").decay(0.1).pan(sine.range(0, 1))`,
      initialTransforms: { echo: 0.3, reverb: 0.3 } },

    { id: "melody_modular_bleep", name: "Modular Bleep-Shower", tags: ["melody", "synth", "modular", "bleep", "glitch", "generative"],
      code: `note("[gs5 ~ ~ ds5] [~ fs5 ~ ~] [gs5 ~ as5 ~] [~ b5 ~ ds5]").scale("G#:minor").s("triangle").decay(0.04)`,
      initialTransforms: { echo: 0.2, reverb: 0.2 } },

    { id: "melody_overdriven_101", name: "Overdriven 101", tags: ["melody", "bass", "synth", "overdrive", "sh101", "raw"],
      code: `note("[d3 ~ d3 ~] [~ f3 d3 ~] [gs3 ~ ~ g3] [~ f3 ~ d3]").scale("D:minor").s("saw").decay(0.15)`,
      initialTransforms: { shape: 0.6, lopass: 700 } },

    { id: "melody_tritone_tension", name: "Tritone Tension Loop", tags: ["melody", "tritone", "dark", "dissonant", "minimal"],
      code: `note("[d4 ~ gs3 ~] [~ d4 ~ gs3] [d4 gs3 ~ d4] [~ ~ gs3 ~]").s("sine").decay(0.06).delaytime(0.375)`,
      initialTransforms: { shape: 0.2, lopass: 900, echo: 0.5, reverb: 0.5 } },

    { id: "melody_sparse_dissonant", name: "Sparse Dissonant Stabs", tags: ["melody", "dissonant", "sparse", "dark", "chromatic"],
      code: `note("[~ cs4 ~ ~] [~ ~ b3 ~] [~ cs4 ~ b3] [~ ~ ~ fs3]").s("triangle").decay(0.07)`,
      initialTransforms: { shape: 0.3, lopass: 700, echo: 0.4, reverb: 0.4 } },

    { id: "melody_chromatic_fall", name: "Chromatic Fall", tags: ["melody", "chromatic", "dark", "descending", "minimal"],
      code: `note("[b3 ~ as3 ~] [a3 ~ gs3 ~] [g3 ~ fs3 ~] [f3 ~ e3 ~]").s("triangle").decay(0.1).lpf(sine.range(400, 1500))`,
      initialTransforms: { shape: 0.25, reverb: 0.5 } },

    { id: "melody_phrygian_sparse", name: "E Phrygian Sparse Stabs", tags: ["melody", "phrygian", "sparse", "dark", "dissonant"],
      code: `note("[~ e4 ~ ~] [~ ~ f4 ~] [e4 ~ ~ ds4] [~ ~ e4 ~]").scale("E:phrygian").s("triangle").decay(0.08)`,
      initialTransforms: { shape: 0.2, lopass: 700, echo: 0.4, reverb: 0.45 } },

    { id: "melody_minor_dyad_filter", name: "Minor Dyad Moving Filter", tags: ["melody", "dyad", "minor", "filter", "atmospheric"],
      code: `note("[c3,eb3] ~ ~ ~").s("sine").decay(0.2).sustain(0.1).lpf(sine.range(300, 800).slow(8))`,
      initialTransforms: { reverb: 0.6 } },

    { id: "melody_chromatic_upper", name: "Chromatic Upper Sequence", tags: ["melody", "chromatic", "upper", "dark", "minimal"],
      code: `note("[as4 ~ b4 ~] [~ as4 ~ ~] [b4 ~ c5 ~] [~ b4 as4 ~]").s("triangle").decay(0.07).delaytime(0.375)`,
      initialTransforms: { shape: 0.25, lopass: 800, echo: 0.35, reverb: 0.4 } },

  ],

  transitions: [

    { id: "arp_strobe_bleep", name: "Hypnotic Strobe Bleeps", tags: ["arp", "melody", "bleep", "hypnotic", "stereo"],
      code: `note("c4 eb4 g3 c5").s("sine").decay(0.05).pan(sine.fast(0.5)).delaytime(0.25)`,
      initialTransforms: { reverb: 0.2, echo: 0.5 } },

    { id: "trans_minor_arp_tail", name: "Minor Arp Delay Tail", tags: ["transition", "arp", "minor", "delay", "dark"],
      code: `note("b3 d4 f4 b4").s("triangle").decay(0.04).delaytime(0.375)`,
      initialTransforms: { lopass: 1200, echo: 0.6, reverb: 0.4 } },

    { id: "trans_chromatic_pan", name: "Chromatic Descent Pan", tags: ["transition", "chromatic", "pan", "dark", "descending"],
      code: `note("cs4 c4 b3 as3").s("sine").decay(0.05).pan(sine.fast(0.25)).delaytime(0.5)`,
      initialTransforms: { echo: 0.5, reverb: 0.3 } },

    { id: "trans_sparse_chord_stab", name: "Sparse Chord Stab", tags: ["transition", "chord", "sparse", "dark", "minimal"],
      code: `note("[~ [b3,d4,f4] ~ ~]*2").s("triangle").decay(0.1)`,
      initialTransforms: { shape: 0.2, lopass: 800, reverb: 0.6, room_size: 0.8 } },

    { id: "trans_tritone_arp", name: "Ascending Tritone Arp", tags: ["transition", "tritone", "arp", "ascending", "dark"],
      code: `note("gs3 d4 gs4 d5").s("sine").decay(0.05).pan(sine.fast(0.3)).delaytime(0.25)`,
      initialTransforms: { lopass: 900, echo: 0.6, reverb: 0.4 } },

    { id: "trans_minor7_stab", name: "Minor 7th Chord Stab", tags: ["transition", "chord", "minor7", "dark", "sparse"],
      code: `note("[~ [b3,d4,a4] ~ ~]").s("triangle").decay(0.08)`,
      initialTransforms: { shape: 0.15, lopass: 850, reverb: 0.5, room_size: 0.7 } },

    { id: "trans_tritone_stutter", name: "Tritone Stutter", tags: ["transition", "tritone", "stutter", "dark", "tension"],
      code: `note("[d5 gs4]*8").s("sine").decay(0.03).gain(saw.range(0.2, 0.7).fast(4)).delaytime(0.125)`,
      initialTransforms: { reverb: 0.3, echo: 0.4 } },

  ],
};

export function getPatternById(pillarName, id) {
  return soundLibrary[pillarName]?.find(p => p.id === id) ?? null;
}
