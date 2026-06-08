# Design: Split bass_percussion into bass + percussion

**Date:** 2026-06-08

## Summary

Split the `bass_percussion` pillar into two independent pillars: `bass` and `percussion`. Remove `GENRE_PRESETS`, `GENRE_NAMES`, and `getGenreCode` entirely.

## Library Changes (`soundLibrary.js`)

- `bass` pillar: all 6 `rumble_*` patterns (unchanged)
- `percussion` pillar: all 5 `perc_*` patterns (unchanged)
- Remove `GENRE_PRESETS`, `GENRE_NAMES`, `getGenreCode`

## Pillar Order (`pillars.js`)

```
['drums', 'bass', 'percussion', 'melody', 'transitions']
```

Knob defaults:
- `bass`: `{ gain: 0.7, cutoff: 1.0, stutter: 0.0 }` (inherited from bass_percussion)
- `percussion`: `{ gain: 0.6, decay: 0.12 }` (mirrors drums, lighter)

## Compiler (`compiler.js`)

- `bass` case: `gain + lpf(cutoff*1200) + degradeBy(stutter*0.4)` — same as current bass_percussion
- `percussion` case: `gain + decay` — mirrors drums pattern

## LLM Roles (`llm.js`)

- `bass`: `'low-end movement — bass lines, sub, rumble'`
- `percussion`: `'rhythmic texture — hi-hats, rides, shakers'`

## App Cleanup (`app.js`)

- Remove `loadGenre` function
- Remove genre bar DOM wiring
- Remove `GENRE_NAMES`, `getGenreCode` imports

## HTML Cleanup (`index.html`)

- Remove `#genre-bar` element

## Tests

- `pillars.test.js`: replace `bass_percussion` with `bass` + `percussion`, add knob defaults for both
- `compiler.test.js`: add cases for `bass` and `percussion`, remove `bass_percussion`
- `library.test.js`: remove genre preset tests, update pillar name references
- `validate.test.js`: update any pillar name references
