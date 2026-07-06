# Styleguide

Source of truth: `style.css`. This doc summarizes conventions for consistency.

## Palette

Defined as CSS vars in `:root`:

| Var | Value | Use |
|---|---|---|
| `--bg` | `#000000` | page background |
| `--surface` | `#0a0a0a` | headers, control bars, cards |
| `--border` | `#1a1a1a` | default 1px dividers |
| `--accent` | `#E8302A` | brand red — active states, glow, section rules |
| `--accent-dim` | `#8a1c18` | dimmed accent (scrollbar hover, disabled-ish) |
| `--text` | `#f0f0f0` | primary text |
| `--muted` | `#555555` | secondary/label text |
| `--error` | `#E8302A` | same as accent |
| `--user-bubble` | `#100000` | user chat message bg |
| `--preview-bg` | `#000000` | code preview bg |
| `--glow` / `--glow-soft` | red rgba shadows | hover/active emphasis |

## Typography

- **Labels, buttons, headers**: `'Bebas Neue', Impact, sans-serif` — always uppercase, letter-spacing `0.08–0.2em`.
- **Code, values, status numbers**: monospace stack — `'JetBrains Mono', 'Courier New', monospace` (`--mono`).
- Body font is `--mono` throughout (no serif/sans body text anywhere).

## Shape & Borders

- `border-radius: 0` everywhere by default — sharp, industrial. Only exception: `.chip-btn` pills use `12px`.
- Default border: `1px solid var(--border)`.
- Section-divider borders (control-bar, pillar-header) use `2px solid var(--accent)`.

## Buttons

- Default state: transparent or `--surface` background, `--muted` text/border.
- Active/selected state: fills with `--accent` (or `--text` for solo), text flips to `#000`.
- Hover: `opacity: 0.8` (generic) or border/text color shifts to `--accent` + soft glow shadow.
- Press feedback: `transform: scale(0.92–0.94)` on `:active`.
- Disabled: `opacity: 0.4; cursor: not-allowed`.

## Depth & Motion

- Two global overlays layered on `body`: film-grain noise (`::after`, SVG turbulence, opacity 0.07) and scanlines (`::before`, repeating-gradient, opacity 0.4, `mix-blend-mode: multiply`). Retro CRT look, applied once at the body level — don't duplicate per-component.
- Glow (`--glow` / `--glow-soft`) is the only depth cue — no generic drop shadows.
- All interactive transitions: `color/border-color/background/box-shadow 0.15s`, transform `0.06s`.
- `@media (prefers-reduced-motion: reduce)` disables all animation/transition globally — any new animation must respect this (already covered by the wildcard rule, no per-component opt-out needed).

## Beat-synced "is-playing" motion

Gated entirely behind `body.is-playing`:
- `--beat-dur` (0.5s) / `--bar-dur` (2s) vars drive pulse timing.
- Play button breathes (`pulse-btn`), status dot blinks, active pillar borders pulse (`pillar-beat`), pillar names glow (`name-glow`).
- Muted/empty/dimmed pillars are explicitly excluded from beat animation (`:not(.pillar--muted):not(.pillar--empty):not(.pillar--dimmed)`) — they should read as "off" visually.

## Naming conventions

BEM-ish, component-prefixed:
- `.btn-*` — buttons (`.btn-genre`, `.btn-mute`, `.btn-solo`, `.btn-viz`, `.btn-mode`, `.btn-send`, `.btn-apply`, `.btn-dismiss`)
- `.pillar-*` — pillar card internals (`.pillar-header`, `.pillar-name`, `.pillar-code`, `.pillar-chat`, `.pillar-vol-row`)
- `.pillar--*` — pillar state modifiers (`.pillar--muted`, `.pillar--dimmed`, `.pillar--soloed`)
- `.msg-*` — chat messages (`.msg-user`, `.msg-error`, `.msg-preview`)
- `.ob-*` — onboarding overlay (`.ob-card`, `.ob-title`, `.ob-spot`, `.ob-tooltip`)

## New component checklist

1. No border-radius unless it's a chip/pill.
2. Bebas Neue for labels, mono for data/code.
3. Default = muted/border colors; active = accent fill + black text.
4. Add glow shadow only on hover/active, never at rest.
5. Prefix class with the component's existing namespace (don't invent a new one for small additions).
