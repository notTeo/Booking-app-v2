# Implementation guide

For developers building this in React 19 + Vite with plain CSS.

## 1. Files

```
src/styles/
  tokens.css          # design tokens (light + dark). Mirrors docs/design-system/tokens.json
  components.css      # shared component classes (BEM). Edit here; do not restyle in page CSS
  pages/*.css         # page layout only: grids, page-specific spacing. No component restyling.
```

Import order in `main.tsx`: `tokens.css`, `components.css`, then page CSS. The `@import` of Google Fonts at the top of `components.css` can move to `index.html` as `<link rel="preconnect">` + `<link rel="stylesheet">` for Poppins (400, 600), League Spartan (700, 800) and Gasoek One.

## 2. Theme

Light is the default (`:root`). Dark is `[data-theme="dark"]` on `<html>`. Set it before first paint to avoid a flash; put this inline in `index.html`:

```html
<script>
  try {
    var t = localStorage.getItem('theme');
    if (!t) t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) {}
</script>
```

Also set `color-scheme` so native controls and scrollbars follow:

```css
:root { color-scheme: light; }
[data-theme="dark"] { color-scheme: dark; }
```

## 3. Responsive behavior

- Container queries (CSS only): data table cards (below 640px of its container), steps indicator (below 480px). No JS.
- Media queries with literal numbers: `.toast-region` (640px), `.modal-backdrop` sheet (max-width 639px), `.page` padding (640px).
- Shell components take state from JS. Toggle `.is-compact` on `.navbar` and `.app-shell`, and render the sidebar as `.sidebar.is-drawer` when compact:

```ts
import { useSyncExternalStore } from 'react';
export function useMediaQuery(q: string) {
  return useSyncExternalStore(
    (cb) => { const m = matchMedia(q); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb); },
    () => matchMedia(q).matches,
    () => false,
  );
}
// const compact = useMediaQuery('(max-width: 959px)');
```

The app has two shells. Shop pages use `ShopSidebarLayout` (`.app-shell` + `.sidebar`): it switches to the `topbar` and drawer at `max-width: 640px` (`useIsCompact`), so the desktop rail stays visible on tablets. Pages outside a shop (dashboard, account) use `AppTopBarLayout` (`.app-shell.app-shell--topbar`): no sidebar, the app `navbar` on top, content centred at 72rem; `.is-compact` at the same 640px.

Drawer behavior: opens from the navbar menu button (`aria-expanded`), `.is-open` plus a `.scrim`; closes on scrim click, Escape, or navigation; focus moves into the drawer and returns to the button.

## 4. Component cheat sheet

States use real pseudo-classes. `is-hover`, `is-focus`, `is-active` classes exist only to display a state statically (docs, tests); never set them from app code.

| Component | Classes | Notes |
|---|---|---|
| Button | `btn` + `btn--secondary` / `--ghost` / `--danger`; `btn--sm` / `--lg`; `btn--icon`; `btn--block`; `is-loading` | Loading: add `is-loading` and `aria-busy="true"`, keep the label, don't set `disabled` (it must stay focusable). Disabled: `disabled`. Icon-only needs `aria-label`. |
| Field | `field`, `field__label`, `field__optional`, `field__hint`, `field__error` | Link hint and error with `aria-describedby`. Error: `aria-invalid="true"` on the control, error text in `field__error`. `.field` has `margin-bottom: var(--space-4)`; flex/grid containers with `gap` must reset it (`.x .field { margin-bottom: 0 }`). |
| Input / Textarea | `input`, `textarea`; `input--sm` | `input--sm`: 36px, only for compact toolbars/filters. `input-wrap.is-loading` + `.spinner.spinner--sm` for async validation. |
| Select | `.select-wrap > .select`; `select--sm` + `select-wrap--sm` | `select--sm` / `select-wrap--sm`: 36px, only for compact toolbars/filters. Native `<select>`; caret is CSS. `select-wrap.is-disabled` dims the caret. |
| Checkbox | `<label class="checkbox"><input class="checkbox__input" type="checkbox"><span class="checkbox__box"></span>Text</label>` | `indeterminate` is set in JS. Error: `.checkbox.is-error`. |
| Switch | `<label class="switch"><input class="switch__input" type="checkbox" role="switch"><span class="switch__track"></span>Text</label>` | `.is-loading` while the change saves (pointer events off). |
| Card | `card`, `card__header`, `card__title`, `card__icon`, `card__text`, `card__section`, `card__footer`, `card__toggle`, `card__chevron`; `card--flat`, `--glow`, `--interactive`, `--selected`, `--auth`, `--center`, `--danger`, `--dashed`, `--flush`; `is-disabled` | Use `<a>` or `<button class="card">` when the whole card is clickable. `card--danger` only sets `border-color: var(--danger-border)` (the danger button carries the color). `card--dashed` is the "add" tile (transparent, dashed, accent text, centered row). `card--flush` removes padding and gap for cards made of full-width sections. `.card` is a flex column with `gap`: direct `h1-h4`, `p` and `.field` children have their margins reset. `card--center` centres the text and a lone spinner, for a short message with its actions (accept an invite, cancel a booking). `<strong>` inside `card__text` takes the `text` colour. `card__icon` is the small muted icon before a `card__title`. `card__header` holds the title (and a line of `card__text`) on the left and one action on the right. `card__section` is a block below a divider; in a `card--flush` every row is a `card__section`. A card that opens and closes is `card--flush` with a `card__toggle` first row (`role="button"`, `tabindex="0"`, `aria-expanded`) ending in a `card__chevron`, followed by its sections when open. |
| Badge | `badge` + `--success/--warning/--danger/--info/--accent/--neutral` or `--pending/--confirmed/--completed/--canceled/--no-show`; `badge--lg` | Always include an icon and the label. |
| Alert | `alert--success/--warning/--danger` (info default); `alert__icon`, `alert__body`, `alert__title`, `alert__actions` | `role="alert"` for danger, `role="status"` otherwise. |
| Toast | `.toast-region > .toast.toast--*` | Render in a portal at the end of `<body>`. 5s auto-dismiss, errors and toasts with an action persist; pause on hover and focus. Region has `aria-live="polite"`. |
| Modal | `.modal-backdrop > .modal` (`modal__header`, `modal__title`, `modal__body`, `modal__footer`); `modal--confirm`, `modal__icon` | Portal; `role="dialog"` or `alertdialog`, `aria-modal`, `aria-labelledby`; trap focus; Esc closes; restore focus; lock body scroll. Phones become a bottom sheet through the media query. |
| Tabs | `.tabs > .tab[role=tab][aria-selected]`; `tabs--segmented` | Roving tabindex, arrow keys, `role=tabpanel`. |
| Empty | `empty`, `empty__icon`, `empty__title`, `empty__text`, `empty__actions`; `empty--sm`; `empty__code` | `empty__code` replaces the icon with the status code on an error page (the 404: `.page.page--center > .empty`). |
| Loading | `skeleton` + `--text/--title/--avatar/--button/--chip/--block`; `spinner`, `--sm`, `--lg` | `spinner--lg` for a page or section that is loading, plain `spinner` inside a card. Container gets `aria-busy="true"`; standalone spinner gets `role="status"` with visually hidden text. |
| Data table | `.table-wrap > .table-surface > table.data-table`; `data-table__foot` | Every `td` needs `data-label`; first cell `data-table__title`; last `data-table__actions`; numbers `data-table__num`. Sortable header: `data-table__sort` button with `aria-sort` on the `th`. Pagination goes in a `data-table__foot` after the table, inside `table-surface`: the page count on the left, a `cluster` of `btn--secondary btn--sm` on the right. |
| Avatar | `avatar`, `--sm/--lg/--xl` | Initials or `<img alt="">` when the name is next to it. |
| Navbar | `navbar`, `navbar__links`, `navbar__link`, `navbar__actions`, `navbar__menu-btn`, `navbar__panel`; `is-compact`, `is-open` | `aria-current="page"` marks the active link, and the active icon action in `navbar__actions`. Icon-only actions get `aria-label` and a `tooltip`. |
| Tooltip | `tooltip`, `tooltip__bubble`; `tooltip--end`; `is-open`, `is-dismissed` | Bubble is `aria-hidden`; the control keeps its `aria-label`. Esc dismisses (`is-dismissed`). |
| Sidebar | `sidebar`, `sidebar__shop`, `sidebar__label`, `sidebar__nav`, `nav-item`, `sidebar__footer`, `sidebar__brand`, `sidebar__title`; `app-shell__main`, `app-shell--topbar`, `topbar`, `topbar__title`; `sidebar--collapsed`, `is-drawer`, `is-open`; `scrim` | `aria-current="page"` on the active `nav-item`. Collapsed items need `aria-label`/`title`. |
| Shop card (dashboard) | `.shop-cards > .shop-cards__grid > li > .card.shop-card`; `shop-card__head`, `shop-card__name`, `shop-card__arrow`, `shop-card__metrics`, `shop-card__metric`, `shop-card__value`, `shop-card__label`, `shop-card__actions` | "Your shops": `<a class="card card--interactive shop-card">`, name, role badge (owner `badge--accent`, staff `badge--neutral`), metrics only with the cross-shop overview. Invite inbox: `<div class="card shop-card">` with `shop-card__actions` (Accept, Decline). Section is a `<section>` labelled by its `card__title` heading. |
| Service / staff card | `service-card`, `staff-card` with `role="radio"` inside a `role="radiogroup"`; `aria-checked`; `aria-disabled` | Arrow keys move the selection; only one card is in the tab order. Always include `.option-check`. |
| Date picker | `datepicker`, `datepicker__grid`, `day`; `day--today`, `day--open`, `day--blank`; `aria-pressed`, `disabled`; `is-loading` | Week starts Monday unless the locale says otherwise. Give each day an `aria-label` with weekday and month. |
| Time slots | `slots`, `slot`, `slot-group`, `slot-group__label`; `aria-pressed`, `disabled` | Label booked slots ("10:00, booked"). |
| Steps | `.steps-wrap > ol.steps > li.steps__item` (`is-done`, `is-current`) and `.steps-compact` | Render both; the container query hides one. Done steps are buttons. `aria-current="step"` on the current one. |
| Chip | `chip`, `chip__label`; `chip--pending` / `--confirmed` / `--completed` / `--canceled` / `--no-show` (colors apply when pressed); `chip--lg` | `<button aria-pressed>`. Filters and short value pickers, not view switching (use tabs). Canceled label is struck through. |
| Wordmark | `wordmark`, `wordmark__be`, `--sm`, `--lg`; `wordmark--inline`, `wordmark--muted` | `<span class="wordmark"><span class="wordmark__be">Be</span>Booked</span>`. `wordmark--inline` inside running text or a heading (takes the size and colour around it); add `wordmark--muted` so "Be" is not orange. |
| Page | `page`; `page--center` | `page` is the 72rem content column. `page--center` puts one card in the middle of the screen (auth pages). `spinner-page` centres a `spinner spinner--lg` while a route resolves; `spinner-wrap` centres one where a page or section is loading. |
| Back link | `back-link` | `<a>` or `<button>` above a page or card title. As a direct child of `.card` it drops its bottom margin. |
| Form links | `form-links` | The links under an auth form. |
| Password requirements | `ul.password-requirements > li.password-requirements__item`; `is-met` | Each item has a check or x icon before the label; `is-met` turns it `success`. |
| Page header | `page-header` | The page title (`h1.t-title`) or section title (`h2.t-subheading`) on the left, its one action on the right; wraps on phones. |
| Cluster | `cluster`; `cluster--tight` | A wrapping row of buttons, badges or short texts (form actions, a badge with its date, table row actions). |
| Setting row | `setting-row`, `setting-row__label`, `setting-row__title`, `setting-row__text` | A setting's name (a `<label for>` the control) and one-line explanation on the left, its `switch` or button on the right. |
| Copy link | `copy-link`, `copy-link__value`, `copy-link__btn`; `copy-link--compact` | A URL with Copy and Open buttons on one line; the URL truncates. Rendered by `CopyLinkButton`. |

Text utilities: `t-display`, `t-title`, `t-heading`, `t-subheading`, `t-body`, `t-body-sm`, `t-caption` set size and weight; add `t-muted` for secondary copy (`text-muted`).

## 5. Rules

- No raw colors, sizes or gaps in component or page CSS. Use tokens. If a value is missing, add a token here first.
- Pages position and space components; they don't restyle them. A page that needs a different button gets a new variant in the system.
- Every form control has a visible label. Every icon-only button has an `aria-label`. Every status shows an icon and a word.
- Test each screen in light, dark and at 360px wide. Check the keyboard path before the mouse path.

## 6. Reference tokens.css

A mirror of the generated `tokens.css`, for reading. Use the generated file in the app.

```css
:root, [data-theme="light"]{--bg:#f8faf8;--surface:#ffffff;--surface-raised:#ffffff;--surface-sunken:#eef3ee;--scrim:#06281873;--border:#dfe6df;--border-strong:#6b8071;--text:#064e3b;--text-muted:#4a5d52;--accent:#166534;--accent-hover:#14532d;--accent-active:#0f4325;--accent-soft:#e2f1e6;--on-accent:#ffffff;--focus-ring:var(--accent);--brand-accent:#d4570a;--success:#157a3b;--success-bg:#e4f3e8;--success-border:#9fd4ad;--warning:#8a4b00;--warning-bg:#fdf1d6;--warning-border:#e9c77a;--danger:#b42318;--danger-hover:#912018;--on-danger:#ffffff;--danger-bg:#fdebe9;--danger-border:#f0aaa2;--info:#1b5fa6;--info-bg:#e6f0fa;--info-border:#a9c9ea;--shadow-sm:0 1px 2px rgba(6, 40, 24, 0.06), 0 1px 3px rgba(6, 40, 24, 0.08);--shadow-md:0 4px 12px rgba(6, 40, 24, 0.08), 0 2px 4px rgba(6, 40, 24, 0.06);--shadow-lg:0 16px 40px rgba(6, 40, 24, 0.16), 0 4px 12px rgba(6, 40, 24, 0.08);--shadow-accent:0 4px 14px rgba(22, 101, 52, 0.32);--shadow-glow:0 0 18px rgba(22, 101, 52, 0.08);--shadow-sheet:0 -8px 24px rgba(6, 40, 24, 0.16);}

[data-theme="dark"]{--bg:#0f120f;--surface:#171c17;--surface-raised:#1e251e;--surface-sunken:#1c241c;--scrim:#000000b3;--border:#2a352a;--border-strong:#6f8774;--text:#e3e8e3;--text-muted:#9bab9b;--accent:#8fb596;--accent-hover:#a8c8ae;--accent-active:#bcd6c1;--accent-soft:#1f3023;--on-accent:#0b140c;--focus-ring:var(--accent-hover);--brand-accent:#f0894a;--success:#74cf8e;--success-bg:#16301f;--success-border:#2d5a3a;--warning:#f0b45c;--warning-bg:#33260f;--warning-border:#5c4519;--danger:#f28b82;--danger-hover:#f6a8a1;--on-danger:#1c0a08;--danger-bg:#361715;--danger-border:#6b2d29;--info:#8db9ee;--info-bg:#15263b;--info-border:#2c4a6e;--shadow-sm:0 1px 2px rgba(0, 0, 0, 0.5);--shadow-md:0 4px 12px rgba(0, 0, 0, 0.5);--shadow-lg:0 16px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05);--shadow-accent:0 4px 14px rgba(143, 181, 150, 0.22);--shadow-glow:0 0 18px rgba(143, 181, 150, 0.12);--shadow-sheet:0 -8px 24px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05);}

:root{--space-1:4px;--space-2:8px;--space-3:12px;--space-4:16px;--space-5:20px;--space-6:24px;--space-8:32px;--space-10:40px;--space-12:48px;--space-16:64px;--radius-sm:6px;--radius-md:12px;--radius-lg:20px;--radius-pill:999px;--radius-full:50%;--motion-fast:120ms;--motion-base:200ms;--motion-slow:320ms;--ease-standard:cubic-bezier(0.2, 0, 0, 1);--ease-exit:cubic-bezier(0.4, 0, 1, 1);--bp-sm:640px;--bp-md:960px;--bp-lg:1280px;--fs-xs:0.75rem;--fs-sm:0.875rem;--fs-base:1rem;--fs-lg:1.125rem;--fs-xl:1.5rem;--fs-2xl:2rem;--fs-3xl:3rem;--lh-xs:1rem;--lh-sm:1.25rem;--lh-base:1.5rem;--lh-lg:1.75rem;--lh-xl:2rem;--lh-2xl:2.25rem;--lh-3xl:3rem;--fw-regular:400;--fw-semibold:600;--fw-bold:700;--fw-black:800;--z-nav:100;--z-drawer:200;--z-modal:300;--z-toast:400;--font-body:"Poppins", system-ui, -apple-system, "Segoe UI", sans-serif;--font-display:"League Spartan", "Poppins", system-ui, sans-serif;--font-logo:"Gasoek One", "League Spartan", sans-serif;}
```
