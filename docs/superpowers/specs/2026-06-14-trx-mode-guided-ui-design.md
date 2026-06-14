# TRX Mode — Guided Transformation UI

**Date:** 2026-06-14  
**Status:** Approved

## Goal

Make Transformation Mode usable for non-technical users. Replace the bare text input with guided suggestion chips that auto-send to the LLM. Active transforms visible in chat; LLM handles removal via natural language.

## Interaction Model

1. User switches a pillar to TRX mode (GEN → TRX button)
2. A row of static suggestion chips appears between the chat area and the text input
3. Clicking a chip immediately sends its label as a prompt to `generateTransformPatch` — no confirmation step
4. LLM applies the transform; chat log shows what's active (e.g., "→ applied: reverb 0.7, degrade 0.3")
5. To remove a transform, user types "remove reverb" (or similar) in the free-text input — LLM sets that transform to `null`
6. Free-text input remains available for any prompt chips don't cover

## Chip Definitions (static per pillar)

```js
const TRX_CHIPS = {
  drums:           [{ label: '+ reverb',   prompt: 'add reverb'      },
                   { label: '+ glitchy',   prompt: 'make it glitchy' },
                   { label: '+ darker',    prompt: 'make it darker'  },
                   { label: '+ widen',     prompt: 'widen the stereo'},
                   { label: '+ crush',     prompt: 'add bit crush'   }],
  bass_percussion: [{ label: '+ darker',   prompt: 'make it darker'  },
                   { label: '+ reverb',    prompt: 'add reverb'      },
                   { label: '+ stutter',   prompt: 'add stutter'     },
                   { label: '+ distort',   prompt: 'add distortion'  },
                   { label: '+ slow down', prompt: 'slow it down'    }],
  melody:          [{ label: '+ reverb',   prompt: 'add reverb'      },
                   { label: '+ echo',      prompt: 'add echo'        },
                   { label: '+ filter',    prompt: 'darken the filter'},
                   { label: '+ widen',     prompt: 'widen the stereo'},
                   { label: '+ vowel',     prompt: 'add vowel filter' }],
  transitions:     [{ label: '+ reverb',   prompt: 'add reverb'      },
                   { label: '+ faster',    prompt: 'speed it up'     },
                   { label: '+ reverse',   prompt: 'reverse the pattern'},
                   { label: '+ filter',    prompt: 'add high pass filter'},
                   { label: '+ echo',      prompt: 'add echo'        }],
};
```

Each chip has a `label` (display) and `prompt` (sent to LLM). Chip click fires `onSend(chip.prompt)`.

## UI Layout (TRX mode)

```
┌─────────────────────────────────────┐
│ DRUMS icon    [M] [S] [OFF] [TRX]   │  ← header (unchanged)
├─────────────────────────────────────┤
│ (compiled code display)             │  ← unchanged
├─────────────────────────────────────┤
│ chat area                           │  ← shows LLM explanations + active
│  → applied: reverb 0.7             │    transform confirmations
├─────────────────────────────────────┤
│ + reverb  + glitchy  + darker  ...  │  ← chip row (TRX only, hidden in GEN)
├─────────────────────────────────────┤
│ [describe changes...         ] [→]  │  ← free-text input (unchanged)
└─────────────────────────────────────┘
```

GEN mode: chip row is absent. Everything else identical.

## Code Changes

### `src/ui.js`

**`renderPillar`** — add chip row element after chat area, before input row:
- Create `div.pillar-chips` with `style="display:none"` (hidden by default)
- For each chip in `TRX_CHIPS[pillar.name]`: create `button.chip-btn`, set text, on click call `onSend(chip)` and disable button briefly to prevent double-fire
- Append `.pillar-chips` between `.pillar-chat` and `.pillar-input-row`

**`updatePillarMode`** — show/hide `.pillar-chips` based on mode:
- `mode === 'transformation'` → `chipsEl.style.display = 'flex'`
- otherwise → `chipsEl.style.display = 'none'`

No changes to chip content after render — chips are static.

### No other files change

`llm.js`, `compiler.js`, `pillars.js`, `validate.js` — unchanged. The LLM already handles free-form transform prompts including removal (sets value to `null`). Chat display already works via `addPillarMessage`.

## Out of Scope

- Dynamic chips based on active pattern tags
- Chip state (highlighting active chips) — chat log handles that
- "Clear all" button — user can type "clear all effects"
- Per-chip value pickers (e.g., reverb amount slider)
