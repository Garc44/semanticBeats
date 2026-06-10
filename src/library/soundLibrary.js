export const soundLibrary = {
  drums: [
    { id: "kick_berghain_rumble", name: "Klockworks Reverb Rumble", tags: ["kick", "industrial", "distorted", "techno", "4x4"], code: `s("bd*4").bank("RolandTR909").shape(0.4).room(0.5).sz(0.8).lpf(400).lpq(2).gain(1.15)`},

    { id: "kick_dirt_club_house",  name: "Dirt Clubkick House Thump",  tags: ["kick", "dirt", "club", "house", "warm"],  code: `s("clubkick*4").lpf(650).lpq(1.5).room(0.1).gain(1.25)`},
    
  ],


  bass: [
    { 
      id: "bass_acid_squelch",
      name: "Acid Squelch Bass",
      tags: ["bass", "acid", "303", "techno"], 
      code: `note("c1 [~ eb1] c1 [g1 bb1]").s("sawtooth").lpf(sine.range(200, 3000).fast(0.5)).lpq(4)` 
    },


    { 
      id: "bass_rolling_hypnotic", 
      name: "Rolling Hypnotic Bass", 
      tags: ["bass", "hypnotic", "rolling", "progressive", "techno"], 
      code: `note("[~ e1 e1 e1] [~ e1 e1 f1] [~ e1 e1 e1] [~ f1 ~ ds1]").scale("E:minor").s("saw").lpf(400).decay(0.12).shape(0.15)`
    },
    { 
      id: "bass_minimal_offbeat", 
      name: "Minimalistic Offbeat Hook", 
      tags: ["bass", "minimal", "offbeat", "groove", "house"], 
      code: `note("[~ a1] [~ a1] [~ c2] [b1 ~ g1 ~]").scale("A:minor").s("square").decay(0.08).lpf(600).resonance(0.2)`
    },
    { 
      id: "bass_industrial_sub", 
      name: "Industrial Sub-Slinker", 
      tags: ["bass", "sub", "industrial", "dark", "slinker"], 
      code: `note("[~ d1] [cs1 d1] [~ cs1] [d1 ~ cs1 d1]").scale("D:phrygian").s("sine").shape(0.4).lpf(250).decay(0.15).room(0.2)`
    },
    { 
      id: "bass_tribal_tom", 
      name: "Tribal Tom-Bass Groove", 
      tags: ["bass", "tribal", "tom", "groove", "percussive"], 
      code: `note("[~ g1] [g1 ~ g1 ~] [~ bb1] [g1 ~ f1 ~]").scale("G:minor").s("triangle").decay(0.18).lpf(350).resonance(0.3)`
    },

    { 
      id: "bass_rolling_saw_driver", 
      name: "Rolling Saw Driver", 
      tags: ["bass", "saw", "techno", "rolling", "classic"], 
      code: `note("[~ ~ c2 ~] [c2 ~ ~ c2] [~ ~ c2 ~] [c2 ~ c3 ~]")
              .s("saw")
              .lpf(400)
              .decay(0.15).sustain(0.05)`
    },

    { 
      id: "bass_stereo_groove_saw", 
      name: "Stereo Groove Saw", 
      tags: ["bass", "saw", "groove", "hypnotic", "stereo"], 
      code: `note("[~ c2 ~ c2] [~ c2 eb2 ~] [~ c2 ~ c2] [~ bb1 ~ c2]")
              .s("saw")
              .lpf(400)
              .decay(0.15).sustain(0.05)
              .pan("0.4 0.6")`
    },

     { 
      id: "bass_accented_offbeat_sub", 
      name: "Accented Offbeat Sub", 
      tags: ["bass", "sub", "sine", "offbeat", "deep"], 
      code: `note("[~ c3]*4") 
              .s("sine")
              .gain("[1 1.1 1 1.2]*2") 
              .attack(0.02).decay(0.2).sustain(0) 
              .lpf(200)`
  },
  { 
    id: "bass_resonant_acid_stepper", 
    name: "Resonant Acid Stepper", 
    tags: ["bass", "saw", "acid", "resonance", "driving"], 
    code: `note("c2 c2 c3 c2  eb2 ~ c2 g2  ~ c2 c3 c2  f2 c2 ~ eb2")
            .s("saw | sawtooth")
            .decay(0.08).sustain(0.05)
            .resonance(10) 
            .lpf("300 450 600 400")`
  },

  { 
    id: "bass_dub_cavern_chord", 
    name: "Dub Cavern Chord", 
    tags: ["bass", "chord", "dub", "delay", "atmospheric"], 
    code: `note("[~ [c2,eb2,g2] ~ ~]*2")
            .s("triangle")
            .lpf(280)                
            .decay(0.15).sustain(0)
            .delay(0.6)              
            .delaytime(0.375)`
  }




  ],


  percussion: [
  { 
    id: "perc_industrial_iron", 
    name: "Kompakt Metal Shakers", 
    tags: ["perc", "hihat", "industrial", "metallic"], 
    code: `stack(s("~ oh*4").gain(0.85), s("hh*16").gain(saw.range(0.2, 0.7).fast(4))).hpf(2200).hpq(2).crush(5)`
  },
  { 
    id: "perc_distressed_clap",
    name: "Factory Floor Clap", 
    tags: ["perc", "clap", "industrial", "lo-fi", "distorted"], 
    code: `s("~ cp").shape(0.8).crush(8).hpf(800).room(0.5).sz(0.6)`
  },
   
  { 
    id: "perc_morphing_minimalist", 
    name: "The Morphing Minimalist", 
    tags: ["perc", "minimal", "modulation", "filter", "panning", "hats"], 
    code: `stack(
            s("hh*16").gain(sine.slow(2).range(0.2, 0.6)).lpf(sine.slow(8).range(800, 3000)).lpq(10), 
            s("click(7,16)").gain(0.8).pan(sine.slow(4).range(0.2, 0.8)).room(0.4),
          )`
  },
  { 
    id: "perc_breathing_ghost", 
    name: "The Breathing Ghost", 
    tags: ["perc", "ambient", "generative", "probability", "filter", "ghostly"], 
    code: `stack(
            s("~ oh").gain(0.7).room(0.3), 
            s("hh*16").degradeBy(sine.slow(8).range(0.1, 0.75)).hpf(saw.slow(6).range(1200, 6000)).hpq(4).gain(0.5),
          )`
  },
  { 
    id: "perc_tape_drift_warp", 
    name: "The Tape-Drift Warp", 
    tags: ["perc", "lo-fi", "tape-drift", "pitch-modulation", "warp", "rimshot"], 
    code: `stack()
            s("rim(5,8)").speed(sine.slow(5).range(0.7, 1.4)).pan(saw.slow(4).range(0.1, 0.9)).room(0.5) .sz(0.6) .gain(0.7), 
            s("~ oh/2").gain(0.6),
          )`
  },
  { 
    id: "perc_909_warehouse_anthem", 
    name: "The 909 Warehouse Anthem", 
    tags: ["perc", "909", "techno", "industrial", "warehouse", "driving"], 
    code: `stack(
            s("~ cp ~ cp").gain(0.9).room(0.6).sz(0.8), 
            s("~ oh ~ oh ~ oh ~ oh").gain(0.8), 
            s("~ ride ~ ride ~ ride ~ ride").gain("[0.5 0.8]*2"),
          )`
  },
  { 
    id: "perc_motor_city_groove", 
    name: "The Motor City Groove", 
    tags: ["perc", "detroit", "techno", "groove", "toms", "syncopated"], 
    code: `stack(
            s("~ cp ~ cp").gain(0.8), 
            s("~ oh ~ oh ~ oh ~ oh").gain(0.7), 
            s("lt ~ mt ~ ~ ht lt ~").gain("[0.7 0.5]*4").room(0.3)),
          )`
  }
 

  ],

  melody: [
    { 
      id: "melody_ostgut_synth", 
      name: "Dystopian FM Sequence", 
      tags: ["melody", "synth", "hypnotic", "dark"], 
      code: `note("[c3 eb3 b2 c3] [g3 c4 fis3 c3]").s("triangle").shape(0.3).decay(0.08).lpf(sine.range(500, 1800)).delay(0.5).room(0.5)`
    },
    { 
      id: "melody_acid_sequence", 
      name: "Underground Acid Morph",
      tags: ["melody", "acid", "303", "squelch", "sequence"], 
      code: `note("c2 [~ eb2] c2 [f2 g2] bb1 c2 [~ c3] c2").s("sawtooth").lpf(sine.range(200, 4000).fast(0.125)).lpq(4).shape(0.3).decay(0.12)`
    },
    { 
    id: "melody_shimmering_trance", 
    name: "Shimmering Trance-Inducer", 
    tags: ["melody", "synth", "trance", "shimmer", "hypnotic"], 
    code: `note("[e4 ~ b4 ~] [g4 ~ e4 ~] [b4 ~ c5 ~] [b4 ~ g4 ~]").scale("E:minor").s("supercomb").decay(0.25).delay(0.4).room(0.6).lpf(sine.range(1000, 3000))`
  },
  { 
    id: "melody_acid_chirp", 
    name: "Minimalist Acid Chirp", 
    tags: ["melody", "synth", "acid", "minimal", "squelch"], 
    code: `note("[~ a4 ~ ~] [~ bb4 ~ c5] [~ a4 ~ ~] [~ bb4 ~ ~]").scale("A:phrygian").s("saw").shape(0.2).decay(0.05).resonance(0.5).lpf(saw.range(300, 1500))`
  },
  { 
    id: "melody_brain_melter", 
    name: "Polyrhythmic Brain Melter", 
    tags: ["melody", "synth", "polyrhythmic", "psychedelic", "complex"], 
    code: `note("[fs4 ~ a4 fs4] [~ b4 ~ cs5] [~ ~ ~ ~] [~ ~ ~ ~]").scale("F#:minor").s("square").decay(0.1).pan(sine.range(0, 1)).delay(0.3).room(0.3)`
  },
  { 
    id: "melody_berlin_monolith", 
    name: "Berlin Monolith", 
    tags: ["melody", "synth", "techno", "berlin", "industrial", "dark"], 
    code: `note("[b4 ~ b4 ~] [~ d5 ~ b4] [cs5 ~ b4 ~] [~ e5 ~ d5]").scale("B:minor").s("saw").shape(0.4).decay(0.12).lpf(900).room(0.5).delay(0.25)`
  },
  { 
    id: "melody_modular_bleep", 
    name: "Modular Bleep-Shower", 
    tags: ["melody", "synth", "modular", "bleep", "glitch", "generative"], 
    code: `note("[gs5 ~ ~ ds5] [~ fs5 ~ ~] [gs5 ~ as5 ~] [~ b5 ~ ds5]").scale("G#:minor").s("triangle").decay(0.04).gain(0.9).delay(0.2).room(0.2)`
  },
  { 
    id: "melody_overdriven_101", 
    name: "Overdriven 101", 
    tags: ["melody", "bass", "synth", "overdrive", "sh101", "raw"], 
    code: `note("[d3 ~ d3 ~] [~ f3 d3 ~] [gs3 ~ ~ g3] [~ f3 ~ d3]").scale("D:minor").s("saw").shape(0.6).decay(0.15).lpf(700)`
  }

  ],
  transitions: [
    
    { id: "arp_strobe_bleep", name: "Hypnotic Strobe Bleeps", tags: ["arp", "melody", "bleep", "hypnotic", "stereo"], code: `note("c4 eb4 g3 c5").s("sine").decay(0.05).pan(sine.fast(0.5)).room(0.2).delay(0.5).delaytime(0.25).gain(0.7)`}
  ],
};

export function getPatternById(pillarName, id) {
  return soundLibrary[pillarName]?.find(p => p.id === id) ?? null;
}