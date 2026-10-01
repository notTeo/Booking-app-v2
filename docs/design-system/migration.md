# Migration from the current CSS

What changed relative to `styles/shared/variables.css` and the shared components, in the order to do it.

## Status

Done (branch `feat/design-system`):

- **Phase 1, tokens** (order of work steps 1-3): `tokens.css` and `components.css` added, old variables renamed and `variables.css` dropped, stray tokens removed, white fills tokenized, brand orange split from warning. No raw hex remains outside `tokens.css`.
- **Phase 2, form and action components** (step 4): buttons, form controls (field, input, select, textarea, checkbox), switch.
- **Phase 3, display components** (step 4): badges and alerts, cards and confirm dialog, data tables (one markup per table, phone cards from the container query). Old CSS for each is removed.
- **Phase 4, owner bookings page** (`bookings.css`): booking blocks use the badge status tokens plus an icon; new `.chip` toggle and `--shadow-sheet` token; page-level button, alert, card and type duplicates removed.

Left:

- **Page CSS cleanup** (steps 5-6): duplicates and raw sizes/gaps in `home.css`, `public.css`, `bookings.css` and the other page files. `home.css` keeps its fake-preview `clamp()` values. The landing page still has its own `.home-btn-primary` / `.home-btn-ghost` buttons, and a few `rgba()` shadows and scrims remain in `home.css`, `public.css`, `bookings.css` and `sidebar.css` (no shadow or scrim token covers them yet).
- **New components** (step 7): toast, tabs, empty and skeleton states, avatar, sidebar and booking-flow pieces, as pages need them. Tooltip is not designed.
- **CLAUDE.md TODOs:** convert saving buttons to `.is-loading` + `aria-busy`; convert inline confirms (service delete, team remove, shop delete, role change, invite cancel/decline) to `<ConfirmDialog tone='danger'>`.

## Decisions on the section 5 issues

| # | Issue | Decision |
|---|---|---|
| 1 | No type or spacing scale | 7 sizes (12, 14, 16, 18, 24, 32, 48) with fixed line heights; 4px-based spacing `space-1` to `space-16`. Old rem values snap to the nearest step. |
| 2 | Orange does two jobs | `brand-accent` (orange, wordmark and decoration) and `warning` (amber-brown, state). The wordmark's "Be" uses `brand-accent`. |
| 3 | Undefined and stray tokens | `--text-secondary` becomes `--text-muted`; `--gb-card` becomes `--surface`; `--font-mono` is dropped (nothing in the system uses it); `--red` and `--red-hover` become `--danger` and `--danger-hover`, now defined in dark. |
| 4 | Hardcoded colors | `#fff` on buttons, the switch thumb, and checkbox ticks become `--on-accent` (or `--on-danger`). The landing traffic-light dots become `--danger`, `--warning`, `--success`. |
| 5 | Radius | `radius-sm` 6, `radius-md` 12, `radius-lg` 20, `radius-pill`, `radius-full`. Buttons are `radius-pill`, not `calc(var(--radius) * 2)`. |
| 6 | Shadows | `shadow-sm`, `shadow-md`, `shadow-lg` plus `shadow-accent` (button hover) and `shadow-glow` (the 7% accent halo). |
| 7 | Buttons | Variants primary, secondary, ghost, danger; sizes sm 36, md 44, lg 52; `btn--icon`; `is-loading`. Not full width by default: add `btn--block`. |
| 8 | Global `input` / `select` / `label` | Scoped to `.input`, `.select`, `.textarea`, `.field__label`. Error (`aria-invalid`), disabled and loading states added. |
| 9 | Breakpoints | Three: 640, 960, 1280. 480, 767/768 and 900 go away. |
| 10 | Dark accent contrast | Dark accent is `#8fb596`. As text it was already fine; as a fill it failed with white (2.6:1). Fills now use dark `on-accent` (8.23:1). |
| 11 | Missing components | Added: modal, toast, tabs, empty state, skeleton, avatar. Tooltip is not designed yet. |

## Token map

| Old | New |
|---|---|
| `--bg` | `--bg` |
| `--bg-card` | `--surface` |
| `--bg-input` | `--surface-sunken` |
| `--border` | `--border` (decorative) / `--border-strong` (controls) |
| `--text` | `--text` |
| `--text-muted` | `--text-muted` (now #4a5d52 in light, was slate #475569) |
| `--accent`, `--accent-hover` | `--accent`, `--accent-hover` (+ `--accent-active`, `--accent-soft`, `--on-accent`) |
| `--success` | `--success` (+ `-bg`, `-border`) |
| `--error`, `--red` | `--danger` (+ `--danger-hover`, `-bg`, `-border`, `--on-danger`) |
| `--warning` (state) | `--warning` (amber-brown, +`-bg`, `-border`) |
| `--warning` (brand "Be") | `--brand-accent` |
| `--radius` | `--radius-md` |
| `color-mix(...)` tints | `--*-bg` tokens |

## Class map

| Old | New |
|---|---|
| `.btn .btn-primary` | `.btn` |
| `.btn-danger` | `.btn--danger` |
| `.btn-ghost` | `.btn--secondary` (old ghost is outlined); use `.btn--ghost` only for new text-only actions |
| (full width default) | `.btn--block` |
| `.alert-error`, `.alert-success` | `.alert--danger`, `.alert--success` (+ `role`) |
| `.status-badge--no_show` and siblings | `.badge--pending`, `--confirmed`, `--completed`, `--canceled`, `--no-show`. Map the DB value `no_show` to `no-show` in the component |
| `.switch` | `.switch` + `.switch__input` + `.switch__track` (off is now neutral, not red) |
| `.data-table`, `.table-view` / `.card-view` | `.table-wrap > .table-surface > .data-table`; the card layout is a container query, no second markup |
| `.confirm-backdrop`, `.confirm-dialog` | `.modal-backdrop`, `.modal.modal--confirm` |
| `.form-group`, `.form-hint` | `.field`, `.field__hint`, `.field__error` |
| `.card` (auth, max-width 420) | `.card.card--auth` |
| `.spinner` | `.spinner`, `.spinner--sm`, `.spinner--lg` |
| `.brand-wordmark` | `.wordmark` + `.wordmark__be` |
| `.visually-hidden` | `.visually-hidden` |

## Order of work

1. Add `tokens.css` and `bundle.css` (see `implementation.md`), keeping the old variables alongside for one pass.
2. Replace old variable names with the new ones using the token map. Delete stray references (`--text-secondary`, `--gb-card`, `--font-mono`).
3. Search for `#fff`, `#ffffff`, `white`, `#f87171`, `#fbbf24`, `#34d399` and replace with tokens.
4. Migrate the shared components one at a time in this order: Button, form controls, Badge, Alert, Switch, Card, Table, ConfirmDialog.
5. Replace page-level duplicates (cards, headers, lists, buttons in `home.css`, `public.css`, `bookings.css` and the rest) with the shared classes. Delete the page rule once a page uses the shared class.
6. Convert font sizes and gaps to `--fs-*`, `--lh-*` and `--space-*`. Do not do this mechanically for `home.css`'s fake app preview; it can keep its `clamp()` values.
7. Add the new components (modal, toast, tabs, empty, skeleton, sidebar changes, booking-flow pieces) as pages need them.

## Judgment calls to review

- Field borders are `border-strong` (3.77:1 and up), noticeably heavier than the old `--border`. That is the price of passing WCAG 1.4.11 for form controls; soften only by darkening the field background, not the border.
- Orange and amber are close in hue. They are separated by role (brand versus state), by lightness (amber-brown in light, brighter in dark), and by the rule that state always carries an icon. If a shop's brand color ever lands near orange, revisit.
- `success` and `accent` are both greens. Success always comes with a check icon and a tint, accent never appears on a tint, and the pair is not red/green, so it is safe for the usual color-blindness types.
- No high-contrast theme and no tooltip were designed; neither was asked for.
