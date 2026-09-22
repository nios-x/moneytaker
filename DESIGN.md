# Design

## Visual world

**The category standard, played straight.** The user took the standing exit in an attended direction round and chose it deliberately over four alternates. The dealt direction (Counterfoil — Indian security printing) and every challenger are spent; nothing from them is smuggled back in. Conventions are embraced without irony.

**Quality bar: Luma + CRED.** Luma sets the structure — a dark surface, one tall card, crisp type, a single unmistakable action, no chrome the page does not need. CRED sets the finish — dense confident typography, real layered depth, motion with mass, and the trustworthiness an Indian audience expects before it parts with ₹1,700.

## Scene

A 26-year-old on a Gurugram street at 11pm, phone at 40% brightness, one thumb, arriving from an Instagram link-in-bio. **Dark is forced by the scene, not chosen by category.** The page is read in the dark, next to a feed that is also dark, and it will be reopened in a UPI app's shadow.

## Color

Strategy: **Restrained** — a near-black violet-tinted ground, one accent carrying every action. The accent is violet because the organiser's existing collateral is purple (💜, recorded in PRODUCT.md), not because parties are purple.

| Token | Value | Role |
|---|---|---|
| `--ink` | `#0A0711` | Page ground. Violet-tinted black, never pure #000. |
| `--surface` | `#140E1E` | The card. One step up from the ground. |
| `--surface-2` | `#1C1429` | Fields, inset rows. |
| `--line` | `#2A2039` | Hairlines. |
| `--accent` | `#8257FF` | Every primary action. |
| `--accent-bright` | `#A98CFF` | Accent text on dark, hover. |
| `--accent-ink` | `#FFFFFF` | Text on accent. |
| `--text` | `#F5F2FA` | Primary text. |
| `--text-2` | `#A79FB8` | Secondary — tinted from the violet hue, never gray. ≥7:1 on ink. |
| `--text-3` | `#8B82A0` | Placeholders, meta. ≥4.5:1 on ink. |
| `--warn` | `#F5A524` | Awaiting verification. Never green — nothing is verified yet. |
| `--ok` | `#3DD68C` | Confirmed by a human only. |
| `--danger` | `#F75E68` | Errors, sold out. |

## Type

- **Display — Bricolage Grotesque.** Variable, optical-size aware. Carries the headline and the price. Not a system stack, not on the saturated-default list.
- **Text / UI — Archivo.** Variable width and weight, drawn for dense printed forms, excellent at 14–16px on a phone.
- **Numerals** use `font-variant-numeric: tabular-nums` everywhere a number can change — prices, spots left, serials, UTRs, timestamps — so digits never jitter between states.
- Tracking floor `-0.04em` on display sizes. Display caps at 6rem. Headings `text-wrap: balance`.

## Materials and depth

Shadows carry a real offset and a soft blur, layered (ambient + key). No zero-offset colored halos. Translucency appears exactly once, on the sticky action bar that sits over scrolling content — as a specific effect, never as decoration.

## Motion

**One authored moment:** the issue. When a registration is created, the amount and the reference settle into the ticket row — a short exponential ease-out from an already-visible default, digits landing with mass. Step transitions animate height and cross-fade; nothing else moves on its own. All motion respects `prefers-reduced-motion`.

## Icons

Drawn SVG on a single 1.5px stroke, one consistent weight. The source copy's emoji are replaced with icons; emoji never stand in for an icon system.

## Browser surfaces

Selection, caret, focus ring, scrollbar and autofill are themed from the palette. Focus is a 2px accent ring with a 2px offset, visible on every interactive element, keyboard-first.

## Structure

One route, three steps, one URL. The card never becomes a modal. Step state survives the round-trip to a UPI app via `localStorage`, because the guest *will* leave and come back.

## Honesty constraints (binding)

- A self-reported UTR is never styled as success. It is `--warn`, and the copy says "awaiting verification".
- No stock photography, no invented faces, no fabricated testimonials or attendee counts. PRODUCT.md lists what does not exist.
- The spots-left counter reflects the real cap or it does not render.
