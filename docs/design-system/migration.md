# Migration from the current CSS

What changed relative to `styles/shared/variables.css` and the shared components, in the order to do it.

## Status

Done (branch `feat/design-system`):

- **Phase 1, tokens** (order of work steps 1-3): `tokens.css` and `components.css` added, old variables renamed and `variables.css` dropped, stray tokens removed, white fills tokenized, brand orange split from warning. No raw hex remains outside `tokens.css`.
- **Phase 2, form and action components** (step 4): buttons, form controls (field, input, select, textarea, checkbox), switch.
- **Phase 3, display components** (step 4): badges and alerts, cards and confirm dialog, data tables (one markup per table, phone cards from the container query). Old CSS for each is removed.
- **Phase 4, owner bookings page** (`bookings.css`): booking blocks use the badge status tokens plus an icon; new `.chip` toggle and `--shadow-sheet` token; page-level button, alert, card and type duplicates removed.
- **App shell** (sidebar Option A): `AppLayout`/`Sidebar` rebuilt on `.app-shell`, `.sidebar`, `.nav-item`, `.scrim` with account and shop levels, a `topbar` and drawer at 640px; `sidebar.css` removed. Shop Invites merged into Team (Add member modal). Routes: `/settings` is now `/account`; `/shops/:slug/invites` is gone. The landing-page preview keeps the old shell class names, scoped in `home.css`.
- **No account-level sidebar**: `AppLayout` split into `AppTopBarLayout` (dashboard, account: app `navbar` with logo, Account and Logout icon buttons) and `ShopSidebarLayout` (shop pages). The sidebar is shop-only. New `tooltip` component for the icon buttons; `app-shell--topbar` modifier; `.topbar__title.wordmark` removed (the shop top bar always shows the shop name).
- **Dashboard is the only page outside a shop**: invite inbox (pending only), "Your shops" with the user's role, Create shop for Pro users, an empty state, and the cross-shop analytics only for owners of 2+ shops (each shop's numbers on its card). `/shops` and `/invites` (and the Sent invites view) removed; every link to them now goes to `/dashboard`. `shop-card__actions` added; role and pending badges carry an icon. `Wordmark` outputs `wordmark__be` (the legacy `.wordmark-be` is gone).
- **Dashboard hides nothing; manager role**: every dashboard section is always shown with an `empty` when it has nothing in it (Subscription, Invitations, Your shops, Across your shops). The new Subscription card shows the plan badge and a disabled Manage billing / Upgrade button (no billing yet). Create shop is a disabled button for non-Pro users. The analytics and each card's numbers are for every member with a shop, not only owners of 2+. Role badges: owner `badge--accent`, manager `badge--info`, staff `badge--neutral`. No new classes.
- **Manager permissions**: new `.fieldset` (a box-less `<fieldset>` so one `disabled` covers a form). Shop Settings is view only for a manager without the owner's permission. The manager's profile has two owner-only `setting-row` switches: Manage managers, Edit shop settings.
- **Shop sidebar back link**: "‹ All shops" (`faChevronLeft` + label), always shown whatever the number of shops, goes to `/dashboard`.
- **Legacy shared stylesheet retired** (page rebuild, phase 0): `styles/shared/components.css` is gone. Its classes are DS classes now: `.brand-wordmark` is `.wordmark.wordmark--inline` (+ `wordmark--muted`), `.card-back` is `.back-link`, auth `.page` is `.page.page--center`, `.copy-link-row` is `.copy-link`, `.req-met` / `.req-unmet` are `.password-requirements__item` (+ `is-met`); `.form-links`, `.password-requirements` and `.spinner-page` moved as they were; the unused `.divider` is dropped. The old 36px `.spinner` override is gone: loading pages use `spinner--lg`, cards the plain `spinner`. `shared/base.css` no longer repeats the DS focus ring and `.visually-hidden`.
- **Auth and one-off pages** (page rebuild, phase 1): Login, Register, Forgot/Reset password, Verify email, Verify email change, Accept invite, Cancel booking and the 404 use only DS classes; `login.css`, `register.css`, `forgot-password.css`, `reset-password.css`, `verify-email.css` and `not-found.css` are deleted and the accept-invite rules are out of `invites.css`. New: `card--center`, `empty__code`, `card__text strong`. The 404 is an `.empty` in a `.page--center` (its code is `fs-3xl`, no longer a `clamp()` up to 8rem). Invite and cancel errors and the email-mismatch warning are `Alert`s. The invite-locked email on Register is `.input.is-disabled`.
- **Dashboard and shop setup** (page rebuild, phase 2): `shops.css` is layout only (page column, header, form row, form actions), about 10 lines from 227; its dead rules from the removed `/shops` list are gone. Shop Settings and New Shop use `card__header`, `card__icon`, `card__text`, `field__hint`, `empty` and the new `setting-row`; `shops-spinner-wrap` is the DS `spinner-wrap` everywhere. New: `t-muted`, `card__icon`, `spinner-wrap`, `setting-row`. Buttons in settings cards no longer stretch to full width on phones, so `copy-link` lost its specificity override. `shop-overview.css` was already layout only.
- **Team and customers** (page rebuild, phase 3): Team, Team member, Customers, Customer detail, the Add member modal and the working-hours panel use only DS classes. `team.css` and `working-hours.css` are layout only (about 20 lines together, from 450); `invites.css` is deleted (all but one rule was dead). New: `page-header`, `cluster`, `card__section`, `card__toggle` + `card__chevron`. Switch rows are `setting-row`; the schedule card is a `card--flush` with a `card__toggle`; Current/Upcoming/Ended and Open/Closed are badges; remove and add time are ghost buttons; customers pagination is a `data-table__foot`. `WorkingHoursPanel` takes a `title` and renders its own section heading.
- **Services and account** (page rebuild, phase 4): Services, the service form modal, Account and the Team member "Assigned services" card use only DS classes. `services.css` and `settings.css` are layout only (about 10 lines together, from 390). New: `list`, `field-row`, and the open/pressed state of `btn--secondary`. A service row reuses `service-card__main/__name/__desc/__meta` inside a `card--flush` of `card__section`s; the account avatar is `avatar--lg`; sessions and assigned staff are `list`s; preference rows are `setting-row`s. Account buttons no longer stretch on phones.
- **Bookings** (page rebuild, phase 5): the calendar is a DS component now (`components.css` section 29, `components/Calendar`), renamed to BEM: `.cal-scroll` is `.cal`, parts are `cal__*`, block parts are `cal-block__*`, `cal-chip-badge` is `cal-chips__count`. Its sizes are rem (gutter, column minimum) and the hour height is `--cal-hour-h`, set by the page from `SLOT_H`. `bookings.css` is layout only (4 lines, from 379). New: `btn--sunken`; `btn--icon` no longer shrinks in a flex row. The header is `page-header`, the toolbar and the chip groups in the two modals are `cluster`s.
- **Public booking** (page rebuild, phase 6): the public booking page, the owner new-booking page and the booking wizard use only DS classes. `public.css` is layout only (about 20 lines, from 315). New: `page-hero`, `suggest`, `field__required`, `field--anchor`, `slot__tag`, `slot-group--collapsible`, `slot-group__count`, `.t-muted strong`. The section title is `t-heading` (no longer uppercase with a rule under it), the confirmation is a `card--center`, loading and error states are `spinner-page` / `spinner-wrap`, an `empty` or an `Alert`. The old public `Navbar`, `Toggles` and `navbar.css` were unused and are deleted.

- **Legal pages** (page rebuild, phase 7): Terms, Privacy, DPA, About and Contact use `back-link`, `t-title`, `t-subheading`, `t-body` and `t-body-sm t-muted`; `legal.css` is layout only (4 rules, from 89 lines). About and Contact keep the landing page's label and buttons.

Every page outside the landing page now uses only classes from `components.css`, plus a layout-only file in `styles/pages/` where it needs one (about 80 lines in all, tokens for every gap; the only literal sizes are page and column widths). `styles/shared/components.css` is gone.

Left:

- **Landing page** (`home.css`, `HomePage.tsx`, `Footer.tsx`, and the label and buttons on About and Contact): the one standing exception. It keeps its own `.home-btn-primary` / `.home-btn-ghost` buttons, its fake-preview `clamp()` values and class names, and a few `rgba()` shadows and scrims.
- **Open UI work:** convert the remaining saving buttons to `.is-loading` + `aria-busy`.

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
| 11 | Missing components | Added: modal, toast, tabs, empty state, skeleton, avatar. Tooltip added with the top bar outside a shop. |

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
| `.brand-wordmark` | `.wordmark` + `.wordmark__be` (`.wordmark--inline` in running text) |
| `.card-back` | `.back-link` |
| `.copy-link-row`, `.copy-link-value` | `.copy-link`, `.copy-link__value` |
| `.req-met`, `.req-unmet` | `.password-requirements__item`, `.is-met` |
| `.visually-hidden` | `.visually-hidden` |

## Order of work

1. Add `tokens.css` and `components.css` (see `implementation.md`), keeping the old variables alongside for one pass.
2. Replace old variable names with the new ones using the token map. Delete stray references (`--text-secondary`, `--gb-card`, `--font-mono`).
3. Search for `#fff`, `#ffffff`, `white`, `#f87171`, `#fbbf24`, `#34d399` and replace with tokens.
4. Migrate the shared components one at a time in this order: Button, form controls, Badge, Alert, Switch, Card, Table, ConfirmDialog.
5. Replace page-level duplicates (cards, headers, lists, buttons in `home.css`, `public.css`, `bookings.css` and the rest) with the shared classes. Delete the page rule once a page uses the shared class.
6. Convert font sizes and gaps to `--fs-*`, `--lh-*` and `--space-*`. Do not do this mechanically for `home.css`'s fake app preview; it can keep its `clamp()` values.
7. Add the new components (modal, toast, tabs, empty, skeleton, booking-flow pieces) as pages need them.

## Judgment calls to review

- Field borders are `border-strong` (3.77:1 and up), noticeably heavier than the old `--border`. That is the price of passing WCAG 1.4.11 for form controls; soften only by darkening the field background, not the border.
- Orange and amber are close in hue. They are separated by role (brand versus state), by lightness (amber-brown in light, brighter in dark), and by the rule that state always carries an icon. If a shop's brand color ever lands near orange, revisit.
- `success` and `accent` are both greens. Success always comes with a check icon and a tint, accent never appears on a tint, and the pair is not red/green, so it is safe for the usual color-blindness types.
- No high-contrast theme and no tooltip were designed; neither was asked for.
