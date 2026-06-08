---
name: strudel-sound-designer
description: Use when adding genres to the Strudel sound library, generating new 6-pillar patterns, or expanding the electronic style catalog for the music webapp.
---

# Strudel Sound Designer

## Overview

Generates valid JavaScript entries for `STYLE_LIBRARY` — a map of genre names to 6 independent Strudel pattern strings. Each genre covers foundation, bassline, percussion, melody, atmosphere, and fx pillars.

## Target Genre Catalog

When asked to build or expand the library, cover these electronic genres (add more as requested):

| Genre | Character |
|-------|-----------|
| `techno` | Hard kick, dark synth, industrial percussion |
| `house` | Four-on-floor, soulful bassline, open hats |
| `acid` | 303-style bassline, snappy drums, squelchy leads |
| `drum_and_bass` | Fast break (~170bpm), sub bass, rolling amen |
| `ambient` | Slow pads, sparse percussion, long atmosphere |
| `breakbeat` | Syncopated breaks, funk bass, chopped hats |
| `minimal` | Sparse kick/clap, dry bass, subtle movement |
| `industrial` | Distorted hits, metallic percussion, noise pads |
| `lo_fi` | Dusty drums, warm bass, detuned melody |
| `trance` | Arpeggiated lead, pumping kick, lush pads |

## 6-Pillar Architecture

Every style needs exactly these 6 keys:

| Pillar | Role |
|--------|------|
| `foundation` | Kick + snare/clap backbone |
| `bassline` | Sub or mid-range groove |
| `percussion` | Hi-hats, shakers, rim clicks |
| `melody` | Lead hook or arpeggio |
| `atmosphere` | Pad layers, ambient chords |
| `fx` | Crashes, risers, transitions on beat intervals |

## Sound Engineering Rules

**Gain balance — non-negotiable:**
- `foundation`, `bassline`: `.gain(0.7)` – `.gain(0.85)`
- `melody`, `percussion`, `atmosphere`, `fx`: `.gain(0.2)` – `.gain(0.4)`

**Sample naming** — use TidalCycles `dirt-samples` folders with explicit indices:
```
s("909:0")   // kick
s("909:5")   // snare
s("hh:0")    // closed hat
s("hh:2")    // open hat
s("808:0")   // 808 kick
s("bd:0")    // bass drum variant
s("industrial:3")  // industrial hit
```

**Synth decay** — always include `.decay(X).sustain(0)` to prevent note overlap:
```javascript
s("sawtooth").decay(0.1).sustain(0)   // short pluck
s("triangle").decay(0.4).sustain(0)  // medium lead
s("sine").decay(2).sustain(0)        // slow pad tone
```

## Output Format

```javascript
export const STYLE_LIBRARY = {
  techno: {
    foundation:   `s("909:0*4").gain(0.82)`,
    bassline:     `note("c1 ~ c1 ~").s("sawtooth").decay(0.08).sustain(0).gain(0.75)`,
    percussion:   `s("hh:0*8").gain(0.25).pan(sine)`,
    melody:       `note("c3 eb3 g3 bb3").s("triangle").decay(0.3).sustain(0).slow(2).gain(0.3)`,
    atmosphere:   `note("[c2,g2,bb2]").s("sine").slow(4).decay(3).sustain(0).gain(0.2)`,
    fx:           `s("~ ~ ~ industrial:3").gain(0.35)`
  },
  house: {
    foundation:   `s("909:0*4 ~ 909:5 ~").gain(0.8)`,
    bassline:     `note("c2 ~ eb2 ~").s("sawtooth").decay(0.15).sustain(0).gain(0.75)`,
    percussion:   `s("hh:0*8 hh:2*2").gain(0.28)`,
    melody:       `note("c4 eb4 g4").s("triangle").decay(0.2).sustain(0).slow(2).gain(0.25)`,
    atmosphere:   `note("[c3,eb3,g3]").s("sine").slow(2).decay(2).sustain(0).gain(0.2)`,
    fx:           `s("~ ~ 909:2 ~").gain(0.3)`
  }
  // ... add remaining genres following same pattern
};
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Synth without `.decay().sustain(0)` | Notes stack → mud. Always add both. |
| `foundation` gain above 0.85 | Master clips. Cap at 0.85. |
| `melody` gain above 0.4 | Drowns mix. Keep 0.2–0.4. |
| Missing a pillar key | Webapp breaks on missing pillar lookup. All 6 required. |
| Generic sample `s("bd")` without index | Unpredictable sample selection. Use `s("bd:0")`. |
| Using non-dirt-samples names | Runtime error. Stick to `909`, `808`, `bd`, `hh`, `snare`, `industrial`. |

## Output File

Write generated styles to:
```
src/library/soundLibrary.js
```

Import in webapp where the 6-pillar format is consumed.
