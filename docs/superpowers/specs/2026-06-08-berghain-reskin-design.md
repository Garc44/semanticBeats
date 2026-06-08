# Design Spec: Berghain / Underground Poster Reskin

**Date:** 2026-06-08
**Scope:** Pure CSS/visual reskin — no layout or JS changes

---

## Goal

Restyle the musicAgent UI to match an underground rave poster / record shop aesthetic: pure black, bold red, condensed type, geometric ornaments, grain texture. Reference image: black background, coral-red (#E8302A) as sole accent, Bebas Neue headings, thick bordered boxes, halftone zine energy.

---

## Color Palette

| Token | Value | Usage |
|---|---|---|
| `--bg` | `#000000` | Page background |
| `--surface` | `#0a0a0a` | Header bg, pillar header bg, global controls bg |
| `--border` | `#1a1a1a` | Dividers between pillars, subtle borders |
| `--accent` | `#E8302A` | Primary red: pillar header bottom border, header bottom border, send button, apply button, active mute, active BPC, focus states, slider accent |
| `--text` | `#f0f0f0` | Body text, code, numbers |
| `--muted` | `#555555` | Labels, placeholder text, status, inactive buttons |
| `--error` | `#E8302A` | Same red — error messages share accent |
| `--user-bubble` | `#100000` | User chat message background |
| `--preview-bg` | `#000000` | Preview code block background |

---

## Typography

- **Bebas Neue** loaded from Google Fonts (`https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap`)
- Applied to: logo, pillar names, all button text, all labels (`letter-spacing: 0.1–0.15em`, `text-transform: uppercase`)
- **Courier New / monospace** kept for code areas only
- **Segoe UI / sans-serif** kept for chat message body text

---

## Border Radius

All interactive elements: `border-radius: 0` (sharp/square). Applies to buttons, inputs, preview cards, message bubbles.

---

## Key Component Changes

### Header
- Bottom border: `2px solid #E8302A`
- Logo: Bebas Neue, `1.8rem`, white — `.accent` span stays red
- Status text: Bebas Neue, uppercase, muted gray
- Play button: red fill, black text, `border-radius: 0`, Bebas Neue

### Global Controls
- Background: `#0a0a0a`
- Labels: Bebas Neue, muted
- Slider values (BPM, GAIN numbers): white `#f0f0f0`
- BPC buttons: sharp, Bebas Neue; active = red fill
- `accent-color: #E8302A` on range inputs

### Pillar Cards
- Dividers between cards: `2px solid #1a1a1a`
- Header bottom border: `2px solid #E8302A`
- Pillar name: Bebas Neue `1.6rem`, red — preceded by unique SVG icon

### Pillar Icons (inline SVG, red stroke `#E8302A`)
| Pillar | Shape |
|---|---|
| DRUMS | Circle with filled center dot |
| BASS | Sine/waveform curve |
| MELODY | Triangle (upward) |
| TRANSITIONS | Square with cross (+) inside |

### Pillar Code Area
- Background: `#000`
- Text: `#f0f0f0` (white)
- Focus: slightly lighter bg `#050505`, text pure white

### Chat Messages
- User bubble: `background: #100000`, `border: 1px solid #2a0a0a`
- Error: `border: 1px solid #E8302A`, text red
- Preview card: `border: 1px solid #E8302A33` (translucent red)
- Preview label: Bebas Neue, muted
- Preview code: white text on black bg

### Buttons
- Send: red fill, black text, `border-radius: 0`, Bebas Neue, `letter-spacing: 0.1em`
- Apply: red fill, black text, sharp
- Dismiss: transparent, dark border, Bebas Neue, muted text
- Mute active: red fill; Solo active: white fill black text

### Grain Texture
CSS-only SVG noise overlay via `body::after`:
- `position: fixed; inset: 0; pointer-events: none; z-index: 9999`
- SVG fractalNoise `baseFrequency: 0.9`, tiled at `200px × 200px`
- `opacity: 0.07`

---

## Files Changed

- `style.css` — all changes
- `index.html` — add Google Fonts `<link>` in `<head>`

No JS changes. No layout changes.

---

## Out of Scope

- Layout restructuring
- New features
- Animation or transition effects
- Dark/light mode toggle
