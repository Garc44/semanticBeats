# MusicAgent

AI-assisted live coding music app built with [Strudel](https://strudel.cc/) and Ollama.

## Requirements

- [Node.js](https://nodejs.org/) (v18+)
- [Ollama](https://ollama.com/) with `llama3` model

## Setup

```bash
# Install dependencies
npm install

# Pull the LLM model (first time only)
ollama pull llama3
```

## Running

**Terminal 1 — start Ollama:**
```bash
OLLAMA_ORIGINS="*" ollama serve
```

**Terminal 2 — start the app:**
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## How to Use

The interface shows **6 pillars**, each representing a layer of your track:

| Pillar | Purpose |
|---|---|
| foundation | Base rhythmic pattern |
| bassline | Low-end bass sounds |
| percussion | Drums and hits |
| melody | Melodic elements |
| atmosphere | Pads and textures |
| fx | Effects and accents |

### Generating Music

1. Type a prompt into any pillar's input field (e.g. `"dark techno kick"`)
2. Click **Send** — the AI plans a transformation and shows a preview
3. Click **Apply** to activate the code, or **Dismiss** to discard

### Playback

- **▶ Play** — starts all active pillars as a combined stack
- **■ Stop** — stops playback
- **Mute** — silences a single pillar without removing its code
- **Solo** — plays only that pillar

### Global Controls

Sliders at the top affect all pillars:

- **Tempo** — playback speed
- **Volume** — master gain
- **Filter** — low-pass filter cutoff
- **Intensity** — scales how strongly transformations are applied

### Direct Code Editing

Each pillar has an editable code field. You can write or paste [Strudel](https://strudel.cc/learn) patterns directly — changes apply live on the next playback.

## Tests

```bash
npm test
```
