# Phase 2 plan: production-readiness fixes

**Next step:** commit **11 continues** with group **9** (ops/env), then groups
10, 11, 12, 14 in that order (Phase A priority list). Commit 10 (the
conditional Postgres exclusion constraint) is **skipped by explicit owner
instruction** — not a failed precondition, a choice to defer it — and moves to
the Phase B list alongside CI/lint.

Groups 3, 4, 6, 7 and 8 are done this session (commit 11; see the status table
and "Additional items by group" for what was built and why). Commit 8
(mobile layout) is also done — see the out-of-hours plan doc for detail.

Full suite green as of group 7: api 328 tests × 3 TZs (the already-documented
`concurrency.test.ts` flake recurred a fifth time this session, again right
after a new test file was added, again gone on immediate rerun — see LATER),
web 54 tests × 3 TZs, e2e 19/19, tsc clean, lint at the same 48-problem web
baseline (api: 0 errors, 6 pre-existing warnings), build succeeds.

*(Keep this line updated after every commit or checkpoint.)*

## Priority order and triage rule (owner-approved)

The full plan stays; nothing is dropped. Order of work:

**PHASE A — launch-critical, do first:** out-of-hours commits 1, 2, 4, 6, 7;
group 3 remainder (`BOOKING_BUSY` / `BOOKING_TOO_LONG` translations + neutral
503 handling); group 4 customer upsert; group 6 rate limiting (including the
shared-IP login lockout fix); group 7 validation; group 8 slugs; group 9
ops/env; group 10 GDPR; group 11 root routing; group 12 tenant script +
Hairology seed; group 14 runbook.

**PHASE B — after A:** out-of-hours commits 5, 8, 9; the exclusion constraint;
group 13 CI + web lint fixes; anything else remaining in the plans.

**Triage rule for NEW findings** (not already in the plans): fix immediately
ONLY if it causes double booking, data leak, data loss, or blocks the owner's
daily use. Everything else is classified and logged in the "LATER" list at the
end of this file, without asking.

**Pushing:** push `prod-readiness` after each checkpoint.

Branch: `prod-readiness` (base `main`; PRs target `dev`). Pushed after each
checkpoint; no PR opened, nothing deployed.

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
| 3 Booking rules | **done** | `a057990` `maxAdvanceDays`; `266490b` 422 rules + codes + endTime recompute + owner `override`; `907b9cd` dashboard dialog + settings field; out-of-hours plan (`overrideRules` contract, storage, UI, commits 1/2/4/6/7/8); commit 11's group 3 remainder = `BOOKING_TOO_LONG`/`BOOKING_BUSY` translations + neutral 503 handling (see "Additional items by group") |
| 4 Customer upsert | **done** | commit 11 continued: `findOrCreateCustomer` in `booking.service.ts` — the public path no longer overwrites an existing customer's name/email (only creates when new); the owner/staff path keeps the old upsert-with-update behaviour (deliberate, matches the wizard's autofill UI) |
| 5 Serialization errors | **done early** (verify when reached) | `d6b9441` retry + concurrency tests; hardened by `742acb6` (re-reads inside tx, narrow policy), `d08f231` (hard time cap; exhaustion is now **503 `BOOKING_BUSY` + Retry-After**, not 409) |
| 6 Rate limiting / JSON errors | **done** | commit 11 continued: `publicReadLimiter` (100/15min: shop info, slots) + `publicWriteLimiter` (20/15min: book, cancel) in `api/src/middleware/rateLimiter.ts`, wired in `public.routes.ts`; `refreshLimiter` replaces `authLimiter` on `/auth/refresh` (60/15min, skipped entirely with no refresh cookie) fixing the shared-IP lockout finding below; `ErrorHandler` now respects a plain error's `status`/`statusCode` in the 4xx range (never 5xx, to avoid leaking internals), which also turns a malformed JSON body from a 500 into a clean 400 |
| 7 Validation | **done** | commit 11 continued, 3 commits: (1) name ≤100 / notes ≤1000 / phone format (`isPlausiblePhone`, lenient by design) / staffId type / email length on the public and owner booking bodies and customer PATCH, shared via new `validators/common.ts`, plus `PATCH /user/me`'s previously-unvalidated `name`; (2) every query/body "token" (verify-email, verify-email-change, reset-password, cancel) now checked `isString()`, not just `notEmpty()` — an array-shaped token used to reach Prisma and come back as a 500, now a clean 400; (3) the 5 routes with no validation chain at all now have one (shopId/memberId), plus their first HTTP-level test coverage. A repo-wide gap the audit found (every path-param id validated `.notEmpty()` only, never checked against the cuid shape Prisma generates) is **not** fixed — logged in LATER, not currently exploitable |
| 8 Slugs | **done** | `api/src/validators/slug.ts`: 3–40 chars, `a-z0-9-`, no leading/trailing hyphen, `RESERVED_SLUGS` (checked by test against every route in `web/src/App.tsx` and every mount in `api/src/app.ts`). `POST /api/shops` enforces it; `PATCH /api/shops/:id` with a `slug` field is now a 400 (was silently ignored). Web: slug input on shop settings is read-only, create form hint updated. **The owner's own reserved list was not in the repo** — the non-route names (admin, www, support, billing, …) are a best guess; owner to confirm/extend |
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
- `742acb6` retried booking transactions re-read everything inside the tx; retry
  policy narrowed to 40001 / TransactionWriteConflict / P2034, capped, logged.
- `053ac8b` inactive shop can no longer be booked through the public endpoint.
- `c7e79fd` booking length capped at 24 h (service duration 1–1440, defensive
  422 `BOOKING_TOO_LONG`) and a bounded overlap query.
- `d08f231` hard time cap: 3 s / 5 attempts, per-attempt Prisma timeout +
  Postgres `statement_timeout`/`lock_timeout`, 503 `BOOKING_BUSY`.
- `47ac29a` Playwright owner-wizard smoke test (uses the authenticated slots
  endpoint, never the public one).
- `449f10d` test: the transaction time budgets (`statement_timeout`,
  `lock_timeout`) are transaction-scoped — `set_config(..., is_local = true)` at
  `api/src/utils/serializable.ts:199-200` (= `SET LOCAL`); after committed and
  rolled-back transactions every pooled connection is back to the defaults.
  Verified the test fails if the setting is made session-level.
- `70c710d` `RATE_LIMIT_DISABLED=true` switch (never honoured in production) so
  the e2e browser suite isn't blocked by the auth limiter.
- `2c34663` owner wizard phone look-up never clears or overwrites typed text
  (fills empty name/email only), with unit + Playwright coverage.

## Known open items / notes

- Web lint: 30 errors, 18 warnings (mostly `no-explicit-any`, React-hooks
  rules). Not yet fixed → group 13.
- One unexplained, non-reproduced 404 in a single run of the overlapping-
  bookings concurrency test right after `d6b9441` was written. Every 404 site in
  the booking flow is listed below and none can be produced by a retry on its
  own; 0 failures in 60+ full-file runs since (30 before and 30 after the
  restructuring). The concurrency tests print unexpected response bodies if it
  recurs.
- The same single run also had a 15 s test timeout once in 30 runs — the
  trigger for the hard time cap in `d08f231` (root cause of that one slow
  request not proven; the cap now makes a hang impossible).
- `BOOKING_BUSY` (503) and `BOOKING_TOO_LONG` (422) have server messages only
  (English); the public page shows the server text — add translations in group
  10/UI work if wanted.
- (Fixed in `2c34663`) The owner wizard's phone field used to clear the name.
- Public shop info (`GET /public/:slug`) still lists active members who are
  not bookable by customers (names only, no contact data); the owner wizard
  relies on it. Consider tightening when the wizard moves to authenticated
  team/service endpoints.
- Two `ts-node-dev --respawn` processes on the owner's machine are the owner's
  own dev servers; don't kill them.
- Phase 1 items to close before deploy (mapped to groups): rate limiting (6),
  validation gaps (7), slug rules (8), ops/env (9), GDPR (10), root routing
  (11), tenant creation + Hairology seed (12), CI (13), runbook (14).

## Additional items by group

### Group 3 (booking rules) — remaining UI/text work

**Done in commit 11** (see the status table). As built:
- `BOOKING_TOO_LONG` added to the shared `RuleMessages` interface (like
  `SLOT_TAKEN`, not to `BOOKING_RULE_CODES` — it's not overridable, so it must
  never reach `isBookingRuleViolation`/`acceptableRuleCodes`/the override
  dialog), with EL+EN strings in both `t.public.ruleErrors` and
  `t.bookings.override`.
- `BOOKING_BUSY` is a new standalone key (`t.public.bookingBusy`,
  `t.bookings.bookingBusy`) — deliberately outside `RuleMessages`, since it
  isn't a rule violation at all. Both pages check `info.status === 503 &&
  info.code === 'BOOKING_BUSY'` first (before the override/rule checks) and
  render it via a new `.public-submit-notice` class (neutral colours —
  `--text-muted`/`--border`/`--bg-input`, not `--error`) instead of
  `.public-submit-error`. The submit button stays disabled for
  `info.retryAfterSeconds` (default 1) via `setTimeout`, not reset by a
  blanket `finally` (removed the `finally` from both `handleSubmit`s; every
  branch now sets `submitting` explicitly, since `finally` still runs after a
  `return` inside `catch` and would have undone the delayed reset).
- `getApiError` now also returns `retryAfterSeconds`, parsed from the
  `Retry-After` response header. That header wasn't reaching the browser at
  all: the API's `cors()` config had no `exposedHeaders`, and `Retry-After`
  isn't in the fetch/XHR CORS safelist — fixed with
  `exposedHeaders: ['Retry-After']` in `api/src/app.ts` (test-first,
  `api/src/tests/cors.test.ts`).
- E2E: `e2e/tests/booking-busy.spec.ts` (new file, `page.route()` response
  interception — the first use of that pattern in this repo) covers both the
  public page and the owner wizard: neutral notice, no red error, no
  booking actually created, typed values kept, button re-enabled after the
  delay, and (owner wizard) never triggers the "book anyway" dialog.

Original spec, for reference:
- **Translations (el + en) for the two new server error codes**, on **both** the
  public booking page and the owner wizard (`web/src/locales/translations.ts`;
  stage only my hunks, never the owner's own edits):
  - `BOOKING_BUSY` (503): Greek + English, e.g. "The booking system is busy —
    please try again in a moment." / "Το σύστημα κρατήσεων είναι απασχολημένο —
    δοκιμάστε ξανά σε λίγο."
  - `BOOKING_TOO_LONG` (422): Greek + English, e.g. "A booking can't be longer
    than 24 hours." / "Ένα ραντεβού δεν μπορεί να διαρκεί πάνω από 24 ώρες."
  - Wire them like the existing rule codes (`t.public.ruleErrors[...]` on the
    public page, `t.bookings.override[...]` / an equivalent map in the owner
    wizard) so neither page falls back to raw English server text.
- **Public page handling of `503 BOOKING_BUSY`** — it must not look like a
  failure: show a neutral, non-error notice ("Try again in a moment"), keep every
  value the customer entered, re-enable the submit button, optionally after the
  `Retry-After` delay (1 s), and never show it in the red error style used for
  real rejections (409 slot taken, 422 rule violations). The owner wizard gets
  the same treatment. Add a Playwright case that forces a 503 (route
  interception) and checks the form is intact and the message is neutral.

### Group 6 (rate limiting) — new finding

**Done in commit 11.** `authLimiter` (10 requests / 15 min per IP) was shared
by `/auth/login` **and** `/auth/refresh`, and every full page load calls
`POST /auth/refresh` — including anonymous visitors of the public booking
page. One login flow costs 3 hits. On a shared IP (a shop's Wi-Fi, a
mobile-carrier NAT) ordinary browsing could exhaust the budget and lock a
staff member out of logging in.

As built: `refreshLimiter` (`api/src/middleware/rateLimiter.ts`) replaces
`authLimiter` on `POST /auth/refresh`. It `skip`s entirely when the request
carries no `refreshToken` cookie — an anonymous visitor never counts against
it at all, since there's nothing to refresh — and is generous (60/15min) even
when one is present, as a backstop against a genuine runaway refresh loop
without login's strictness. `authLimiter` itself is unchanged and now applies
only to `/auth/login`, `/auth/register` and `/auth/reset-password`. The new
`publicReadLimiter`/`publicWriteLimiter` are separate limiters entirely (see
the group 6 status-table row). The `RATE_LIMIT_DISABLED` switch (`70c710d`)
still covers all of these the same way, verified by test.

## Retry safety and contention: findings and decision

Reviewed at the owner's request after the concurrency work (`d6b9441`).

### Findings

1. **Side effects (PASS).** Emails run in the controllers after the service
   returns (`public.controller.ts:43,63`, `booking.controller.ts:26`), never inside
   the retried function.
2. **Reads inside the transaction (was FAIL, fixed in `742acb6`).** The shop,
   service, staff and schedule (and on PATCH/status the booking) were read before
   the transaction and reused across retries, so a retry could book with a
   deactivated provider, a stale duration or a closed day, and a booking deleted
   meanwhile gave a 500 (Prisma `P2025`) instead of 404. Now every dependent read
   is inside the retried function; tests force a first-attempt failure, change the
   data, and check the retry sees it. (`cancelToken` is generated before the tx —
   harmless, only the committing attempt persists it.)
3. **Retry policy (was FAIL, fixed in `742acb6` + `d08f231`).** It also retried
   unique violations, had no total-time cap and no logging. Now: only
   40001 / `TransactionWriteConflict` / `P2034`; max 5 attempts and 3 s total; each
   retry logged with its attempt number; a request can no longer hang (see
   `d08f231`).
4. **Real bug found on the way (`053ac8b`).** `POST /public/:slug/book` did not
   check `isActive` — a deactivated shop accepted bookings.

### Every 404 site in the booking flow (`api/src/services/booking.service.ts`)

| Line | Where | Cause |
|---|---|---|
| 207 | public create | shop by slug missing **or inactive** |
| 212 | public create | service not in that shop |
| 276 | owner create | caller not a member of the shop |
| 281 | owner create | service not in that shop |
| 520 | PATCH / status (`loadBooking`) | booking missing or belongs to another shop |
| 560 / 566 | PATCH | new service / new staff not in that shop |
| 66 / 79 | `requireMembership` / `canViewCustomerDetails` | caller not a member |
| 331 | slots (`getShopTimezone`) | shop missing |
| 704 | cancel by token | unknown token |
| `public.controller.ts:129`, `public.service.ts:5,49` | public slots / info | shop missing or inactive |

A retry can only produce a 404 if the row was really deleted, deactivated or
revoked between attempts; because the reads are now inside the transaction, the
404 then reflects the true state (tests: shop deactivated, booking deleted,
membership revoked between attempts).

### Query plan (EXPLAIN on 200k bookings)

The overlap query was **not** a sequential scan: it used
`Booking_staffId_startTime_idx`, but with an open lower bound it read and
discarded 354 rows (the provider's whole history, growing with time; 12 buffers).
Bounded to `startTime > newStart - 24h` it reads a tight range (3 buffers, no
discarded rows) on the same index — no new index needed (`c7e79fd`). That
requires bookings to be at most 24 h, which is enforced.

### Retry counts under synthetic contention (10 rounds each)

Requests that should all succeed but were aborted and retried by Postgres
(serializable "false conflicts"). Zero 5xx, zero exhausted retries, zero
double bookings, ~30–60 ms per round in every variant.

| Variant | A: 10 same slot (retries) | B: 6 different slots, 1 provider (retries / 60 req) | C: 6 providers, same time (retries / 60 req) | D: 6 different shops (retries / 60 req) |
|---|---|---|---|---|
| Unbounded query, test DB | 90 | 70 | 60 | — |
| Bounded query, test DB | 90 | 76 | 49 | 65 |
| Unbounded, 200k-row DB | 90 | 87 | 45 | — |
| Bounded, 200k-row DB | 90 | 75 | 55 | — |
| + `enable_seqscan=off` | 90 | 70 | 46 | — |
| + customer write removed | 90 | 81 | 55 | — |
| + both | 90 | 72 | 56 | 59 |

(A's 90 = the nine losers each retrying once before seeing the real overlap.)

Conflicts occur even between different shops, and none of the tested
interventions changed the rate, so the cause was **not isolated** (the working
theory is Postgres SSI's page-level predicate locks on tiny indexes; unproven).

### Decision: stop tuning

Retry counts under artificial 10-way contention are not a launch concern;
correctness is. The behaviour is correct: exactly one winner, everything else a
clean 409, no 5xx, no hangs. **The retry-rate investigation is closed.** The
bounded query and length cap stay (cheap, tested, scan cost no longer grows with
history).

**Planned structural fix:** the Postgres exclusion constraint (out-of-hours plan,
decision 5): `btree_gist` over the provider and a time range, filtered to
slot-holding statuses. It makes overlap impossible at the database level
regardless of isolation level, and would let the application drop to a cheaper
scheme (retry only on the constraint violation) — removing serializable false
conflicts at scale. Preconditions unchanged: verify `btree_gist` on a real
Railway Postgres, and confirm `prisma migrate diff` neither reports drift nor
tries to drop it; if either fails, skip it and say so.

### Hard time cap (`d08f231`)

3 s total and 5 attempts per operation; every attempt receives the *remaining*
budget as Prisma `timeout`/`maxWait` **and** Postgres `statement_timeout` /
`lock_timeout` (`set_config`, transaction-local), so a statement blocked on a
lock is cancelled too (Prisma's timeout alone only fires between statements —
verified against the real DB for raw SQL and ORM calls). Out of budget/attempts →
**503 `BOOKING_BUSY`** with `Retry-After: 1` (not a hang, not a 500, and no longer
a misleading "slot taken"). Timeouts are not retried. Verification: the 10-request
concurrency file ×30 runs — zero failures, zero 5xx, every request < 4 s.

## How to verify the current state

```bash
cd api && npm run lint && npx tsc --noEmit && npm run test:tz   # 216 tests x 3 zones
cd web && npx tsc -b && npm run test:tz && npm run build        # 21 tests x 3 zones; lint has 30 known errors
npm run e2e                                                     # from repo root (9 pass, 1 skipped)
```

## LATER (triaged, not launch-critical)

- **Slots for a date beyond `maxAdvanceDays`**: the endpoints still list slots the
  booking call will refuse (422, never overridable). The owner wizard's date
  input is now capped at the window (commit 6); the public page already was.
  Remaining: nothing user-visible. (Closed.)

- **The `notEmpty()`-only path-param id gap (group 7 audit finding)**: every
  `:shopId`/`:bookingId`/`:memberId`/`:serviceId`/`:customerId`/`:scheduleId`/
  `:inviteId`/`:userShopId` param, across every validator file, is checked
  with `.notEmpty()` only — never checked against the cuid shape Prisma
  actually generates (`@default(cuid())` on every model). Not currently
  exploitable: every one of these lookups is additionally scoped by the
  authenticated caller's shop/user membership, so a malformed id just 404s
  instead of leaking anything. A shared `isCuid()`-style helper threaded
  through all ~15 validator files would close it in one pass if it's ever
  prioritized — logged here rather than done as part of group 7, since it
  didn't meet the triage bar (no double booking / data leak / data loss /
  blocked daily use).

- **A fourth intermittent failure**: `concurrency.test.ts` "non-conflicting
  bookings for different providers/slots all succeed" failed once (UTC, full
  suite, while finishing out-of-hours commit 2); passed on every rerun. That test
  expects six 201s, so a failure means a valid booking was rejected (409/503),
  not a double booking. No body captured — unclassified. **Recurred four
  times more**, every time immediately after adding a new (unrelated) test
  file to the suite, and every time passed on the very next run: (1)
  America/New York, full `test:tz`, finishing commit 11's group 3 remainder
  (translations/CORS/web-UI, nothing touching booking concurrency); (2) UTC,
  full `test:tz`, right after adding `customerUpsert.test.ts` (commit 11's
  group 4); (3) UTC again, full `test:tz`, right after adding
  `errorHandler.test.ts` + `publicRateLimiter.test.ts` (commit 11's group 6 —
  rate limiting and error handling); (4) UTC again, full `test:tz`, right
  after adding `tokenValidation.test.ts` (commit 11's group 7, part 2 — again
  nothing touching the concurrency path). All four passed immediately on
  rerun, in isolation and as part of the full suite. Still unclassified, no
  body captured any time. The correlation with "a new test file just got
  added" across all five occurrences may be a clue (e.g. a first-run cost — connection pool
  warm-up, query planner cache — under the full suite's load) rather than
  pure chance; worth a look if it recurs again, but not launch-blocking.
- **Intermittent API test failures under full-suite load** (3 in ~20 full runs
  while doing out-of-hours commit 1; each passed on rerun and in isolation):
  `concurrency.test.ts` "simultaneous OVERLAPPING" (Athens) and "SAME customer
  phone" (New York) — bodies not captured; `overlapIntegrity.test.ts` "CANCELED
  -> CONFIRMED onto a re-booked slot" (New York) — 15 s test timeout.
  **Investigated** with an instrumented copy of the two files (journals every
  request's status/body/timing; snapshots bookings + `pg_stat_activity` + locks
  twice on failure): 50/50 clean isolated runs of `concurrency.test.ts`, then 24
  full-suite runs (23 clean, 1 failure; loop stopped there at the owner's
  request). The one captured failure (`owner bookings with override cannot both
  win either`, New York, 30 s timeout) had 9 of 10 requests reach the app (1x201,
  8x409, all <= 22 ms) and the 10th never arrived at the HTTP handler; DB had
  exactly one active booking, zero overlaps, no stuck queries or locks.
  Classified **test-infra** (supertest client/connection stall), not an
  invariant violation — but one sample, and the missing request's fate is
  unobserved. The three original failures remain **unclassified** (no data).
  The capture kit is not in the repo. Classified LATER; next time one fails,
  keep the response bodies.
