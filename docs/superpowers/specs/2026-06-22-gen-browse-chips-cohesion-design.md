# GEN Browse Chips + Cohesion — Design

Date: 2026-06-22

## Problem

GEN mode currently has only a free-text prompt that feeds the LLM
(`generateTransformationPlan`), which picks a pattern from
`soundLibrary[pillar.name]`. Two issues:

1. **No discovery.** The user can't see what sounds exist, so prompts are blind.
   TRX mode already shows emotion chips; GEN has nothing equivalent.
2. **Poor cohesion.** The LLM's worst failure is picking sounds that don't fit
   the other playing tracks. The cohesion context it receives lists only raw
   pattern ids (e.g. `- drums: kick_909_ghost`) with no vibe information.

The project is intentionally LLM-in-the-middle: chips must *guide* the LLM, not
bypass it.

## Goals

- Show a browse menu of available sounds in GEN mode.
- Clicking a chip seeds the prompt (LLM still runs).
- Reduce cohesion failures via (a) visual marking of sounds that gel, and
  (b) a richer cohesion context for the LLM.

## Non-goals

- No deterministic LLM-bypass apply for GEN chips (that's the TRX/emotion path).
- No genre-preset logic (none exists in the library; cohesion is tag-based).

## Key facts (verified)

- `PILLAR_NAMES = ['drums', 'bass', 'percussion', 'melody', 'transitions']`
  maps 1:1 to `soundLibrary`, `EMOTION_RECIPES`, and `TRACK_ROLES` keys.
  (`bass_percussion` in CLAUDE.md is stale.)
- `soundLibrary[pillar.name]` returns the candidate patterns directly.
- Each pattern has `{ id, name, tags: [...], code, initialTransforms }`.
- No `GENRE_PRESETS`/`getGenreCode` exports exist. Cohesion basis = `tags`.
- Existing chip row: `.pillar-chips`, currently built once with emotion chips
  and shown only in transformation mode (`updatePillarMode`).

## Design

### Part A — GEN browse chips

- The `.pillar-chips` row becomes **mode-aware**:
  - GEN mode → sound chips (one per `soundLibrary[pillar.name]` entry).
  - TRX mode → emotion chips (unchanged behavior).
- `updatePillarMode` swaps which chip set is rendered/shown.
- Sound chip: label = pattern `name`, `title` = `tags.join(', ')`.
- **Click behavior:** insert pattern `name` into the pillar's `.pillar-prompt`
  input and focus it. No auto-send. User edits/adds, then sends → existing
  `handlePillarSend` GEN pipeline runs unchanged.

### Part B1 — mark cohesive chips

New pure module `src/library/cohesion.js`:

```js
// Returns soundLibrary[pillarName] annotated + sorted: fitting sounds first.
// fits = candidate shares >=1 tag with any pattern active in ANOTHER pillar.
export function rankSoundsByCohesion(pillarName, currentTracksState) {
  // currentTracksState: { [pillarName]: selectedId | null }
  // -> [{ pattern, fits }]  (stable order within each group)
}
```

- "Active in another pillar" = `currentTracksState[otherName]` is a non-null id;
  resolve via `getPatternById(otherName, id)` to read its tags.
- Build the union of all other-pillar tags; a candidate `fits` if its tag set
  intersects that union.
- Sort: `fits` chips first, original library order preserved within each group.
- UI: fitting chips get a `.chip--fits` class (small accent dot/marker).

### Part B2 — strengthen LLM cohesion context

In `generateTransformationPlan` (`src/llm.js`), replace the id-only
"Other active channels" block with name + tags per active channel:

```
Other active channels:
- drums: 909 Ghost Pulse [techno, minimal, dark]
- bass: Industrial Sub-Slinker [sub, industrial, dark]
```

Resolve each active id via `getPatternById(name, id)`; skip empty channels.
Keeps the same prompt structure, just richer signal.

### Wiring (app.js)

- Chip rendering needs the current cross-pillar state
  (`{ name: selectedId }`), same shape already built for
  `generateTransformationPlan`.
- A helper builds that snapshot; GEN chips are (re)rendered from
  `rankSoundsByCohesion`.
- **Refresh on every apply:** after any pillar's preview is applied (GEN, TRX,
  or emotion apply path), recompute and re-render **all** pillars' GEN chips so
  cohesion marks/order stay current as the mix changes.
- Also refresh a pillar's GEN chips when it toggles into GEN mode, and on
  initial mount.

### style.css

- `.chip--fits` indicator (small accent dot / accent border), consistent with
  existing chip styling.

## Components / boundaries

- `src/library/cohesion.js` — pure, no DOM. Input: pillar name + state snapshot.
  Output: ranked/annotated sound list. Independently unit-testable.
- `src/ui.js` — DOM only. Renders GEN vs TRX chips, applies `.chip--fits`,
  wires GEN click → insert-to-prompt. Exposes a refresh function for app.js.
- `src/llm.js` — richer cohesion context string; no behavior change to schema,
  validation, or return contract (still returns `null` on failure).
- `app.js` — builds state snapshot, calls UI refresh on mount, mode-toggle→GEN,
  and after every apply.

## Error handling

- `rankSoundsByCohesion` tolerates unknown/null ids and empty state → all
  `fits=false`, original order.
- Missing patterns in cohesion context are skipped (channel treated as empty).
- LLM contract unchanged: `generateTransformationPlan` still returns `null` on
  any failure.

## Testing

- `tests/cohesion.test.js` (new): `rankSoundsByCohesion`
  - no other active tracks → all `fits=false`, original order
  - overlapping tags → those `fits=true` and sorted first
  - null/unknown ids ignored
  - same-pillar selection does not count as "other"
  - empty state snapshot → original order
- UI and the llm prompt string are not unit-tested (consistent with existing
  "Strudel and UI are not tested" policy). Manual check in dev server.

## YAGNI / risks

- Cohesion is a coarse tag-overlap heuristic, not weighted scoring — sufficient
  for a binary "fits" marker.
- Refreshing all GEN chips on every apply is cheap (a few small arrays, only
  GEN-mode rows actually re-render).
