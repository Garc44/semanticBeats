# 4-Pillar Restructure Design

**Date:** 2026-06-01
**Status:** Approved

## Summary

Collapse 6 pillars (`foundation`, `bassline`, `percussion`, `melody`, `atmosphere`, `fx`) into 4 semantically cleaner pillars (`kick`, `rumble_bass`, `groove`, `synth_fx`). Two pillars are simple renames; two are new merged catalogs with baked `stack()` patterns.

## New Pillar Map

| New Pillar | Source | Strategy |
|---|---|---|
| `kick` | `foundation` | Rename only — patterns and IDs unchanged |
| `rumble_bass` | `bassline` + `atmosphere` | New catalog, 3 baked `stack()` patterns |
| `groove` | `percussion` | Rename only — patterns and IDs unchanged |
| `synth_fx` | `melody` + `fx` | New catalog, 3 baked `stack()` patterns |

## Pattern Catalog

### `kick` (unchanged from `foundation`)
- `kick_sine_44` — Sine Kick 4/4
- `kick_square_44` — Square Kick 4/4
- `kick_acid_44` — Acid Kick 4/4

### `groove` (unchanged from `percussion`)
- `perc_minimal_hats` — Minimal Hi-Hats
- `perc_acid_backbeat` — Acid Backbeat
- `perc_industrial_fast` — Industrial Rapid Hats

### `rumble_bass` (new — bass + drone stacked)
- `rumble_hypnotic` — hypnotic saw bass sidechain + deep sine pad `[c2,g2,bb2]` slow4
- `rumble_acid` — 303 saw bass lpf800 + acid chord drone `[c2,eb2]` slow4
- `rumble_industrial` — distorted bass `c1~~~c1` + sparse sine drone `c2` slow8

### `synth_fx` (new — melody + fx stacked)
- `synthfx_hypnotic` — triangle minor phrase `c3 eb3 g3 bb3` slow2 hp450 + square accent `~~~c1` distort
- `synthfx_acid` — saw acid seq `c3~eb3~g3~bb3~` lpf1200 hp450 + square burst `c2*2` distort
- `synthfx_industrial` — square riff `c3 c3 eb3 c3` distort + square slam `~~~c1` distort0.9

## GENRE_PRESETS

```js
techno: {
  kick:        "kick_sine_44",
  rumble_bass: "rumble_hypnotic",
  groove:      "perc_minimal_hats",
  synth_fx:    "synthfx_hypnotic",
}
```

## Architecture Notes

- `assembleCode`, `rebuildStack`, `app.js`, `llm.js`, `validate.js`, `patchEngine.js` — no changes needed. All consume `pillarName` dynamically.
- Baked `stack()` patterns are valid Strudel strings. `assembleCode` appends `.slow()/.speed()/.gain()` modifiers to the outer expression — this works correctly with `stack(...)` as the base.
- UI display fix: `pillar.name.replace(/_/g, ' ').toUpperCase()` so "RUMBLE BASS" not "RUMBLE_BASS".

## Files Changed

| File | Change |
|---|---|
| `src/pillars.js` | `PILLAR_NAMES` → `['kick', 'rumble_bass', 'groove', 'synth_fx']` |
| `src/library/soundLibrary.js` | Rename 2 keys, add 2 new catalogs, update `GENRE_PRESETS` |
| `src/library/styles.js` | DELETE (dead code — never imported) |
| `src/ui.js` | `replace(/_/g,' ')` before `.toUpperCase()` |
| `tests/pillars.test.js` | Count 6→4, name assertions updated |
| `tests/library.test.js` | Local `PILLAR_NAMES` → 4 names, fix pillar-specific assertions |

## Test Changes Detail

**`tests/pillars.test.js`:**
- Expected array: `['kick', 'rumble_bass', 'groove', 'synth_fx']`
- `.toHaveLength(4)`
- Solo test: `soloedPillar: 'foundation'` → `'kick'`

**`tests/library.test.js`:**
- Local `PILLAR_NAMES` const updated to 4 names
- `'exports all 6 pillars'` → `'exports all 4 pillars'`
- `getPatternById('foundation', 'kick_sine_44')` → `getPatternById('kick', 'kick_sine_44')`
- `getPatternById('bassline', 'bass_acid_303')` → `getPatternById('rumble_bass', 'rumble_acid')`
