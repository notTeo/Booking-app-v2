# BeBooked: current styling summary (input for the design system)

Stack: React 19 + Vite, plain CSS (no Tailwind, no CSS-in-JS, no UI library). Icons: FontAwesome. ~7,500 lines of CSS.
Product: multi-tenant booking app. Shop owners/staff use a dashboard; customers use public booking pages. Has a marketing landing page and is translated (`locales/translations.ts`).

## 1. Tokens that exist today (`styles/shared/variables.css`)

| Token | Light | Dark |
|---|---|---|
| `--bg` | #f8faf8 | #0f120f |
| `--bg-card` | #ffffff | #171c17 |
| `--bg-input` | #f1f5f1 | #1c241c |
| `--border` | #e2e8e2 | #263026 |
| `--text` | #064e3b (deep green) | #e3e8e3 |
| `--text-muted` | #475569 (slate) | #8a998a |
| `--accent` | #166534 "Rich Emerald" | #8ba88e "Dusty Eucalyptus" |
| `--accent-hover` | #14532d | #a3bba5 |
| `--success` | #15803d | #8ba88e |
| `--error` | #e74c3c | #e57373 |
| `--warning` | #d97706 | #f5b662 |
| `--red` / `--red-hover` | #c0392b / #a93226 (danger button) | not overridden in dark |
| `--radius` | 12px | |

Fonts:
- Body `Poppins` (400/600/700/800)
- Headings `League Spartan` (700/800/900, headings default to 900)
- Logo `Gasoek One`

Theme switching: `[data-theme="dark"]` on the root.

Brand: the wordmark "**Be**Booked" uses `--warning` (orange) for "Be", so orange doubles as a brand color and as the warning color.

## 2. Usage stats (what the CSS really does)

- Color tokens used most: accent 184x, text-muted 161x, text 151x, border 92x, bg-card 65x, bg-input 48x, error 41x, success 36x, warning 27x.
- Radius: `var(--radius)` 47x; pill `999px` 19x; circle `50%` 20x. Plus one-offs: 6px, 20px, 24px, 50px, `calc(var(--radius)*2)` (buttons), `*0.75`, `*0.6`, and `clamp()` values in the landing preview.
- Font sizes: **no scale.** About 25 distinct values. Most common: 0.9rem (44x), 0.85 (34x), 0.8 (28x), 0.95 (23x), 1rem (21x), 0.875 (18x), 0.75 (13x), 1.6 (12x), 1.1 (11x), 0.72 (11x), 0.78, 0.82, 0.68, 0.7.
- Spacing: **no scale.** Rem values used ad hoc. Gaps: 1rem (42x), 0.5 (30x), 0.75 (24x), 0.6 (18x), 0.4 (18x), 1.5 (8x). Card padding is usually 1rem 1.25rem or 1.25rem.
- Shadows: rare and inconsistent. Mostly an accent glow (`0 0 18px accent 7%`) and accent-tinted button shadows (`0 4px 15px accent 30-40%`).
- Breakpoints: 640px (13x, mix of min and max), 767/768px, 480px, 900px.
- Reduced motion is respected once. Focus-visible rings exist (2px accent outline, 2px offset).

## 3. Shared components in CSS (`styles/shared/`)

- **Buttons** `.btn` + `.btn-primary`, `.btn-danger`, `.btn-ghost`. Pill-shaped (radius x2), full width by default.
- **Form**: `.form-group`, global styles on `input` / `select` (custom caret) / `label` (uppercase, small, muted), `.form-hint`, `.form-links`.
- **Card** `.card` (max-width 420px, auth style), `.card-back`, `.page` (centered layout).
- **Alerts** `.alert-error`, `.alert-success` (tinted via `color-mix`).
- **Status badge** `.status-badge--pending|confirmed|completed|canceled|no_show`: the best-built piece, token-based with `color-mix`.
- **Switch** `.switch`, 44x24 toggle. "Off" is red, not gray.
- **Data table** `.data-table*`, with a responsive **row-card** variant for mobile (`.table-view` / `.card-view`).
- **Confirm dialog** `.confirm-backdrop`, `.confirm-dialog`.
- **Misc**: `.spinner`, `.divider`, `.copy-link-row`, `.password-requirements`, `.brand-wordmark`, `.visually-hidden`.

React components (`src/components`): AppLayout, Navbar, Sidebar, Footer, ConfirmDialog, Switch, Toggles, CopyLinkButton, WorkingHoursPanel, Wordmark, BrandText, PasswordRequirement, plus the `booking-wizard/` (service, staff, date/time, customer form steps and a steps indicator).

## 4. Page-level CSS (where the duplication likely lives)

`home.css` 2310 lines (landing page and fake app preview), `public.css` 906 (customer booking), `bookings.css` 562, `working-hours.css` 408, `shops.css` 374, `dashboard.css` 346, `sidebar.css` 329, `services.css` 314, `settings.css` 272, `invites.css` 252, `team.css` 228, `shop-overview.css` 201, `navbar.css` 154.

Pages restyle their own cards, headers, lists and buttons, so many page-specific classes are likely variants of the same few patterns.

## 5. Inconsistencies / things to decide in the design system

1. **No type scale and no spacing scale.** Needs about 6-7 text sizes and a 4px or 8px spacing scale.
2. **Orange is used for two jobs.** Brand "Be" and the warning state both use `--warning`. Split into `--brand-accent` and `--warning`.
3. **Undefined or stray tokens.** `--text-secondary`, `--gb-card`, `--font-mono` are referenced but not defined (fallbacks are hiding it). `--red` duplicates `--error` and has no dark value.
4. **Hardcoded colors.** `#fff` on buttons (22x), switch thumb, and traffic-light dots on the landing page (#f87171, #fbbf24, #34d399). Needs `--on-accent`.
5. **Radius.** 10+ values. Define: sm / md (12) / lg / pill / full.
6. **Shadows.** Define 2-3 elevation levels plus the accent glow.
7. **Buttons.** Only 3 variants, always full width, no sizes (sm/md), no icon button, no loading state. Pages likely add their own button classes.
8. **Global element styles** (`input`, `select`, `label`) are unscoped, so every input gets the same look. Fine, but there's no error or disabled state.
9. **Breakpoints** are inconsistent (640 / 767 / 768 / 900 / 480). Pick 2-3.
10. **Dark mode**: accent shifts from deep emerald to a desaturated eucalyptus. Check contrast on `--accent` text and buttons (white on #8ba88e is weak).
11. **Missing components**: modal (only a confirm dialog), toast/notification, tabs, empty state, skeleton loaders, tooltip, badge variants beyond booking status, avatar.

## 6. Visual identity in one paragraph

Calm, nature-inspired: near-white green-tinted backgrounds, deep emerald primary, soft green-gray borders, rounded 12px cards, pill buttons, and a chunky display wordmark with an orange "Be". Dark mode is a muted, low-saturation forest palette. Tone: friendly, relaxed, "chill vibe" (per a code comment).

## 7. Suggested scope for the design system

Tokens (color roles, type scale, spacing, radius, shadow, breakpoints, motion), Button (variants/sizes/states), Input/Select/Textarea/Checkbox/Switch with error and disabled states, Card, Badge/Status, Alert/Toast, Modal/ConfirmDialog, Table + mobile row-card, Tabs, Empty state, Spinner/Skeleton, Navbar/Sidebar shells, and the booking flow pieces (service card, staff card, date picker, time-slot chips, step indicator). Light and dark themes for all.
