# Strudel AI Companion — Design Spec
**Date:** 2026-05-15

## Overview

Browser webapp for collaborative live electronic music production. User types natural language into a chat panel; a local llama3 LLM (via Ollama) modifies the currently-playing Strudel loop. Chat history persists for the full session so the LLM understands evolving context ("make it more aggressive than before").

---

## Architecture

```
app.js          — entry point, wires modules, owns shared state
strudel.js      — engine init, evaluate, stop, revert on error
llm.js          — Ollama fetch via /api/chat, conversation history, system prompt
ui.js           — chat render, preview/apply/dismiss, code panel sync
index.html      — split layout
style.css       — layout + dark theme
```

### Shared State (app.js)
- `conversationHistory[]` — full message log sent to LLM each turn
- `currentCode` — last successfully evaluated Strudel code
- `pendingCode` — code in preview, waiting for user Apply/Dismiss
- `isPlaying` — boolean, drives Play/Stop button state

### Data Flow
```
user types prompt
  → ui.js captures input
  → llm.js sends [systemPrompt + conversationHistory + "Current code:\n<code>\n\nRequest: <prompt>"]
  → Ollama /api/chat returns new code
  → ui.js renders preview bubble with [Apply] [✕]
  → user clicks Apply
  → strudel.js evaluates new code
      → success: update currentCode, update code panel
      → error: revert to currentCode, show red error bubble in chat
```

---

## LLM Integration

**Endpoint:** `POST http://localhost:11434/api/chat`  
**Model:** `llama3:latest`  
**Stream:** `false`

### System Prompt (curated Strudel reference, ~450 tokens)
```
You are a Strudel live-coding music assistant. Strudel uses mini-notation inside JS functions.

SOUNDS
s("bd sd hh cp")        — drum samples (bd=kick, sd=snare, hh=hihat, cp=clap)
note("c3 e3 g3")        — pitched notes
n("0 2 4").s("piano")   — sample index + instrument

MINI-NOTATION
"bd sd"         sequence
"bd*4"          repeat 4x
"[bd sd]*2"     group, repeat
"bd ~ sd ~"     ~ = rest
"<bd sd>"       alternate each cycle
"bd(3,8)"       euclidean rhythm

COMBINING
stack(a, b, c)  — play simultaneously
cat(a, b)       — play in sequence (one per cycle)

EFFECTS (chain with dot notation)
.room(0-1)      reverb
.gain(0-2)      volume
.pan(-1 to 1)   stereo pan
.lpf(hz)        low-pass filter
.hpf(hz)        high-pass filter
.speed(n)       sample playback speed
.slow(n)        stretch pattern n times
.fast(n)        compress pattern n times
.delay(n)       echo
.crush(n)       bitcrush

EXAMPLE
stack(
  s("bd ~ bd ~"),
  s("~ sd ~ sd").room(0.3),
  s("hh*8").gain(0.5).pan(sine)
)

RULES
- Output ONLY valid Strudel JS. No markdown. No explanation. No backticks.
- Always preserve sounds not mentioned in the user's request.
- Modify the current code — do not rewrite from scratch unless explicitly asked.
- Never add comments or blank lines outside the code.
```

### Request Format
```json
{
  "model": "llama3:latest",
  "messages": [
    { "role": "system", "content": "<system prompt>" },
    ...conversationHistory,
    { "role": "user", "content": "Current code:\n<currentCode>\n\nRequest: <userPrompt>" }
  ],
  "stream": false
}
```

Conversation history stores only `{ role, content }` pairs. The current code is injected fresh each turn (not stored in history) so history tokens stay lean.

---

## UI Layout

```
┌─────────────────────────────────────────────────────┐
│  Strudel AI                    [▶ Play] / [■ Stop]  │
├──────────────────────┬──────────────────────────────┤
│  CHAT                │  CODE                        │
│                      │                              │
│  [user] make bd fast │  stack(                      │
│                      │    s("bd*4 ~ bd ~"),          │
│  [ai] Preview:       │    s("~ sd ~ sd"),           │
│  ┌──────────────┐   │    s("hh*8").gain(0.5)       │
│  │ s("bd*8...")  │   │  )                           │
│  │ [Apply] [✕]  │   │                              │
│  └──────────────┘   │                              │
│                      │                              │
├──────────────────────┤                              │
│  [input........] [→] │                              │
└──────────────────────┴──────────────────────────────┘
```

- **Left panel:** Scrollable chat. User messages right-aligned, AI messages left-aligned. Preview blocks show generated code with Apply/Dismiss buttons.
- **Right panel:** Live Strudel code, `contenteditable`. On blur, syncs to `currentCode`.
- **Header:** Play/Stop toggle. Status text (Playing / Stopped / Thinking... / Error).
- **Error state:** Red bubble in chat shows Strudel error message. Code reverts to last working `currentCode`.

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Ollama not running | Red chat bubble: "Ollama unreachable. Start with `ollama serve`." |
| LLM returns non-code | Red chat bubble: "LLM returned invalid response." No code applied. |
| Strudel evaluate throws | Revert `currentCode`, red bubble with error message. |
| User edits code manually | On blur, validate by evaluating if playing; update `currentCode` on success. |

---

## Known Issues Fixed vs Current Code

| Bug | Fix |
|---|---|
| Wrong model `qwen2.5-coder:7b` | Use `llama3:latest` |
| `evaluate(code, engine)` wrong API | Use `strudelEngine.evaluate(code)` |
| `/api/generate` no history support | Use `/api/chat` with messages array |
| No CORS config for Ollama | Document: run `OLLAMA_ORIGINS="*" ollama serve` |
| Weak system prompt | Full curated Strudel reference (above) |
| Empty style.css | Full split-layout styles |

---

## Out of Scope

- Audio visualizer
- Export/save sessions
- Multiple simultaneous loops (multitrack)
- Model switching UI
