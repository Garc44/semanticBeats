# MusicAgent

AI-assisted live coding music app built with [Strudel](https://strudel.cc/) and a local
[Ollama](https://ollama.com/) LLM. Describe what you want in plain language — the AI picks
patterns and shapes the sound. No code required, but you can edit Strudel directly if you want.

Everything runs **locally and offline**: the LLM is Ollama on your own machine — no API keys,
no quota, no cloud.

## Requirements

- [Node.js](https://nodejs.org/) v18+
- [Ollama](https://ollama.com/) with an instruct model pulled (default `qwen2.5:7b`)

## Setup

```bash
# Install dependencies
npm install

# Pull the LLM model (first time only)
ollama pull qwen2.5:7b
```

## Running

**Terminal 1 — start Ollama** (the `OLLAMA_ORIGINS` env var lets the browser app reach it):
```bash
OLLAMA_ORIGINS="*" ollama serve
```

**Terminal 2 — start the app:**
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

To use a different model or endpoint, copy `.env.example` to `.env` and set
`VITE_OLLAMA_MODEL` / `VITE_OLLAMA_URL`.

## How to Use

The interface shows **5 pillars** — each is a layer of your track that plays in parallel:

| Pillar  | Shown as | Purpose                        |
|---------|----------|--------------------------------|
| drums   | DRUMS    | Core drum pattern              |
| bass    | BASS     | Low-end bass                   |
| percussion | PERCS | Extra hits and rhythm          |
| melody  | MELODY   | Melodic / lead elements        |
| transitions | EFFECTS | Risers, sweeps, accents     |

### Two modes per pillar: GEN and TRX

Each pillar has a mode toggle:

- **GEN** (generate) — type what you want (e.g. `"dark techno kick"`) and **Send**. The AI
  picks a matching pattern and shows a preview. GEN also shows clickable **sound chips**
  ranked to fit the rest of your mix.
- **TRX** (transform) — shape the *current* sound. Shows **emotion chips** (pick a feeling,
  not an effect — e.g. *warmer*, *darker*, *crisper*). Chips are deterministic and apply
  instantly, no LLM needed. You can also type effect words like `"more reverb"` or
  `"kill the filter"`.

### Applying changes

Every transformation shows a **preview card**:

- **Apply** — activates the new code.
- **Dismiss** — discards it, nothing changes.

If applied code fails to play, the app auto-fixes once and reverts if that also fails.

### Playback

- **▶ Play** — plays all active pillars as one combined stack.
- **■ Stop** — stops playback.
- **Mute** — silences one pillar without removing its code.
- **Solo** — plays only that pillar (overrides mutes).

### Global controls

Sliders affect the whole mix:

- **Tempo** — playback speed
- **Volume** — master gain
- **Filter** — low-pass cutoff
- and more (reverb, shape)

### Direct code editing

Each pillar has an editable code field. Write or paste
[Strudel](https://strudel.cc/learn) patterns directly — changes apply live on next playback.

## Tests

```bash
npm test          # run once
npm run test:watch
```

## Architecture

Single-page Vite app, no framework. Pipeline:

```
generateTransformationPlan()  →  compileTrack()  →  rebuildStack()
         (llm.js)                  (compiler.js)      (pillars.js)
```

The LLM only **selects** pattern IDs and structural mods (speed/slowdown) — it never writes
code. All code generation lives in `compiler.js`. See `CLAUDE.md` for the full module map.
