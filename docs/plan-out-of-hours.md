# Plan: out-of-hours manual bookings and calendar visibility

Status: **approved** (with the decisions below). This file is the source of
truth if work continues in a new session. Branch: `prod-readiness`.

## 0. Approved decisions (these override anything below that differs)

1. **Overridable rule codes:** `OUTSIDE_OPENING_HOURS`, `SHOP_CLOSED`,
   `BOOKING_IN_PAST`, `OFF_SLOT_GRID`. `BOOKING_BEYOND_ADVANCE_WINDOW` is
   **not** overridable (raise the shop's `maxAdvanceDays` instead).
2. **COMPLETED blocks overlap.** Only `CANCELED` and `NO_SHOW` free a slot.
3. **Any shop member may override**; `createdById` records who. Hard DELETE of
   a booking stays owner-only.
4. **Out-of-hours slot grid:** 15-minute, midnight-anchored, capped at **3 h
   before the first opening** and **4 h after the last closing** for that
   provider/day. Anything beyond that goes through "Other time…" (5-minute
   step). Breaks between opening ranges are shown in full.
5. **Postgres exclusion constraint** is a separate commit, done only after
   (a) verifying `btree_gist` works on a real Railway Postgres (throwaway DB,
   steps provided to the owner) and (b) confirming `prisma migrate diff`
   reports no drift and does not try to drop it. If either fails: skip it and
   say so.

### Approved order (bugs before features)

0. Commit the Playwright scaffold; mark the obsolete override-dialog E2E
   `test.skip` with a comment pointing to commit 9. Clean working tree.
1. **Security:** remove `internal` from the public slots route; route the
   authenticated owner slots endpoint (no out-of-hours feature yet). Test:
   unauthenticated `internal=true` gets public-only results.
2. **Overlap hardening:** status-transition overlap check inside a
   serializable tx, COMPLETED policy, concurrency test.
3. Then commits 1, 2, 4 (out-of-hours flags), 5, 6, 7, 8, 9 of section 8
   below, then the optional constraint, then resume the remainder of group 3
   and groups 4–14 of the production-readiness plan.

Checkpoints: stop and summarize after the two bug commits, and again after
the migration + rules contract, before starting UI work.

Standing rules: tests first and shown failing; run the full suite (all three
TZs for the API) **before** committing; one concern per commit; never touch
the owner's own `translations.ts` edits without staging only my hunks.

## 1. Problem

Owners/staff need manual bookings outside working hours (a regular at 20:30,
a walk-in logged afterwards, a booking on a closed day). The public page stays
strict. Today the manual form only offers in-hours slots and the calendar is a
fixed-row day view, so an out-of-hours booking can't be created and, if it
existed, might be invisible.

### Hard rules

1. Overlap with another booking for the same provider is NEVER allowed, on any path.
2. A booking must NEVER be hidden in the calendar because it is outside the default rows.
3. Whether a booking was out-of-hours is stored at creation time, not recomputed.
4. Public page: behaviour unchanged; out-of-hours slots are never offered.
5. Server enforces; UI only helps. Owner/staff bypass needs explicit confirmation.
6. Must work on a phone; never rely on colour alone to signal out-of-hours.

## 2. Findings (state before this work)

### Manual booking form
- Slot source: the public slots endpoint with `?internal=true`
  (`web/src/hooks/useBookingWizard.ts:83`, `api/src/controllers/public.controller.ts:128`).
- Hours: `getAvailableSlots` (`api/src/services/booking.service.ts:316`) →
  `loadDayHours` (`api/src/services/bookingRules.service.ts:45`). "No
  preference" uses the shop-wide schedule (`staffId null`); a named provider
  uses only their own schedule; none = closed (no fallback, deliberately).
- Step: fixed 30 min, anchored at each range's opening
  (`api/src/utils/slots.ts:3,46`). NOT the service duration (that only decides
  whether the slot still fits before closing).
- Breaks: no break/time-off model. Several `ShopWorkingHourRange` rows per day
  = split shifts; the gap is the break (`api/prisma/schema.prisma:94`). Days
  off = `isOpen=false`. No vacations/exceptions.
- Internal mode shows in-hours slots, booked ones disabled
  (`DateTimeStep.tsx:56`); a closed day shows only a message + link, no slots
  (`:105`). Calendar click hint snaps to nearest slot within 60 min (`:14`).
- **Security:** `internal=true` is a query flag on an unauthenticated route
  (`api/src/routes/public.routes.ts:21`) — anyone can see availability of
  staff who aren't customer-bookable. An authenticated controller exists
  (`api/src/controllers/booking.controller.ts:46`) but was never routed.

### Calendar
- Rows hard-coded 07:00–23:00, 64 px/hour (`web/src/pages/ShopBookingsPage.tsx:21`).
- Columns: one per team member, unfiltered (`:149`), incl. inactive staff.
- Block `top = (minutes − 07:00) × px/min` (`:363`).
- **Bookings outside the rows:** before 07:00 → negative `top`, above the
  scroll origin and under the sticky header = unreachable/hidden (violates
  hard rule 2); after 23:00 → below the grid lines with no hour label;
  provider not in the members list → `'unassigned'` bucket that never renders
  (`:151`); bookings are fetched by start date only (nothing for
  midnight-crossing).
- No non-working shading. Click-to-create snaps to 30 min, clamps at 07:00 (`:346`).
- Mobile: `bookings.css` has zero `@media` rules; columns `min-width:140px` +
  56 px gutter (`bookings.css:240,285`) → 3 providers ≈ 476 px on a 390 px
  screen, sideways scroll, no sticky gutter.

### Models / integrity
- `Booking` (`schema.prisma:200`) has no out-of-hours marker; `override` was a
  transient request boolean, never stored.
- Overlap enforced in serializable transactions on create and PATCH only; no
  DB-level constraint.
- **Gap:** `updateBookingStatus` (`booking.service.ts:627`) has no overlap
  check: a CANCELED booking whose slot was re-booked can be flipped back to
  CONFIRMED → two active bookings for one provider.
- **Gap:** overlap queries also ignore COMPLETED (`booking.service.ts:127,247,585`).

### Reusable
`buildSlotCandidates`, `loadDayHours`, `assertBookingRules` (extend to return
all violations), 422 rule codes + translations, `ConfirmDialog`, `AppError.code`,
`shopTime` (client+server), `timeHint`/`initialMemberId`, and the unrouted
`booking.controller.getAvailableSlots` (becomes the authenticated owner slots
endpoint).

## 3. Chosen design

Chosen options: **A3 / B3 / C1 / D2 / E2** (rationale in section 4).

### A3 — reaching an out-of-hours time
- A "Show times outside working hours" toggle on the internal date/time step,
  plus an "Other time…" native time input (5-minute step) for times that fit
  no grid (e.g. a walk-in logged at 21:10).
- Grid: 15-min, midnight-anchored, capped 3 h before first opening / 4 h after
  last closing for that provider/day (decision 4); breaks shown in full.
  In-hours slots keep the current opening-anchored 30-min grid.
- Visual: dashed border + moon icon (☾) per out-of-hours slot; text section
  headings ("Before opening", "Break", "After closing"); aria-label like
  "20:30, outside working hours"; booked = strikethrough + word "booked";
  today's earlier slots tagged "past". Never colour alone.
- API: new authenticated `GET /api/shops/:shopId/bookings/slots?...&includeOutsideHours=true`
  returning `{time, available, outsideHours, reason?}`. The public endpoint is
  untouched and loses the `internal` flag.
- Closed day: show the "closed" note but still offer the toggle.

### B3 — confirming the override
- The last step shows a non-modal "This booking is outside working hours"
  panel with an explicit "Book outside working hours" button.
- Request carries the exact accepted codes: `overrideRules: ["OUTSIDE_OPENING_HOURS"]`
  (not a bare `override: true`). The server re-computes the violations; any
  violation not in the accepted list → 422 listing **all** violations. The
  existing `ConfirmDialog` remains as the fallback for that case.
- Only the overridable codes in decision 1 are accepted.

### C1 — calendar day view
- Visible range = union of every provider's working hours that day and the
  earliest/latest booking, padded 1 h, never narrower than 09–18. Shop-timezone
  minutes; midnight-crossing bookings clamped and marked "→ next day".
- Per-provider non-working shading: hatched pattern + small "Off"/"Closed"
  label (not colour alone). Needs a new
  `GET /api/shops/:shopId/schedules/day?date=` → `{memberId: ranges[] | null}`
  reusing `loadDayHours`.
- Override bookings: dashed border, ☾ icon, text tag "After hours" /
  "Closed day" / "Past entry", driven by the stored flag (hard rule 3).
- Clicking a hatched area opens the form with the toggle already on.
- Safety net (hard rule 2): any booking not fully inside the rendered area, or
  whose provider has no column, is listed in a banner "N bookings outside the
  visible range". The dead `'unassigned'` bucket becomes a real "Other" column.

### D2 — mobile
- Form: 3-column slot grid, ≥ 44 px targets, toggle at the top of the step,
  collapsible sections, native time picker for "Other time…".
- Calendar ≤ 640 px: one provider per page (scroll-snap) with provider chips to
  jump; sticky time gutter; detail panel becomes a bottom sheet; chips show an
  out-of-hours badge (icon + count). > 640 px: the current grid, unchanged.

### E2 — data model
- `Booking.overriddenRules String[] @default([])` (text array; stores exactly
  the accepted codes) and `Booking.createdById String?` (who created it).
  Additive migration, no backfill (existing rows = `[]`).
- UI tag derived from the stored codes: `OUTSIDE_OPENING_HOURS` → "After
  hours", `SHOP_CLOSED` → "Closed day", `BOOKING_IN_PAST` → "Past entry",
  `OFF_SLOT_GRID` → "Custom time".
- Rule-1 hardening: status-transition overlap check, COMPLETED policy, and
  (conditional, decision 5) a DB exclusion constraint.

## 4. Options considered (for the record)

- **A:** A1 toggle only · A2 free time input only · **A3 toggle + grid + "Other time…"** (chosen).
- **B:** B1 confirm on selection only · B2 save → 422 → dialog → resend (was
  committed as `907b9cd`) · **B3 explicit confirm on last step + accepted-codes contract** (chosen; B2 kept as fallback).
- **C:** **C1 dynamic range** (chosen) · C2 always 24 h · C3 compressed gaps.
- **D:** D1 horizontal scroll + sticky gutter · **D2 one provider per page ≤ 640 px, D1 above** (chosen) · D3 agenda list.
- **E:** E1 boolean · **E2 codes array + createdById** (chosen) · E3 audit table.

## 5. Mockups

```
MANUAL FORM — DESKTOP (normal)                 DESKTOP (toggle on)
+------------------------------------+        +------------------------------------+
| Date [ 2026-12-08 ]                |        | Date [ 2026-12-08 ]                |
| ( ) Show times outside working hrs |        | (x) Show times outside working hrs |
|                                    |        |                                    |
| 09:00 09:30 10:00 10:30 11:00      |        | Working hours                      |
| 11:30 12:00 [BOOKED] 13:00 ...     |        | 09:00 09:30 10:00 10:30 11:00 ...  |
|                                    |        |                                    |
| Other time...  [--:--]  (hidden)   |        | ☾ Before opening (needs confirm)   |
|                                    |        | ┄06:00┄ ┄06:15┄ ┄06:30┄ ...        |
+------------------------------------+        | ☾ Break 13:00-14:00                |
                                              | ┄13:15┄ ┄13:30┄ ┄13:45┄            |
                                              | ☾ After closing (needs confirm)    |
                                              | ┄17:15┄ ... ┄20:15┄ ┄20:30┄ ...   |
                                              | Other time: [ 21:10 ]  (5-min)     |
                                              |                                    |
                                              | [!] Outside working hours: this    |
                                              | will be saved as an exception.     |
                                              | [ Book outside working hours ]     |
                                              +------------------------------------+
Legend: ┄nn:nn┄ = dashed border + ☾ icon; aria-label "20:30, outside working hours".
        BOOKED = strikethrough + the word "booked".

MANUAL FORM — PHONE (390 px)
+------------------------------+
| Date [ Tue 8 Dec ]           |
| [ ☾ Show outside hours  (o)] |
| Working hours                |
| [09:00][09:30][10:00]        |
| [10:30][11:00][11:30]        |
| ▾ ☾ Before opening (12)      |
| ▾ ☾ After closing (14)       |
|   [┄17:15┄][┄17:30┄][┄17:45┄] |
| Other time [ 21:10 ] (wheel) |
+------------------------------+
| ☾ Outside working hours      |
| [ Book outside hours       ] |
+------------------------------+

CALENDAR — DESKTOP (Nick 09-17, Maria 10-18; rows expand to 21:30)
      |      NICK       |      MARIA      |
 08:00|░░░░░░░░░░░░░░░░░|░░░░░░░░░░░░░░░░░|   ░ = hatched: not working
 09:00|                 |░░░ Off ░░░░░░░░░|       (pattern, not colour only)
 10:00|+---------------+|                 |
      || Anna  Cut     ||+---------------+|
 11:00|+---------------+|| Bob   Beard   ||
      |                 |+---------------+|
  ...
 18:00|░░░░░░░░░░░░░░░░░|░░░░░░░░░░░░░░░░░|
 20:00|░░░░░░░░░░░░░░░░░|┏┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┓|   dashed border
 20:30|░░░░░░░░░░░░░░░░░|┇☾ Kostas  Cut  ┇|   ☾ icon + tag
      |░░░░░░░░░░░░░░░░░|┇ AFTER HOURS   ┇|
 21:00|░░░░░░░░░░░░░░░░░|┗┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┛|
 21:30|                 |                 |
 [ i ] 0 bookings outside the visible range   (banner only when N>0)

CALENDAR — PHONE (one provider per page, swipe or tap chips)
+------------------------------+
| ‹ Tue 8 Dec ›                |
| [ NICK ] [ MARIA ☾1 ]        |
+------+-----------------------+
| 17:00|░░░░░░░░░░░░░░░░░░░░░░░|
| 18:00|░░░░░░░░░░░░░░░░░░░░░░░|
| 20:00|┏┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┓|
| 20:30|┇☾ Kostas · Cut        ┇|
|      |┇  AFTER HOURS         ┇|
| 21:00|┗┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┛|
+------+-----------------------+
 tap a block -> bottom sheet with details / status
```

## 6. Test plan (each written first and shown failing)

**API**
1. Rule 1: overlap never bypassable — create, PATCH and status transition;
   CANCELED→CONFIRMED hole; COMPLETED overlap; the 10-request concurrency test,
   also with `overrideRules` set.
2. Explicit override contract: missing/incomplete `overrideRules` → 422 listing
   all violations; blanket `override: true` rejected; a code accepted for one
   violation doesn't cover another; non-overridable codes can't be accepted.
3. Persistence (rule 3): `overriddenRules` saved and returned; unchanged when
   the shop schedule is edited later; bookings without override keep `[]`;
   `createdById` set.
4. Owner slots endpoint: `includeOutsideHours` full-day flags (before opening,
   break, after closing, closed day, past, booked) with the 3 h / 4 h caps;
   authenticated; `bookableInternally` respected; DST days 2027-03-28 and
   2027-10-31 with no duplicates/nonexistent slots.
5. Rule 4: the public endpoint never returns out-of-hours slots; the
   `internal` flag on the public route is ignored (unauthenticated
   `internal=true` gets public-only results); a public booking with override
   fields is still 422.
6. Day-schedule endpoint: per-provider ranges; a provider with no schedule is closed.
7. Migration applied to a copy of an existing DB with no drift.

**Web unit (three TZs):** range computation, midnight crossing, booking before
opening, the "outside visible range" list.

**Playwright (iPhone-size viewport):** calendar shows a 06:15 and a 22:30
booking; a booking on a closed day is visible; owner books 20:30 via the toggle
(confirm → tagged in the calendar) and 21:10 via "Other time"; overlap refused
even after confirming; the public page never shows those slots; the tag is
text + icon (checked without relying on colour).

## 7. Reuse map

| Existing piece | Reuse |
|---|---|
| `buildSlotCandidates`, `loadDayHours`, `assertBookingRules` | Extend to whole-day / all violations |
| 422 rule codes + translations | Keep |
| `ConfirmDialog` | Keep as the fallback |
| `AppError.code` | Keep |
| `shopTime` (client + server) | Unchanged |
| `timeHint`, `initialMemberId` | Unchanged |
| Unrouted `booking.controller.getAvailableSlots` | Becomes the authenticated owner slots endpoint |

## 8. Commit breakdown (in order)

Bug fixes first (approved ordering):

- **S0** Playwright scaffold (+ obsolete override-dialog E2E marked `test.skip`, pointing to commit 9).
- **S1** Security: drop `internal` from the public slots route; route the authenticated owner slots endpoint (no out-of-hours yet).
- **S2** Overlap hardening: status-transition overlap check in a serializable tx; COMPLETED blocks; concurrency test.

Then the feature commits:

1. Migration: `Booking.overriddenRules`, `Booking.createdById` (+ test).
2. Rules contract: explicit `overrideRules` (overridable set per decision 1), all-violations 422, `createdById`, replacing the boolean `override`.
4. Owner slots endpoint with out-of-hours flags (15-min midnight-anchored grid, 3 h / 4 h caps, breaks in full).
5. Day-schedule endpoint for the calendar.
6. Web form: toggle, sections, "Other time…", inline confirmation, translations (dialog stays as fallback).
7. Web calendar: dynamic range, per-provider shading, override styling, out-of-view safety net, real "Other" column.
8. Mobile layout: provider paging, sticky gutter, bottom sheet, form tap targets.
9. Playwright E2E replacing the obsolete override-dialog test.
10. (Conditional, decision 5) Postgres exclusion constraint — only after the Railway `btree_gist` check and the no-drift check both pass; otherwise skipped and reported.
11. Resume the remainder of production-readiness group 3, then groups 4–14.

Checkpoints: after S1+S2; after commits 1+2 (migration + rules contract).

## 9. Context from the main production-readiness effort

- Groups 0, 1, 2 are done. Group 3 is partly done: `maxAdvanceDays`, the 422
  rules engine with codes, endTime recompute on service change, and the
  dashboard confirm dialog are committed (`266490b`, `907b9cd`).
- Committed since: timestamptz migration (`c84293d`), UTC session pinning
  (`0f0eaa0`, needed because Prisma's pg adapter sends naive timestamps),
  deterministic DST resolution (`d7381cf`), frozen test clock (`8bf0d0b`).
- The API test DB deliberately has a hostile default timezone
  (America/New_York); the API suite runs under `npm run test:tz`
  (UTC, Europe/Athens, America/New_York).
- Web lint has 30 pre-existing errors to be fixed in group 13 (lint stays
  blocking in CI); check `set-state-in-effect` in `VerifyEmailPage` /
  `VerifyEmailChangePage` for StrictMode double requests.
- E2E lives in `e2e/` (`npm run e2e` from repo root), not in CI yet.
