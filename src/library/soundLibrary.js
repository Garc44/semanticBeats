export const SYNTH_DRUMS = {
  "909:0":      `note("c1").s("sine").penv("4 0").decay(0.12).sustain(0)`,
  "bd:0":       `note("b0").s("sine").penv("3 0").decay(0.09).sustain(0)`,
  "snare:0":    `s("white").decay(0.08).sustain(0).lpf(3000)`,
  "hh:0":       `s("white").decay(0.03).sustain(0).hpf(5000)`,
  "hh:1":       `s("white").decay(0.18).sustain(0).hpf(4000)`,
  "hh:2":       `s("white").decay(0.05).sustain(0).hpf(5500)`,
  "industrial": `note("c1").s("square").decay(0.08).sustain(0).distort(0.7)`,
};

export const GENRE_NAMES = [
  'techno', 'house', 'acid', 'drum_and_bass', 'ambient',
  'breakbeat', 'minimal', 'industrial', 'lo_fi', 'trance',
];

export function getGenre(name) {
  return GENRE_LIBRARY[name] ?? null;
}

export const GENRE_LIBRARY = {
  techno: {
    foundation:   `note("c1*4").s("sine").penv("4 0").decay(0.12).sustain(0).gain(0.82)`,
    bassline:     `note("c1 ~ c1 ~").s("sawtooth").decay(0.08).sustain(0).gain(0.75)`,
    percussion:   `note("c6*8").s("white").decay(0.03).sustain(0).hpf(5000).gain(0.25)`,
    melody:       `note("c3 eb3 g3 bb3").s("triangle").decay(0.3).sustain(0).slow(2).gain(0.3)`,
    atmosphere:   `note("[c2,g2,bb2]").s("sine").slow(4).decay(3).sustain(0).gain(0.2)`,
    fx:           `note("~ ~ ~ c1").s("square").decay(0.08).sustain(0).distort(0.7).gain(0.35)`,
  },

  house: {
    foundation:   `stack(note("c1 ~ c1 ~").s("sine").penv("4 0").decay(0.12).sustain(0), note("~ ~ g2 ~").s("white").decay(0.08).sustain(0).lpf(3000)).gain(0.8)`,
    bassline:     `note("c2 ~ eb2 g2").s("sawtooth").decay(0.15).sustain(0).gain(0.75)`,
    percussion:   `note("c6*8").s("white").decay(0.03).sustain(0).hpf(5000).gain(0.28)`,
    melody:       `note("c4 eb4 g4 bb4").s("triangle").decay(0.25).sustain(0).slow(2).gain(0.25)`,
    atmosphere:   `note("[c3,eb3,g3]").s("sine").slow(2).decay(2).sustain(0).gain(0.2)`,
    fx:           `note("~ ~ g2 ~").s("white").decay(0.06).sustain(0).lpf(4000).gain(0.3)`,
  },

  acid: {
    foundation:   `stack(note("c1 ~ c1 c1").s("sine").penv("4 0").decay(0.12).sustain(0), note("~ g2 ~ ~").s("white").decay(0.08).sustain(0).lpf(3000)).gain(0.82)`,
    bassline:     `note("c2 c2 eb2 c2 bb1 c2 g1 ~").s("sawtooth").decay(0.05).sustain(0).gain(0.8)`,
    percussion:   `note("c6*16").s("white").decay(0.03).sustain(0).hpf(5000).gain(0.22)`,
    melody:       `note("c4 eb4 c4 bb3").s("square").decay(0.1).sustain(0).gain(0.28)`,
    atmosphere:   `note("[c2,g2]").s("sawtooth").slow(4).decay(1).sustain(0).gain(0.18)`,
    fx:           `note("~ ~ ~ c6").s("white").decay(0.12).sustain(0).hpf(4000).gain(0.32)`,
  },

  drum_and_bass: {
    foundation:   `stack(note("b0 ~ ~ b0 ~ b0 ~ ~").s("sine").penv("3 0").decay(0.09).sustain(0), note("~ ~ g2 ~ ~ ~ g2 ~").s("white").decay(0.08).sustain(0).lpf(3000)).fast(2).gain(0.8)`,
    bassline:     `note("c1 ~ ~ eb1 ~ c1 g1 ~").s("sine").decay(0.12).sustain(0).gain(0.82)`,
    percussion:   `note("c6 c6 c6 c6").s("white").fast(2).decay(0.04).sustain(0).hpf(5000).gain(0.24)`,
    melody:       `note("c4 ~ eb4 ~ g4 ~ bb4 ~").s("triangle").decay(0.15).sustain(0).gain(0.28)`,
    atmosphere:   `note("[c2,g2,bb2]").s("sine").slow(2).decay(2).sustain(0).gain(0.2)`,
    fx:           `note("~ ~ ~ ~ ~ ~ ~ c1").s("square").decay(0.08).sustain(0).distort(0.7).gain(0.38)`,
  },

  ambient: {
    foundation:   `note("b0 ~ ~ ~").s("sine").penv("3 0").decay(0.09).sustain(0).slow(2).gain(0.7)`,
    bassline:     `note("c1 ~ ~ ~").s("sine").slow(4).decay(4).sustain(0).gain(0.72)`,
    percussion:   `note("c6*2").s("white").slow(2).decay(0.18).sustain(0).hpf(4000).gain(0.2)`,
    melody:       `note("c4 g4 bb4 g4").s("triangle").slow(4).decay(1.5).sustain(0).gain(0.22)`,
    atmosphere:   `note("[c3,g3,bb3,d4]").s("sine").slow(8).decay(6).sustain(0).gain(0.35)`,
    fx:           `note("~ ~ ~ ~").s("sine").gain(0.0)`,
  },

  breakbeat: {
    foundation:   `stack(note("b0 ~ ~ b0").s("sine").penv("3 0").decay(0.09).sustain(0), note("~ ~ c6 ~").s("white").decay(0.03).sustain(0).hpf(5000), note("~ g2 ~ g2").s("white").decay(0.08).sustain(0).lpf(3000)).gain(0.8)`,
    bassline:     `note("c2 eb2 ~ g2 ~ c2 ~ bb1").s("sawtooth").decay(0.1).sustain(0).gain(0.78)`,
    percussion:   `note("c6 ~ c6 ~ c6 c6 ~ c6").s("white").decay(0.04).sustain(0).hpf(5000).gain(0.26)`,
    melody:       `note("c4 eb4 g4 bb4").s("square").decay(0.2).sustain(0).slow(2).gain(0.28)`,
    atmosphere:   `note("[c3,g3]").s("triangle").slow(4).decay(2).sustain(0).gain(0.2)`,
    fx:           `note("~ ~ c1 ~").s("square").decay(0.08).sustain(0).distort(0.7).gain(0.33)`,
  },

  minimal: {
    foundation:   `stack(note("c1 ~ ~ ~").s("sine").penv("4 0").decay(0.12).sustain(0), note("~ ~ g2 ~").s("white").decay(0.08).sustain(0).lpf(3000)).gain(0.78)`,
    bassline:     `note("c2 ~ ~ c2").s("sine").decay(0.18).sustain(0).gain(0.72)`,
    percussion:   `note("c6 ~ c6 ~").s("white").decay(0.03).sustain(0).hpf(5000).gain(0.22)`,
    melody:       `note("c4 ~ ~ g4").s("triangle").decay(0.35).sustain(0).slow(2).gain(0.22)`,
    atmosphere:   `note("[c3,g3]").s("sine").slow(8).decay(4).sustain(0).gain(0.18)`,
    fx:           `note("~ ~ ~ ~").s("sine").gain(0.0)`,
  },

  industrial: {
    foundation:   `stack(note("c1*4").s("square").decay(0.08).sustain(0).distort(0.7), note("~ c2 ~ c2").s("square").decay(0.06).sustain(0).distort(0.9)).gain(0.85)`,
    bassline:     `note("c1 ~ c1 ~").s("square").decay(0.06).sustain(0).gain(0.8)`,
    percussion:   `note("c1*8").s("square").decay(0.04).sustain(0).distort(0.8).hpf(200).gain(0.3)`,
    melody:       `note("c3 ~ eb3 ~").s("square").decay(0.12).sustain(0).gain(0.28)`,
    atmosphere:   `note("[c1,g1]").s("sawtooth").slow(4).decay(2).sustain(0).gain(0.22)`,
    fx:           `note("~ c1 ~ c1").s("square").decay(0.1).sustain(0).distort(0.9).gain(0.38)`,
  },

  lo_fi: {
    foundation:   `stack(note("b0 ~ ~ b0").s("sine").penv("3 0").decay(0.09).sustain(0), note("~ ~ g2 ~").s("white").decay(0.08).sustain(0).lpf(3000)).gain(0.75)`,
    bassline:     `note("c2 eb2 ~ g2").s("triangle").decay(0.2).sustain(0).gain(0.72)`,
    percussion:   `note("c6*8").s("white").decay(0.05).sustain(0).hpf(5500).gain(0.22)`,
    melody:       `note("c4 eb4 g4 bb4").s("triangle").decay(0.5).sustain(0).slow(2).gain(0.25)`,
    atmosphere:   `note("[c3,eb3,g3,bb3]").s("sine").slow(4).decay(3).sustain(0).gain(0.2)`,
    fx:           `note("~ ~ c6 ~").s("white").decay(0.08).sustain(0).hpf(4500).gain(0.25)`,
  },

  trance: {
    foundation:   `stack(note("c1*4").s("sine").penv("4 0").decay(0.12).sustain(0), note("~ ~ g2 ~").s("white").decay(0.08).sustain(0).lpf(3000)).gain(0.82)`,
    bassline:     `note("c2 ~ g2 ~").s("sawtooth").decay(0.1).sustain(0).gain(0.78)`,
    percussion:   `note("c6*8").s("white").decay(0.03).sustain(0).hpf(5000).gain(0.25)`,
    melody:       `note("c4 eb4 g4 bb4 c5 bb4 g4 eb4").s("sawtooth").decay(0.12).sustain(0).gain(0.3)`,
    atmosphere:   `note("[c3,g3,bb3,d4]").s("sine").slow(4).decay(4).sustain(0).gain(0.32)`,
    fx:           `note("~ ~ ~ g2").s("white").decay(0.06).sustain(0).lpf(4000).gain(0.35)`,
  },
};
