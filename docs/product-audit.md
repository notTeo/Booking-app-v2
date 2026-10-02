# BeBooked product audit (read-only report)

Basis: code read on branch `dev` (700cc05). Nothing was run, so 360px notes come from CSS and markup. "unclear" = could not be determined from code.
Paths: `W/` = `web/src/`, `A/` = `api/src/`.

## 0. Findings that change the plan

| # | Finding | Evidence |
|---|---|---|
| F1 | **Reschedule exists in the API but not in the UI.** The `PATCH …/bookings/:id` endpoint handles time, service, staff and notes, with an overlap check. There is no client function in `W/api/booking.api.ts` and no button. | `A/routes/booking.routes.ts:53`, `A/services/booking.service.ts:826` |
| F2 | **PENDING is dead.** Bookings are created CONFIRMED and nothing creates PENDING. The Pending stat card, "N pending" badge and legend entry still show. There is no "needs confirming" job. | `schema.prisma:215`, `W/pages/DashboardPage.tsx` |
| F3 | **No holiday or closure feature.** Hours are per-member date-ranged schedules. A closed day means ending and recreating schedules. | no date-override model; `WorkingHoursPanel.tsx` |
| F4 | **Customer cancel is unsafe and broken.** There is no cutoff, and it also accepts COMPLETED and NO_SHOW. The error mapping reads the wrong field, so every failure shows the generic message. The owner is never emailed. | `A/services/booking.service.ts:176-191`, `W/pages/CancelBookingPage.tsx:25-28`, `A/controllers/public.controller.ts:98-109` |
| F5 | **Owner or staff cancel and status changes send no email to the customer.** | `booking.controller.ts` has no send on update |
| F6 | **Confirmation screen is thin.** It shows no cancel link, no add-to-calendar, no staff, no address, and a raw `YYYY-MM-DD` date. Those exist only in the email, which is sent only if the optional email was filled in. Without an email the customer cannot cancel. | `W/pages/PublicPage.tsx:142-164`, `A/services/email.service.ts:247-278` |
| F7 | **Infinite spinner** on Services, Team, Team member, Bookings, Customers and Customer detail when the shop is not found or the user is deactivated. | `ShopServicesPage.tsx:103-110`, `ShopTeamPage.tsx:25-32`, `ShopBookingsPage.tsx:116` |
| F8 | **Silent failure** when changing a booking status. Re-opening a canceled booking can return 409 and the UI shows nothing. | `ShopBookingsPage.tsx:147-149` |
| F9 | **Removing a member with bookings** returns 409 `CONFLICT_REFERENCED`, but the UI shows only "failed to remove". Deactivating warns about nothing: future bookings stay, and nobody is notified. | `A/services/team.service.ts:131-240` |
| F10 | **Auth pages are hardcoded English** (login, register, verify, forgot, reset) and `ShopNewPage` too. The UI defaults to Greek. The `t.login.*`, `t.register.*` and similar keys exist but are unused. | `W/pages/LoginPage.tsx` and others |
| F11 | **Emails are English-only**, with `en-US` dates and 12-hour times. | `email.service.ts:228-241` |
| F12 | **Self-signup dead-ends.** Creating a shop requires `isPro`, and only the admin script sets it. Every self-signup lands on an empty dashboard with no action. Fine for Hairology (admin-created), but it blocks any self-serve onboarding. | `A/services/shop.service.ts:69`, `A/admin/createTenant.ts:67` |
| F13 | **No staff-specific view.** Staff see all columns and can change any booking. Team, Customers and Settings are hidden in the nav but reachable by URL (API enforces owner-only for owner actions). | `Sidebar.tsx:174-202`, `A/utils/shopAccess.ts` |
| F14 | **Public book response leaks data** to anonymous callers: the full shop row, staff email and `cancelToken`. | `public.controller.ts:40`, `booking.service.ts:216-221` |
| F15 | **Marketing copy promises things that don't exist**: reschedule, real-time alerts, a 14-day trial and a cancel-subscription flow. | `HomePage.tsx` FAQ and bento copy |
| F16 | **Dead code**: `Navbar.tsx`, `Toggles.tsx` and `navbar.css` are imported nowhere. So the logged-in app has no theme or language toggle outside `/settings`. | grep |
| F17 | **Design-system layering**: the legacy `W/styles/shared/components.css` is still imported by `W/index.css` (duplicate `.spinner`, `.card-back`, `.form-links`). `W/styles/components.css` also defines `.shop-card`, which is redefined in `pages/shops.css`. | `W/index.css:1-2` |

---

## PART 1: PAGE INVENTORY

### 1.1 Route table

| Route | Page (en / el) | Who | How you get there | Purpose |
|---|---|---|---|---|
| `/` | Home / Αρχική | everyone (a logged-in owner also sees the marketing page) | URL, wordmark | Marketing landing |
| `/login` | Login / Σύνδεση | logged-out (logged-in → `/dashboard`) | Home nav, footer, ProtectedRoute redirect | Sign in |
| `/register` | Register / Εγγραφή | logged-out | Home CTA, invite link | Sign up, or accept an invite by signing up |
| `/forgot-password` | Forgot password / Ξέχασα τον κωδικό | logged-out | link on Login | Request reset email |
| `/reset-password` | Reset password / Επαναφορά κωδικού | public (token) | email | Set new password |
| `/verify-email` | Verify email / Επαλήθευση email | public (token) | email | Creates the user from the pending registration |
| `/verify-email-change` | Verify email change / Επαλήθευση νέου email | public (token) | email | Confirm new email |
| `/invite?token=` | Accept invite / Αποδοχή πρόσκλησης | public | email | Accept a shop invite (login or register first) |
| `/cancel?token=` | Cancel booking / Ακύρωση ραντεβού | customer | email button | Cancel only |
| `/:slug` (and `/p/:slug` redirect) | Booking page / Σελίδα κρατήσεων | customer | Instagram, QR, shared link | 4-step public booking |
| `/privacy` `/terms` `/dpa` | Privacy / Terms / DPA | everyone | footer; Register and booking page link to Privacy and Terms | Legal |
| `/about` `/contact` | About / Contact | everyone | Home nav (Contact), footer (About; footer "Contact" is a `mailto:`) | Static |
| `*` | Not found / Δεν βρέθηκε | everyone | any bad URL | 404 |
| `/dashboard` | Overview / Επισκόπηση | any logged-in user | login redirect; sidebar | Cross-shop stats, upcoming, shop cards |
| `/shops` | Shops / Καταστήματα | any logged-in user | sidebar | List my shops |
| `/shops/new` | New shop / Νέο κατάστημα | logged-in (API: Pro only) | button on Shops | Create a shop |
| `/settings` | Settings / Ρυθμίσεις | logged-in | sidebar (account level only) | My profile, password, sessions, delete account, theme, language |
| `/invites` | Invites / Προσκλήσεις | logged-in | sidebar (account level only) | Invites I received and sent |
| `/shops/:slug` | Overview / Επισκόπηση | owner + staff | shop card, sidebar | Shop stats and upcoming |
| `/shops/:slug/bookings` | Bookings / Ραντεβού | owner + staff | sidebar, "View all" | Day calendar by staff column |
| `/shops/:slug/bookings/new` | New booking / Νέο ραντεβού | owner + staff | sidebar | Phone-booking wizard |
| `/shops/:slug/services` | Services / Υπηρεσίες | owner (edit) + staff (read-only) | sidebar | Services and who performs them |
| `/shops/:slug/team` | Team / Ομάδα | owner (staff by URL) | sidebar "Manage" | Member table |
| `/shops/:slug/team/:memberId` | Team member / Μέλος ομάδας | owner (staff by URL, read-only) | row click only | Edit member, hours, services, remove |
| `/shops/:slug/invites` | Invites / Προσκλήσεις | owner | sidebar "Manage" | Actually "add team member" and login invites |
| `/shops/:slug/customers` | Customers / Πελάτες | owner (staff by URL) | sidebar "Manage" | Customer search list |
| `/shops/:slug/customers/:customerId` | Customer / Πελάτης | owner (staff by URL) | row click only | Edit, history (last 5), export, delete |
| `/shops/:slug/settings` | Settings / Ρυθμίσεις | owner (staff by URL, 403 on save) | sidebar "Manage" | Shop details, booking rules, booking link, delete shop |

Greek page titles for Privacy, Terms, DPA, About, Contact, Not found and the auth pages are not verified here: `translations.ts` has keys for them, which I did not list one by one.

### 1.2 Page cards

Effort: S < 2h, M half day, L 1–2 days. Components named are existing DS classes unless marked NEW.

#### `/` Home (`W/pages/HomePage.tsx`, `home.css` 2266 lines)
- **Shows:** nav, hero, a fake dashboard preview (a re-implemented mini app), features, how it works, pricing, FAQ, footer. Actions: sign in, get started, mailto.
- **Missing:** a logged-in owner gets no "Go to dashboard".
- **Redundant:** the fake preview re-implements tables, inputs and buttons. FAQ and bento promise reschedule, alerts, a trial and a plan that don't exist (F15).
- **Phone:** between 481 and 767px the container keeps 64px padding. Preview layout is unclear.
- **States:** static.
- **DS bypass:** `.home-btn-primary` and `.home-btn-ghost` duplicate `.btn` (also used by About and Contact); about 186 raw `px` and 275 raw `rem`; 0 `--fs-`/`--space-` tokens; 10 raw `rgba(0,0,0,…)` (`home.css:118,241,266,354,524,560,1610,1614,1677,2206`); raw z-index.
- **Verdict:** CHANGE (low priority).
- **Changes:**
  1. CHANGE FAQ and bento copy to match reality: remove trial, plan and reschedule claims, en + el (S)
  2. CHANGE nav CTA to "Dashboard" when `useAuth().isAuthenticated` (S) · `btn`
  3. CHANGE `.home-btn-*` to `.btn` / `.btn--ghost` and tokenise `home.css` (L, LATER)
  4. REMOVE the English-only preview mock data, or localise it (M, LATER)

#### `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/verify-email-change`
- **Shows:** `card--auth` forms. Register has name, email, password with a checklist, and a terms checkbox. After register it shows "check your email" plus resend. Verify pages auto-run on mount.
- **Missing:**
  - Login always goes to `/dashboard` and ignores the page you came from (`ProtectedRoute.tsx` does not save it).
  - After verify there is no auto-login ("Go to Login").
  - Reset navigates silently to `/login` with no success message.
  - A missing reset token is caught only on submit.
  - A re-opened verify link says "Invalid token" instead of "already verified".
- **Redundant:** none.
- **Phone:** fine. `.card-back` is `0.8rem` with no min-height (tap target below 44px).
- **States:** loading and error are present. The verify "Verifying…" state has no spinner. `PublicRoute` returns `null` while loading, so the screen flashes blank.
- **DS bypass:**
  - Raw rem in `login.css` and `verify-email.css`.
  - Inline styles at `RegisterPage.tsx:84,109`.
  - `<Link><button>` nesting at `VerifyEmailPage.tsx:75,111`, `VerifyEmailChangePage.tsx:49,56`, `NotFoundPage.tsx:12`.
  - `type="name"` at `RegisterPage.tsx:94` is not a valid input type.
  - `forgot-password.css` and `reset-password.css` are empty files.
- **Hardcoded English:** nearly everything (F10).
- **Verdict:** CHANGE (copy only, no structure).
- **Changes:**
  1. CHANGE all hardcoded strings to the existing `t.login/register/forgotPassword/resetPassword/verifyEmail*` keys (M) · no new components
  2. CHANGE login to return to the originally requested URL (S)
  3. CHANGE `<Link><button class="btn">` to `<Link class="btn">` (S)
  4. CHANGE `PublicRoute` loading to render `.spinner` like `ProtectedRoute` (S)
  5. CHANGE reset success to navigate with a success `alert` on Login (S)
  6. CHANGE `type="name"` to `type="text"` (S)
  7. CHANGE register 409 to a neutral message (avoids revealing that an email exists) (S)

#### `/invite`
- **Shows:** invite summary, then Accept (matching email) or Register / Log in.
- **Missing:** the sentence "X invited you to join Y" is not localised. A logged-in user with a different email sees a warning plus "Register".
- **States:** loading, error and accept error are present. Error type is detected by `message.includes('expired')` on English text (`:34-35`).
- **DS bypass:** `.accept-invite-warning` is a hand-rolled alert (`invites.css:134`); inline `fontSize:'0.82rem'` at `:70,95`.
- **Verdict:** CHANGE.
- **Changes:**
  1. CHANGE `.accept-invite-warning` to `alert alert--warning` (S)
  2. CHANGE localise the invite sentence, en + el (S)
  3. CHANGE "Dashboard" link hidden for logged-out users (S)

#### `/:slug` Booking page (`W/pages/PublicPage.tsx`, `public.css`, `booking-wizard/*`)
- **Shows:** shop header (name, description, phone, address, raw IANA timezone badge), then 4 steps: service, staff (including "No preference"), date and time, details.
- **Can do:** book. Nothing else.
- **Missing:**
  - Phone and address are not tappable (`tel:`, map).
  - The IANA timezone badge is noise for customers.
  - No language toggle (cookie default `el`).
  - No "today" default date.
  - The staff step is always shown, even for a one-staff shop.
  - No passive notice that the email is needed to cancel.
- **Redundant:** the timezone badge.
- **Phone:**
  - About 9–10 taps plus 2 typed fields (name, phone).
  - Badges are `nowrap`, so a long address can force horizontal scroll (probable, not verified).
  - No scroll-to-top on step change.
  - Slot-fetch errors read as "closed this day" (`useBookingWizard.ts:109`).
- **States:**
  - Loading is a bare spinner.
  - Shop-not-found has no retry.
  - There is no loading state for slots.
  - Zero eligible staff still shows "No preference".
  - A raw English API message can appear in a Greek UI.
  - Confirmation screen: see F6.
- **DS bypass:** token-clean overall. Exceptions: `45rem` max-width, `0.06em`, `.wizard-btn` layout hack. `formatPrice` hardcodes `€`; `formatDuration` hardcodes "m"/"h" (`wizardUtils.ts`).
- **Verdict:** CHANGE (this is the most important screen for Hairology's customers).
- **Changes:**
  1. ADD to the confirmation: formatted date and time, staff name, address, "Add to calendar" and a "Cancel booking" link. Uses `card`, `btn--secondary`, `alert--success` (M)
  2. CHANGE the email field: keep optional but add a `field__hint` "Needed to cancel online"; always show the shop phone on the confirmation (S)
  3. REMOVE the timezone badge from the customer header (S)
  4. CHANGE phone and address badges to `tel:` and map links (S)
  5. CHANGE skip the staff step when only one bookable staff exists (S)
  6. CHANGE default the date to the first available day (M)
  7. CHANGE slot fetch error to a danger `alert` with retry, not "closed" (S)
  8. ADD a language toggle in the header (S) · reuse the toggle pattern from `SettingsPage`
  9. CHANGE trim the `POST /public/:slug/book` response to the fields the page needs (S, F14)
  10. CHANGE map API error codes to translated copy instead of raw `info.message` (S)

#### `/cancel`
- **Shows:** a blind confirm ("Yes, cancel" / "Keep booking"), then the booking details. The confirm step cannot name the booking because no GET-by-token endpoint exists.
- **Missing:** a reschedule or "book again" link, the shop phone, and an owner notification (F4).
- **States:** error text is plain. "Already canceled" and "not found" are unreachable (field mismatch).
- **Phone:** fine. The date is shown in the **browser** timezone, not the shop's.
- **DS bypass:** inline styles at `:38,60,72,105`; reuses `accept-invite-*` classes from `invites.css`; raw `padding:4rem 1rem`.
- **Verdict:** CHANGE.
- **Changes:**
  1. CHANGE fix the error field mapping (`apiErrorField(err,'message')` or use error codes) (S)
  2. CHANGE API: reject cancel when the booking is COMPLETED, NO_SHOW or in the past; add a configurable cutoff later (M)
  3. ADD owner email on customer cancel (M)
  4. ADD a GET-by-token so the confirm step can show service and time (M)
  5. ADD "Book again" link to `/:slug` (S) · `btn--secondary`
  6. CHANGE show time in the shop timezone (S)
  7. CHANGE inline styles to `.stack` or DS spacing classes (S)

#### `/privacy`, `/terms`, `/dpa`, `/about`, `/contact`, `*`
- **Shows:** static text. `/dpa` shows a "placeholder" notice (runbook blocker). About links to a personal GitHub profile and a personal gmail. Contact has a `mailto` only.
- **Redundant:** `/contact` duplicates the footer `mailto` and the About CTA. About and Contact import the whole of `home.css` just for the footer and `.home-btn-*`.
- **Phone:** fine.
- **DS bypass:** `legal.css` raw rem and px; `.contact-page` styles (`legal.css:69-89`) unused; footer anchors (`/#features`) cause a full reload from non-home pages (`Footer.tsx:24-27`).
- **Verdict:** KEEP legal pages. MERGE `/contact` into About.
- **Changes:**
  1. MERGE `/contact` into `/about` and redirect (S)
  2. REMOVE the personal GitHub link on About (S)
  3. CHANGE footer links to `<Link to="/#…">` (S)
  4. CHANGE put the final DPA text in (blocker in `docs/runbook.md`) (L, content)

#### `/dashboard` Overview, all shops (`W/pages/DashboardPage.tsx`, `components/overview/*`)
- **Shows:** greeting, Week / Month / 3-months tabs, 4 stat cards, bar chart, next-5 upcoming table, status donut, "Your shops" cards.
- **Can do:** change range, open a shop, retry.
- **Missing:**
  - Today's bookings (only the next 5 from now; earlier-today bookings are invisible).
  - Staff name and phone on upcoming rows.
  - Rows are not links.
  - "View all" appears only with exactly one shop.
- **Redundant:** the donut, the Pending and Canceled stat cards, and the chart (period analytics, not a morning tool). Pending is dead (F2). For a one-shop owner this page duplicates `/shops/:slug`.
- **Phone:**
  - 36px tabs and chips.
  - The month chart has about 31 bars of roughly 5px each, as `<button>`s.
  - Upcoming rows become tall cards.
- **States:** skeleton, error with retry, no-shops, never-booked and period-empty are present. The error branch drops the tabs, and a failed range cannot be left.
- **DS bypass:** `shop-overview.css` is token-clean. `.btn--primary` is a no-op class (`NoShopsEmpty.tsx:17`). The greeting uses the browser timezone while the buckets use the shop timezone. `formatWhen` hardcodes 24h. For non-Pro users the empty state has no action (F12).
- **Verdict:** CHANGE (rename to Dashboard; make it a working view).
- **Changes:**
  1. ADD a "Today" section, all of today's non-canceled bookings with time, customer, service and staff, each linking to `/shops/:slug/bookings?date=…`. Uses `data-table`, `badge`, `empty` (M)
  2. REMOVE the Pending stat card, "N pending" badge and PENDING legend entry (S)
  3. CHANGE make upcoming rows link to the calendar day (S)
  4. MOVE the donut and legend to the shop Overview (or remove it) (S)
  5. RENAME sidebar "Overview" → "Dashboard" / "Πίνακας" (S)
  6. CHANGE one-shop owners: redirect `/dashboard` to the shop (L only if desired; otherwise leave) (LATER)
  7. CHANGE non-Pro empty state to a `mailto` contact button · `btn--secondary` (S)
  8. CHANGE `.btn--primary` to `.btn` (S)

#### `/shops` and `/shops/new`
- **Shows:** `/shops` is a grid of cards (name, active, slug, role) plus a dashed "New shop" card, disabled for non-Pro with the reason only in a `title` tooltip (invisible on touch). `/shops/new` has name, slug, description, phone, timezone, address.
- **Missing:**
  - Shop creation is Pro-only (F12) with no way to ask.
  - After creating a shop there is no onboarding.
  - No inline slug conflict hint.
- **Redundant:** for a one-shop owner `/shops` is a pass-through. The role is shown raw ("owner"/"staff") at `ShopsPage.tsx:72`. `/shops/new` duplicates fields that Shop settings also edits.
- **Phone:** fine.
- **States:** loading, error and empty are present. The non-Pro empty state is text only.
- **DS bypass:** `.shops-empty`, `.shop-card-slug` (monospace) and raw rem in `shops.css`; `.shop-card` defined twice (F17); `ShopNewPage.tsx` is **entirely hardcoded English** ("Pro Account Required", "Create Shop", labels, hints).
- **Verdict:** CHANGE. Do NOT merge `/shops` into the dashboard until a multi-shop owner exists, but it is a candidate for LATER.
- **Changes:**
  1. CHANGE localise `ShopNewPage` (M)
  2. CHANGE disabled "New shop" card to show an inline `alert--info` with a contact link (S)
  3. CHANGE translate the role badge ("Owner"/"Staff") (S)
  4. ADD after create: redirect to the shop Overview with the setup checklist (see Overview) (M)
  5. CHANGE slug 409 to a `field__error` on the slug field (S)

#### `/settings` Account (`W/pages/SettingsPage.tsx`, `settings.css`)
- **Shows:** identity header, profile (name, email, new password), preferences (theme, language), last 5 sessions plus "Revoke all", delete account.
- **Missing:**
  - It is reachable only from the account-level sidebar. From inside a shop you go back to Shops first.
  - Deleting an account with bookings returns an English 409 string.
  - A sole-owner shop would be orphaned with no warning.
  - Session load errors are swallowed (`:74`).
- **Redundant:** "Preferences" is the only theme and language toggle in the whole app.
- **Phone:** fine.
- **States:** present except session load error.
- **DS bypass:** `.settings-avatar` duplicates `.avatar` (`settings.css:34-46`); `.settings-pref-row`, `.shop-active-row` and `.team-switch-row` are three copies of one row; raw rem and px.
- **Hardcoded English:** `formatSessionDate` has inline Greek/English ternaries (`:38-40`); "Failed to delete account."
- **Verdict:** CHANGE (rename to Account, move to the avatar menu).
- **Changes:**
  1. RENAME "Settings" → "Account" / "Λογαριασμός" (S)
  2. MOVE theme and language toggles into the app header or avatar menu (M)
  3. CHANGE delete-account pre-check: block with a clear translated message if the user still owns shops or has future bookings (M)
  4. CHANGE `.settings-avatar` → `.avatar .avatar--lg` (S)
  5. CHANGE dedupe the switch-row pattern into one DS class (S)
  6. CHANGE translate `formatSessionDate` and error strings (S)

#### `/invites` My invites (`W/pages/InvitesPage.tsx`)
- **Shows:** tabs Received and Sent. Accept and Decline on Received.
- **Missing:** the Sent tab is read-only and loses cancelled invites (cancel deletes the row). Decline stores `expired`, so the sender cannot tell declined from expired.
- **Redundant:** the Sent tab duplicates the pending list on the Team invites page. The same word "Invites" is also the label of a different page (`/shops/:slug/invites`).
- **Phone:** fine.
- **States:** present.
- **DS bypass:** `.invites-tab(s)` duplicate DS `.tabs`/`.tab`/`.tab__count`; inline `marginLeft/opacity` at `:114,:123`.
- **Verdict:** CHANGE (shrink it). The bulk of users never see it, so it should stop taking a top-level nav slot when empty.
- **Changes:**
  1. REMOVE the Sent tab (S)
  2. REMOVE tabs entirely → a single list of received invites (S) · `data-table`, `empty`
  3. CHANGE show the sidebar item only when `invites.length > 0`, otherwise move it into Account (S, needs a count: reuse `getMyInvites`)
  4. RENAME "Invites" → "My invites" / "Οι προσκλήσεις μου" or "Προσκλήσεις μου" (S)

#### `/shops/:slug` Shop overview (`W/pages/ShopOverviewPage.tsx`)
- **Shows:** same widgets as the dashboard for one shop. Staff see shop-wide stats, not their own.
- **Missing:** a today number (the API returns `todayCount` and `upcomingCount`; the page throws both away), a "New booking" shortcut, and the booking link (only in the never-booked empty state).
- **Redundant:** nearly identical to `/dashboard` for a one-shop owner.
- **Phone:** same as the dashboard.
- **States:** the loading and no-shop states use the undefined class `.state-view`. A one-frame "no shop" flash is likely, because `ShopContext` `isLoading` starts false. An overview error hides the upcoming list.
- **DS bypass:** `OverviewEmpty.tsx` re-implements `CopyLinkButton`; `.state-view` has no CSS; `.overview-total` unused.
- **Verdict:** CHANGE. This becomes the home of "Today + setup + booking link".
- **Changes:**
  1. ADD Today list (same component as the Dashboard "Today") (M)
  2. ADD a "Setup checklist" card: add a service, assign staff, set hours, share the link. Hide when all done. Use `card`, `badge--success` (done), `btn--secondary` (M). **NO NEW COMPONENT:** a list in a `card` is enough.
  3. ADD "New booking" `btn` in the header (S)
  4. ADD booking link row with `CopyLinkButton` always visible (S)
  5. CHANGE use `.spinner` / `.skeleton` and `.empty` instead of `.state-view`; make `ShopContext.isLoading` start true (S)
  6. REMOVE Pending card (S)
  7. RENAME to "Overview" / "Σύνοψη" (kept, now unique at SHOP level only) (S)

#### `/shops/:slug/bookings` Calendar (`W/pages/ShopBookingsPage.tsx`, `bookings.css`)
- **Shows:** date arrows and picker, 5 status chips plus staff and service selects (client-side filters), a day grid with one column per member plus "Other", and a detail panel.
- **Can do:**
  - Tap a block, then a status chip (immediate, no confirm).
  - Owners tap an empty cell to book.
- **Missing:**
  - No "Today" button; the date is lost on leaving the page.
  - No reschedule or notes edit (F1). Phone shown as text, not `tel:`.
  - No customer link.
  - No auto-refresh.
  - A canceled block and a new booking can overlap in the same cell (a freed slot is rebooked; blocks are full width).
  - Staff have no "my column".
- **Redundant:** the status filter and service filter, with canceled and no-show shown by default. Deactivated members still get a column ("Other").
- **Phone:**
  - Single column per swipe, with a chip row (good).
  - Date arrows, input, chips and selects are 36px (below 44px).
  - Filters take about 200px of height (unclear).
  - The bottom sheet is hand-built: no scrim, no focus trap, no Esc, no `role="dialog"` (the DS has `.modal-backdrop--sheet`).
  - Blocks have a minimum of 28px.
- **States:** the empty day has no message. The error `alert` has no retry. The status-update failure is silent (F8). The spinner replaces the whole grid on every refetch.
- **DS bypass:**
  - Raw px in calendar geometry (`--cal-gutter-w:56px`, `--cal-col-min:140px`, `.cal-hour-label{height:64px}` duplicating `SLOT_H` in the TSX).
  - `.cal-chip-badge` is a hand-rolled badge.
  - The sheet re-implements `.modal-backdrop--sheet`.
  - Uses `.shops-spinner-wrap` from `shops.css`.
  - Hardcoded `aria-label` "Previous day"/"Next day".
- **Verdict:** CHANGE (this is the owner's main working screen).
- **Changes:**
  1. ADD "Today" button next to the arrows · `btn--secondary btn--sm` (S)
  2. ADD reschedule in the detail panel: reuse the slot picker from `DateTimeStep`; wire `PATCH …/bookings/:id` through a new `updateBooking` in `W/api/booking.api.ts` · `modal` (sheet), `slot` (L)
  3. ADD cancel and no-show confirm: `ConfirmDialog` for Cancel and No-show; show error `alert` on failure (S–M)
  4. CHANGE status failure shows a `toast--danger` with the 409 translated (S)
  5. CHANGE phone to a `tel:` link; add customer name → customer page link · `data-table__link` (S)
  6. CHANGE the detail panel to a real `modal modal--sheet` with scrim and Esc (M)
  7. CHANGE read `?date=` from the URL and write back, so "View all", dashboard rows and post-create redirect land on the right day (S)
  8. ADD for staff: highlight their own column and scroll to it on phone (`TeamMember.userId` already returned) (S)
  9. REMOVE the service filter and the status filter, replaced by a single "Hide canceled" `switch` (S)
  10. CHANGE empty day shows `empty--sm` with a "New booking" action (S)
  11. CHANGE 44px targets on phone for date controls (S)
  12. CHANGE members: hide deactivated members' column unless they have bookings that day (S)

#### `/shops/:slug/bookings/new` (`ShopNewBookingPage.tsx`, `booking-wizard/*`)
- **Shows:** a 4-step wizard (service, staff, date and time, details). The date step has a 10/15/20/30 interval picker, an out-of-hours switch, an "Other time" field and a warning list. The details step has phone first (live customer search), name, email and notes.
- **Missing:**
  - No success feedback after create: it navigates to the calendar on today with no `?date=` and no toast (`t.bookings.createSuccess` exists unused).
  - The date starts empty and has no `min` (past dates allowed).
  - Staff step is not skipped for a one-staff shop.
- **Redundant:** page chrome. The customer `.public-page`/`.public-header` layout is nested inside the app shell. The page header shows the shop name again.
- **Phone:**
  - About 9–11 taps plus typing via the sidebar. About 4 taps through the calendar (owners only).
  - A 40-slot grid at 15 minutes is about 700px.
  - `.public-loading` has `min-height:100dvh`, so embedding it in the calendar sheet makes a viewport-tall spinner.
- **States:** a fetch error is reported as "shop not found". A slot fetch error looks like "closed". The "New customer" hint wrongly shows for a known customer after an exact-phone autofill (`OwnerCustomerFormStep.tsx:152`). Staff without `canViewCustomerDetails` get blank lookup rows (read from code; not run).
- **DS bypass:** inline `position:relative` (`:123`); `customer-search-*` is a custom list (token-based); customer-facing labels ("Your Details"); `€` and `m/h` hardcoded.
- **Verdict:** CHANGE.
- **Changes:**
  1. ADD a `toast--success` ("Booking created for …") and navigate to `/bookings?date=<booked day>` (S)
  2. CHANGE default date to today and add `min=today` (S)
  3. CHANGE skip the staff step for one-staff shops; "any" otherwise (S)
  4. CHANGE the "New customer" hint to show only after a completed search with no match (S)
  5. CHANGE owner labels ("Customer details", not "Your details") (S)
  6. REMOVE the shop-name header and page chrome (S)
  7. CHANGE redact customer lookup for staff: show "Hidden" or disable the lookup (S)
  8. CHANGE cache `getShopInfo` for the embedded wizard and use `.spinner` without `100dvh` (S)

#### `/shops/:slug/services`
- **Shows:** list (name, active badge, description, duration, price) plus add/edit form (name, duration, price, active, description), a Staff panel per service, and delete (409 → "Deactivate instead").
- **Missing:** nothing structural. The owner can't see which services have no staff (a service with no assigned staff is unbookable and nothing says so).
- **Redundant:** the Staff panel here duplicates "Assigned services" on the member page. That is a reasonable duplicate (two entry points). **Description** is shown to customers (`ServiceSelectStep.tsx:33-38`), so keep it.
- **Phone:** fine; `service-staff-select` has `min-width:180px`; the edit form is a `card` nested in `card--flush` (double border).
- **States:** loading, error and empty are present. Infinite spinner (F7).
- **DS bypass:** `.service-action-active` and `.service-delete-btn:hover` restyle `.btn` with `!important` (`services.css:105-113`); `service-action-btn` and `.service-icon-btn` are dead; `.services-empty` duplicates `.empty`; inline spinner size at `:449`; raw rem; the isActive label is a `<span>`, so tapping the text doesn't toggle the switch (`:302-305`); hardcoded `€`, "min", "h", "m".
- **Verdict:** CHANGE (small).
- **Changes:**
  1. ADD "No staff assigned" `badge--warning` on a service with no staff (S)
  2. CHANGE fix the infinite spinner (S)
  3. CHANGE switch label to `<label>` (S)
  4. REMOVE `!important` overrides; use `btn--ghost` / `btn--danger` (S)
  5. CHANGE duration input `max=1440` (S)
  6. CHANGE use `.empty`, `.spinner--sm`, remove the nested card (S)

#### `/shops/:slug/team` and `/team/:memberId`
- **Shows:** Team is a table (email, role, "no login yet", joined, Remove). The member page has email, role, active, bookable-by-customers, bookable-internally and can-view-customer-details switches; a login-invite block; **working hours** (`WorkingHoursPanel`); assigned services; remove.
- **Missing:**
  - There is no Add button on Team (adding is on the Invites page).
  - Deactivate shows no warning about future bookings (F9).
  - No "bookings count" and no name edit.
  - Hours live four clicks deep: Team → member → Availability → New schedule → expand.
- **Redundant:** the three-switch cluster. "Bookable internally" vs "bookable by customers" vs "active" is confusing; the reactivation TODO (CLAUDE.md:9) makes it worse.
- **Phone:**
  - `.team-invite-actions` doesn't wrap (`team.css:99-103`), so Greek labels may overflow.
  - `h1` has `word-break:break-all`.
- **States:** present. Infinite spinner (F7). Remove error is generic (F9).
- **DS bypass:**
  - `team.css:85-97` hides the panel's `h1` and overrides its padding from outside.
  - Three copies of the switch-row pattern.
  - `card-back` is not `btn--ghost`.
  - Raw rem and px (`680px`).
  - Inline spinner styles at `:446`.
- **Verdict:** Team = CHANGE; member page = CHANGE; **Team invites page = MERGE INTO Team**.
- **Changes:**
  1. ADD "Add team member" button on Team that opens the add form in a `modal` (M) · `modal`, `field`, `input`, `select`, `switch`
  2. ADD on deactivate: `ConfirmDialog` showing "N future bookings stay on the calendar; they won't be moved or notified" (needs a count from the API) (M)
  3. CHANGE the remove 409 → translated message "Deactivate instead" with a one-click deactivate (S)
  4. CHANGE on reactivation restore the two bookable flags (fixes the CLAUDE.md TODO) (S)
  5. ADD an "Opening hours" summary on the member card ("Mon–Fri 09–17") linking to the panel (S)
  6. CHANGE group the switches: Active (master), then "Bookable" sub-options; hide the sub-options when inactive (S)
  7. CHANGE `.team-invite-actions` to wrap (S)
  8. CHANGE fix the infinite spinner (S)

#### `/shops/:slug/invites` (Team invites)
- **Shows:** an "Add team member" form and a "Members without a login" table with Send, Resend and Cancel invite.
- **Missing:** a staff member who visits by URL sees "You haven't sent any invites" (misleading).
- **Redundant:** the label and `t.invites` namespace collide with `/invites`. It creates members, not invites. It duplicates Team.
- **Phone:** fine.
- **DS bypass:** inline feedback `<p>` with custom classes (`invites.css:70-81`) instead of `alert`; `.invites-empty` duplicates `.empty`; raw rem.
- **Verdict:** MERGE INTO Team (as an "Add member" modal plus a "No login yet" filter or badge). Old route redirects to `/shops/:slug/team`.
- **Changes:**
  1. MOVE the add form into the Team modal (M, see Team #1)
  2. MOVE Resend/Cancel invite into the member page invite block (already there) (S)
  3. REMOVE the route; add redirect (S)
  4. CHANGE feedback to `alert--success` / `alert--danger` (S)

#### `/shops/:slug/customers` and `/:customerId`
- **Shows:** search plus table (name, phone, email, added), pagination. Detail shows stats (visits, total spent), an edit form, **last 5 bookings only**, and export / hard-delete (owner).
- **Missing:**
  - No upcoming booking, no last visit, no no-show or cancel counts.
  - No "Book again" and no `tel:`.
  - A booking doesn't link to its customer.
  - Staff cannot reach the page.
  - `totalSpent` is a revenue number. The product brief says no revenue/prices in analytics, so it should go.
- **Redundant:** the page wraps `.team-page`/`.team-header` CSS.
- **Phone:**
  - Pagination uses the undefined class `bookings-date-nav-btn` (about 21px tall).
  - `.card-back` is 20px.
  - The phone input has no `type="tel"` (`:175`).
- **States:**
  - The list shows both an error `alert` and the empty state together.
  - Search has no debounce or latest-wins guard.
  - A stale "saved" alert is never cleared.
  - The "no results" empty state is fine.
  - Redacted staff can probe whether a phone exists, because search matches the real value.
- **DS bypass:** inline `marginBottom:'1.25rem'` (`:64`) and `maxWidth:320` (`:74`); detail inline styles at `:215,217`; `team.css` raw rem and px; redundant `role="table"` attributes.
- **Verdict:** CHANGE.
- **Changes:**
  1. REMOVE "Total spent" (S) (brief: no revenue)
  2. ADD "Upcoming" and "Last visit" and counts (completed, canceled, no-show) on the detail page (M) · `stat`, `badge`
  3. CHANGE history from 5 rows to the last 20 with "Show more" (M)
  4. ADD `tel:` link and "New booking for this customer" (preselects phone) · `btn--secondary` (S)
  5. ADD calendar detail panel → link to the customer (S)
  6. CHANGE pagination to `btn btn--secondary btn--sm`; debounce search; hide the empty state on error (S)
  7. CHANGE `type="tel"` on the phone input (S)
  8. CHANGE staff with `canViewCustomerDetails` can open Customers; sidebar item shown for them (S)
  9. CHANGE a hidden-contact staff's search must not match on phone/name (S, API)

#### `/shops/:slug/settings` Shop settings (`ShopSettingsPage.tsx`, `shops.css`)
- **Shows:** booking-link card with copy button; form (name, slug read-only, description, phone, address, timezone, max advance days, slot interval, active); danger zone.
- **Missing:** this is the only permanent home of the booking link (besides the never-booked empty state). **There are no hours here** (and there is no shop-wide hours in the API; the schema comment at `schema.prisma:58` is stale). No QR code.
- **Redundant:** the raw `shop.role` string in the header. The API accepts `lat`/`lng`/`placeId` but ignores them (dead validators).
- **Phone:** the header Save button becomes full width and wraps (`shops.css:224` overrides a `.settings-section-header .btn{width:auto}` that doesn't apply to `.shop-settings-section`).
- **States:** present. Staff by URL see the whole form and get a 403 on save (only the danger zone is hidden).
- **DS bypass:** three switch-row variants; `.shop-field-hint` duplicates `.field__hint`; raw rem and px (`600px`, `620px`); `font-family:monospace`; dead `.shop-checkbox-label` and `.shop-active-toggle`; `ShopSettingsPage` loads `getMyShops()` itself instead of `useShop()`.
- **Verdict:** CHANGE (RENAME to "Shop settings").
- **Changes:**
  1. RENAME sidebar label → "Shop settings" / "Ρυθμίσεις καταστήματος" (S)
  2. CHANGE guard owner-only routes in the client (`<OwnerRoute>` → redirect to the shop overview) (S)
  3. CHANGE use `useShop()` (S)
  4. CHANGE fix the Save-button layout on phones (S)
  5. REMOVE the raw role text (S)
  6. ADD QR code of the booking link (**flag:** needs a small client library, no external service) (M, LATER)

#### `WorkingHoursPanel` (used only on the member page; `components/WorkingHoursPanel.tsx`, `working-hours.css`)
- **Shows:** per-member date-ranged schedules, each with 7 days and multiple time ranges, plus an overlap check.
- **Missing:**
  - Holidays and closed days (F3). A new member with no schedule is silently "not working"; no default hours.
  - "Create schedule" creates an empty schedule with every day closed, then you expand it, toggle days, set times and Save.
  - "Copy hours to all staff" is absent.
  - Save is two sequential calls (PATCH dates, then PUT days) and is not atomic.
- **Redundant:** schedule date ranges, in practice used as an "everything from now on" schedule (for a 1-chair shop this is over-engineered).
- **Phone:**
  - `.working-hours-slot` is `nowrap` (two time inputs plus a separator plus a 44px X may clip).
  - The `@media (max-width:520px)` stack rule is overridden by a later `flex:1` rule, so it never applies (`working-hours.css:42-48`).
- **States:** present.
- **DS bypass:**
  - `.working-hours-remove` and `.working-hours-add-slot` are page buttons.
  - `.wh-status` is a hand-rolled badge.
  - Inline `borderRadius:0` etc. at `:565`.
  - `.wh-empty` duplicates `.empty`.
  - Duplicate `line-height`.
  - Raw rem and px.
- **Verdict:** CHANGE.
- **Changes:**
  1. ADD "Closures": a date-exception list ("Closed on 25 Dec", optional "hours instead") per shop, with an Add closure `modal` (date, optional end date, reason). Uses `data-table`, `modal`, `field`, `input`, `btn`. **Needs a new table and migration, and a rules change in `bookingRules.service.ts` and slots.** (L) (F3)
  2. CHANGE "New schedule" prefills Mon–Fri 09:00–17:00 and opens it, one tap to save (S)
  3. ADD "Apply to all staff" (M)
  4. CHANGE make the save atomic (one API call) (M)
  5. CHANGE `.working-hours-remove` → `btn btn--icon btn--ghost`; `.wh-status` → `badge` (S)
  6. CHANGE fix the dead mobile stack rule (S)
  7. MOVE entry point: add an "Hours" link on Shop settings or Team for the owner, since the panel is four clicks deep (S)

---

## PART 2: USER JOURNEYS

Counts: taps/clicks on desktop unless marked "phone" (phone adds drawer taps).

| # | Journey | Path (from code) | Count | Where it is slow, confusing or broken |
|---|---|---|---|---|
| 1 | Owner first time | `/register` (4 fields + terms) → email link → `/verify-email` → "Go to Login" → `/login` → `/dashboard` empty → (non-Pro: dead end) → `/shops/new` (6 fields) → shop → Services → add each → Staff button per service → Team → member → Availability → New schedule → expand → toggle days → Save → Invites → add member → Settings → copy link | about 40+ taps | F12 dead end. No auto-login after verify. No checklist. Hours are 4 clicks deep with all days closed by default. A new shop is not bookable until services, staff assignment and a schedule exist, and nothing says so. The link is in Shop settings only. |
| 2 | Morning check | login → `/dashboard`: next 5 upcoming; or sidebar → shop → Bookings. Phone: hamburger → Shops → shop → hamburger → Bookings (about 5 taps) | 1–5 | Dashboard shows only the next 5 from now; earlier-today bookings are invisible. No "needs confirming" (F2). No staff or phone. Rows don't link. No "Today" button on the calendar. |
| 3 | Phone booking | Calendar: tap cell → service → Continue → phone → name → Create (about 4–5 taps). Sidebar wizard: phone 2 taps + service, staff, date (2+), slot, Continue, phone, name, Create (about 9–11 taps) | 5 / 11 | Calendar path is owner-only. Date empty by default; staff step always shown. No success message. Lands on today, not the booked day. The "New customer" hint is wrong for known customers. |
| 4 | Cancel, reschedule, no-show | Calendar → tap block → status chip → close sheet (3 taps). Reschedule: **not possible** (F1) | 3 | No confirm on cancel. Silent failure (F8). No reschedule (cancel plus new booking loses notes). No customer email on owner cancel (F5). Customer self-cancel: F4. |
| 5 | Staff leaves | Team → member → Active off → Save (4 taps); or Remove (4 taps) | 4 | Deactivation forces both bookable flags false. Future bookings stay on the calendar in the "Other" column, not moved, not notified, with no warning (F9). Remove fails 409 with a generic message when the member has bookings. Reactivation does not restore flags (TODO in CLAUDE.md). |
| 6 | Holiday or closed day | Team → member → Availability → end the schedule on the day before → New schedule → starting the day after → set 7 days → Save. Repeat per staff | 15+ | F3: no feature. Error-prone. The owner override can still book on a closed day; that's not a closure. |
| 7 | Find a customer | Sidebar Customers → search → row (3 taps). From a booking: not possible | 3 | Staff can't reach Customers. History is the last 5 only. No upcoming, no no-show count. Phone search is a raw `contains` (format sensitivity unclear). |
| 8 | Staff: my day | Shop → Bookings → find my column → tap block → chip | 3 + hunting | No own-column marker or filter. Staff see and can alter everyone's bookings. Shop Overview shows shop-wide stats. Staff can open owner pages by URL. |
| 9 | Customer: Instagram → booked | `/:slug` → service → staff → date (2–3 taps) → slot → Continue → name, phone → Confirm | 9–10 taps | Date empty; staff step even for one barber; slots-fetch error reads as "closed"; raw API errors in English; confirmation is thin (F6); no language toggle; the email is optional but is the only route to cancel. |
| 10 | Customer: cancel or change | Email button → `/cancel` → confirm | 2 | Only if email was given. Cancel only; no reschedule. Wrong error mapping (F4). No cutoff. The owner is not told. Time shown in the browser's timezone. |

---

## PART 3: NAVIGATION AND NAMING

### 3.1 Map of every nav entry

Entry points: sidebar (`W/components/Sidebar.tsx`), the mobile top bar plus drawer (`AppLayout.tsx`), page links. No navbar is used in the app (`Navbar.tsx` is dead), and there is no avatar or user menu and no shop switcher.

**ACCOUNT level** (`GlobalNav`, any route outside `/shops/:slug/*`)

| Label en / el | Route | Section | Who | Icon |
|---|---|---|---|---|
| Overview / Επισκόπηση | `/dashboard` | "App" / Εφαρμογή | all | `faTableCells` |
| Shops / Καταστήματα | `/shops` | App | all | `faStore` |
| Invites / Προσκλήσεις | `/invites` | App | all | `faEnvelopeOpen` |
| Settings / Ρυθμίσεις | `/settings` | "Account" / Λογαριασμός | all | `faGear` |
| Logout / Αποσύνδεση | n/a | Account | all | `faRightFromBracket` |

**SHOP level** (`ShopNav`, any `/shops/:slug/*`): back chevron "My Shops" / "Τα Καταστήματά μου" (to `/shops`), then the shop name as plain text.

| Label en / el | Route | Section | Who | Icon |
|---|---|---|---|---|
| Overview / Επισκόπηση | `/shops/:slug` | "Shop" / Κατάστημα | owner + staff | `faTableCells` |
| Bookings / Ραντεβού | `…/bookings` | Shop | owner + staff | `faCalendar` |
| New Booking / Νέο Ραντεβού | `…/bookings/new` | Shop | owner + staff | `faPlusCircle` |
| Services / Υπηρεσίες | `…/services` | Shop | owner + staff | `faScissors` |
| Team / Ομάδα | `…/team` | "Manage" / Διαχείριση | owner | `faUsers` |
| Invites / Προσκλήσεις | `…/invites` | Manage | owner | `faUserPlus` |
| Customers / Πελάτες | `…/customers` | Manage | owner | `faMagnifyingGlass` |
| Settings / Ρυθμίσεις | `…/settings` | Manage (bottom) | owner | `faGear` |
| Logout / Αποσύνδεση | n/a | n/a | all | `faRightFromBracket` |

### 3.2 Problems

| # | Problem | Evidence |
|---|---|---|
| N1 | **"Overview" ×2, same label and same icon** at two levels, with different content (all shops vs one shop). | `Sidebar.tsx:77,154` |
| N2 | **"Settings" ×2, same label and icon**: account vs shop (el "Ρυθμίσεις" ×2). | `:94,197` |
| N3 | **"Invites" ×2, different icons, different jobs**: received (`/invites`) vs creating team members (`/shops/:slug/invites`). | `:87,187` |
| N4 | Shop-level "Invites" is not about invites. It is "add team member". | `ShopInvitesPage.tsx` |
| N5 | **Account is unreachable from a shop**: back chevron → Shops → Settings. No theme or language toggle inside a shop. Logout is the only account action in `ShopNav`. | `Sidebar.tsx:117-216` |
| N6 | **No shop switcher.** Changing shop = back, Shops, pick (3 taps). | n/a |
| N7 | "New Booking" is an action in a nav list and uses title case (el "Νέο Ραντεβού"). Customers uses a magnifier icon (that is "search"). | `:164,192` |
| N8 | "Manage" has 4 items with no hours entry; the comment at `Sidebar.tsx:176` says "set when everyone works" but there is no hours link, and `sidebar.shopWorkingHours` is unused. | `translations.ts` |
| N9 | Staff see 4 items, owners 8. Staff reach Team, Customers, Invites and Settings by URL (no client route guard). | F13 |
| N10 | Title case in some labels ("My Shops", "New Booking", "Νέο Ραντεβού", "Τα Καταστήματά μου"). | `translations.ts:903-921,1818-1836` |
| N11 | Section label "Shop" sits above the shop name; "App" is a meaningless section label. | `:75,152` |
| N12 | The mobile top bar has only a hamburger and the wordmark, with no shop name, so on a phone you can't tell which shop you're in until the drawer opens. | `AppLayout.tsx:24-33` |
| N13 | Dead nav code: `Navbar.tsx`, `Toggles.tsx`, `navbar.css`, `sidebar.shopWorkingHours`. | F16 |

### 3.3 Naming rule and proposal

**Rule:** every label unique across the app; sentence case; 1–2 words; natural Greek; account-level words describe *me*, shop-level words describe *the shop*.

| Today (en) | Proposed en | Proposed el | Why |
|---|---|---|---|
| Overview (`/dashboard`) | **Dashboard** | **Πίνακας** (or "Σύνοψη όλων") | all shops |
| Overview (shop) | **Overview** | **Σύνοψη** | one shop |
| Shops | **Shops** | **Καταστήματα** | keep |
| Invites (received) | **My invites** | **Προσκλήσεις μου** | received; only shown when I have some |
| Settings (account) | **Account** | **Λογαριασμός** | profile and security |
| Settings (shop) | **Shop settings** | **Ρυθμίσεις καταστήματος** | shop |
| Invites (shop) | removed → inside **Team** | n/a | N3, N4 |
| New Booking | **New booking** | **Νέο ραντεβού** | sentence case |
| Bookings | **Bookings** | **Ραντεβού** | keep |
| My Shops (back) | **All shops** | **Όλα τα καταστήματα** | clearer |
| Customers | **Customers** | **Πελάτες** | keep; icon `faAddressBook` |

(Proposed Greek wording is mine; Nick should check the Greek with Hairology.)

### 3.4 Option A: minimal (rename only)

```
DESKTOP (account)           DESKTOP (shop)               PHONE DRAWER (shop)
┌───────────────┐           ┌───────────────┐            ┌─ ✕ ─────────────┐
│ BeBooked      │           │ ‹ BeBooked    │            │ BeBooked        │
│ ACCOUNT LEVEL │           │ Hairology     │            │ ‹ All shops     │
│ ▢ Dashboard   │           │ SHOP          │            │ Hairology       │
│ ▢ Shops       │           │ ▢ Overview    │            │ ▢ Overview      │
│ ▢ My invites* │           │ ▢ Bookings    │            │ ▢ Bookings      │
│ ACCOUNT       │           │ ＋ New booking │            │ ＋ New booking   │
│ ⚙ Account     │           │ ▢ Services    │            │ ▢ Services      │
│ ⏻ Logout      │           │ MANAGE        │            │ ▢ Team          │
└───────────────┘           │ ▢ Team        │            │ ▢ Customers     │
 *only if invites exist     │ ▢ Customers   │            │ ⚙ Shop settings │
                            │ ⚙ Shop settings│           │ ⚙ Account       │ ← add
                            │ ⏻ Logout      │            │ ⏻ Logout        │
                            └───────────────┘            └─────────────────┘
```
- **Renamed:** the table in 3.3.
- **Moved:** shop-level "Invites" folded into Team (MERGE, see Part 1). Account link added to the shop nav (small `Account` entry above Logout). Theme and language toggles go to the top of the account page only.
- **Route changes:** `/shops/:slug/invites` → redirect to `/shops/:slug/team`. `/settings` stays (page title renamed to "Account").
- **Sidebar changes:** drop the "App" label; keep "Account".
- **E2E impact:** no spec in `e2e/tests` selects a sidebar label (grep found none), and they navigate by URL. Re-check `dashboard-overview.spec.ts:181,225,239` ("View all", "Create your first shop" links, unchanged by Option A). No spec edits expected.
- **Effort:** S–M. **Risk:** only translations and one redirect.

### 3.5 Option B: clearer (shop switcher, account in avatar menu)

```
DESKTOP                                   PHONE
┌───────────────────┐                     ┌────────────────────────────┐
│ BeBooked          │                     │ ☰  Hairology ▾        (HT) │  ← top bar: shop name + avatar
│ [ Hairology ▾ ]   │ ← shop switcher     └────────────────────────────┘
│   (All shops…)    │                     Drawer:
│ ▢ Dashboard       │ ← all shops          [ Hairology ▾ ]
│ SHOP              │                      Overview / Bookings / ＋ New booking
│ ▢ Overview        │                      Services / Team / Customers
│ ▢ Bookings        │                      Shop settings
│ ＋ New booking     │                      ─────────
│ ▢ Services        │                      Account (avatar menu)
│ ▢ Team            │                        Account · My invites (n)
│ ▢ Customers       │                        Theme · Language · Logout
│ ⚙ Shop settings   │
│ ─────────         │
│ (HT) Account ▴    │ ← avatar menu: Account, My invites, Theme, Language, Logout
└───────────────────┘
```
- **Moves:** account items (Account, My invites, theme, language, logout) → avatar menu. Shop switcher replaces the back chevron and the `/shops` hop. Dashboard stays a top item.
- **Renames:** as in 3.3.
- **Routes:** `/settings` → `/account` (redirect). `/invites` → `/account/invites` or keep `/invites` (redirect not needed if kept). `/shops/:slug/invites` → `/shops/:slug/team`. `/shops` stays as a list reachable from the switcher ("All shops").
- **NEW COMPONENT needed:** a dropdown menu (the DS has `navbar__panel`, `sidebar__shop` and `avatar`, but no menu or popover). It is the one new component in this audit. Phone: use `modal--sheet` instead of a popover.
- **E2E impact:** `account-delete.spec.ts:23,37` (`/settings`), and `owner-slot-interval-filters.spec.ts:29` only if shop settings moves (it does not here). Both are fixed by the redirect, but the `toHaveURL(/\/settings$/)` assertion at `account-delete.spec.ts:37` would fail after a redirect to `/account`.
- **Effort:** M–L. **Risk:** keyboard and focus handling in a new menu; `useMatch('/shops/:slug/*')` in `Sidebar.tsx:226` drives the level switch today, so the switcher must not break it.
- **Recommendation:** do **A now**, and B only when a second shop owner exists. One shop does not need a switcher, and a one-shop owner today sees the "Shops" list as a pass-through.

---

## PART 4: RECOMMENDATIONS

Journey numbers refer to Part 2. DS components named per item.

### NOW (before more shops onboard; max 8)

| # | Type | What | Files | Why / journey | Effort | Risk |
|---|---|---|---|---|---|---|
| 1 | CHANGE | **Fix calendar status failures:** `ConfirmDialog` on cancel and no-show, `alert`/`toast--danger` on error (409 translated), "Today" button, `?date=` in the URL, `tel:` link | `ShopBookingsPage.tsx`, `bookings.css`, `translations.ts` | J2, J4, J8 | M | Low. Behaviour change: cancel now needs 2 taps. |
| 2 | CHANGE | **Fix customer cancel:** error field mapping; API refuses COMPLETED, NO_SHOW and past bookings; email the owner on customer cancel | `CancelBookingPage.tsx:25-28`, `booking.service.ts:176-191`, `public.controller.ts:98-109`, `email.service.ts` | J10 | M | Medium: touches booking rules; add API tests first (project rule). |
| 3 | CHANGE | **Fuller confirmation screen:** formatted date, staff, address, add-to-calendar, cancel link; `tel:` for phone; trim the response payload (F14) | `PublicPage.tsx`, `public.controller.ts`, `booking.service.ts` | J9, J10 | M | Low. Payload trim: check the web client does not depend on removed fields. |
| 4 | ADD | **Closures (holidays):** per-shop date exceptions, honoured by slots and booking rules; list and add `modal` in Team/Hours | new Prisma model and migration, `bookingRules.service.ts`, `slots.ts`, `WorkingHoursPanel.tsx` | J6 | L | **High:** new migration; the slot, overlap and out-of-hours rules and 328 API tests interact. Keep the owner override working on closed days (e2e `owner-outside-hours.spec.ts:249`). |
| 5 | CHANGE | **Safe deactivate/remove:** confirm dialog with the count of future bookings, translated 409 with "Deactivate instead", restore bookable flags on reactivation (CLAUDE.md TODO), fix infinite spinners | `ShopTeamPage.tsx`, `ShopTeamMemberPage.tsx`, `team.service.ts`, Services and Bookings pages | J5 | M | Medium: reactivation changes stored flags. Existing tests: `membershipActive.test.ts`. |
| 6 | RENAME | **Option A nav rename** + remove shop "Invites" (merge into Team) + add Account link in the shop sidebar | `Sidebar.tsx`, `translations.ts` (en + el), `App.tsx` redirect | all (N1–N5) | S–M | Low. Redirect old route. |
| 7 | CHANGE | **A real "Today" view:** list of today's bookings (time, customer, service, staff) with links to the calendar day; remove dead Pending UI; localise the overview times | `DashboardPage.tsx`, `ShopOverviewPage.tsx`, `UpcomingBookings.tsx`, `overview.service.ts`, `OverviewBody.tsx` | J2 | M | Low–medium. Existing e2e (`overview.spec.ts`, `dashboard-overview.spec.ts`) asserts stat cards, so update those. |
| 8 | ADD | **Reschedule in the calendar panel** (wire the existing PATCH endpoint; reuse `DateTimeStep`) | `booking.api.ts`, `ShopBookingsPage.tsx`, `DateTimeStep.tsx` | J4 | L | Medium. Rules and overrides apply (`overrideRules`); email behaviour must be decided with item 9. |

### NEXT (worth doing before mid-February)

| # | Type | What | Files | Why | Effort | Risk |
|---|---|---|---|---|---|---|
| 9 | ADD | **Customer email when the owner cancels or reschedules** (only if the customer has an email) | `booking.controller.ts`, `email.service.ts` | J4 | M | Emails are English-only today (see 15). |
| 10 | ADD | **Setup checklist** on the shop Overview (service, staff assigned, hours, link shared), with the booking link always visible; "No staff assigned" badge on services | `ShopOverviewPage.tsx`, `OverviewEmpty.tsx`, `ShopServicesPage.tsx` | J1 | M | Low |
| 11 | CHANGE | **Staff "my day":** highlight own column, scroll to it, hide Team, Customers and Settings routes client-side (`OwnerRoute`) | `ShopBookingsPage.tsx`, `App.tsx` | J8 | M | Low. API already enforces. |
| 12 | MERGE | **Team + shop invites** into one page with an "Add member" `modal` | `ShopTeamPage.tsx`, `ShopInvitesPage.tsx` | J1, J5 | M | Low. Delete route, add redirect. |
| 13 | CHANGE | **Customer detail:** upcoming, last visit, counts, last 20 bookings, `tel:`, "New booking" shortcut; remove "Total spent"; calendar block links to the customer | `ShopCustomerDetailPage.tsx`, `customer.service.ts` | J7 | M | Low. Honour `contactHidden` for staff. |
| 14 | CHANGE | **Public booking polish:** default date, skip the staff step for one barber, tappable phone and address, remove timezone badge, language toggle, translated errors | `PublicPage.tsx`, booking-wizard components | J9 | M | Low. Check `public.css`; existing e2e `booking-busy.spec.ts` and `timezone.spec.ts`. |
| 15 | CHANGE | **Greek for auth pages and emails:** wire existing `t.*` keys; localise `ShopNewPage`; localise email templates and dates (the booking page language, or `el` default) | auth pages, `ShopNewPage.tsx`, `email.service.ts` | owner onboarding, J9 and J10 | M–L | Medium: emails need a language parameter on booking creation. |
| 16 | CHANGE | **New booking by owner:** default today, `min=today`, success toast, redirect to the booked day, fix the "New customer" hint | `ShopNewBookingPage.tsx`, `OwnerCustomerFormStep.tsx`, `useBookingWizard.ts` | J3 | S–M | Low |
| 17 | CHANGE | **Hours UX:** prefill Mon–Fri 09–17 on New schedule; "Apply to all staff"; atomic save; add an Hours entry point | `WorkingHoursPanel.tsx`, `workingHours.service.ts` | J1, J6 | M | Medium: the save path changes; overlap tests in `scheduleOverlap.test.ts`. |
| 18 | CHANGE | **Marketing honesty:** remove trial, plan, reschedule and alert claims; "Dashboard" CTA when logged in; non-Pro contact action | `HomePage.tsx`, `NoShopsEmpty.tsx`, `ShopsPage.tsx` | J1 | S | Low |

### LATER

| # | Type | What | Why later |
|---|---|---|---|
| 19 | ADD | Reminder emails (needs a scheduler job; **flag:** a cron on Railway is new infra, no new external service) | Helps no-shows, but many customers give no email. |
| 20 | CHANGE | Option B (switcher and avatar menu; **NEW COMPONENT:** menu) | Only matters with multi-shop owners. |
| 21 | CHANGE | Redirect one-shop owners from `/dashboard` to the shop; hide `/shops` for them | Same. |
| 22 | CHANGE | `home.css` tokenisation and `.home-btn-*` → `.btn` | Pure cleanup; landing page. |
| 23 | ADD | QR code of the booking link (small client library) | Nice for the counter and flyers. |
| 24 | CHANGE | Cancel cutoff setting per shop | Only if abuse appears. |
| 25 | ADD | Self-serve shop creation (remove Pro gate) and billing | Needs a business decision. |

### DON'T

| Idea | Why not |
|---|---|
| PENDING / approval workflow | Nothing creates PENDING and Hairology confirms by phone. Remove the dead UI instead (item 7). |
| Customer accounts or login | Product rule: no account; adds password and GDPR surface. |
| Revenue, price analytics, "total spent" | Product rule; remove "Total spent" instead. |
| Drag-and-drop calendar | Large effort; reschedule via the panel covers it. |
| Push or real-time notifications | Needs a new service; email on cancel (items 2, 9) is enough. |
| SMS reminders | New external service and cost. |
| Per-service staff pickers or resource management | A 1-chair shop doesn't need it. |
| Shop switcher now | One shop; Option A is enough. |
| Contact form page | `mailto` is enough; merge Contact into About. |

---

## DS BYPASS LIST (fix in the branch that touches the page)

| File | Bypass |
|---|---|
| `styles/pages/home.css` | `.home-btn-*` (also used by About, Contact, Footer); about 186 raw px and 275 raw rem; no `--fs-`/`--space-` tokens; 10 raw `rgba(0,0,0,…)`; raw z-index |
| `styles/pages/services.css` | `!important` overrides of `.btn` (`:105-113`); dead `.service-action-btn` and `.service-icon-btn`; `.services-empty` duplicates `.empty`; raw rem and px (`160px`, `180px`, `860px`) |
| `styles/pages/team.css` | raw rem and px (`680px`, `1.6rem`); overrides `WorkingHoursPanel` from outside (`:85-97`); `.team-invite-actions` doesn't wrap; `.team-switch-row` duplicated twice more elsewhere |
| `styles/pages/invites.css` | `.invites-tab(s)` duplicate `.tabs`; custom inline feedback (`:70-81`); `.accept-invite-warning` instead of `alert`; `.invites-empty` duplicates `.empty`; also used by `CancelBookingPage` |
| `styles/pages/shops.css` | `.shops-empty`, `.shop-active-*`, `.shop-field-hint` duplicate `.empty` and `.field__hint`; `.shop-card` also defined in `components.css`; monospace; `:has()` hack; raw `600px`, `620px`; also hosts `.shops-spinner-wrap` used by 5 pages |
| `styles/pages/settings.css` | `.settings-avatar` duplicates `.avatar`; custom session row; raw rem and px |
| `styles/pages/working-hours.css` | `.working-hours-remove` and `.working-hours-add-slot` page buttons; `.wh-status` custom badge; `.wh-empty`; dead mobile rule; raw rem and px (`52px`, `680px`) |
| `styles/pages/bookings.css` | raw px geometry (`56px`, `140px`, `64px`); `.cal-chip-badge`; hand-built bottom sheet instead of `.modal-backdrop--sheet`; no scrim |
| `styles/pages/legal.css`, `login.css`, `verify-email.css`, `not-found.css` | raw rem and px; `.contact-page` unused |
| `styles/pages/sidebar.css` | raw `.app-main` padding (`2rem 1.5rem`); raw `rgba` shadows |
| `styles/shared/components.css` and `base.css` | legacy layer still imported by `index.css`: `.spinner` (36px/3px), `.card-back` (raw `0.8rem`), `.form-links`; duplicates `styles/components.css` |
| TSX inline styles | `RegisterPage.tsx:84,109`; `CancelBookingPage.tsx:38,60,72,105`; `AcceptInvitePage.tsx:70,95`; `ShopServicesPage.tsx:449`; `ShopTeamMemberPage.tsx:446`; `WorkingHoursPanel.tsx:565`; `ShopCustomersPage.tsx:64,74`; `ShopCustomerDetailPage.tsx:215,217`; `OwnerCustomerFormStep.tsx:123`; `InvitesPage.tsx:114,123` |
| Undefined or no-op classes | `.btn--primary` (`NoShopsEmpty.tsx:17`, `OverviewEmpty.tsx:28`), `.state-view` (`ShopOverviewPage.tsx:48-49`), `.bookings-date-nav-btn` (`ShopCustomersPage.tsx:128,138`) |
| Nested interactive markup | `<Link><button>` in `NotFoundPage.tsx:12`, `VerifyEmailPage.tsx:75,111`, `VerifyEmailChangePage.tsx:49,56`, `LoginPage` register link (via `Navbar`, dead) |
| Hardcoded strings | `€`, "m"/"h" in `wizardUtils.ts` and `ShopServicesPage.tsx`; `ShopNewPage.tsx`; auth pages; `aria-label`s in the calendar, Home and Footer fallbacks |

---

## PART 5: SUGGESTED BRANCH PLAN

Order: smallest risk and highest daily value first. Each branch: tests first (project rule), `dev` as the target, one theme, commit after each.

| # | Branch | Goal | Size | Relation to "dashboard cleanup part 2" |
|---|---|---|---|---|
| 1 | `fix/silent-failures` | Infinite spinners, calendar status feedback and confirm, `ShopContext.isLoading`, `.state-view`, `.btn--primary` no-ops (NOW 1, part of 5) | S–M | Absorbs part of it (loading and error states for services, team, shops pages) |
| 2 | `fix/customer-cancel` | Cancel error mapping, API refuses completed and past, owner email on cancel (NOW 2) | M | independent |
| 3 | `feat/nav-rename` | Option A rename, merge shop Invites route, Account link in the shop sidebar, delete dead Navbar and Toggles code (NOW 6) | S–M | **Replaces** the "sidebar" and "navbar" restyling items |
| 4 | `feat/booking-confirmation` | Fuller confirmation, tappable contacts, trimmed response, public-page polish (NOW 3, NEXT 14) | M | independent |
| 5 | `feat/today-view` | Today list on Dashboard and Overview, remove Pending, `?date=` links (NOW 7) | M | independent |
| 6 | `feat/team-safety` | Deactivate warning, translated remove errors, restore flags on reactivation, Team + invites merge (NOW 5, NEXT 12) | M | **Replaces** the "team" and "invites" restyling; DS fixes for those pages land here |
| 7 | `feat/holiday-closures` | Closures model, rules, UI (NOW 4) | L | Replaces the "working-hours" restyling (the panel gets rebuilt anyway; DS fixes for `working-hours.css` land here) |
| 8 | `feat/reschedule` | Reschedule in the calendar panel, customer email on owner cancel or reschedule (NOW 8, NEXT 9) | L | independent |
| 9 | `feat/owner-booking-polish` | Wizard defaults, toast, redirect to the booked day, customer hint fix (NEXT 16) | S–M | independent |
| 10 | `feat/setup-checklist` | Overview checklist, link always visible, "No staff" badge, non-Pro contact (NEXT 10, 18) | M | independent |
| 11 | `feat/staff-day` | Own column, client route guards, customer detail upgrade (NEXT 11, 13) | M | independent |
| 12 | `chore/ds-owner-setup-pages` | Remaining DS cleanup for services, shop settings, shops, account pages (switch-row dedupe, `.avatar`, tabs, `.empty`) | M | **This is what is left of "dashboard cleanup part 2"** once the above land |
| 13 | `feat/greek-everywhere` | Auth pages, `ShopNewPage` and email localisation (NEXT 15) | M–L | independent |
| 14 | `feat/hours-ux` | Prefill hours, apply to all, atomic save (NEXT 17) | M | independent (can merge into 7) |

**Hours budget** at about 10h/week for about 20 weeks is roughly 200 hours. NOW items 1–8 are about 4–6 working days; NEXT is about 5–7 days. That fits before mid-February with slack, but branch 13 and 14 are the first to drop.

**What stays as "dashboard cleanup part 2":** only branch 12, and trimmed. The sidebar and navbar parts become branch 3. The team, invites and hours parts get done inside the feature branches 6 and 7, so the pages are restyled once, not twice.
