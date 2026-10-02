# UI rebuild audit: REBUILD VIEW vs RESKIN

Read-only static audit of `web/src` (branch `dev`, 700cc05) against the BeBooked design system (DS). Nothing was run; anything not provable from code is marked "unclear".
Paths: `W/` = `web/src/`, `E/` = `e2e/tests/`, `DS` = `W/styles/components.css`, `sh/c` = `W/styles/shared/components.css`, `sh/b` = `W/styles/shared/base.css`, `PA` = `docs/product-audit.md`.

Method and caveats:
- DS coverage = distinct `className` tokens that are DS-defined ÷ all distinct tokens, per file, resolved through template strings and ternaries. No unresolved DYNAMIC classNames were found in any audited file.
- Planned work (f) comes from `PA` Part 1 (page changes) and Part 4 (NOW 1-8, NEXT 9-18, LATER 19-25). `PA` was not trusted blindly: where it is incomplete it is corrected below (see section 2).
- Rules (task Step 3): **REBUILD** if f=large OR (DS<50% AND >=3 MISSED/DUPLICATE/OVERRIDE). **EXTRACT FIRST** if REBUILD and e="only after extracting". **RESKIN** if f=none/small AND DS>=50%. f=large means new section, merge, new modal or new flow.
- Account decision (user): Option A. Theme and language toggles stay on the Account page; no avatar menu. `PA` Part 1 `/settings` change #2 ("move toggles") is dropped.
- Shop overview decision (user): no route merge; the page is judged as it exists.
- Three layout facts apply to every page: all page CSS is global because every page is a static import (`W/App.tsx:12-41`, no `React.lazy`); DS loads first (`W/main.tsx:12-13`), then `W/index.css` (`main.tsx:14`) which imports the legacy layer (`index.css:1-2`), then page CSS, so legacy and page rules win equal-specificity ties against the DS; `ShopContext.isLoading` starts `false` (`W/context/ShopContext.tsx:16-17`) so the first render of every shop page has `shop=null, isLoading=false`.

---

## 1. Verdict table

Effort: S <2h, M half day, L 1-2 days (page only; extraction commits counted separately where noted). "Selectors at risk" = lines in `E/` or unit tests that a markup rewrite would break.

| Page | Proposed | Decision | AGREE/FLIP | Rule fired | DS % | e2e selectors at risk | Effort |
|---|---|---|---|---|---|---|---|
| Booking page shell + confirmation (`PublicPage`) | REBUILD | EXTRACT FIRST (`useBookingSubmit`, `useCustomerLookup`), then REBUILD | AGREE | f=large (PA NOW 3, F6); also 48.6% DS with 5+ MISSED/DUP | 48.6 | about 12 spec lines (`.public-wizard-actions` booking-busy:53, `.public-booking-confirmed` timezone:80, `#booking-date`, `#b-*`, radiogroup roles) | M (+S extract) |
| Booking wizard steps 1-4 | RESKIN | RESKIN | AGREE | Rule 3: f small (PA NEXT 14), 62.3% | 62.3 | about 40 spec lines (radio roles, slot button names, `aria-pressed`, `#booking-date`); keep roles and ids | S |
| Cancel | RESKIN | RESKIN (extract `useCancelBooking` with the NOW 2 fix) | AGREE | Rule 3: f small (PA NOW 2), 66.7% | 66.7 | 0 | S |
| Calendar (`ShopBookingsPage`) | REBUILD VIEW | EXTRACT FIRST (`useShopBookings`, `useCalendarFilters`, `useActiveColumn`, view-model fn), then REBUILD | AGREE | f=large (PA NOW 1, NOW 8, NEXT 11); 40.3% with 6+ MISSED/DUP/OVR | 40.3 | 11 spec lines (`.cal-block*`, `#bookings-date`, `.cal-filters-count`, `#cal-filter-*`, status chip button name) | L (+M extract) |
| New booking (not in split) | n/a | RESKIN | n/a | Rule 3 not met on DS% but rule 2 does not fire (2 MISSED/DUP per file, <3); f small (PA NEXT 16) so it leans RESKIN | 14-20 | shared with wizard | S |
| Dashboard | REBUILD VIEW | REBUILD VIEW (additive) | AGREE | f=large (PA NOW 7: new Today section, Pending removal, donut move) | 90.7 | about 25 spec lines (`.stat*`, `.shop-card*`, `.bar-chart__*`, `td[data-label]`) | M |
| Shop overview (as it exists) | REBUILD VIEW | REBUILD VIEW | AGREE | f=large (PA NOW 7 Today + NEXT 10 setup checklist, link row, New booking button) | direct 0 / shared 90 | same specs as Dashboard (`overview.spec.ts` 289 lines) | M |
| Team + Shop invites (merge) | REBUILD VIEW | EXTRACT FIRST (`useTeamMembers`, `useAddMemberForm`), then REBUILD | AGREE | f=large (PA NEXT 12 merge + add-member modal) | 82 / 67 | 0 (no e2e) | L |
| Team member | REBUILD VIEW | EXTRACT FIRST (`useTeamMember`, `useMemberInvite`, `useMemberServices`), then REBUILD | AGREE | f=large (PA NOW 5 new deactivate flow, switch regroup, hours summary) | 54 | 0 | L |
| WorkingHoursPanel | REBUILD VIEW | EXTRACT FIRST (`useScheduleEditor`), then REBUILD | AGREE | f=large (PA NOW 4 closures, NEXT 17); 31% with 13 MISSED/DUP/OVR | 31 | 0 (but seeds DB tables `owner-outside-hours.spec.ts:19,22,259,262`) | L (+M extract) |
| Services | RESKIN | In-place fix (path A, section 4.8); rule 2 literally gives EXTRACT FIRST + REBUILD | FLIP by rule, resolved to in-place at user direction | Rule 2: 43% with 13 MISSED/OVR/UNDEF | 43 | 7 spec lines (`service-delete.spec.ts:40-56`) | S-M (A) vs L (B) |
| Customers list | RESKIN | RESKIN | AGREE | Rule 3: f small (PA NEXT 13), 67% | 67 | 0 | S |
| Customer detail | RESKIN | EXTRACT FIRST (`useCustomerDetail`, `useCustomerPrivacy`), then REBUILD | FLIP | f=large (PA NEXT 13: upcoming, last visit, counts, 20-row history, shortcuts) | 73 | 0 | M |
| Shop settings | RESKIN | RESKIN | AGREE | Rule 3: f small (PA Part 1), 53% | 53 | 3 spec lines (`#detail-slot-interval`, "Save changes", `owner-slot-interval-filters.spec.ts:29-31`) | S |
| Shops | RESKIN | REBUILD VIEW | FLIP | Rule 2: 45% with 8 MISSED/OVR | 45 | 0 | S |
| New shop | RESKIN | RESKIN (+ i18n) | AGREE | Rule 3: 60% | 60 | 1 (`dashboard-overview.spec.ts:240` URL only) | S-M |
| Account | RESKIN | REBUILD VIEW | FLIP | Rule 2: 39% with 11 MISSED/DUP/OVR (f small under Option A) | 39 | 7 (`account-delete.spec.ts:23-37`, roles and English strings) | M |
| My invites | RESKIN | RESKIN | AGREE | Rule 3: f small (PA Part 1), 73% | 73 | 0 | S |
| Auth pages (6) | RESKIN | RESKIN, after centered-page DS class and legacy `.page` removal | AGREE | Rule 3: f small (PA NEXT 15), 61% union | 61 | 10+ spec lines (`#email`, `#password`, `button[type=submit]` on Login) | S-M |
| Accept invite | RESKIN | RESKIN | AGREE | Rule 3: 54% | 54 | 0 | S |
| Terms / Privacy / DPA | RESKIN | REBUILD VIEW (one prose template) | FLIP | Rule 2: 0% with 5 MISSED + 5 DUP | 0 | 1 (`.legal-title`, `root-routing.spec.ts:20`) | S |
| About + Contact | RESKIN | REBUILD VIEW (merge Contact into About) | FLIP | f=large (PA Part 1 merge) and 0% | 0 | 0 | S |
| 404 | RESKIN | REBUILD VIEW | FLIP | Rule 2: 20% with 3 MISSED | 20 | 2 (`.not-found`, `root-routing.spec.ts:27,36`) | S |
| Sidebar / AppLayout | REBUILD VIEW | REBUILD VIEW (do the PA NOW 6 rename in the same pass) | AGREE | Rule 2: 5% (1/22) with 13 MISSED/DUP; f small by PA, large by DS adoption | 5 | 0 direct; indirect `h1` (`overview.spec.ts:142`) | L |
| HomePage (not in split) | n/a | out of scope, flagged | n/a | PA LATER 22 | 3.9 | 0 | n/a |

Counts: 14 REBUILD (6 of them EXTRACT FIRST: booking shell, Calendar, Team, Team member, WorkingHoursPanel, Customer detail), 9 RESKIN, 1 in-place resolution (Services). 7 FLIPs against the proposed split: Customer detail, Shops, Account, Terms/Privacy/DPA, About+Contact, 404, and Services (by rule, resolved in place). Dashboard and Shop overview stay REBUILD (AGREE).

---

## 2. Foundation

### 2.1 Import order (confirmed)
| Step | Source |
|---|---|
| 1 | Fontsource CSS `W/main.tsx:4-11` |
| 2 | `W/styles/tokens.css` `main.tsx:12` (3 lines, minified; `wc -l` reports 2 because there is no trailing newline) |
| 3 | `W/styles/components.css` `main.tsx:13` |
| 4 | `W/index.css` `main.tsx:14` → `@import shared/base.css` (`index.css:1`), `@import shared/components.css` (`index.css:2`) |
| 5 | Per-page CSS through the eager import graph (`main.tsx:18`, `App.tsx:12-41`) |

The legacy layer is still imported and loads after the DS.

### 2.2 Legacy rules colliding with DS (legacy wins ties)
| Legacy rule | DS counterpart | Effect |
|---|---|---|
| `sh/c:2-9` `.spinner` (36px, 3px border, `spin`) | `DS:401-404` `.spinner` | Legacy size and animation win. `.spinner--sm/--lg` (`DS:405-406`) are earlier and lose, so inline sizes are used: `W/pages/ShopServicesPage.tsx:449`, `ShopTeamMemberPage.tsx:446`. Also hits `ShopBookingsPage:270,465`, `PublicPage:68`, `CancelBookingPage:37`, `OwnerBookingWizard:63`, `ShopNewBookingPage:11`. |
| `sh/c:11-13` `@keyframes spin` | `DS:43` `ds-spin` | Duplicate |
| `sh/c:24-32` `.page` (flex-centre, `min-height:100dvh`, padding 1.5rem) | `DS:491-492` `.page` (max-width 72rem, responsive padding) | Same selector, different meaning; legacy padding beats DS padding. Used by `LoginPage:35`, `RegisterPage:78`, `ForgotPasswordPage:32`, `VerifyEmailPage:66`, `ResetPasswordPage:47`, `VerifyEmailChangePage:40`. |
| `sh/b:29-36` `a:hover{text-decoration:underline}` | `.btn{text-decoration:none}` | (0,1,1) beats (0,1,0): every `<Link className="btn">` underlines on hover (`AcceptInvitePage:70,121,131,137`). |
| `sh/b:38-42` `a/button:focus-visible` | `DS:33` `:focus-visible` (`--focus-ring`) | Legacy outline bypasses the focus token for bare `a`/`button`. |
| `sh/b:15-22` `body` (16px, line-height 1.6) | `DS:21-29` (`--fs-base`, `--lh-base`) | `--lh-base` (1.5rem) overridden by 1.6. |
| `sh/b:24-27` h1-h6 weight 900 | `DS:30` h1-h4 | Duplicate; DS `--fw-black` is 800. |
| `sh/b:1-5` reset | `DS:19`, `DS:30-31` | Duplicate |
| `sh/b:46-56` `.visually-hidden` | `DS:34-37` | Duplicate |
| `sh/c:88-101` `.brand-wordmark`, `.wordmark-be`, `.brand-wordmark--muted` | `DS:60-64` `.wordmark`, `.wordmark__be` | Same purpose, other names; `--muted` is a DS-GAP. |
| `sh/c:163-171` `.copy-link-row .copy-link-btn.btn` | `.btn--icon .btn--sm` | 3-class specificity hack to beat `shops.css:224` `.btn{width:100%}`. |

Legacy rules with no DS equivalent (must move into the DS before the layer can be deleted): `.form-links` (`sh/c:35-42`), `.card-back` (`sh/c:62-84,132-135`), `.password-requirements/.req-met/.req-unmet` (`sh/c:108-130`), `.copy-link-*` (`sh/c:141-179`), `.spinner-page` (`sh/c:15-21`, used `W/components/ProtectedRoute.tsx:8`). Dead: `.divider` (`sh/c:45-59`, no TSX uses it).

### 2.3 Other collisions and leaks
| Item | Evidence |
|---|---|
| `shops.css:48-50` `.shop-card{gap}` redefines DS `.shop-card` (`DS:676`) and leaks onto the dashboard cards (`W/components/overview/ShopCards.tsx:18`) | `shops.css:48`, `ShopsPage.tsx:60` |
| `sidebar.css:60-76,276-285` redefines DS `.sidebar` | |
| `navbar.css:1-11` redefines DS `.navbar`; file is never bundled (only `Navbar.tsx:5` imports it) | |
| Only `!important`s outside the DS | `services.css:106,107,111,112` |
| `.label-caps` defined twice inside the DS | `DS:38`, `DS:56` |
| `shops-spinner-wrap` defined only in `shops.css:22` but used on at least 11 pages (Calendar `ShopBookingsPage:270,465`, Team :67, Member :272,445, Invites `ShopInvitesPage:134`, Services :333, Customers :51,81, Detail :119, Settings :137, Shops :36, My invites `InvitesPage:91`) | `PA` F17 does not list it |
| `sh/c` page-load wrappers: three variants for the same job (`.public-loading` `public.css:16`, `.spinner-page`, `.shops-spinner-wrap`) | |
| `home.css` (2266 lines) is loaded globally via `Footer.tsx:3`, `AboutPage:8`, `ContactPage:7`; `HomePage.tsx:37` imports `sidebar.css` | |

### 2.4 Foundation hygiene counts
| Metric | Result |
|---|---|
| Raw hex outside tokens.css | 0 |
| rgb/rgba | 11: `home.css:118,241,266,354,524,560,1610,1614,1677,2206`, `sidebar.css:295` |
| Named colour | 1: `home.css:1638` |
| Off-grid breakpoints | 8: `home.css:2142,2160,2167,2220,2254`, `sidebar.css:271,322`, `working-hours.css:42` |
| Off-by-one `max-width:640px` (DS uses 639) | 3: `navbar.css:89`, `settings.css:163`, `shops.css:213` |
| Weight 500 (Poppins 500 not imported; `main.tsx` loads 400/600/700/800) | `settings.css:104`, `invites.css:39`, `home.css:162,1470` |
| Inline `style={{}}` in TSX | 30 across 16 files (top: `ShopBookingsPage` 4, `HomePage` 4, `CancelBookingPage` 4) |
| Comment-only CSS files still imported | `register.css`, `forgot-password.css`, `reset-password.css` (1 line each; imported `RegisterPage:8`, `ForgotPasswordPage:4`, `ResetPasswordPage:5`) |
| Tokens used but not in tokens.css | `--control-sm/md/lg` (`DS:13-15`); runtime-set: `--bar-h` (`BookingsChart.tsx:55`), `--donut-stops` (`StatusDonut.tsx:33`), `--sidebar-width` (`Sidebar.tsx:64,129`) |
| Tokens defined, never used | `--bp-sm/md/lg` (CSS vars cannot drive media queries), `--ease-exit` |

### 2.5 DS inventory
257 distinct selectors in `components.css`, 84 tokens in `tokens.css` (+3 `--control-*` in `components.css`). Token groups: 30 colour, 6 shadow, 10 space (1-6, 8, 10, 12, 16), 5 radius, 5 motion, 3 breakpoint, 7 font-size, 7 line-height, 4 weight, 4 z-index, 3 font-family. Class groups: typography 9, wordmark 4, button 8, field/input/select 16, checkbox 3, switch 4, card 13, stat 9, badge 13, chip 12, alert 8, toast 9, modal 11, tabs 5, empty 6, skeleton/spinner 10, data-table 12, avatar 4, navbar 8, shell/sidebar 11, booking-flow 14, datepicker/slots 14, steps 9, dashboard (bar-chart, donut, legend, shop-card) 30, state classes 13. Full list: `DS` and `docs/design-system/components/*`.

### 2.6 DS classes never used in any TSX: 74 (of 93 without a literal use; 19 are used dynamically)
Dynamic uses: `badge--{pending,confirmed,completed,canceled,no-show}` (`W/components/StatusBadge.tsx:11`), `chip--*` (`ShopBookingsPage.tsx:323,451`), `legend__item--*` (`StatusDonut.tsx:43`), `stat__icon--*` (`StatCards.tsx:9-19`).

| Never-used DS class(es) | Re-implemented under another name? (page, file:line) |
|---|---|
| `app-shell` | Yes: `app-layout`/`app-body`, `AppLayout.tsx:19,43` (`sidebar.css:2,9`) |
| `scrim`, `is-drawer`, `sidebar--collapsed` | Yes: `sidebar-backdrop` (`AppLayout.tsx:38`; `sidebar.css:292`), `drawer-open` (`Sidebar.tsx:63,128`); collapsed rail: none |
| `nav-item`, `nav-item__label`, `sidebar__label/__nav/__shop/__shop-name/__footer` | Yes: `sidebar-link`, `sidebar-section-label`, `sidebar-shop-name`, `sidebar-bottom` (`Sidebar.tsx:75-197`; `sidebar.css:93-261`) |
| `navbar__*` (7) | Dead component `Navbar.tsx:26-85`; landing uses `home-hamburger`/`home-mobile-menu` (`HomePage.tsx:335,373`) |
| `toast-region`, `toast`, `toast--*`, `toast__*` (9) | No re-implementation; closest is `invites-form-feedback--*` (`ShopInvitesPage.tsx:227`). **No JS toast component exists**, only CSS. |
| `datepicker*`, `day--*` | Replaced by native `<input type="date">`, `DateTimeStep.tsx:158` |
| `wordmark`, `--sm`, `--lg`, `__be` | Yes: `brand-wordmark`/`wordmark-be` (`Wordmark.tsx:5`, `BrandText.tsx:15`) |
| `avatar--sm` / `avatar` itself | `avatar--lg` re-implemented as `settings-avatar` (`SettingsPage.tsx:169`; `settings.css:34-46`) |
| `btn--lg` | Yes: `home-btn-primary`/`home-btn-ghost` (`AboutPage.tsx:28,33`, `ContactPage.tsx:21`; `home.css:35-76`) |
| `badge--danger/info/lg` | Partly: `wh-status--*` (`WorkingHoursPanel.tsx:449`) |
| `field__error` | Yes: `wh-slot-error` (`WorkingHoursPanel.tsx:623`), `public-error` (`OwnerBookingWizard.tsx:66`), `invites-form-feedback--error` (`ShopInvitesPage.tsx:227`) |
| `t-body`, `t-display` | Yes: `legal-body`, `legal-title` (`legal.css:19,32`) |
| `tab__count` | Yes: inline spans `InvitesPage.tsx:114,123` |
| `data-table__foot` | Yes: `pagination-controls` (`ShopCustomersPage.tsx:126,134`; `team.css:132-143`) |
| `switch__state` | Yes: `working-hours-status` (`WorkingHoursPanel.tsx:582`) |
| `empty`/`empty--sm` (used, but) | Re-implemented 8x: `team-empty`, `services-empty`, `wh-empty`, `invites-empty`, `shops-empty`, `accept-invite-error`, `public-error`, `not-found` |
| `card--flat/glow/selected`, `card__footer`, `option-check`, `service-card__end`, `input-wrap`, `skeleton--button`, `data-table__num/__sort/__sub`, `is-compact` (no `matchMedia` anywhere in src) | None found |
| `spinner--sm/--lg` | Unusable (legacy `.spinner` wins, 2.2) |

### 2.7 What must be removed or fixed before any page work
| # | Action | Blocks |
|---|---|---|
| 1 | Delete dead code: `Navbar.tsx`, `Toggles.tsx`, `navbar.css`, `sh/c` `.divider`, empty `register/forgot-password/reset-password.css` imports, `.contact-page` (`legal.css:69-89`), `.overview-total` (`shop-overview.css:13`), `.service-icon-btn` (`services.css:97`), `.shop-active-toggle`/`.shop-checkbox-label` (`shops.css:150,155`) | nothing; lowers noise |
| 2 | Add DS equivalents for the legacy-only rules (`.card-back` → back link, `.form-links`, password checklist, copy-link field, `.spinner-page` → loading wrapper), then migrate users | step 3 |
| 3 | Remove `sh/c` and `sh/b` imports from `index.css:1-2` (keep only a minimal root rule for `html/body/#root` height from `sh/b:7-13`) | Cancel, Auth, every `.spinner`, `Link.btn` hover, focus ring |
| 4 | Resolve `.page` collision: DS `.page` stays; add a centered-page class for auth/cancel/accept/404 | Cancel (NOW 2), Auth |
| 5 | Rename or remove `shops.css:48` `.shop-card{gap}` | Dashboard, Shops |
| 6 | Move `--control-*` into `tokens.css`; normalise 640/639 and the 8 off-grid breakpoints at the pages that are touched | per page |
| 7 | Logic fix (own branch, PA branch 1): `ShopContext.isLoading` initial `true`, and null-shop handling in every shop page (see 3.x bug lists) | all shop pages |
| 8 | Add `toast` JS (region + hook); CSS exists | Calendar (NOW 1) |

### 2.8 Corrections to `PA`
| `PA` claim | Verified result |
|---|---|
| F17: legacy layer has duplicate `.spinner`, `.card-back`, `.form-links` | Also `.page`, `a:hover`, `:focus-visible`, body line-height, h1-h6, `.visually-hidden`, wordmark, `.copy-link-btn` (2.2) |
| DS bypass list: `shops-spinner-wrap` used by 5 pages | At least 11 pages (2.3) |
| Part 1 `/settings` #2 moves toggles out of the page; Part 3.4 Option A keeps them | Resolved by user: Option A, toggles stay |
| NEXT 12 merges Team + shop invites | Member page stays a separate route in `PA` (route table `PA:59`); the proposed split merged all three. This audit follows `PA`. |
| `PA` F7 lists infinite spinners on 6 pages | Same root cause (`ShopContext` sets `shop=null` on failure, `ShopContext.tsx:41-42`), see per-page evidence below |

---

## 3. DS gaps (extend the DS before touching pages)

Tag = first page that needs it and the first `PA` item. "LATER" = no NOW/NEXT item needs it.

| # | Gap (what to add) | Evidence (file:line) | First page | Needed by | Tag |
|---|---|---|---|---|---|
| G1 | Toast region + hook (CSS exists, no JS, 9 classes unused) | `DS` toast block; `ShopBookingsPage.tsx:147-149` silent failure | Calendar | NOW 1 (#4), NEXT 16 | NOW |
| G2 | `.page-header` (title + actions, wraps); 6 copies: `bookings-header` `bookings.css:11`, `overview-head` `shop-overview.css:3`, `invites-header` `invites.css:11`, `shops-header` `shops.css:6`, `team-header` `team.css`, `services-header` `services.css` (+ 5 copies of `h1{1.6rem/700}`) | | Calendar | NOW 1 | NOW |
| G3 | Loading wrapper (`.loading` / spinner-wrap) replacing `.public-loading`, `.spinner-page`, `.shops-spinner-wrap` | `public.css:16`, `sh/c:14`, `shops.css:22` | Calendar | NOW 1 / NOW 5 | NOW |
| G4 | Calendar geometry tokens (`--cal-hour-h` 64px duplicated at `bookings.css:167` and `ShopBookingsPage.tsx:32`, `--cal-gutter-w` 56px `:111`, `--cal-col-min` 140px `:112`, `--cal-stripe` 6px `:113`, sticky-header z-token raw `10` at `:132`, `6` at `:399`), event-block component reusing `.badge--*` status tokens (`bookings.css:229-231,273-277`), off-hours hatch, toolbar/cluster | `bookings.css:110-356` | Calendar | NOW 1, NOW 8 | NOW |
| G5 | Centered page (auth, cancel, accept, 404) | legacy `.page` `sh/c:24-32`; `accept-invite-page` `invites.css:103-111`; `not-found` `not-found.css:1-11` | Cancel | NOW 2 | NOW |
| G6 | Public shell (narrow 45rem column + hero header), section-heading variant (2px rule, raw `0.06em` at `public.css:105`), stack/cluster utilities | `public.css:6-106` | Booking page | NOW 3 | NOW |
| G7 | Narrow page widths (860/680 raw: `team.css:3,45`, `services.css:3`, `shops.css:3`, `invites.css`, `working-hours.css:3`) | | Team | NOW 5 / NEXT 12 | NOW |
| G8 | Setting row (switch + label + description); 3 copies: `team-switch-*` (6 uses `ShopTeamMemberPage:333-381`, `ShopInvitesPage:199-218`), `shop-active-*` (`ShopSettingsPage:281-284`), `settings-pref-row` (`SettingsPage:252`) | `team.css`, `shops.css`, `settings.css` | Team member | NOW 5 (#6 regroup switches) | NOW |
| G9 | Assigned-item list row + inline add select (`service-staff-*`: `ShopTeamMemberPage:454-477`, `ShopServicesPage:446-485`; `services.css:119-170`) | | Team member | NOW 5 | NOW |
| G10 | Back link (`card-back`; `legal-back` is a duplicate; tap target 20px per `PA`) | `sh/c:62-84`, `legal.css:7-17` | Team member | NOW 5 | NOW |
| G11 | Day-schedule editor (day label + switch + time-range slots), accordion/disclosure row (`wh-chevron`, `wh-schedule-header`) | `working-hours.css`; `WorkingHoursPanel.tsx:440-491,571-601` | WorkingHoursPanel | NOW 4 | NOW |
| G12 | Sidebar header row, back link, static shop title, `is-compact` hook (no `matchMedia` in src), resize decision (DS has fixed 16rem/4.5rem, current has `useSidebarWidth`), `wordmark` adoption | `Sidebar.tsx:29-34,67-72,137-142`; `sidebar.css:19,34,41,141-162` | Sidebar | NOW 6 | NOW |
| G13 | Copy-link read-only field (legacy, raw `monospace`/`.85rem`) | `sh/c:141-179`; `CopyLinkButton.tsx:28-38` | Shop overview | NEXT 10 (link row always visible) | NEXT |
| G14 | Password requirements checklist | `sh/c:108-130`; `RegisterPage.tsx:121-128`, `ResetPasswordPage.tsx:61-68` | Register | NEXT 15 (needed to delete `sh/c`) | NEXT |
| G15 | `.field__required` (DS has only `field__optional`) | `PublicPage.tsx:216,231`, `OwnerCustomerFormStep.tsx:125,159` | Booking page details | NEXT 14 | NEXT |
| G16 | Autocomplete listbox/menu (`customer-search-*`, stand-in `z-index:var(--z-nav)` at `public.css:273`) | `OwnerCustomerFormStep.tsx:136-151` | New booking | NEXT 16 | NEXT |
| G17 | `.wordmark--inherit` (replaces `brand-wordmark--muted`) | `sh/c:99-101` | Auth / footer | NEXT 15 | NEXT |
| G18 | Disclosure for `slot-group--collapsible` | `DateTimeStep.tsx:245`; `public.css:227-254` | wizard step 3 | none (owner-only polish) | LATER |
| G19 | Prose container (legal), `t-display` numeral variant (404 code) | `legal.css:1-5`; `not-found.css:13-19` | Legal | none (DPA content only, PA Part 1) | LATER |
| G20 | Avatar menu / popover | PA Option B | n/a | LATER 20 | LATER |
| G21 | Left-aligned `card__footer` variant (`service-card-actions`) and tinted nested panel (`service-staff-panel`, color-mix `services.css:119`) | `services.css:92-94,119` | Services | PA branch 12 only | LATER |

Not gaps (reuse): reschedule and calendar detail use existing `modal`/`modal-backdrop--sheet` (`PA` Calendar #6, `DS:348`); Add member modal uses `modal`; setup checklist is a list in a `card` (`PA` Shop overview #2: "NO NEW COMPONENT"); pressed/danger buttons use `btn--ghost`/`btn--danger` (`PA` Services #4), so `service-action-active` and `service-delete-btn` need no DS class.

---

## 4. Per-page sections

Each section: a) files and lines, b) DS coverage, c) non-DS items, d) raw values, e) coupling, f) planned structural change, g) test exposure, h) bugs, then the decision.

### 4.1 Booking page + wizard + confirmation

**a)** `W/pages/PublicPage.tsx` 308; `components/booking-wizard/DateTimeStep.tsx` 283, `OwnerCustomerFormStep.tsx` 233, `OwnerBookingWizard.tsx` 217, `StaffSelectStep.tsx` 71, `WizardStepsIndicator.tsx` 46, `ServiceSelectStep.tsx` 45, `wizardUtils.ts` 51, `customerAutofill.ts` 17; `hooks/useBookingWizard.ts` 188; `api/public.api.ts` 121; `styles/pages/public.css` 315.

**b)**
| File | DS | non-DS | % |
|---|---|---|---|
| PublicPage | 17 | 18 | 48.6 |
| DateTimeStep | 14 | 11 | 56.0 |
| ServiceSelectStep | 6 | 2 | 75.0 |
| StaffSelectStep | 8 | 4 | 66.7 |
| WizardStepsIndicator | 11 | 0 | 100 |
| OwnerCustomerFormStep | 9 | 9 | 50.0 |
| OwnerBookingWizard | 1 | 4 | 20.0 |
| Union | 48 | 29 | 62.3 |
Dynamic resolved: `PublicPage:293`, `OwnerCustomerFormStep:219` (`is-loading`); `DateTimeStep:107` (`slot--dashed`); `WizardStepsIndicator:20,40` (`is-done`, `is-current`).

**c)**
| Class (uses) | Class | file:line | Why |
|---|---|---|---|
| `public-page/-header/-header-inner/-main/-section` (shell) | DS-GAP | `PublicPage:128-143,166`, `OwnerBookingWizard:141`; `public.css:6,37,49,82,94` | Hero + 45rem column; raw `45rem` (50,83), `100vh` (7-8). Pre-DS. |
| `public-loading` (3) | DUPLICATE | `PublicPage:68`, `OwnerBookingWizard:63`, `ShopNewBookingPage:11`; `public.css:16` | = `.spinner-page`; `100dvh` makes the calendar sheet spinner viewport-tall. |
| `public-error` (2) | MISSED | `PublicPage:72`, `OwnerBookingWizard:66`; `public.css:16-33` | `.empty` / `.alert--danger` |
| `public-shop-name`, `public-shop-desc` | MISSED | `PublicPage:131-132`; `public.css:54,67` | `t-title`/`t-body` (exact scale match unclear) |
| `public-wizard-context` (4) | MISSED | `PublicPage:204`, `DateTimeStep:145`, `StaffSelectStep:22`, `OwnerCustomerFormStep:112`; `public.css:124` | `t-body-sm` + muted |
| `public-booking-confirmed` | MISSED | `PublicPage:144`; `public.css:185-193`; `.public-booking-confirmed .card__text` at `:191` is an OVERRIDE | `.empty` (icon/title/text) |
| `.public-wizard-actions .btn{flex:1}` | OVERRIDE | `public.css:158-162` (uses `max-width:639px`) | Restyles `.btn` from outside |
| `slot-tag` | OVERRIDE | `DateTimeStep:115-116`; `public.css:260-264` | `text-decoration:none` defeats `.slot:disabled` (`DS:588`) |
| `.ooh-toggle .switch`, `.ooh-toggle label` | OVERRIDE | `public.css:205,209` | Restyle `.switch` |
| `public-field-required` (4) | DS-GAP | `PublicPage:216,231`, `OwnerCustomerFormStep:125,159`; `public.css:178` | G15 |
| `public-section-title` (2) | DS-GAP | `PublicPage:167`, `OwnerBookingWizard:142`; `public.css:98-106` | G6 |
| `slot-group--collapsible` | DS-GAP | `DateTimeStep:245`; `public.css:227-254` | G18 |
| `customer-search-*` (3) | DS-GAP | `OwnerCustomerFormStep:137,142,146`; `public.css:268-315` | G16 |
| `public-wizard-panel/-actions`, `public-booking-form`, `public-datetime-row`, `public-options`, `interval-picker`, `ooh-other-time`, `wizard-btn`, `slot-group__count`, `public-shop-meta` | LAYOUT-OK | `public.css:114,151,172,164,136,213,219,149,256,74` | Token flex/grid; `wizard-btn` is a one-off `align-self` hack |
DEAD/UNDEFINED: none (34 classes, all used).

**d)** Inline: `OwnerCustomerFormStep.tsx:123` `position:relative`. Raw units: `public.css:7-8,18-19` (`100vh/100dvh`), `:50,83` (`45rem`), `:105` (`0.06em`), `:192` (`60ch`), `:247` (`0.8em`), `:262` (`0.8`). Breakpoints: `640px` at `:43,60,88,142` (OK), `639px` at `:158`. Hex/rgb/color-mix: none. Hard-coded `€`, "m"/"h": `wizardUtils.ts`.

**e)**
| File | Hooks / API | Where | JSX replaceable? |
|---|---|---|---|
| PublicPage | `useBookingWizard` (separate); 9 inline `useState` (`:51-65`); `createBooking` inline (`:84`); 503 cooldown timer (`:103-107`); error mapping (`:109-115`) | mixed | Only after extracting `useBookingSubmit` (busy/cooling/error mapping, duplicated at `OwnerBookingWizard:74-132`) |
| `useBookingWizard` | `getShopInfo` (`:80`), `getPublicSlots`/`getOwnerSlots` (`:103-106`) | separate hook, no test | n/a |
| DateTimeStep | auto-select effect (`:123-140`), toggle state | inline | Yes |
| OwnerCustomerFormStep | `getCustomers` debounce + autofill (`:65-93`) | inline | Only after `useCustomerLookup` |
| OwnerBookingWizard | `createOwnerBooking` (`:83`), override machine (`:57-60,111-129`), `ConfirmDialog` | inline | Only after `useOwnerBookingSubmit` |
| Service/Staff steps, WizardStepsIndicator | none | pure props | Yes |

**f)** PA NOW 3 / Part 1 changes #1-10: confirmation gets formatted date/time, staff, address, add-to-calendar, cancel link (large: today `confirmed` is a local boolean `PublicPage:65,93`, the `createBooking` result is discarded `:84`, `BookingConfirmation` is typed and unused `public.api.ts:71-77`; cancel token is not in that type, backend support unclear). Steps: default date, skip staff step (hook logic), tappable phone/address, translated errors, language toggle: small.

**g)** At risk if markup changes (all in `E/`): `getByRole('radiogroup').getByRole('radio')` (booking-busy:23-24, owner-booking:40-41, owner-customer-lookup:33-34, owner-outside-hours:37-38, owner-slot-interval-filters:38-39,85-86, root-routing:9,15, timezone:34-35) needs `role=radiogroup`/`radio` kept (`ServiceSelectStep:21,26`, `StaffSelectStep:29,34,55`); `#booking-date` (`DateTimeStep:154-163`) in booking-busy:25,87, owner-booking:42, owner-customer-lookup:35, owner-outside-hours:39, slot-interval:40,87, timezone:23,36,59-60; `#b-name/#b-phone/#b-email/#booking-other-time` (booking-busy:29-30,64-65,91-92,123; owner-booking:48-51; owner-customer-lookup:43-78; owner-outside-hours:104-105,141-142,161-162; timezone:77-78); slot button names `10:00`, `/^20:30/`, `20:30, outside working hours` (aria-label `DateTimeStep:90-97,111`); `aria-pressed` (timezone:38,62); `.public-wizard-actions` (booking-busy:53); `.public-booking-confirmed` (timezone:80); `getByRole('status')`/`('alert')` (booking-busy:57,60,116,119; owner-outside-hours:108,143,165,267,275); switch name (owner-outside-hours:46); `<h4>` in `<summary>` (owner-outside-hours:63-64,70,73,269); `slot.locator('svg')` (owner-outside-hours:85); `ConfirmDialog` alertdialog buttons (owner-outside-hours:111,149,169-182,242; booking-busy:121). Text-only selectors (`/continue/i`, `/confirm booking/i`) survive. Unit tests (`wizardUtils.test.ts`, `customerAutofill.test.ts`) are pure.

**h)** Evidence only:
- Slot-fetch failure shown as "closed this day": `useBookingWizard.ts:108-109`; no stale-response guard `:97-110`.
- Any shop-info failure becomes `shopNotFound`: `useBookingWizard.ts:82-85`.
- No empty state for an `ok` day with zero slots or before a date is picked: `DateTimeStep:222-224`.
- Confirmation prints raw ISO `date`/`time`: `PublicPage:84,150-155`.
- Required `*` span, no `required`/`aria-required`: `PublicPage:216-226,231-241`.
- `role="radio"` with hard-coded `aria-checked="false"`, no roving tabindex: `ServiceSelectStep:26-27`, `StaffSelectStep:33-34,55-56`.
- Duplicate `<label>` beside the Switch's own: `DateTimeStep:204-206` vs `Switch.tsx:11,18`.
- `.catch(() => {})` swallows lookup errors; debounce not cleared on unmount: `OwnerCustomerFormStep:91`.
- Customer dropdown is a bare `<ul>` of buttons, no listbox role or keys: `OwnerCustomerFormStep:136-151`.
- 503 cooldown `setTimeout` not cleaned up: `PublicPage:103`, `OwnerBookingWizard:105`.
- No `notFound` branch in the owner wizard: `OwnerBookingWizard:65-67`.
- `ConfirmDialog` backdrop/Esc cancel while `busy`: `ConfirmDialog.tsx:69-71,96,117`.

**Decision:** shell + confirmation = **EXTRACT FIRST (`useBookingSubmit`, `useCustomerLookup`; own commit before markup), then REBUILD** (rules 1 and 2). Steps 1-4 = **RESKIN** (rule 3, 62.3%). **AGREE** with the proposal.

### 4.2 Cancel

**a)** `W/pages/CancelBookingPage.tsx` 112; `styles/pages/invites.css` 155 (shared, `accept-invite-*` at 101-149).
**b)** DS 8 / non-DS 4 = 66.7%. Non-DS: `accept-invite-page` (5 uses), `accept-invite-card` (5), `accept-invite-meta` (2), `accept-invite-error` (1).
**c)**
| Class | Class | file:line | Why |
|---|---|---|---|
| `accept-invite-page` | MISSED | `CancelBookingPage:35,48,58,68,97`; `invites.css:103-111` | centred `.page` (G5); raw `2rem 1rem`; pre-DS reuse |
| `accept-invite-card` | OVERRIDE | `invites.css:113-116` | `max-width:30rem` over `card--auth` 26.25rem (`DS:242`) |
| `accept-invite-meta` | MISSED | `:71,100`; `invites.css:118-126` | `t-body-sm` + muted; raw `0.9rem` |
| `accept-invite-error` | MISSED | `:50`; `invites.css:144-149` | `alert--danger`/`.empty`; raw `4rem 1rem` |
**d)** Inline styles: `:38` (`marginTop`, `textAlign`, `color`), `:60`, `:72` (`display:flex`, `gap:'0.75rem'`, `marginTop:'1.25rem'`), `:105` (`marginTop`, `fontSize:'0.85rem'`). Legacy `.spinner` (36px) applies at `:37`.
**e)** `useSearchParams`, `useLang`, 4 `useState`; `cancelBooking(token)` inline `:20`; error mapping by `msg.includes(...)` `:24-29`; 5 JSX branches. Replaceable only after `useCancelBooking` (mutation + error mapping).
**f)** Small (PA NOW 2, Part 1 `/cancel`): fix field mapping, booking details via GET-by-token (API), "Book again", shop timezone.
**g)** None. No e2e hits `/cancel`.
**h)** Error branch is checked before confirm and is terminal (no retry): `:46-54`. Error mapping reads the wrong field so every failure is generic (`:25-28`; PA F4). Initial error string computed once in `useState`, stale on language switch: `:16`. Spinner/error without `role=status`/`alert`: `:37,50`. "Kept" state is a dead end: `:56-63`.
**Decision:** **RESKIN** (rule 3). Extract `useCancelBooking` inside the NOW 2 fix. **AGREE.**

### 4.3 Calendar (`ShopBookingsPage` + detail/quick-create panels)

**a)** `W/pages/ShopBookingsPage.tsx` 615; `calendarModel.ts` 120 (+ `calendarModel.test.ts` 152); `components/ConfirmDialog.tsx` 134; `StatusBadge.tsx` 16; `bookingStatus.ts` 12; `styles/pages/bookings.css` 425. The "sheet" is two inline `card cal-detail-panel` elements (`:388-413,415-460`); `ConfirmDialog` is only used by `OwnerBookingWizard:10,204`.
**b)** ShopBookingsPage DS 29 / non-DS 43 = **40.3%**; ConfirmDialog, StatusBadge, Alert 100%. Dynamic resolved: `chip--{pending,confirmed,completed,canceled,no-show}` (`:323,451`), `cal-block--*` (`:571`; `bookings.css:273-277`).
**c)**
| Class (uses) | Class | file:line | Why |
|---|---|---|---|
| `cal-scroll/-grid/-header-row/-gutter-cell/-col-header/-body/-gutter/-hour-label/-col(--creatable)/-hour-line/-off-segment/-off-label` | DS-GAP | `:494-558`; `bookings.css:110-227` | G4 geometry; raw `56px/140px/6px/64px` |
| `cal-block` (+ `--compact/--override/--selected/--{5 statuses}/-time/-name/-service/-tag/-next-day`) | DS-GAP / DUPLICATE | `:571-598`; `bookings.css:233-356` | Status map re-maps `.badge--*` tokens (comment `:229-231` admits it); raw `3px` bar (`:249`) |
| `cal-detail-panel` (2) | DS-GAP | `:389,415`; `bookings.css:68-76,404-419` | Duplicates `modal-backdrop--sheet` styling (`DS:348`); hacks `z-index: calc(var(--z-nav)+1)`, raw `80dvh` (`:410`). PA says: use real `modal--sheet`. |
| `cal-detail-header` | MISSED | `:390,416`; `:78` | `card__header`/`modal__header` |
| `cal-detail-meta`, `cal-detail-muted` | MISSED | `:430,439,442`; `:85,93` | `t-body-sm` + muted |
| `cal-filters-count` | MISSED | `:367`; `:62` | `t-body-sm` |
| `cal-chip-badge` | MISSED | `:487`; `:365` | `badge` |
| `.bookings-date-nav .btn--icon` | OVERRIDE | `bookings.css:31-38` | Sets `--btn-bg`, `flex:none` from outside |
| `cal-filter-select` (2) | OVERRIDE | `:339,351`; `:56-60` | `width:auto`, raw `10rem` |
| `shops-spinner-wrap` (2) | DS-GAP | `:270,465`; `shops.css:22` | G3, cross-page dependency |
| `bookings-page/-header/-date-nav`, `cal-filters(-statuses)`, `cal-detail-notes`, `cal-detail-statuses`, `cal-chips` | LAYOUT-OK | `bookings.css:5,11,24,42,50,97,101,361-379` | `bookings-header` = G2 |
DEAD/UNDEFINED: none.
**d)** Inline style: `:531`, `:546`, `:557`, `:578` (computed geometry; legitimate values, DS-GAP for tokens). Raw px in TSX: `:32-35` (`SLOT_H 64`, `MIN_BLOCK_H 28`, `COMPACT_BLOCK_H 56`). Raw z-index: `bookings.css:10,259,265,270,399`. `max-width:639px` at `:372`. No colour literals.
**e)** God component. API: `listBookings`, `getMembers`, `getDaySchedule` (parallel, `requestSeq` guard) and `updateBookingStatus` (`:104-132,141-152`); ~14 `useState` (`:71-102`); derived view-model `:166-225`; `IntersectionObserver` effect `:239-256`; pure logic already in `calendarModel.ts` (tested). Replaceable only after extracting `useShopBookings` (fetch, members, schedule, race guard, status update), `useCalendarFilters`, `useActiveColumn`, and a `buildCalendarViewModel` function. `ConfirmDialog` is a self-contained portal (focus trap, Esc, scroll lock).
**f)** Large. PA NOW 1 (ConfirmDialog on cancel/no-show, toast, Today button, `?date=` read **and write**, `tel:`), NOW 8 (reschedule: no client function today, `booking.api.ts` has only `updateBookingStatus` `:83`; API exists `A/routes/booking.routes.ts:53`), NEXT 11 (own column), Part 1 #6 (real modal sheet), #9 (filters → one switch), #12 (hide deactivated columns). Today `?date=` is read once and never written back (`:65,79`). Closures need data the page does not receive (`getDaySchedule` returns weekly hours only, `calendarModel.ts:9`).
**g)** `.cal-block`, `.cal-block-time`, `.cal-block-service` (owner-booking:56,58,60,61; owner-outside-hours:124,229,246,283; slot-interval:50); `#bookings-date` (owner-booking:56; owner-outside-hours:123,228,245,282; slot-interval:48); `getByRole('button',{name:'Canceled',exact})` (slot-interval:54); `.cal-filters-count` (slot-interval:56); `#cal-filter-service`, `#cal-filter-staff` (slot-interval:63,65); `/clear filters/i` (slot-interval:59, text only). PA Part 1 #9 removes the filters, so slot-interval:54-65 must be rewritten regardless. `calendarModel.test.ts` is pure and survives.
**h)** Infinite spinner when the shop never loads: `loading` starts true `:74`, effect returns early on `!shop` `:116`, spinner `:464`. Clearing the date input sets `dateOverride=''` and fetches with an empty date: `:79-80,300`. Status-update errors swallowed: `:147-149`. Load failure shows alert plus empty grid, no retry; `refetchBookings` does not refetch `daySchedule`: `:385,104-113`. Spinner replaces the whole grid on each refetch: `:464-466`. Hard-coded English `aria-label`s: `:288,306`. `div.cal-col` has `onClick` but no role/tabindex/key handler: `:523-539`. Bottom sheet has no scrim/focus trap/Esc/dialog role: `:389,415`; `bookings.css:404`.
**Decision:** **EXTRACT FIRST, THEN REBUILD** (rule 1, f=large; rule 2 also, 40.3% with 6+ items). **AGREE.**

### 4.4 New booking (`ShopNewBookingPage` + `OwnerBookingWizard`; not in the proposed split)

**a)** `W/pages/ShopNewBookingPage.tsx` 31; wizard files as 4.1.
**b)** ShopNewBookingPage DS 1 / non-DS 6 = 14.3%; OwnerBookingWizard 1/5 = 20%; OwnerCustomerFormStep 9/18 = 50%.
**c)** Per file, MISSED/DUP/OVERRIDE count is 2 (ShopNewBookingPage: `public-loading` DUPLICATE, `public-shop-name` MISSED; OwnerBookingWizard: `public-loading` DUPLICATE, `public-error` MISSED), the rest are DS-GAP shell classes (G6). Rule 2 needs 3.
**d)** `OwnerCustomerFormStep.tsx:123` inline. Others as 4.1.
**e)** `ShopNewBookingPage` is a thin wrapper (`useShop`, `useNavigate`, `OwnerBookingWizard`); replaceable: yes.
**f)** Small: PA NEXT 16 (toast, redirect to `/bookings?date=`, default date today with `min`, skip staff step, "New customer" hint, owner labels, **remove shop-name header and page chrome**, cache `getShopInfo`).
**g)** Same specs as 4.1 (`/shops/${slug}/bookings/new` at owner-booking:39, owner-customer-lookup:32, owner-outside-hours:36, slot-interval:37,84; `/create booking/i` owner-booking:52, booking-busy:114, slot-interval:46 text-only).
**h)** `if (!shop || !slug) return null` blanks the page for an unknown shop and for the first render (`ShopContext` initial `isLoading=false`): `ShopNewBookingPage:11-12`. 100vh spinner (`:11`). Both wizards re-fetch the shop via the public endpoint (`useBookingWizard.ts:80`) though `ShopContext` holds it (`ShopContext.tsx:34-40`). "New customer" hint wrong for a known customer: `OwnerCustomerFormStep:152` (PA).
**Decision:** **RESKIN** (rule 2 not met; f small; "otherwise" leans RESKIN because the page is a wrapper and the change is deleting chrome). Not in the proposed split.

### 4.5 Dashboard

**a)** `W/pages/DashboardPage.tsx` 113; `components/overview/` `BookingsChart` 116, `UpcomingBookings` 94, `OverviewBody` 76, `StatusDonut` 54, `RangeTabs` 51, `OverviewEmpty` 46, `ShopCards` 44, `OverviewSkeleton` 37, `OverviewHeader` 35, `StatCards` 28, `NoShopsEmpty` 25; `styles/pages/shop-overview.css` 13; `api/overview.api.ts` 60; `utils/overviewFormat.ts` 53 (+ test 105).
**b)** Union DS 78 / non-DS 8 = **90.7%**. Per file: DashboardPage 90, BookingsChart 100, StatCards 100, ShopCards 100, RangeTabs 100, StatusDonut 94.4, UpcomingBookings 87.5, NoShopsEmpty 87.5, OverviewEmpty 90, OverviewSkeleton 64.3, OverviewBody 50, OverviewHeader 50. Dynamic: `BookingsChart:40-48,74`, `StatCards:19`, `StatusDonut:43`.
**c)**
| Class | Class | file:line | Why |
|---|---|---|---|
| `overview-page` (6, nested 2-3 deep) | DUPLICATE | `DashboardPage:48,66,75,83`, `OverviewSkeleton:8`, `OverviewBody:35`; `shop-overview.css:2` | = DS `.page` (72rem, `DS:491`); raw `72rem` |
| `overview-head` | DS-GAP | `OverviewHeader:30`; css `:3` | G2 |
| `overview-grid` (+ `__chart`, `__upcoming`, `__breakdown`) | LAYOUT-OK | `OverviewBody:63-64`, `OverviewSkeleton:19-29`, `UpcomingBookings:30`, `StatusDonut:29`; css `:4-11` | breakpoint 960 is legal |
| `.overview-grid__chart > .card` | OVERRIDE | css `:6` | `flex:1` on `.card` |
| `overview-upcoming__head` | LAYOUT-OK | `UpcomingBookings:31`; css `:12` | |
| `btn--primary` (2) | UNDEFINED | `NoShopsEmpty:17`, `OverviewEmpty:28` | no CSS anywhere; plain `.btn` is primary |
| `overview-total` | DEAD | css `:13` | |
| `card__title` used outside a `.card` | MISSED | `ShopCards:14`, `UpcomingBookings:32` | `t-subheading` |
| `.shop-card{gap}` (leak) | DUPLICATE | `shops.css:48` | affects `ShopCards:18` |
**d)** Legitimate inline custom-property bridges only: `BookingsChart:54-56` (`--bar-h`), `StatusDonut:33` (`--donut-stops`). `shop-overview.css:2` raw `72rem`. No colour/font-size/gap literals. Breakpoint `960px` only.
**e)** `useQuery(getMyOverview)` (`:28-32`), `useQuery(getMyUpcoming)` (`:36-40`), `useAuth`, range state; 4 early-return branches in the page (`:46-80`). Overview components are pure except `BookingsChart` (`active`) and `OverviewEmpty` (clipboard `:11-19`). Replaceable: **yes**.
**f)** Large by definition: PA NOW 7 adds a Today section (all today's non-canceled bookings, linked to `?date=`), removes the Pending card/badge/legend, moves or removes the donut, links upcoming rows, renames to "Dashboard"; Part 1 #7 non-Pro `mailto` empty state. Data: `overview.api.ts` only exposes `hasAnyBookings` (`:19`); a today query needs API support (unclear whether `getMyUpcoming` can serve it).
**g)** At risk (`E/dashboard-overview.spec.ts`, `E/overview.spec.ts`): `.stat`/`.stat__value` (dashboard-overview:146; overview:146); `.shop-card*`, `.badge--warning` (dashboard-overview:147,186-199,212,223-224,255,263); `.bar-chart__col*` + aria-label regex `label: N bookings` (dashboard-overview:156-165; overview:147,159-182); `.data-table th`, `td[data-label="Shop"/"When"]`, `tbody tr` (dashboard-overview:175-178,269; overview:148-149,197); `.legend__count/.legend__pct/.donut__value` and `getByRole('list',{name:'Bookings by status'})` (overview:210-217); `.bar-chart__value` opacity (overview:224); `.visually-hidden table tbody tr` count 7 (overview:225); `getByRole('tab',{name,exact})` (dashboard-overview:145; overview:145). `PA` NOW 7 notes the stat-card specs must be updated. Text-only selectors survive (greeting regex `:142,204`, "Upcoming bookings", "View all", "Create your first shop", "Try again").
**h)** Range switch after first load blanks header and tabs (query key changes `:29`, no `placeholderData`, `:64-71` renders only `<h1>` + skeleton), unmounting `RangeTabs` and losing focus; contradicts the `OverviewBody` comment (`:13-14`). Range-switch error turns the whole page into the error alert: `DashboardPage:46-63`; `OverviewBody` gets hard-coded `isError={false}` (`:88`). Clipboard failure silent: `OverviewEmpty:16-18`. Chart bars toggle a tooltip by `onClick` without pressed state: `BookingsChart:50-60`.
**Decision:** **REBUILD VIEW** (rule 1: f=large via the Today section). Effort M because it is additive: 78 of 86 classes are already DS and e = yes. **AGREE.**

### 4.6 Shop overview (as it exists; no route merge)

**a)** `W/pages/ShopOverviewPage.tsx` 64; `styles/pages/shop-overview.css` 13; shared components as 4.5; `api/overview.api.ts` 60.
**b)** Direct: DS 0 / non-DS 2 (`overview-page`, `state-view`) = 0%. All markup delegates to the 90.7% shared components.
**c)** `state-view` (2) UNDEFINED `ShopOverviewPage:48-49` (no CSS anywhere; loading/no-shop states are bare text); `overview-page` DUPLICATE (as 4.5); `.overview-total` DEAD `shop-overview.css:13`. `OverviewEmpty` re-implements `CopyLinkButton` (`OverviewEmpty:11-19`; PA).
**d)** None in the page.
**e)** `useShop`, two `useQuery` (`getOverview`, `getBookingStats().upcoming` `:22-37`), `publicShopUrl`; hooks run before early returns. Replaceable: **yes**.
**f)** Large: PA Part 1 `/shops/:slug` and NEXT 10: Today list (same component as Dashboard), **setup checklist card** (service, staff assigned, hours, link shared; hidden when done; PA says no new component), "New booking" button, always-visible booking link row (`CopyLinkButton`), spinner/skeleton/`.empty` instead of `.state-view`, remove Pending, rename. The API already returns `todayCount`/`upcomingCount` and the page discards them (PA). Checklist data: `overview.api.ts` exposes only `hasAnyBookings` (`:19`); services/team/hours completeness needs new queries (unclear which endpoints exist).
**g)** `overview.spec.ts` (289 lines): same selectors as 4.5; plus 'Copy booking link' (overview:256,265,282,285) and "No bookings this week/month…" text (overview:254-288).
**h)** First render flashes "no shop": `ShopOverviewPage:48-49` with `ShopContext.isLoading` initial false. Loading/no-shop states unstyled (undefined `state-view`). `viewAllTo` built before the shop check: `:44` (`/shops/undefined/bookings`). Overview error hides the upcoming list (PA).
**Decision:** **REBUILD VIEW** (rule 1). Build the Today component once and share it with the Dashboard. **AGREE.**

### 4.7 Team + Team member + WorkingHoursPanel + Shop invites

**a)** `W/pages/ShopTeamPage.tsx` 151, `ShopTeamMemberPage.tsx` 541, `ShopInvitesPage.tsx` 323; `components/WorkingHoursPanel.tsx` 646, `Switch.tsx` 25, `CopyLinkButton.tsx` 46; `styles/pages/team.css` 143 (also used by Customers), `working-hours.css` 311, `invites.css` 155 (shared with AcceptInvite, InvitesPage, CancelBooking); `api/team.api.ts` 58, `invite.api.ts` 51, `workingHours.api.ts` 77; `utils/scheduleOverlap.ts` 35 (+ test 63).
**b)**
| File | DS | non-DS | % |
|---|---|---|---|
| ShopTeamPage | 18 | 4 | 82 |
| ShopTeamMemberPage | 22 | 19 | 54 |
| ShopInvitesPage | 26 | 13 | 67 |
| WorkingHoursPanel | 15 | 34 | 31 |
| Switch | 3 | 0 | 100 |
| CopyLinkButton | 4 | 4 | 50 |
Dynamic (all resolved): `ShopTeamPage:108`, `ShopTeamMemberPage:301,388,411`, `ShopInvitesPage:222,227,262,267,274` (`invites-form-feedback--{success,error}` defined `invites.css:75,79`), `WorkingHoursPanel:404,449,484,488,500,510,582` (`wh-status--{current,upcoming,ended}` `working-hours.css:298,303,308`; bare `open`/`closed` `:109,186,190`).
**c)**
| Page | Class(es) | Class | file:line | Why |
|---|---|---|---|---|
| Team | `team-remove-btn` | UNDEFINED | `ShopTeamPage:54`; `team.css:32-33` empty stub | rule removed in `ba3077e` |
| Team | `team-header`, `shops-spinner-wrap` | DS-GAP | `:76`, `:67` | G2, G3 |
| Team | `team-page` | LAYOUT-OK | `:66,75`; raw `860px` `team.css:3` | G7 |
| Member | `card-back` | DS-GAP | `:282,293` | G10 |
| Member | `service-action-btn` | UNDEFINED | `:460,489` | same removal; also `ShopServicesPage:411,423,436,465,499` |
| Member | `service-staff-add/-item/-list/-select` | DS-GAP | `:454,456,476,477`; `services.css:143-170` | G9, cross-file |
| Member | `team-switch-row/-label/-desc` | DS-GAP | `:333-381,405` | G8 |
| Member | `team-member-schedules` | OVERRIDE | `:435`; `team.css:73-97` | restyles `.working-hours-page`, hides `.working-hours-header h1` |
| Member | `team-services-empty` | UNDEFINED | `:452` | no definition |
| Member | `team-date` | MISSED | `:304,429` | `card__text`/`t-body-sm` |
| Member | `shop-danger-card` | LAYOUT-OK | `:504`; `shops.css:176` | raw `600px` in a 680px page |
| Member | `team-invite-actions/-block`, `team-member-card/-meta/-page` | LAYOUT-OK | `:386,409,400,298,300,271,281,291`; raw `.75rem/1.25rem/680px` | `team-invite-actions` does not wrap (PA) |
| Invites | `invites-empty` | MISSED | `:145` | `.empty--sm` (used at `:240`) |
| Invites | `invites-form-feedback(--error/--success)` | MISSED | `:227` | `<Alert>`; success colour is `--accent` not `--success` |
| Invites | `invites-subheading` | MISSED | `:235`; `invites.css:151-155` | `t-subheading` |
| Invites | `invites-header`, `shops-spinner-wrap` | DS-GAP | `:144,152`, `:134` | G2, G3 |
| Invites | `invite-actions`, `invites-form-row`, `invites-page` | LAYOUT-OK | `:272,162,221,133`; off-scale `.4rem`, raw `160px`/`860px` | |
| WH | `wh-status` + `--current/--upcoming/--ended` | DUPLICATE | `:449`; `working-hours.css` | re-implements `.badge` (same file uses `.badge` at `:484`) |
| WH | `working-hours-row/-day-label/-toggle/-slots/-slot/-sep` | DS-GAP | `:571-601` | G11 |
| WH | `wh-schedule-header/-date-range/-chevron/open` | DS-GAP | `:441,448,488` | G11 |
| WH | `working-hours-header` | DS-GAP | `:336` | G2; hidden by `team.css:95` when nested |
| WH | `working-hours-status open/closed` | MISSED | `:582` | `.switch__state` |
| WH | `working-hours-remove` | MISSED | `:614`; css `:223-241` | `btn btn--ghost btn--icon btn--sm` |
| WH | `working-hours-add-slot` | MISSED | `:627`; css `:243-259` | `btn btn--ghost btn--sm` |
| WH | `wh-empty`, `wh-rule-note`, `wh-slot-error` | MISSED | `:426,354,623` | `.empty--sm`, `card__text`, `field__error` |
| WH | `working-hours-card` + inline `borderRadius:0` | OVERRIDE | `:564-565`; css `:145-147` margin dead | `card--flush` plus inline overrides |
| WH | `.working-hours-slot .input` | OVERRIDE | css `:210-215` | restyles DS `.input` |
| WH | 10 layout classes (`wh-create-*`, `wh-schedule-*`, `wh-dates-section`, `wh-active-switch`, `working-hours-page`) | LAYOUT-OK | various | raw rem/px (d) |
| CopyLinkButton | `copy-link-row/-value` | DS-GAP | `:28,29`; `sh/c:141-161` | G13 |
| CopyLinkButton | `copy-link-btn` | OVERRIDE | `:30,38`; `sh/c:163-171` | specificity hack |
Tallies: Member DS-GAP 9, UNDEFINED 2, MISSED 1, OVERRIDE 1, LAYOUT-OK 6; Invites LAYOUT-OK 3, MISSED 5, DS-GAP 5; WH DS-GAP 11, LAYOUT-OK 10, MISSED 8, DUPLICATE 4, OVERRIDE 1. DEAD: `working-hours.css:262` `.working-hours-actions`, `team.css:32-33,62-63,70-71` empty stubs, `.wh-create-fields` defined 3x (`working-hours.css:36,48,268`), `working-hours.css:145-147`. Duplicate declarations `:229,235` (line-height), `:289,295` (font-weight). Why: pre-DS leftovers and one-off hacks; the `team-*` names on Customers pages are copy-paste (4.9).
**d)** Inline: `ShopTeamMemberPage:446`, `WorkingHoursPanel:565`. `color-mix`: `working-hours.css:76,240,258,299,304`. Off-grid breakpoint `@media (max-width:520px)` `working-hours.css:42` (overridden by a later `flex:1`, so it never applies, PA). Raw font-size: `team.css:17,29,40,80,124,128,141`; `working-hours.css:17,28,86,93,104,131,165,179,228,249,278,288`; `invites.css:19,38,71,96,120,139,146,152`. Raw gap/padding/margin: `team.css` 16 lines, `working-hours.css` 23 lines, `invites.css` 8 lines. Off-scale rem (0.1-1.75): `team.css:12,119`; `working-hours.css:12,133,174,230,231,251,292,294`. Raw px: `working-hours.css:3,183,211,214` (`680px`, `52px`, `110px`, `150px`), `team.css:3,45`, `invites.css:66`. Raw radius `999px` `working-hours.css:293`; raw durations `:72,105,233,252`. No hex, no `!important`.
**e)**
| File | State / API | Where | JSX replaceable? |
|---|---|---|---|
| ShopTeamPage | 6 `useState`, 1 effect; `getMembers`, `removeMember` | inline | in-file yes; as a view only after `useTeamMembers` |
| ShopTeamMemberPage | 26 `useState`, 2 effects; `getMember`, `updateMemberRole`, `removeMember`, `sendLoginInvite`, `cancelLoginInvite`, `getMemberServices`, `getServices`, `assignStaff`, `unassignStaff`, 5 `whApi.*` bundle (`:255-267`) | inline; rules: dirty (`:101-108`), owner-change (`:109`), active-off clears both bookable flags (`:114-120`), owner always active (`:127`), DTO (`:136-150`), invite gate (`:414`), available services IIFE (`:471-474`) | only after `useTeamMember`, `useMemberInvite`, `useMemberServices` (+ remove flow) |
| ShopInvitesPage | 14 `useState`; `getMembers`, `createTeamMember`, `sendLoginInvite`, `cancelLoginInvite` | inline; owner-confirm gate (`:89-96`), pending filter (`:98`) | only after `useAddMemberForm`, `usePendingInvites` |
| WorkingHoursPanel | 10 `useState`; API injected via `WorkingHoursApi` (`:22-28`) | inline: `validateSlots` (`:119-134`), defaults 09-17 (`:182,202`), overlap pre-check (`:229-242`), two sequential saves (`:246-256`), per-schedule edit map (`:98,155-174`) | only after `useScheduleEditor(api)` + a `DayScheduleEditor` view |
`scheduleOverlap.ts` is pure and tested. No page uses any hook in `src/hooks/`.
**f)** Team: **large**. PA NEXT 12 merges shop invites into Team with an "Add member" modal, redirect for the old route (three routes today: `App.tsx:100-102`; deep link `OwnerBookingWizard.tsx:176-177`; sidebar `Sidebar.tsx:182,187`; `getMembers` fetched in both pages `ShopTeamPage:28`, `ShopInvitesPage:45`); NOW 5 deactivate `ConfirmDialog` with future-booking count (needs API count). Member: **large** (NOW 5: confirm flow, translated 409 + one-click deactivate, restore flags on reactivation, hours summary, switch regroup). WorkingHoursPanel: **large**: NOW 4 closures need a new model, migration, rules change and a modal (no closure concept exists, PA F3); NEXT 17 prefill, apply-to-all, atomic save. Inferred from code that `Schedule`/`WorkingDay` has days and hours only.
**g)** No e2e for any of these pages (no spec visits Team, Member, Invites or hours). Only `utils/scheduleOverlap.test.ts:13-63` (pure; breaks only if signatures change for closures). `owner-outside-hours.spec.ts:19,22,259,262` writes `ShopWorkingHourRange`/`ShopWorkingDay` rows directly, so the closures migration can break them. `service-delete.spec.ts` and `owner-slot-interval-filters.spec.ts:29` are other pages. No `data-testid` anywhere in `W/` or `E/`.
**h)** Infinite spinner when `shop` is null (`ShopContext.tsx:42`): `ShopTeamPage:26` leaves `loading=true` (init `:17`, spinner `:64`); `ShopTeamMemberPage:73` → `:269`. Error and empty state rendered together: `ShopTeamPage:80,84-87`; `ShopInvitesPage:156,239-242`; `WorkingHoursPanel:351,425-427` ("New schedule" still shown `:338-348`). Swallowed catches: `ShopTeamPage:42`; `ShopInvitesPage:123`; `ShopTeamMemberPage:180,214,247`; `WorkingHoursPanel:289`; `CopyLinkButton:22-24`. No success feedback: `ShopInvitesPage:105-106,120-122`, `ShopTeamMemberPage:212-213`. Non-atomic save: `WorkingHoursPanel:246-263`. `div role=button` contains the Switch input (nested interactive): `WorkingHoursPanel:440-491`. Switch accessible name changes with state: `:480`. Span labels on switches (name only via `aria-label`, description not `aria-describedby`): `ShopTeamMemberPage:334-381`; `ShopInvitesPage:199-219`. Identical accessible names across rows: `ShopTeamPage:53-61`, `ShopInvitesPage:273-284`, `ShopTeamMemberPage:459`, `WorkingHoursPanel:594,604,616`. Feedback `<p>` has no live region: `ShopInvitesPage:226-230`. Services flash of empty text (`servicesLoading` init false): `ShopTeamMemberPage:64,444-452`. `setTimeout` not cleared: `CopyLinkButton:21`. `toLocaleDateString()` without app locale: `ShopTeamPage:116`, `ShopTeamMemberPage:305`, `WorkingHoursPanel:60`. Hard-coded English: `staff@example.com` (`ShopInvitesPage:180`, `ShopTeamMemberPage:317`). Misleading "no invites" for a non-owner by URL: `ShopInvitesPage:141-147` (PA).
**Decision:** Team + invites: **EXTRACT FIRST (`useTeamMembers`, `useAddMemberForm`), then REBUILD** (rule 1). Team member: **EXTRACT FIRST (`useTeamMember`, `useMemberInvite`, `useMemberServices`), then REBUILD** (rule 1). WorkingHoursPanel: **EXTRACT FIRST (`useScheduleEditor`), then REBUILD** (rules 1 and 2: 31%, 13 items). **AGREE** on all three. Note `PA` merges only Team + Invites; the member page stays its own route.

### 4.8 Services

**a)** `W/pages/ShopServicesPage.tsx` 553; `styles/pages/services.css` 199; `api/service.api.ts` 77.
**b)** 49 distinct classes: 21 DS, 28 non-DS = **43%**. Dynamic: `:391` (badge), `:318` (`is-loading`), `:423` (`service-action-active`).
**c)**
| Class(es) | Class | file:line | Why |
|---|---|---|---|
| `service-action-btn` | UNDEFINED | `:411,423,436,465,499` | rule removed in `ba3077e` |
| `service-action-active` | OVERRIDE | `:423`; `services.css:105-108` | `!important` on `.btn--secondary` |
| `service-delete-btn` | OVERRIDE | `:436`; `services.css:110-113,92-94` | `!important` on hover |
| `service-card-info/-name/-desc/-meta` | MISSED | `:386-399` | `.service-card__main/__name/__desc/__meta` |
| `service-card-actions` | MISSED | `:409` | `.card__footer` (needs left-aligned variant, G21) |
| `service-form-active/-active-label` | MISSED | `:301,302` | `.switch` + `.switch__state`; `<span class="field__label">` is the label |
| `service-staff-title`, `-empty` | MISSED | `:455,458` | `.label-caps`, `.card__text` |
| `services-empty` | MISSED | `:365` | `.empty` |
| `service-staff-panel/-loading/-list/-item/-add` | DS-GAP | `:446,448,460,462,484` | G9, G21 |
| `services-header`, `shops-spinner-wrap` | DS-GAP | `:344`, `:333` | G2, G3 |
| `service-card-main/-sep`, `service-form(-grid/-actions)`, `service-staff-select`, `services-list/-page` | LAYOUT-OK | various; raw `1.1rem`, `160px`, `.6rem`, `180px`, `860px` | off-scale values |
Tally: MISSED 10, LAYOUT-OK 8, DS-GAP 7, OVERRIDE 2, UNDEFINED 1. DEAD: `.service-icon-btn` (`services.css:97`); misleading comment `:104` ("Add card dashed border" above `.service-action-active`).
**d)** `!important`: `services.css:106,107,111,112`. `color-mix`: `:89,119`. Raw font-size `:17,28,58,64,72,123,138,157` (`.97/.82/.88/.78rem`); raw gap/padding/margin 27 lines (`:11,12,26,35,…,197`); raw px `:3,169,179`; `letter-spacing` `:126`. Inline `style` `ShopServicesPage.tsx:449` (spinner size workaround). No hex.
**e)** 22 `useState` (`:69-100`), 1 effect (`:103`), no custom hooks; `getServices`, `getService`, `createService`, `updateService`, `deleteService`, `assignStaff`, `unassignStaff`, `getMembers` all inline; helpers `formatDuration/formatPrice/serviceToForm/formToDto` (`:26-59`); `SERVICE_HAS_BOOKINGS` → deactivate machine (`:180-204`); available-staff IIFE (`:477-482`); `renderServiceForm` with 8 positional parameters (`:256-326`). In-file JSX swap: yes; as a separate view: only after `useServices`, `useServiceStaffPanel`, `ServiceForm`.
**f)** Small. PA Part 1 `/services`: "No staff assigned" badge, fix spinner, `<label>` on switch, drop `!important`, `max=1440`, `.empty`/`.spinner--sm`/remove nested card. No new section, merge, modal or flow.
**g)** `service-delete.spec.ts:40-56`: `page.locator('li, .card, .service-card').filter({hasText}).last()` (`:42`; order-sensitive because the edit form is a `.card` inside the row card), `getByRole('button',{name:'Delete'})` (`:45,50`; breaks if it becomes icon-only without an aria-label), alertdialog buttons (`:46,51,54`), `getByText('Empty Service')` count 0 (`:47`), row `toContainText('Inactive')` (`:56`).
**h)** Infinite spinner if `shop` null: effect early return `:104`, init `loading=true` `:70`, spinner `:330`. Error plus empty both shown: `:348,364-366`. Hard-coded English `min`/`h`/`m`, `(min)`, `(€)`, `€`: `:26-33,279,290`. Span label on switch: `:301-305`. Identical accessible names (Edit/Staff/Delete per row do not include the service name): `:411-440`. Swallowed catches: `:127,213,247`. No cancel flag in the fetch effect: `:103-110`.

**Two paths, both with effort:**
| | A: in-place fix | B: extract + rebuild |
|---|---|---|
| Work | Replace the 10 MISSED with DS classes (`empty`, `label-caps`, `card__text`, `.switch` with a real `<label>`, `service-card__*` where it fits); delete `service-action-btn` and `service-icon-btn`; remove the four `!important` rules by using `btn--ghost`/`btn--danger` (PA Services #4); drop the inline spinner size (needs legacy `.spinner` gone, 2.7 #3); tokenise 27 spacing and 8 font-size lines; page-header, list-row and loading wrapper come from DS gaps G2/G3/G9/G21 | Extract `useServices` (22 `useState`, delete/deactivate machine), `useServiceStaffPanel`, `ServiceForm`; then rewrite JSX and CSS |
| Logic touched | none (except the infinite-spinner guard, which is branch 1 anyway) | yes: 3 extractions of a 553-line file with no unit tests and one e2e spec |
| Test risk | `service-delete.spec.ts:42` locator stays valid if rows stay `.card`/`li` | same, plus extraction risk |
| Effort | about 3-4h (S-M) | about 1-1.5 days (L), no product value (PA asks for six small fixes) |
| DS-clean afterwards? | yes, once G2/G3/G9/G21 exist; remaining page CSS is LAYOUT-OK with tokens | yes |
**Pick A.** It is cheaper and leaves the page DS-clean. Rule 2 literally fires (43% DS, 13 MISSED/OVR/UNDEF) and gives EXTRACT FIRST then REBUILD; this is a recorded deviation at the user's direction. PA branch 12 already assumes in-place cleanup for Services.
**Decision:** **in-place fix (path A)**; rule 2 fired; **FLIP** by rule, resolved to in-place.

### 4.9 Customers + Customer detail

**a)** `W/pages/ShopCustomersPage.tsx` 150, `ShopCustomerDetailPage.tsx` 289; `api/customer.api.ts` 79; `styles/pages/team.css` 143 (shared).
**b)** Customers DS 12 / non-DS 6 = 67%; Detail 19 / 7 = 73%. Dynamic: `Detail:201,219,227` (`is-loading`).
**c)**
| Page | Class | Class | file:line | Why |
|---|---|---|---|---|
| Customers | `bookings-date-nav-btn` | UNDEFINED | `:128,138` | removed in `9f3f7e3`; pagination buttons are unstyled (trailing space in `:128`) |
| Customers | `pagination-controls/-status` | MISSED | `:126,134`; `team.css:132-143` | `.data-table__foot` (`DS:436`) |
| Customers | `team-header`, `shops-spinner-wrap` | DS-GAP | `:60`, `:51,81` | G2, G3 |
| Customers | `team-page` | LAYOUT-OK | `:50,59` | "team" names are copy-paste |
| Detail | `card-back` | DS-GAP | `:129,139` | G10 |
| Detail | `team-date` | MISSED | `:147,152,153` | `card__text` |
| Detail | `team-empty` | MISSED | `:161`; `team.css:36-41` | `.empty--sm` |
| Detail | `team-member-card/-meta/-page`, `shops-spinner-wrap` | LAYOUT-OK / DS-GAP | `:144,146,151,118,128,138`, `:119` | |
**d)** Inline: `ShopCustomersPage:64` (`marginBottom:'1.25rem'`), `:74` (`maxWidth:320`); `ShopCustomerDetailPage:215` (`color`, `fontSize:'0.9rem'`), `:217` (`display:flex`, `gap:'0.75rem'`). `team.css` raw values as 4.7.
**e)** Customers: 6 `useState`, 1 effect, `getCustomers` inline; eslint-disable with a note to move to react-query (`:26`). Detail: 13 `useState`, `getCustomer`, `updateCustomer`, `exportCustomer`, `deleteCustomer`; JSON download built inline with `Blob`/`URL`/`<a>` (`:78-85`); dirty check (`:109-114`). Customers list replaceable after `useCustomerList` (optional); Detail only after `useCustomerDetail`, `useCustomerPrivacy` and a `downloadJson` util.
**f)** Customers list: small (PA NEXT 13: pagination to `btn--secondary btn--sm`, debounce search, `type="tel"`, staff access, redacted search). Detail: **large** (PA NEXT 13: Upcoming, Last visit, counts, last 20 with "Show more", `tel:`, "New booking for this customer", remove "Total spent"; API change in `customer.service.ts`).
**g)** None. No e2e or unit test touches either page (`owner-customer-lookup.spec.ts` is the booking wizard's phone lookup).
**h)** Infinite spinner if `shop` null: `Customers:25` (init `loading=true` `:20`, shown `:80-83`); `Detail:37` → `:116`. Search fires per keystroke with no stale-response guard: `Customers:24-39`. Error plus empty both shown: `Customers:78,88-93`. `shop!` non-null assertion: `Detail:261`. Export success has no feedback: `Detail:77-85`. Swallowed catches: `Detail:65,86,102`. Row has both `onClick` navigate and a `<Link>`: `Customers:106-110`. Phone input without `type="tel"`: `Detail:175` (PA).
**Decision:** Customers list **RESKIN** (rule 3). Customer detail **EXTRACT FIRST (`useCustomerDetail`, `useCustomerPrivacy`), then REBUILD** (rule 1). **AGREE** for the list, **FLIP** for the detail.

### 4.10 Shop settings

**a)** `W/pages/ShopSettingsPage.tsx` 320; `styles/pages/shops.css` 227 (imported `:9`); `settings.css` 209 (not imported; works through global CSS); `CopyLinkButton.tsx`; `api/shop.api.ts` 48.
**b)** 36 distinct, 19 DS / 17 non-DS = **53%**. Dynamic: `:168,169,198`.
**c)**
| Class(es) | Class | file:line | Why |
|---|---|---|---|
| `card-back` | DS-GAP | `:153` | G10 |
| `shop-active-row/-label/-name/-desc` | DS-GAP | `:281-284` | G8 |
| `shop-detail-header`, `shops-spinner-wrap` | DS-GAP | `:165`, `:137` | G2, G3 |
| `settings-danger-desc`, `settings-section-header` | MISSED | `:298`, `:190` | `card__text`, `card__header`; `.settings-section .settings-section-header .btn` (`settings.css:206`) never matches here |
| `shop-detail-date`, `shops-empty` | MISSED | `:172,173`, `:156` | `t-caption`, `.empty` |
| `shop-field-hint` | DUPLICATE | `:183,196,217` | `.field__hint`, which the page uses at `:264,279`; `:has(+ .copy-link-row)` hack `shops.css:145-148` |
| `shop-settings-section` | OVERRIDE | `:178,189,293`; `shops.css:181-184,224-226` | restyles `.card`; `.btn{width:100%}` at ≤640px |
| `settings-section-icon/-title`, `shop-detail-meta`, `shops-page` | LAYOUT-OK | `:179-193,294-295,167,136…`; raw `.9rem`, `860px` | |
DEAD: `.shop-active-toggle` (`shops.css:150`), `.shop-checkbox-label` (`shops.css:155`).
**d)** No inline style, no colour literals. `shops.css` raw font-size 11 lines (`:17,60,65,71,88,108,121,138,159,203,209`), raw gap/padding/margin 25 lines, raw px/rem `:3,43,95,127,177,182` (`860px`, `260px`, `26.25rem`, `600px`, `620px`), `640px` breakpoint `:213` (off-by-one convention). `:has()` `:145`.
**e)** 19 `useState`, 1 effect; `getMyShops` (`:68`), `updateShop` (`:107`), `deleteShop` (`:125`) inline; does not use `useShop()`, refetches and filters (third copy of `ShopContext.tsx:37`; also `ShopsPage:23`); DTO assembly with always-true guards (`:97-106`); slug-change redirect (`:110-112`). In-file swap yes; PA asks for `useShop()` anyway.
**f)** Small: PA Part 1 `/shops/:slug/settings` (rename, `<OwnerRoute>`, `useShop`, Save layout, remove raw role text; QR LATER). `useShop()` exposes only `{shop,isLoading}` (`ShopContext.tsx:56`), so a saved edit cannot update the context (inferred).
**g)** `owner-slot-interval-filters.spec.ts:29` (route), `:30` `#detail-slot-interval` `selectOption('15')` (id and native `<select>` at `ShopSettingsPage:267-268`), `:31` `getByRole('button',{name:/save changes/i})` (header Save, `:198`).
**h)** Local `setShop` only; context copy goes stale after save: `:44,108` vs `ShopContext.tsx:56` (consumer impact unclear). Load error has no retry or back link: `:142-147`. Stale success alert until next save: `:61,109`. Card titles are `<p class="card__title">` not headings: `:179,192,294`. Raw `{shop.role}`: `:168`. Staff by URL see the whole form and get a 403 on save (PA).
**Decision:** **RESKIN** (rule 3: 53%, f small). **AGREE.**

### 4.11 Shops + New shop

**a)** `W/pages/ShopsPage.tsx` 91, `ShopNewPage.tsx` 168; `styles/pages/shops.css` 227; `api/shop.api.ts` 48; `context/ShopContext.tsx` 57.
**b)** ShopsPage DS 9 / 11 non-DS = **45%**; ShopNewPage 12 / 8 = 60%. Dynamic: `ShopsPage:63,72`, `ShopNewPage:153`.
**c)**
| Page | Class | Class | file:line | Why |
|---|---|---|---|---|
| Shops | `shop-card-top/-name` | MISSED | `:61,62` | `.shop-card__head/__name` |
| Shops | `shop-card-slug`, `-desc`, `-city` | MISSED | `:67,69,73` | `card__text`, `.shop-card__label`; raw `monospace`, `.8rem` |
| Shops | `shops-grid` | MISSED | `:58` | `.shop-cards__grid` (DS 1/2/3 cols vs `auto-fill minmax(260px,1fr)`) |
| Shops | `shops-empty` | MISSED | `:46` | `.empty` |
| Shops | `.shop-card{gap}` | OVERRIDE | `shops.css:48-50` on `<Link className="card card--interactive shop-card">` `:60` | redefines DS `.shop-card` (`DS:676`) |
| Shops | `shops-header`, `shops-spinner-wrap` | DS-GAP | `:31`, `:36` | G2, G3 |
| Shops | `shop-card-meta`, `shops-page` | LAYOUT-OK | `:71`, `:30` | |
| New | `card-back` | DS-GAP | `:66` | G10 |
| New | `shop-field-hint` | DUPLICATE | `:98` | `.field__hint` |
| New | `shop-detail-back`, `shop-form-actions/-card/-row`, `shops-page`, `shops-upgrade-card` | LAYOUT-OK | `:65,152,71,114,27,64,28` | `26.25rem` equals `.card--auth` |
**d)** `shops.css` as 4.10; no inline style, no colour literals.
**e)** ShopsPage: 3 `useState`, 1 effect, `getMyShops` inline, `useAuth` for `isPro`. ShopNewPage: 8 `useState`, `createShop` inline, slug sanitiser (`:36-38`), Pro gate (`:25-34`). `getMyShops` is called in 3 places (`ShopContext.tsx:37`, `ShopsPage:23`, `ShopSettingsPage:68`). JSX replaceable: yes for both (hooks `useMyShops`, `useCreateShop` optional).
**f)** Shops: small (PA Part 1: inline `alert--info` for the disabled "New shop" card, translate the role badge). New shop: small (localise, redirect to the shop overview after create, slug 409 as `field__error`).
**g)** `dashboard-overview.spec.ts:240` `toHaveURL(/\/shops\/new$/)` only. `.shop-card*` locators hit the dashboard's `ShopCards`, not `ShopsPage`. No spec visits `/shops`.
**h)** `ShopNewPage` entirely hard-coded English (`:29-30,57,67,72,76,87,99-100,105,116,126,140,146,154,161`). Role badge not translated: `ShopsPage:72`. Disabled "New shop" explains itself only through `title`: `ShopsPage:81-82`. No retry on load error: `ShopsPage:41-43`.
**Decision:** Shops **REBUILD VIEW** (rule 2: 45%, 8 items; 91 lines, S). New shop **RESKIN** (rule 3: 60%). Shops is a **FLIP**, New shop **AGREE**.

### 4.12 Account (`SettingsPage`)

**a)** `W/pages/SettingsPage.tsx` 376; `styles/pages/settings.css` 209.
**b)** DS 14 / non-DS 22 = **39%**. Dynamic: `:233,309`.
**c)**
| Category | Count | Classes (file:line) |
|---|---|---|
| MISSED | 9 | `settings-overview-email` `:173`, `settings-overview-since` `:182`, `settings-section-title` `:188,245,282,321` (use `card__header`), `settings-section-icon` `:189`, `settings-pref-desc` `:252`, `settings-sessions-hint` `:287,289,292`, `settings-session-icon` `:298`, `settings-session-expiry` `:300`, `settings-danger-desc` `:325` |
| LAYOUT-OK | 6 | `settings-section`, `settings-overview` (raw `1.25rem` `:31`), `-info`, `-badges`, `settings-sessions-list`, `settings-session-date` |
| DS-GAP | 5 | `settings-page` (narrow, `560px`; G7), `password-requirements` (G14), `settings-pref-row/-label` (G8), `settings-session-row` (or `data-table`) |
| DUPLICATE | 1 | `settings-avatar` `:169`; `settings.css:34-46` = `.avatar .avatar--lg` |
| OVERRIDE | 2 | `settings-pref-btn` `:255,270`; `.settings-section .btn{width:100%}` `settings.css:169-171` (should be `btn--block`); unclassed `<h1>` restyled by `.settings-page h1` (`settings.css:5-9,164-167`, raw `1.6rem/1.35rem`), should be `t-title` |
**d)** `settings.css` raw values on 28 lines (`:6,8,23,31,43,51,57,67,72,82,83,99,103,108,119,126,132,133,136,141,152,158,165,166,174,180,194,202`); `color-mix` `:134`; weight 500 `:104`; `max-width:640px` `:163`. No inline style in the TSX.
**e)** `updateMe`, `deleteMe`, `getSessions`, `revokeAllSessions`, `useAuth`, `useTheme`, `useLang`, all inline (`:71-161`); date helpers inline `:23-42`. Replaceable: **yes**.
**f)** Small under Option A (user decision): rename to "Account", delete-account pre-check (API, PA Part 1 #3), `.avatar`, one setting-row class, translate `formatSessionDate` and errors. Theme and language toggles **stay** (use DS `switch` for theme and `tabs--segmented` for language; PA's "move toggles" is dropped). No avatar menu (G20 stays LATER).
**g)** `account-delete.spec.ts:23-37`: `goto('/settings')`, `getByRole('button',{name:/delete account/i}).first()`, `getByRole('alertdialog')`, `getByLabel('Confirm your password')`, `getByRole('button',{name:'Delete account'})`, `getByRole('alert')` text "Incorrect password.", `toHaveURL(/\/settings$/)`. All depend on English strings, `Alert` role and `ConfirmDialog` `role="alertdialog"` (`:99`). Keep route `/settings` (Option A has no redirect).
**h)** `getSessions` failure swallowed (`.catch(() => {})` `:74`), UI shows `noSessions` (`:288-289`). If `deleteMe` succeeds and `logout()` throws, the catch shows a delete error though the account is gone: `:139-147`. aria-label differs from visible text ("Light theme"/"English" vs "Switch to light"/"Switch to English"), language label hard-coded: `:258,273`. Section titles are `<p class="card__title">` not headings: `:188,245,282,321`. Hard-coded el/en strings: `:38-41,144`. `user!`: `:98`. Whether revoke-all also invalidates the current session is unclear (no logout after success `:121-123`).
**Decision:** **REBUILD VIEW** (rule 2: 39%, 11 items; e = yes). **FLIP.**

### 4.13 My invites (`InvitesPage`)

**a)** `W/pages/InvitesPage.tsx` 234; `invites.css` 155.
**b)** DS 19 / non-DS 7 = **73%**; dynamic resolved `:76,109,118,153,199,204`.
**c)** `invites-tabs/-tab/-tab--active` MISSED `:107,109,118`; `invites.css:26-53` (DS `tabs`/`tab`/`tab__count`, as `RangeTabs.tsx:31-39`); `shops-spinner-wrap` DUPLICATE `:91` (defined only in `shops.css:22`); `invites-page`, `invites-header`, `invite-actions` LAYOUT-OK (`:90,99,100,74`; raw `860px`, `1.5rem`, `.4rem`); `.invites-header h1` overrides base type (`invites.css:18-22`). Inline spans `:114,123` (`marginLeft:0.4rem; opacity:0.7`) should be `tab__count`.
**d)** `invites.css` raw values on 21 lines (`:8,15,19,38,40,41,59,71,72,90,96,97,109,120,131,139,140,146,148,152,154`), `color-mix` `:135,136`, weight 500 `:39`; inline `:114,123`.
**e)** `getMyInvites`, `acceptInvite`, `declineInvite`, `useLang`, `useNavigate`, inline (`:31-70`); `renderReceivedActions` closure shared by table and cards (`:73-86`). Replaceable: yes.
**f)** Small: PA Part 1 `/invites`: remove the Sent tab and tabs entirely (single list; `data-table`, `empty`), rename "My invites", sidebar item only when `invites.length > 0` (needs `getMyInvites` in the sidebar: Sidebar section 4.17).
**g)** None.
**h)** Load error sets an alert but tabs and "no invites" empty states still render, no retry: `:38,131-134`. Tabs lack `role="tablist"/"tab"`/`aria-selected` and `type="button"`: `:107-125`. `toLocaleDateString()` without locale: `:159,209`. Decline error detail discarded: `:64-66`. Effect deps omit `t`: `:31-40`. Decline not disabled while Accept runs: `:82`.
**Decision:** **RESKIN** (rule 3: 73%, f small). **AGREE.**

### 4.14 Auth pages (Login, Register, Forgot, Reset, Verify, VerifyEmailChange)

**a)** `W/pages/LoginPage.tsx` 83, `RegisterPage.tsx` 183, `ForgotPasswordPage.tsx` 59, `ResetPasswordPage.tsx` 91, `VerifyEmailPage.tsx` 118, `VerifyEmailChangePage.tsx` 62; `login.css` 5, `register.css` 1, `forgot-password.css` 1, `reset-password.css` 1, `verify-email.css` 13; `components/PasswordRequirement.tsx` 18.
**b)** Login 13/18 (72%), Register 14/19 (74%), Forgot 10/14 (71%), Reset 10/15 (67%), Verify 10/13 (77%), VerifyChange 7/8 (88%); union **14/23 = 61%**. Dynamic: Register `:162,172` (`is-loading`).
**c)**
| Class | Class | file:line | Why |
|---|---|---|---|
| `card-back` | DS-GAP | Login `:37`, Register `:80`, Forgot `:34`, Reset `:49`; `sh/c:62-84` | G10 |
| `brand-wordmark`, `brand-wordmark--muted` | DUPLICATE / DS-GAP | same lines; `sh/c:88,99` | G17 |
| `form-links` | DS-GAP | Login `:76`, Register `:177`, Forgot `:53`, Reset `:85`; `sh/c:35-42` | raw `0.5rem/0.9rem` |
| `password-requirements`, `req-met/-unmet` | DS-GAP | Register `:122`, Reset `:62`, `PasswordRequirement.tsx:13`; `sh/c:108-130` | G14 |
| `remember-me` | MISSED | Login `:60`; `login.css:3-5` | wrap in `.field` (Register does `:130`) |
| `verify-email-status` | MISSED | Verify `:70`, Change `:44`; `verify-email.css:1-3` | `t-body-sm` + muted |
| `verify-resend-label` | MISSED | `:85`; css `:9-13` | `field__label`; raw `.9rem/.75rem` |
| `verify-resend-form` | LAYOUT-OK | `:84`; css `:5-7` | raw `1.25rem` |
`page` is used with the legacy meaning (viewport-centred flex, `sh/c:24-32`), not the DS meaning: needs G5.
**d)** Inline: `RegisterPage.tsx:84` (`color`, `fontSize:0.88rem`, `marginBottom:1rem`), `:109` (`opacity:0.7; cursor:not-allowed`). Raw: `verify-email.css:6,11,12`, `login.css:4`. No hex, no breakpoints.
**e)** Login: `useAuth().login`, `useNavigate` inline `:19-32`. Register: `register()`, `resendVerification()`, `authStore.setToken` directly (`:48`), `useAuth`, `useLang`, `useSearchParams`, inline `:37-75`. Forgot/Reset: one API call each, inline. Verify pages: effect with a `useRef` StrictMode guard (`VerifyEmailPage:18-47`, `VerifyEmailChangePage:13-37`; do not break). Replaceable: yes (Register has token handling in the view).
**f)** Small: PA NEXT 15 wires existing `t.login/register/...` keys (unused today), `<Link class="btn">`, `type="text"`, login returns to the requested URL (`LoginPage.tsx:26` always `/dashboard`, `ProtectedRoute.tsx:12` drops the path, `AcceptInvitePage.tsx:138` builds `?redirect=` that nothing reads), reset success message, `PublicRoute` spinner.
**g)** `#email`, `#password`, `button[type=submit]` on Login: account-delete:13-15, overview:137-139, owner-slot-interval-filters:23-25,79-81, owner-customer-lookup:28-30, service-delete:36-38, owner-outside-hours:32-34, booking-busy:79-81, owner-booking:33-35, dashboard-overview:134-136, root-routing:21-22; `waitForURL('**/dashboard')` couples to `LoginPage.tsx:26`. Keep exactly one `button[type=submit]`. Register, Forgot, Reset, Verify: no specs.
**h)** `/login?redirect=` ignored (above). `type="name"` invalid: `RegisterPage.tsx:94`. `<Link>` elements inside a `<label>` wrapping the checkbox: `RegisterPage.tsx:131-147`. `<Link><button>`: `VerifyEmailPage.tsx:75,111`, `VerifyEmailChangePage.tsx:49,56`. Hard-coded English though keys exist: `translations.ts:247,299,307,321,332`; Register mixes `t` and English (`:56,153,156,159`); default language `el` (`LanguageContext.tsx:15`). Reset success navigates silently: `ResetPasswordPage.tsx:37-38`; missing token only checked on submit `:29-33`. Expiry detected by matching server text: `VerifyEmailPage.tsx:43`. "Verifying..." plain `<p>`: `VerifyEmailPage.tsx:70`, `VerifyEmailChangePage.tsx:44`; no axios timeout (`client.ts:5-8`). Timeouts not cleaned: `RegisterPage.tsx:70,73`, `VerifyEmailPage.tsx:57,61`. No `autoComplete` on password inputs: `LoginPage.tsx:51-58`, `RegisterPage.tsx:114`, `ResetPasswordPage.tsx:54,72`.
**Decision:** **RESKIN** (rule 3: 61%, f small), after G5, G10, G14, G17 and the legacy `.page` removal (2.7 #3-#4). **AGREE.**

### 4.15 Accept invite

**a)** `W/pages/AcceptInvitePage.tsx` 149; `invites.css` (shared).
**b)** DS 7 / 13 = **54%**.
**c)** `accept-invite-page` DUPLICATE (`:57,67,83`; `invites.css:103-111`, G5); `accept-invite-card` OVERRIDE (`:58,68,84`; `invites.css:113-116`, `30rem` vs 26.25rem); `accept-invite-error` MISSED (`:69`; `:144-149`); `accept-invite-meta` MISSED (`:86`; `:118-126`); `accept-invite-warning` MISSED (`:118`; `:134-142`; re-implements `alert--warning` with `color-mix` `:135,136`); `accept-invite-actions` LAYOUT-OK (`:106`; `:128-132` raw `0.75rem`). Spinner at legacy 36px (`:59`).
**d)** Inline `:70` (`marginTop:1.5rem`), `:95` (`marginTop`, `fontSize:0.82rem`); `invites.css:109,120,131,139,140,146,148`.
**e)** `lookupInvite`, `acceptInvite`, `useAuth`, `useLang`, `useNavigate`, inline `:24-53`. Replaceable: yes.
**f)** Small (PA Part 1 `/invite`: `alert--warning`, localise the invite sentence, hide the Dashboard link when logged out). Renaming `accept-invite-*` also touches `CancelBookingPage`.
**g)** None.
**h)** `?redirect=` ignored (4.14). Error type by `message.includes('expired')` on English text and fallback "not found" for any other error including network failures: `:34-36`. Hard-coded "Dashboard" and "invited you to join": `:70,88-89`. Spinner without `role=status`: `:59`. `if(!invite) return null` blanks: `:78`. Effect deps omit `t`: `:39`. `Link.btn` underlines on hover (2.2).
**Decision:** **RESKIN** (rule 3: 54%). **AGREE.**

### 4.16 Legal, About, Contact, 404

**a)** `W/pages/AboutPage.tsx` 42, `ContactPage.tsx` 30, `TermsPage.tsx` 38, `PrivacyPage.tsx` 38, `DpaPage.tsx` 38, `NotFoundPage.tsx` 15; `legal.css` 89, `not-found.css` 33; `components/Footer.tsx` 58.
**b)** About 0/12, Contact 0/10, Terms 0/9, Privacy 0/9, DPA 0/9 (all 0%); NotFound 1/5 = 20% (`btn`).
**c)**
| Class | Class | file:line | Why |
|---|---|---|---|
| `legal-page` | DS-GAP | `legal.css:1-5` | prose container (G19), raw `3rem 1.5rem 4rem` |
| `legal-back` | DUPLICATE | `legal.css:7-17` | = `card-back` |
| `legal-title` | MISSED | `:19-24` | `t-title` (weight 900 vs DS 800) |
| `legal-section-heading`, `legal-body`, `legal-updated`, `legal-contact` | MISSED | `:39,32,26,46-54` | `t-subheading`, `t-body`, `t-caption`, `t-body-sm` |
| `home-label`, `about-badge` | DUPLICATE / OVERRIDE | `home.css:1487`; `legal.css:56-60` | `badge badge--accent label-caps` |
| `home-btn-primary/-ghost` | DUPLICATE | `AboutPage:28,33`, `ContactPage:21`; `home.css:35-76` | `.btn`, `.btn--secondary` |
| `about-actions` | LAYOUT-OK | `legal.css:62-67` | raw `1rem`, `2rem 0 1rem` |
| `.contact-page` | DEAD | `legal.css:69-89` | 21 lines; `ContactPage` uses `legal-page` |
| `not-found`, `not-found-title`, `not-found-message` | MISSED | `not-found.css:1-11` | `empty`, `empty__title`, `empty__text` |
| `not-found-code` | DS-GAP | `not-found.css:13-19` | G19 |
| `.not-found .btn{margin-top}` | OVERRIDE | `not-found.css:33` | small |
Counts (legal/About/Contact): MISSED 5, DUPLICATE 5, DS-GAP 1, LAYOUT-OK 1, OVERRIDE 1, DEAD 1.
**d)** `legal.css` raw values on 17 lines (font-size `:12,21,28,34,41,48`; margin `:9,23,29,36,43,59,66`; padding `:4,74,75`; gap `:65`); `not-found.css:9,10,14,23,29`; `font-weight:900` `legal.css:22,42`, `not-found.css:24`. Inline: `BrandText.tsx:14` `display:'contents'`. No hex.
**e)** Only `useLang` and `BrandText`. Terms, Privacy and DPA differ only in their `sections` array. Replaceable: yes. About and Contact import all of `home.css` (2266 lines) just for the footer and `.home-btn-*`.
**f)** Legal pages: small (DPA text is content, PA Part 1 and `docs/runbook.md` blocker). About + Contact: **large by definition** (PA Part 1: merge `/contact` into `/about` with redirect; remove the personal GitHub link; footer anchors to `<Link to="/#…">`). 404: none.
**g)** `root-routing.spec.ts:20` `.legal-title` on `/privacy`; `:27,36` `.not-found`. Update both with the rewrite (switch to role/heading selectors).
**h)** `<Link><button>`: `NotFoundPage.tsx:12`. No `<main>` landmark on legal pages. `.legal-back` underlines on hover (2.2). Footer anchors (`/#features`) cause a full reload from non-home pages: `Footer.tsx:24-27` (PA).
**Decision:** Terms/Privacy/DPA **REBUILD VIEW** as one prose template (rule 2). About + Contact **REBUILD VIEW** (rule 1: merge). 404 **REBUILD VIEW** (rule 2). All **FLIP**; each is S.

### 4.17 Sidebar / AppLayout

**a)** `W/components/Sidebar.tsx` 234, `AppLayout.tsx` 53, `Wordmark.tsx` 8; `hooks/useSidebarWidth.ts` 54; `styles/pages/sidebar.css` 329. Dead: `Navbar.tsx` 88, `Toggles.tsx` 30, `navbar.css` 146 (nothing imports `Navbar`; `Toggles` only by `Navbar.tsx:6`). `sidebar.css` is also imported by `HomePage.tsx:37`.
**b)** Live: Sidebar 1/14 (7%, only `sidebar`, `:63,128`), AppLayout 0/7, Wordmark 0/1; subtotal **1/22 = 5%**. Dead Navbar 5/12. Dynamic resolved: `Sidebar.tsx:63,128` (`drawer-open`), `:77-192` (NavLink `active`), `:197`.
**c)**
| Class | Class | file:line | DS equivalent / why |
|---|---|---|---|
| `sidebar-link`, `active` | MISSED | `Sidebar.tsx:77,82,87,94,100,154,159,164,169,182,187,192,197,205`; `sidebar.css:165-197` | `nav-item`, `[aria-current="page"]` |
| `sidebar-section-label` | MISSED | `:75,92,152,180`; `sidebar.css:93` | `sidebar__label` |
| `sidebar-bottom` | MISSED | `:197`; `:252` | `sidebar__footer` (applied to one link as a hack) |
| `drawer-open` | MISSED | `:63,128`; `sidebar.css:138,287` | `is-drawer is-open` |
| `sidebar-close-btn` | MISSED | `:43`; `:141-162` | `btn btn--ghost btn--icon btn--sm` |
| `app-layout`, `app-body` | MISSED | `AppLayout.tsx:19,43`; `sidebar.css:2,9` | `app-shell` |
| `sidebar-backdrop` | MISSED | `AppLayout.tsx:38`; `:292` | `scrim` |
| `hamburger-btn` | MISSED | `AppLayout.tsx:26`; `:41` | `btn btn--ghost btn--icon` |
| `app-mobile-brand` | MISSED | `AppLayout.tsx:32`; `:34` | `wordmark` |
| `sidebar-logout` | DUPLICATE | `:100,205`; `:235-261` | duplicates `sidebar-link` |
| `wordmark-be` | DUPLICATE | `Wordmark.tsx:5` | `wordmark__be` |
| `sidebar-header/-header-spacer/-back-link`, `sidebar-shop-name`, `sidebar-resize-handle`, `app-mobile-header` | DS-GAP | `:67,71,137,142,30`; `AppLayout.tsx:24` | G12 |
| `sidebar-link-label` (18 uses; also `HomePage.tsx:441,467,478,482`) | UNDEFINED | `Sidebar.tsx:72…210` | no CSS anywhere; DS `nav-item__label` |
| `app-main` | LAYOUT-OK | `AppLayout.tsx:48`; `sidebar.css:264,266,318` | raw `2rem 1.5rem` / `1.25rem 1rem` |
Tally: MISSED 11, DUPLICATE 2, DS-GAP 6, UNDEFINED 1, LAYOUT-OK 1. `.sidebar` is OVERRIDDEN from outside (`sidebar.css:60-76,276-285`).
**d)** `sidebar.css` raw: gap `:22,74,113,168`; padding `:24,71,99,169,225,244,249,266,289,318`; margin `:100,101,114`; font-size `:37,94,121,171,212,226,241`; `rgba` `:295`; fixed px `:23,63,278,46-47,132-133,148-149,205-206`; raw z-index `:31,89,150,283,296` (DS has `--z-nav`, `--z-drawer`); breakpoints 767/768 `:271,322` (docs say 960); `color-mix` `:186,218`. Inline `Sidebar.tsx:64,129` (`--sidebar-width`, a legitimate bridge).
**e)** Sidebar: `useAuth`, `useShop`, `useLang`, `useSidebarWidth`, `useMatch`, `useNavigate`; no direct API call (logout via `AuthContext`); width logic is in `hooks/useSidebarWidth.ts`. AppLayout: one `useState`. Replaceable: **yes** (caveat: adopting the DS fixed width orphans the resize hook and handle). `HomePage.tsx:425-485` duplicates the sidebar markup and `home.css:550-690,2165-2210` styles it, so renames affect the landing preview.
**f)** By `PA`: small (NOW 6 Option A: renames, drop shop "Invites", Account link in the shop nav, drop the "App" label, "My invites" only when invites exist, N12 mobile top bar without shop name). By DS adoption: large (rename classes, JS `is-compact`, move breakpoint 768→960, decide resize, resolve legacy `.page` first).
**g)** No spec selects sidebar markup (they navigate by URL; `PA` agrees). Indirect: `getByRole('heading',{level:1})` at `overview.spec.ts:142` and `dashboard-overview.spec.ts:142,204` depends on the wordmark staying an `h4` (`Sidebar.tsx:72,136`). Unit tests: none.
**h)** `/shops/new` (`App.tsx:91`, outside `ShopRouteProvider` `:95`) matches `useMatch('/shops/:slug/*')` (`Sidebar.tsx:226`), so `ShopNav` could render with slug "new" (react-router inference; unclear without running). `await logout()` has no try/catch and `AuthContext.tsx:56-60` skips `clearToken` if `logoutApi` throws: `Sidebar.tsx:102,207`. Hard-coded English "Open menu", "Close menu": `AppLayout.tsx:28`, `Sidebar.tsx:43`. Closed mobile drawer stays focusable (`left:-240px`, no `inert`/`visibility`), no Esc, hamburger without `aria-expanded`/`aria-controls`, backdrop is a bare `div onClick`: `sidebar.css:276-285`, `AppLayout.tsx:25-29,37-40`. Resize handle has `role="separator"` but is not focusable and mouse-only; unguarded `localStorage`; side effect inside a `setState` updater: `Sidebar.tsx:29-34`; `useSidebarWidth.ts:18,23-51,40-43`. `<aside>` with no `<nav>` landmark; wordmark is an `<h4>`: `Sidebar.tsx:62,127,72,136`. Manage items pop in late (`isOwner` false while `isLoading`) and a failed `getMyShops()` silently nulls the shop: `Sidebar.tsx:123,174`; `ShopContext.tsx:41`.
**Decision:** **REBUILD VIEW** (rule 2: 5%, 13 MISSED/DUP). Do the Option A renames inside the rebuild (PA branch 3). **AGREE.** Option B stays LATER (PA #20).

### 4.18 HomePage (unlisted, flagged only)

`W/pages/HomePage.tsx` 1279 + `home.css` 2266; 8 of 206 distinct classNames DS (3.9%); rgba/hex lines 10 (`home.css:118,241,266,354,524,560,1610,1614,1677,2206`), 92 `color-mix` lines, 456 raw px/rem lines, off-grid breakpoints at `:2142,2160,2167,2220,2254`; 4 inline styles (`HomePage:1059,1063,1069,1075`); 21 dead-class candidates (unclear, may be false positives). The embedded preview re-implements the owner wizard and a fake calendar (`HomePage:847-1090,1043-1077`), so owner UI changes drift from it. `home.css` is loaded globally (2.3). Not in the split; PA LATER 22. Local state only, no API calls.

---

## 5. Test gaps before rebuild

Write these first, on the current UI, using role/name/id selectors only (no class locators, no `data-testid`: none exist), following the style of the existing specs (DB poll as in `owner-slot-interval-filters.spec.ts:32-35`, login helper as in `account-delete.spec.ts:13-15`). Each must pass before and after the rewrite.

| REBUILD page | Existing e2e | Smoke tests to add first |
|---|---|---|
| Team + invites merge | none | (1) owner opens `/shops/:slug/team`, sees the owner row and a seeded member; (2) add a member via the current add form, row appears (API `createTeamMember`); (3) remove a member without bookings, row disappears; with bookings the 409 message is shown (PA F9) |
| Team member | none | (1) open a seeded member, toggle Active off + save, `isActive` persisted (DB poll); (2) after NOW 5, reactivation restores both bookable flags (CLAUDE.md TODO); (3) unknown member id shows a not-found state, not an infinite spinner (`ShopTeamMemberPage:73`) |
| WorkingHoursPanel | none (only seeds the tables) | (1) create a schedule, open Monday 09:00-17:00, save, rows exist in `ShopWorkingHourRange`; (2) overlapping ranges show the validation error; (3) delete a schedule. Re-check `owner-outside-hours.spec.ts:19,22,259,262` after the closures migration |
| Customer detail (and Customers list) | none | (1) search finds a seeded customer, row opens detail; (2) edit name, save, persisted; (3) history shows the seeded booking; export/delete confirm opens |
| Shops | none (route assertion `dashboard-overview.spec.ts:240`) | (1) `/shops` lists the seeded shop with a role badge; (2) card click goes to `/shops/:slug`; (3) non-Pro: the new-shop control is disabled and the reason is visible text (PA Shops #2) |
| Account | `account-delete.spec.ts` (delete only) | (1) edit name, save, persisted; (2) theme toggle sets `[data-theme]`; (3) language toggle changes the page heading text. Keep `/settings` (Option A) |
| Sidebar / AppLayout | none | (1) owner sees shop nav, navigates every item by link role and lands on the expected URL; (2) staff user sees only the 4 shop items (needs a staff seed); (3) at 360px the hamburger opens the drawer and a link click closes it. Write them against URLs and roles so the Option A renames do not break them |
| Calendar | partial (`owner-booking`, `owner-outside-hours`, `slot-interval`) | (1) tap a block, set status Completed, persisted; mock a 409 and assert an `alert` (PA F8); (2) `?date=` deep link opens that day; (3) tap an empty cell opens create. Rewrite `slot-interval:54-65` (filters) because PA Part 1 #9 removes them |
| Dashboard | `dashboard-overview.spec.ts` | (1) Today list shows today's seeded booking (NOW 7); (2) no Pending card; (3) range switch keeps the tabs (`DashboardPage:28-32,64-71`) |
| Shop overview | `overview.spec.ts` | (1) Today list; (2) setup checklist visible for an empty shop and hidden when all four are done; (3) booking link row copy |
| Booking confirmation | `timezone.spec.ts:80` | (1) confirmation shows a formatted date and the staff name; (2) the cancel link works end to end (after NOW 3); (3) a booking without email shows the shop phone |
| About + Contact, 404, legal | `root-routing.spec.ts:20,27,36` | (1) `/contact` redirects to `/about`; (2) `/privacy` and a bad URL assert by heading role, not `.legal-title`/`.not-found` |
| Cancel (RESKIN, but NOW 2 changes API rules) | none | (1) valid token cancels and shows the confirmation; (2) invalid token shows the mapped message (field-mapping bug `CancelBookingPage:25-28`); API tests first (project rule, PA NOW 2) |

---

## 6. Suggested order of work

Ordered by daily value to a one-chair shop (calendar and morning view first), then lowest risk. Maps to `PA` Part 5 branches.

| Step | Work | Why this order | `PA` branch |
|---|---|---|---|
| 0 | **Foundation**: delete dead code (2.7 #1), add DS equivalents for legacy-only rules (#2), remove the legacy imports (#3), `.page` collision (#4), `.shop-card` collision (#5), `--control-*` into tokens (#6) | everything inherits the legacy `.spinner`, `Link.btn` underline, focus ring and `.page` until this is gone | before 1 |
| 1 | **Logic fixes**: `ShopContext.isLoading` initial true, null-shop states on Services/Team/Member/Calendar/Customers/Detail, calendar status failure feedback, `.state-view`, `.btn--primary` | no markup risk; removes the infinite spinners and silent failures that every later test would trip on | 1 |
| 2 | **DS additions tagged NOW**: G1-G12 (toast, page header, loading wrapper, calendar geometry + event block, centered page, public shell, narrow widths, setting row, list row, back link, schedule editor + accordion, sidebar bits) | pages cannot be rebuilt "using only DS classes" until these exist | before 3-7 |
| 3 | **Test gaps** (section 5) for every REBUILD page, written on the current UI | rewriting without them is blind (8 of the 11 rebuild pages have no e2e) | with each branch |
| 4 | **Calendar**: extract commit (`useShopBookings`, `useCalendarFilters`, `useActiveColumn`, view-model fn), then rebuild with NOW 1 (confirm, toast, Today, `?date=`) | the owner's main working screen; NOW 8 reschedule needs the extracted hook | 1, then 8 |
| 5 | **Cancel reskin + NOW 2 API fix** (centered page from G5) | small, safe, fixes a broken customer flow | 2 |
| 6 | **Sidebar/AppLayout rebuild with Option A renames** | every page sits inside it; the rename is low risk once tests exist | 3 |
| 7 | **Booking page shell + confirmation**: extract `useBookingSubmit`/`useCustomerLookup`, then rebuild; wizard steps reskin | the customer-facing screen for the shop's clients | 4 |
| 8 | **Dashboard + Shop overview rebuild** (shared Today component), then setup checklist | morning check; additive on a 90.7% DS base, so cheap | 5, 10 |
| 9 | **Team (+ invites merge), Team member**: extract, rebuild | safe deactivate flow and the merge | 6 |
| 10 | **WorkingHoursPanel**: extract, rebuild, then closures (L, migration risk) | highest risk, so last of the NOW items; needs its smoke tests and the seed check first | 7, 14 |
| 11 | **Reschedule** in the rebuilt calendar panel | depends on step 4 and the email decision (NEXT 9) | 8 |
| 12 | **Reskins**: Customers list, Shop settings, New shop, My invites, Auth pages (after G14/G17), Accept invite, New booking (NEXT 16) | cheap, low risk; Auth waits for G5/G14/G17 | 9, 12, 13 |
| 13 | **Small rebuilds**: Customer detail (extract first), Shops, Account, legal template, About+Contact, 404; **Services in place (path A)** | low daily value, each S-M; Customer detail needs API changes (NEXT 13) | 11, 12 |
| 14 | **LATER**: HomePage tokenisation, avatar menu (Option B), QR, G18-G21 | no NOW/NEXT item depends on them | LATER |

`PA` branch 12 shrinks accordingly: Services, Shop settings, Shops and Account clean-up are covered here (Services in place, Account and Shops rebuilt, Shop settings reskin).
