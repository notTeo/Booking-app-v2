BeBooked is a calm, friendly booking product for shops and the people who book them. It is built phone-first for customers and desktop-first for shop owners. The look: emerald green on green-tinted neutrals, rounded 12px cards, pill buttons, a chunky Gasoek One wordmark with an orange "Be". Dark mode is the same brand in a low-saturation forest palette, not an inverted one.

Build with plain CSS variables from `tokens.css` and the classes in `web/src/styles/components.css`. No Tailwind, no UI library, no CSS-in-JS. Start with `implementation.md` for setup and `migration.md` for what changed from the current CSS.

## Content fundamentals

- Write like a relaxed, competent friend: short sentences, "you" and "your", no jargon. Sentence case everywhere (buttons, titles, labels). No emoji, no exclamation marks except one on a completed booking ("You're booked!").
- Say what happened, then what to do next. Errors never blame: "We couldn't save your changes. Check your connection and try again." not "Error 500".
- Buttons are verbs: "Book now", "Reschedule", "Cancel booking", "Copy booking link". A destructive button names the thing: "Delete service", never "Yes".
- Empty states are one sentence plus one action: "No bookings yet. Share your booking page and your first customer will show up here."
- Times and prices use the shop's locale. Prices and times set in tabular numerals. Dates read "Thu 1 Oct, 10:30".

## Visual foundations

### Color

Use roles, never raw hex. Every role has a light and a dark value in `tokens.json` and a usage note naming the grounds it is checked on.

| Role | Tokens | Use |
|---|---|---|
| Ground | `bg`, `surface`, `surface-raised`, `surface-sunken` | Page, cards and nav, modals and toasts, inputs and table headers |
| Line | `border`, `border-strong` | `border` for dividers and card outlines; `border-strong` for the edge of anything interactive |
| Text | `text`, `text-muted` | Primary and secondary copy |
| Action | `accent`, `accent-hover`, `accent-active`, `accent-soft`, `on-accent`, `focus-ring` | Buttons, links, selection, focus |
| Brand | `brand-accent` | The "Be" in the wordmark and marketing decoration only |
| State | `success`, `warning`, `danger`, `info`, each with `-bg` and `-border`; `on-danger` | Alerts, badges, validation |

Rules:

- `brand-accent` is never a state color and never text under 24px. It used to double as the warning color; that is split. Warning is amber-brown (`warning`), brand is orange. If a screen needs to say "careful", it uses `warning` plus an icon.
- A solid `accent` fill takes `on-accent` text. In light that is white (7.13:1). In dark it is a near-black green (8.23:1). White on the dark accent was 2.6:1, which is what failed before. The dark accent as TEXT already passed (the new one is 8.28:1 on `bg`).
- Status is never color alone: every badge and alert carries an icon and a word. Canceled is also struck through so it differs from Completed by more than hue.
- `border-strong` is at least 3:1 on `surface`, `surface-sunken` and `bg` in both themes (3.77:1 and 4.09:1 on the input background). Do not swap it for `border` on controls to look softer.
- No hardcoded colors. The three landing-page traffic-light dots map to `danger`, `warning` and `success`; the switch thumb is `on-accent`.

### Type

Poppins for body and UI, League Spartan for headings and numbers that need weight, Gasoek One for the wordmark only. Seven sizes, 12 to 48px, each with one line height. Use the `t-*` classes or the `--fs-*` / `--lh-*` / `--fw-*` tokens.

| Style | Size / line | Weight | Font | Use |
|---|---|---|---|---|
| `t-display` | 48 / 48 | 800 | League Spartan | Landing hero only; on phones `clamp(2.25rem, 9vw, 3rem)` |
| `t-title` | 32 / 36 | 800 | League Spartan | Page title, one `h1` per page |
| `t-heading` | 24 / 32 | 700 | League Spartan | Section heading, modal title |
| `t-subheading` | 18 / 28 | 700 | League Spartan | Card title, service name |
| `t-body` | 16 / 24 | 400 | Poppins | Body copy, input text |
| `t-body-sm` | 14 / 20 | 400 | Poppins | Hints, table cells, secondary text |
| `t-caption` | 12 / 16 | 600 | Poppins | Badges, group labels, table headers (add `label-caps` for uppercase) |

Headings no longer default to weight 900: titles are 800, the rest 700. Field labels are sentence-case 14px semibold (they were small uppercase muted); uppercase is reserved for 12px captions.

### Spacing

Everything is a multiple of 4px: `space-1` 4, `space-2` 8, `space-3` 12, `space-4` 16, `space-5` 20, `space-6` 24, `space-8` 32, `space-10` 40, `space-12` 48, `space-16` 64. No raw rem or px gaps.

### Radius, elevation, motion, breakpoints

- Radius: `radius-sm` 6 (checkbox), `radius-md` 12 (cards, inputs, alerts), `radius-lg` 20 (modals, sheets, date picker), `radius-pill` (buttons, badges, chips, tabs), `radius-full` (avatars, icon buttons, step markers).
- Elevation: flat by default; `shadow-sm` hover lift, `shadow-md` menus, `shadow-lg` modals and toasts, `shadow-accent` primary-button hover glow, `shadow-glow` one featured card per screen. In dark, `shadow-lg` adds a 1px light hairline because black shadows vanish.
- Motion: 120ms for hover and focus, 200ms for toggles and drawers, 320ms for modals, all on `ease-standard`. Reduced motion removes transitions and stops pulsing; spinners keep turning, slower.
- Breakpoints (three): `bp-sm` 640, `bp-md` 960, `bp-lg` 1280. Below 960 the sidebar is a drawer and the navbar is compact. Below 640 modals are bottom sheets and tables are cards. CSS variables don't work in `@media`; write the number.

### States

Every interactive component has default, hover, focus-visible, pressed (where it moves), disabled, and loading or error where it applies. Focus is always `2px solid var(--focus-ring)` with a 2px offset (inputs sit flush: offset 0). Hover never relies on color alone for meaning. Disabled is a quieter surface with `text-muted` text, `cursor: not-allowed`, and `aria-disabled` or `disabled`; loading keeps the label, adds a spinner, and sets `aria-busy`.

## Iconography

FontAwesome stays as the icon set in the app. Icons inherit text color, sit at `1em` (16px in text, 18-20px in nav and alerts, 24px in empty states), and are decorative unless they stand alone, in which case the control gets an `aria-label`. The previews draw 2px-stroke SVG stand-ins of the same shapes so they render without the font; swap them 1:1 for FontAwesome classes. There is no logo file in the sources: the wordmark is live type ("Be" in `brand-accent`, "Booked" in `text`, Gasoek One), and that is the logo.

## Usage guide

### Which component when

| Need | Use | Not |
|---|---|---|
| The one main action on a screen | `btn` (primary), one per view | Two primaries side by side |
| A secondary action next to it | `btn--secondary` | A second primary |
| Low-emphasis action, toolbars, "Cancel" | `btn--ghost` | Ghost as the only way to proceed |
| Delete, cancel booking, remove | `btn--danger`, always behind a confirm dialog | Danger for a harmless reset |
| Icon-only action | `btn--icon` with `aria-label` | Icon-only for anything unfamiliar |
| One value to type | `input`, with a `field__label` always visible | Placeholder as the label |
| Pick one of many (more than 4) | `select` | A row of radio cards |
| Pick one of a few visual options | `service-card` / `staff-card` (radio group) | A select for services |
| Long free text | `textarea` | An input |
| Choose several, or accept terms | `checkbox` | A switch |
| A setting that applies immediately | `switch` | A checkbox that needs a Save |
| Group related content | `card` | A card inside a card |
| Booking state | `badge--pending / confirmed / completed / canceled / no-show` | Custom colored text |
| Inline, persistent message about a page or form | `alert` | A toast |
| Short confirmation of something that just happened | `toast`, 5 seconds | A toast for errors the user must act on |
| Blocking input or a form in context | `modal` (sheet on phones) | A modal for a message |
| "Are you sure?" before an irreversible action | confirm dialog (`modal--confirm`) | A confirm for reversible actions |
| Switch between views of the same data | `tabs` or `tabs--segmented` | Tabs for steps in a flow |
| No data yet, or nothing matches | `empty` | A blank area |
| Content is loading | `skeleton` for areas, `spinner` for actions | A full-page spinner |
| Many records with several fields | `data-table` (cards on phones) | A table of two columns |
| Top-level navigation | `navbar` (public pages, marketing), `sidebar` (dashboard) | Both nav patterns on one page |
| Customer booking flow | `steps` > service > staff > `datepicker` > `slots` > details | Skipping the steps indicator |

### Spacing rules

- Page gutter: `space-4` on phones, `space-6` from 640px. Content column max 72rem.
- Section to section: `space-8`, `space-10` from 960px. Inside a section: `space-6`.
- Card padding `space-5` (`space-4` in dense lists on phones). Content inside a card stacks at `space-4`.
- Form fields stack at `space-4`; label to control `space-2`; control to hint or error `space-2`.
- Related items in a list `space-3`; chips and slots `space-2`; icon to label `space-2` (`space-1` in badges); button groups `space-3`.
- Tap targets are at least 44px: `btn` md, inputs, checkbox and switch rows, tabs, nav items, slots, calendar days (40px wide at 360px, 44px tall).

### Type rules

- One `t-title` per page. Don't skip heading levels; style with `t-*` classes if the visual size differs from the level.
- Inputs are 16px so iOS Safari doesn't zoom on focus. Nothing is smaller than 12px.
- Body copy is `text`, secondary copy `text-muted`, never a lighter custom gray. Line length 65 characters max.
- Prices, times and counts use tabular numerals (`font-variant-numeric: tabular-nums`) so columns align.
- Weights are 400, 600 (Poppins) and 700, 800 (League Spartan) only. Don't bold body text for emphasis beyond 600.

### Dark mode

Same components, same names; only token values change. Elevation in dark comes from lighter surfaces (`surface-raised`) rather than shadow. Fills use `on-accent` and `on-danger`, which are dark in dark mode. Preview every new screen in both themes before shipping.
