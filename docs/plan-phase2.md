# Phase 2 plan: production-readiness fixes

**Next step:** Checkpoint after the two bug commits (S1 `28e9c7d`, S2 `0ea6259`
+ `d6b9441`) — then out-of-hours commits **1 + 2** (migration
`Booking.overriddenRules` / `createdById`, then the explicit `overrideRules`
rules contract), then checkpoint again **before any UI work**. See
`docs/plan-out-of-hours.md` for the order and details.

*(Keep this line updated after every commit or checkpoint.)*

Branch: `prod-readiness` (base `main`; PRs target `dev`). Nothing pushed, no PR
opened, nothing deployed.

## Context

Monorepo: `api/` (Node/Express/Prisma/PostgreSQL, Railway) and `web/`
(React/Vite, Vercel), plus `e2e/` (Playwright). Multi-tenant booking SaaS for
barbershops/salons; first tenant Hairology (Athens), public booking page at
`https://<DOMAIN>/hairology`. Free scheduling only, no payments.

Phase 1 (audit only) produced a report; the owner approved Phase 2 below.
Phase 1 findings still open are tracked in the groups that fix them.

## Standing rules

- **Tests first and shown failing**, then the fix, then shown passing.
- **One concern per commit.**
- **Always run the full suite BEFORE committing** (API: `npm run test:tz` = UTC,
  Europe/Athens, America/New_York; web: `npm run test:tz`; lint/tsc as well).
- **Stop and summarize after each numbered group** before continuing.
- **Never commit the owner's `web/src/locales/translations.ts` edits** unless
  told to. When adding my own strings, stage only my hunks (build the staged
  blob from HEAD + my additions with `git update-index --cacheinfo`, leaving
  the working tree alone). The owner's `closedThisDay` edit is already
  committed (`5bbe134`); do not touch that line.
- Never ask the owner to paste secrets into chat; Railway/Vercel env vars are
  set by the owner in the dashboards.
- Hard DELETE of a booking is **owner-only** (`2f27ae8`); staff may change
  status (including cancel).

## Groups 0–14 (as approved, full text)

Execute Phase 2 in this order, one concern per commit, run the full test suite
after each commit, and stop after each numbered group to give a short summary
before continuing.

0. Housekeeping: fix .env.test to use a migrated test DB; fix or rewrite the 2
   stale booking tests (setupShop must assign StaffService); run prettier --fix
   as a single isolated formatting commit; fix the 3 no-useless-escape errors.
1. Tenant isolation: membership check on deleteBooking; scope serviceId and
   staffId to the shop on public create, owner create, and PATCH; remove mass
   assignment in createShop/updateShop (explicit field whitelist). Add
   regression tests for every hole found.
2. Timezones: all wall-clock ↔ UTC conversion done in shop.timezone on both
   server and client (use date-fns-tz or Luxon, pick one and use it
   everywhere). Fix slot generation, wizard ISO building, and "today"/day-range
   boundaries. Tests must run under BOTH TZ=UTC and TZ=Europe/Athens, including
   DST dates 2027-03-28 and 2027-10-31.
3. Booking rules (server-side, public AND owner paths): reject past times,
   closed days, outside opening hours, off the slot grid, and beyond a max
   advance window (make it a shop setting, default 60 days). Return 422 with
   clear error codes.
4. Customer upsert: public bookings must NOT overwrite an existing customer's
   name/email. Only create if new; otherwise attach the booking to the existing
   customer unchanged.
5. Serialization errors: map DriverAdapterError TransactionWriteConflict / code
   40001 (and P2034) to 409 at all three call sites. Rerun the 10-request
   overlapping-time test; zero 500s allowed.
6. Rate limiting on /public/* (stricter on /book and /cancel). Malformed JSON →
   400. Respect err.status in errorHandler.
7. Validation: express-validator on every route listed as missing, including
   query-string tokens and path params. Length caps and types on all public
   booking fields (name ≤100, notes ≤1000, phone format, email format).
8. Slugs: 3–40 chars, a-z0-9 and hyphens, no leading/trailing hyphen,
   RESERVED_SLUGS including every existing route listed plus the owner's list.
   Slug immutable after creation.
9. Ops/env: graceful SIGTERM shutdown (server.close + prisma.$disconnect),
   unhandledRejection handler, request IDs in logs, /health checks the DB.
   NODE_ENV required in prod. CORS accepts a comma-separated CLIENT_URLS list.
   Fix JWT_REFRESH_EXPIRES_IN parsing. Update both .env.example files. Remove
   PII (emails) from info-level logs. Delete the dead web/config/env.ts. Update
   the API README (remove Stripe/Google OAuth).
10. GDPR: notice line + privacy link on the booking form; /dpa page
    (placeholder text); termsVersion + termsAcceptedAt stored on user at
    registration with a required checkbox on RegisterPage; shop admin can
    export (JSON) and delete a customer; self-host all fonts (including
    Lobster) and remove Google Fonts.
11. Root routing: /:slug after all static routes; /p/:slug redirects to
    /:slug; update copy-link buttons and email links.
12. Tenant ops: admin-only CLI script to create a tenant (user + shop + isPro +
    membership) and a separate Hairology seed (slug "hairology", staff,
    services, hours, no demo data). Rename seed-visual-check.ts clearly as
    dev-only and make it refuse to run when NODE_ENV=production.
13. Minimal CI: GitHub Actions running tsc, lint, and API tests on push.
14. Deploy runbook + rollback plan (Railway + Vercel + DNS), with env vars the
    owner sets in the dashboards.

### Rules the owner added while approving group 2

- One library (Luxon chosen), used on both server and client. No
  `new Date("YYYY-MM-DDTHH:mm")` string parsing anywhere.
- Tests first, failing under TZ=UTC before the fix; run the full suite under
  TZ=UTC, TZ=Europe/Athens and TZ=America/New_York.
- DST: 2027-03-28 (03:00–04:00 doesn't exist in Athens) and 2027-10-31
  (03:00–04:00 occurs twice): slot generation must not crash, duplicate, or
  produce nonexistent slots.
- The public page shows times in the SHOP's timezone regardless of the
  visitor's browser timezone (tested with a non-Athens browser TZ).

### Adjustments approved after group 2

- **A.** Convert booking/schedule DateTime columns to `timestamptz(3)` with
  `USING col AT TIME ZONE 'UTC'` (done for all 31 columns).
- **B (group 3, corrected).** Public path strict (422 + codes). Owner/staff
  path: same checks but bypassable with an explicit override; overlap is NEVER
  bypassable; recompute `endTime` on service change with the overlap re-check
  inside the serializable tx (409 test: a longer service colliding with the
  next booking leaves the original unchanged).
- **C.** Commit the headless-Chrome timezone E2E as Playwright under `e2e/`
  with `npm run e2e`; **not in CI for now**.
- **D (group 13).** Fix the 30 web lint errors *properly*; lint stays
  **blocking** in CI. Look closely at `react-hooks/set-state-in-effect` in
  `VerifyEmailPage` and `VerifyEmailChangePage` — check whether they cause
  double requests in StrictMode.

## Superseded parts

- **Group 3, "public AND owner paths" strictness** is **superseded for the
  owner/staff path** by `docs/plan-out-of-hours.md`: the owner override is no
  longer a blanket `override: true` but an explicit
  `overrideRules: [...]` list (only `OUTSIDE_OPENING_HOURS`, `SHOP_CLOSED`,
  `BOOKING_IN_PAST`, `OFF_SLOT_GRID` are overridable;
  `BOOKING_BEYOND_ADVANCE_WINDOW` never is), stored on the booking, with
  out-of-hours slots visible in the form and a redesigned calendar. The public
  path stays strict and unchanged.
- The dashboard "book anyway?" dialog (`907b9cd`) is now only the fallback for
  a 422 the UI did not anticipate; the E2E spec for the old flow is `test.skip`ped
  until commit 9 of the out-of-hours plan.
- Group 5's serialization mapping was **pulled forward** into the overlap
  hardening work (`d6b9441`) because a zero-5xx concurrency test cannot pass
  without it; group 5 reduces to verifying it (see status).

## Status per group

| Group | Status | Commits |
|---|---|---|
| 0 Housekeeping | **done** | `caf9ee6` self-migrating test DB (+ refuses non-*test* DBs); `46fad4f` stale booking tests; `cf1fff1` no-useless-escape + lint glob; `7c8b787` prettier-only |
| 1 Tenant isolation | **done** | `be099d1` delete membership; `7647e8e` serviceId/staffId scoping (create, PATCH, slots); `783e4e2` field whitelists; `2f27ae8` delete owner-only |
| 2 Timezones | **done** | `a8becd9` server (Luxon, shop tz); `6689f90` web (+ vitest, `test:tz`); follow-ups below |
| 3 Booking rules | **partly done / partly superseded** | `a057990` `maxAdvanceDays`; `266490b` 422 rules + codes + endTime recompute + owner `override`; `907b9cd` dashboard dialog + settings field. Remainder = out-of-hours plan (`overrideRules` contract, storage, UI) |
| 4 Customer upsert | not started | — |
| 5 Serialization errors | **done early** (verify when reached) | `d6b9441` retry + 409 mapping at all four serializable sites, concurrency tests |
| 6 Rate limiting / JSON errors | not started | — |
| 7 Validation | not started | — |
| 8 Slugs | not started | — (note: `updateShop` already ignores `slug`; must become a 400 before deploy) |
| 9 Ops/env | not started | — |
| 10 GDPR | not started | — |
| 11 Root routing | not started | — |
| 12 Tenant ops / seeds | not started | — |
| 13 CI | not started | — (also: fix 30 web lint errors, lint blocking) |
| 14 Runbook | not started | — |

### Related commits (not tied to a single group)

- `c84293d` all `DateTime` columns → `timestamptz(3)`.
- `0f0eaa0` pin DB connections to UTC. Prisma's pg adapter sends Dates as
  timezone-less strings that Postgres reads in the *session* zone, so
  timestamptz stored the wrong instant on a non-UTC-default Postgres
  (Prisma-only round trips hid it; the browser E2E exposed it).
- `d7381cf` deterministic DST resolution (Luxon biased ambiguous times by
  "now"; server and web now resolve explicitly, earliest instant).
- `8bf0d0b` frozen test clock (2026-12-01); the test DB's default timezone is
  deliberately hostile (America/New_York).
- `936667b` Playwright E2E scaffold (`npm run e2e`, 4 timezone tests pass; the
  obsolete override-dialog spec is skipped). Not in CI.
- `28e9c7d` security: public slots ignore `internal`; authenticated
  `GET /api/shops/:shopId/bookings/slots`.
- `0ea6259` overlap hardening: re-occupying a slot (CANCELED/NO_SHOW →
  active) re-checks overlap; COMPLETED blocks.
- `fb4c1e3`, `80d4ab8` out-of-hours plan doc and its decision-4 addendum.

## Known open items / notes

- Web lint: 30 errors, 18 warnings (mostly `no-explicit-any`, React-hooks
  rules). Not yet fixed → group 13.
- One unexplained, non-reproduced 404 in a single run of the overlapping-
  bookings concurrency test right after `d6b9441` was written; 0 failures in
  30 subsequent full-file runs. The tests now print unexpected response bodies
  to help if it recurs.
- Public shop info (`GET /public/:slug`) still lists active members who are
  not bookable by customers (names only, no contact data); the owner wizard
  relies on it. Consider tightening when the wizard moves to authenticated
  team/service endpoints.
- Two `ts-node-dev --respawn` processes on the owner's machine are the owner's
  own dev servers; don't kill them.
- Phase 1 items to close before deploy (mapped to groups): rate limiting (6),
  validation gaps (7), slug rules (8), ops/env (9), GDPR (10), root routing
  (11), tenant creation + Hairology seed (12), CI (13), runbook (14).

## How to verify the current state

```bash
cd api && npm run lint && npx tsc --noEmit && npm run test:tz   # 177 tests x 3 zones
cd web && npx tsc -b && npm run test:tz && npm run build        # lint has 30 known errors
npm run e2e                                                     # from repo root
```
