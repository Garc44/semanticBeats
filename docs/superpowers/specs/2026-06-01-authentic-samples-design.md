# Authentic Samples Migration Design

**Date:** 2026-06-01  
**Status:** Approved for implementation

## Summary

Replace all synthesized oscillator patterns in `soundLibrary.js` with authentic hardware drum machine samples (tidal-drum-machines) and vintage instrument samples (dirt-samples). Update `strudel.js` to prebake both sample packs on init. Code structure (stack, note, rhythm mini-notation, DSP chains) stays identical — only the `s()` token changes, plus drums drop `note()` and `penv()`.

---

## 1. Sample Packs

Two packs loaded via `prebake` in `strudel.js`:

| Pack | URL | Contents |
|------|-----|----------|
| tidal-drum-machines | `https://raw.githubusercontent.com/felixroos/dough-samples/main/tidal-drum-machines.json` | Roland TR-808/909 + 60+ other drum machines |
| dirt-samples | `github:tidalcycles/dirt-samples` | Pitched instruments: moog, bass, juno, fm, arpy, pad, etc. |

---

## 2. `strudel.js` Changes

```js
import { initStrudel, samples, evaluate as _evaluate, hush } from '@strudel/web';

export async function init() {
  try {
    await initStrudel({
      prebake: () => Promise.all([
        samples('https://raw.githubusercontent.com/felixroos/dough-samples/main/tidal-drum-machines.json'),
        samples('github:tidalcycles/dirt-samples')
      ])
    });
    initialized = true;
    console.log("Strudel sample packs baked successfully.");
  } catch (error) {
    console.error("Failed to preload Strudel sample packs:", error);
    throw error;
  }
}
```

`initialized = true` only on success. Catch rethrows so `app.js` can surface the init failure.

---

## 3. Genre → Machine Mapping

| Genre | Drum Bank | Bass Bank | Synth Bank |
|-------|-----------|-----------|------------|
| `techno` | `RolandTR909` | `moog` | `juno` |
| `dub_techno` | `RolandTR808` | `bass` | `pad` |
| `hardgroove` | `RolandTR909` | `bass` | `fm` |
| `schranz` | `RolandTR909` | `bass` | `fm` |

Schranz patterns keep their existing `.distort()` / `.lpf()` chains — samples pass through the same DSP.

---

## 4. Sample Token Syntax

tidal-drum-machines uses `.bank()` as a machine selector. Instrument category tokens:

| Token | Sound |
|-------|-------|
| `bd` | Bass drum / kick |
| `sd` | Snare drum |
| `hh` | Closed hi-hat |
| `oh` | Open hi-hat |
| `cp` | Hand clap |

```js
// Correct
s("bd:0*4").bank("RolandTR909").decay(0.12).gain(0.82)

// Wrong — looks for a literal folder named "RolandTR909", returns silence
s("RolandTR909:0*4").decay(0.12).gain(0.82)
```

dirt-samples uses plain folder names directly in `s()` — no `.bank()` needed:

```js
note("c1 ~ c1 ~").s("bass").lpf(160).decay(0.07)
note("c3 eb3 g3").s("juno").decay(0.3)
```

---

## 5. Pillar Translation Rules

### kick (drum triggers)

Drop `note()`. Drop `penv()` — transient baked into sample. Keep `.decay()`, `.gain()`, `.distort()`, `.lpf()`.

```js
// before
note("c1*4").s("sine").penv("4 0").decay(0.12).sustain(0).gain(0.82)
// after
s("bd:0*4").bank("RolandTR909").decay(0.12).gain(0.82)
```

Pattern-level variation via `:N` index (e.g. `bd:0` through `bd:3` for 909's four kick variations).

### groove (drum triggers)

Drop `note()`. Drop `.hp()` / `.hpq()` — those were shaping white noise; real hat/snare samples don't need it. Rhythm moves into `s()` mini-notation.

```js
// before
note("c6*8").s("white").decay(0.03).sustain(0).hp(450).hpq(0.3).gain(0.25)
// after
s("hh*8").bank("RolandTR909").decay(0.03).gain(0.25)
```

Open hat uses `oh`. Snare backbeat uses `sd`. Schranz shaker: `cp` clap stacked with fast `hh`.

### rumble_bass (pitched — keep note())

Keep `note()`, `stack()`, `.slow()`, `.lpf()`, `.lpq()`, `.gain()`, `.decay()`. Swap synth name only.

| Old synth | New sample |
|-----------|------------|
| `s("sawtooth")` | `s("moog")` (techno) or `s("bass")` (others) |
| `s("sine")` | `s("bass")` (sub roundness) |
| `s("square")` | `s("fm")` (schranz) |
| `s("white")` noise texture | keep as `s("white")` — synth texture, not instrument |

### synth_fx (pitched — keep note())

Same rule as rumble_bass. Swap synth name, preserve everything else.

| Old synth | New sample |
|-----------|------------|
| `s("triangle")` | `s("arpy")` |
| `s("sawtooth")` | `s("juno")` |
| `s("square")` | `s("fm")` |

---

## 6. Files Changed

| File | Change |
|------|--------|
| `src/strudel.js` | Add `samples` import, replace `initStrudel({})` with prebake block |
| `src/library/soundLibrary.js` | Rewrite all 24 patterns across 4 pillars |

No changes to `app.js`, `patchEngine.js`, `llm.js`, `validate.js`, `operations.js`, or tests. The pattern strings are data — the engine is unchanged.

---

## 7. Testing

No automated tests cover `soundLibrary.js` pattern strings (they're data, not logic). Verification is manual:

1. `npm run dev` → click Play
2. Confirm audio loads (no silence, no console errors)
3. Cycle through all 4 genre presets — each should sound distinct
4. Confirm techno/hardgroove use 909 character, dub uses 808 character
5. Confirm bass/synth pillars pitch-shift correctly across pattern notes
