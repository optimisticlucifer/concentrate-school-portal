# Design System — Concentrate School Portal

> Calm, positive, "artist's-canvas" airy UI. Sage-green-on-warm-stone — the deliberate
> opposite of AI-slop (no purple/blue gradients, no blobs, no bubbly radius, no emoji-as-icon).
> Palette + rationale from color-psychology research (see docs/research if kept).

## Palette (Tailwind tokens)

| Token | Hex | Role & psychology |
|---|---|---|
| `primary` | `#4B8B6F` | Muted sage-green. Brand, primary buttons, active nav. Green = growth/focus; desaturated = calm not neon. |
| `primary-hover` | `#3E7860` | Press/hover state (the micro-interaction). |
| `primary-subtle` | `#E7F0EB` | Selected rows, active-nav bg, tags. Very low saturation. |
| `accent` | `#5B7C99` | Muted slate-blue. Info/links. Blue = trust; recedes behind green. |
| `success` | `#3E7860` | "Graded"/positive. Reuses green so success feels native. |
| `warning` | `#C08A3E` | "Due soon"/"Late". Warm amber — informs, doesn't alarm. |
| `danger`  | `#B5544A` | "Missing"/destructive. Desaturated terracotta — signals without spiking anxiety. |
| `background` | `#FAF9F6` | Warm paper white (the airy canvas). Not `#FFFFFF` (sterile). |
| `surface` | `#FFFFFF` | Cards, lifted with 1px border not heavy shadow. |
| `border` | `#E8E5DE` | Warm hairline borders — structure without weight. |
| `text` | `#2C2A26` | Warm charcoal. Softer than `#000`, high contrast. |
| `text-muted` | `#6B6862` | Labels, meta, timestamps. |

## Status pills (reused everywhere an assignment appears)

| State | Style | Meaning |
|---|---|---|
| Submitted | accent-subtle bg + accent text + check icon | student submitted |
| Graded | primary-subtle bg + success text + award icon | teacher graded |
| Due soon | warning-subtle bg + warning text + clock icon | within N days |
| Late / Missing | danger-subtle bg + danger text + alert icon | past due |

Always color **+ label + icon** (12% of men have red-green deficiency).

## Rules (enforced)

- Backgrounds/surfaces under ~30% saturation. Saturated color only on interactive/meaningful elements.
- Elevation = 1px warm border + faint shadow. **No gradients, no decorative blobs.**
- Radius modest + consistent: `rounded-lg` (8px). Not pill-shaped everything.
- One line-icon set (**Lucide**, already a dep), single weight.
- Skeleton loaders, not spinners. Subtle hover/press. "Saving…/Saved" indicator on grade entry (kills "did it save?" anxiety).

## Layout

- Left sidebar (role-scoped nav) + top bar (user/role). Content = light, airy, generous whitespace.
- Card grid on desktop, single column on mobile (students are mostly on phones — mobile parity is a trust signal).
- **Empty states as onboarding**: two parts instruction, one part personality; explain where things will appear + inline primary action. Never a blank white void.

## Thought of the day

- Small quiet card, top of dashboard. `primary-subtle` bg, muted text, one line + optional attribution.
- Static curated JSON (~60 vetted lines), rotates by day-of-year (same all day). Reflective > motivational-poster. No exclamation marks, no emoji, no second-person hype.
- Optional role-tuned pools (teachers vs students) — cheap, thoughtful.
