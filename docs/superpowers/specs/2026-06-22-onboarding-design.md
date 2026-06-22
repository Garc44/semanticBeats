# Onboarding Flow — Design

**Date:** 2026-06-22
**Status:** Approved, pending implementation plan

## Problem

New users land on five empty pillar columns with no sound, no guidance, and no
obvious first move. The path to a satisfying result (pick a layer's sound → tweak
→ play) is invisible. This kills the first-30-seconds experience and leaves
amateurs unsure how to get something that sounds good.

## Goal

A first-run onboarding that teaches the core mental model and the three core moves,
then gets out of the way. Welcome card → spotlight tour over the real UI. Shows
once; replayable on demand.

## Non-Goals

- No autoplay / default track on load (rejected during brainstorm).
- No genre-preset bar (separate future work; the orphaned `.btn-genre` CSS is out
  of scope here).
- No third-party tour library (adds a dependency and fights the theme).
- No automated tests of DOM rendering (matches existing convention — UI untested).

## Approach

Vanilla JS module, no new dependencies, matching the existing `src/ui.js`
DOM-helper style. Spotlight uses the box-shadow "hole" trick: a large dark
box-shadow spread around the target element dims everything else while the target
stays lit. Bundle is already ~800 kB; adding a tour library is unjustified.

## Components

### Module — `src/onboarding.js`

Single purpose: run the intro flow. Exports:

- `shouldShowOnboarding(storage)` — pure function. Returns `true` when
  `storage.getItem('sb_onboarded')` is falsy, else `false`. Takes a
  localStorage-like object so it is unit-testable without the DOM.
- `startOnboarding()` — renders welcome card, then the spotlight tour. Always runs
  when called (used for replay).
- `maybeStartOnboarding()` — runs `startOnboarding()` only if
  `shouldShowOnboarding(localStorage)` is true. Called once at app boot, after
  pillars are rendered.

Marking complete: `localStorage.setItem('sb_onboarded', '1')` on finish OR skip,
from either the welcome card or any tour step.

### Welcome card

Centered modal over a dimmed app backdrop.

- Bebas heading: "SEMANTIC BEATS".
- One line on what the app is.
- The three core moves:
  1. Pick a layer's sound.
  2. Tweak it by feel or words.
  3. Play.
- Buttons: `TAKE THE TOUR` (accent fill) and `SKIP`.
- Reuses existing glow and `msg-in` entrance motion.

`SKIP` → mark complete, dismiss. `TAKE THE TOUR` → dismiss card, begin tour.

### Spotlight tour

Four ordered steps. Each step: `{ selector, title, body, placement }`.

1. first `.pillar-card` — "Each column is one layer of your track."
2. `.pillar-prompt` (within that first card) — "Describe a sound or a change here."
3. `.btn-mode` (within that first card) — "GEN makes new sounds · TRX tweaks the
   feel with one-tap chips."
4. `#play-btn` (header) — "Hit play to hear it all together."

Rendering:
- Full-screen dark overlay with a lit cutout over the current target (box-shadow
  hole trick), aligned to the target's bounding rect.
- Themed tooltip card near the target: step counter `01 / 04`, title, body, and
  `BACK` / `NEXT` / `SKIP` buttons. Final step shows `DONE` instead of `NEXT`.
- `placement` positions the tooltip relative to the target (e.g. below / above);
  clamp to viewport so it never overflows offscreen.
- Reposition overlay + tooltip on `window` resize.
- `ESC` key → skip (mark complete, tear down).

Teardown: remove overlay, tooltip, and listeners. On finish or skip, mark complete.

### Header replay control

A `?` button added to the header (near play / status). Click → `startOnboarding()`.
Lets users replay the tour anytime regardless of the stored flag.

## Data Flow

```
app boot (after pillars render)
  └─ maybeStartOnboarding()
       └─ shouldShowOnboarding(localStorage)?
            ├─ yes → startOnboarding()
            │         └─ welcome card
            │              ├─ SKIP → mark complete → teardown
            │              └─ TOUR → step 1..4 → DONE → mark complete → teardown
            └─ no  → nothing

header "?" click → startOnboarding()  (ignores flag; replay)
```

## Styling

New block in `style.css`, brutalist theme: black surfaces, red accent
(`var(--accent)`), sharp corners (`border-radius: 0`), Bebas display + mono body.
Reuse existing `--glow` / `--glow-soft` and entrance keyframes. All animation
guarded by the existing `prefers-reduced-motion` rule.

## Error / Edge Handling

- Tour target missing (selector finds nothing): skip that step and advance; if no
  targets remain, end the tour gracefully (never throw).
- Window resize mid-tour: recompute target rect, reposition overlay + tooltip.
- Replay when already onboarded: allowed via `?` button (bypasses the flag).
- `startOnboarding` must be idempotent: calling while a tour is open tears down the
  existing one first (no stacked overlays).

## Testing

`tests/onboarding.test.js`:
- `shouldShowOnboarding` returns `true` when the flag is unset; `false` when set
  (using a fake storage object).
- Tour step-list integrity: exactly four steps; each has a non-empty `selector`,
  `title`, and `body`.

DOM rendering and spotlight positioning are not unit-tested, matching the existing
project convention (Strudel and UI untested).

## Files Touched

- `src/onboarding.js` — new module.
- `app.js` — call `maybeStartOnboarding()` after initial render; wire header `?`.
- `src/ui.js` / `index.html` — add the header `?` replay button.
- `style.css` — onboarding styles.
- `tests/onboarding.test.js` — new tests.
