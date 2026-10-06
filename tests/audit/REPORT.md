# Security and correctness audit

Branch `dev` @ `4868d53`, audited 2026-10-06. Audit only: no source file was changed; everything created is under `tests/audit/`.

Four auditors worked in parallel (tenant isolation, auth and authorization, public booking flow, validation and error handling). Their findings are merged here, duplicates folded together, sorted by severity. Route-by-route coverage tables are in [COVERAGE.md](COVERAGE.md); the repo map is in [REPO_MAP.md](REPO_MAP.md).

Paths are relative to the repo root unless they start with `svc/` (= `api/src/services/`).

## Headline

- **34 distinct findings, all CONFIRMED by a failing test:** 2 Critical, 1 High, 6 Medium, 25 Low. No finding is UNCONFIRMED.
- **The Critical pair is one root cause:** the service create and update routes hand the request body to Prisma. Any registered user who creates their own shop can make themselves a manager of any other shop and read its customers.
- **No double booking was found.** 10 parallel POSTs for one slot gave exactly one 201 and nine 409 in every round.
- **No route is missing authentication**, and no token-forgery path was found.

## Fix status (updated 2026-10-06)

Fixes are on six stacked local branches, `fix/audit-baseline` through `fix/audit-token-hardening` (the last one contains everything). Nothing is pushed. The rest of this report describes the code as audited, before the fixes.

Audit suite after the fixes: **148 tests, all pass.** Existing API suite: 1199 pass. The audit suite now runs in CI (`npm run test:audit` from `api/`).

| Status | Findings |
|---|---|
| Fixed | TI-01, TI-02, TI-03, TI-04, AU-01, AU-02, AU-03, AU-04, AU-05, AU-07, AU-08, AU-09, AU-10, PB-01, PB-03, PB-04, PB-05, PB-06, PB-07, PB-08, PB-09, PB-11, PB-12, VE-02 to VE-09 |
| Accepted by design | PB-02 (no per-phone booking cap), TI-05 / PB-10 (personal durations on the public grid), AU-06 (15-minute access-token window). Documented in `docs/deployment.md`, "Known limits"; their tests now assert the accepted behaviour. |

Audit tests edited while fixing, and why:

- PB-02, TI-05, PB-10, AU-06: rewritten to assert the accepted behaviour.
- AU-02 (third test), AU-07 (email-change test): their setup now sends the current password, which the AU-02 fix requires.
- All auth audit tests: tokens are taken from the emailed link, because the AU-07 fix stores only hashes, and accounts are verified with the sign-up password (AU-03 fix).
- `validation/platform.negative.test.ts`: a wrong-typed field is now a generic 400, not a generic 500 (VE-02 fix).

Behaviour changes worth knowing before release:

- Changing password or email in account settings asks for the current password.
- Opening the email verification link now asks for the password chosen at sign-up (AU-03): the link alone no longer creates the account. The endpoint is `POST /auth/verify-email` with `{ token, password }`.
- Signing up with an address that already has an account answers "check your email" and sends that account a notice, instead of a 409.
- Customers can only book a staff member for a service assigned to that member.
- Booking start times must carry a UTC offset or `Z`.
- Customer phones are stored without spaces or punctuation.
- Login also counts failed attempts per email (10 per 15 minutes).
- In production the API refuses to start if a JWT secret is under 32 characters or the two are equal.
- Three migrations: `normalize_customer_phone`, `booking_contact_email`, `hash_stored_tokens`.

## Summary

| ID | Severity | Status | Area | Description |
|---|---|---|---|---|
| TI-01 | Critical | CONFIRMED | Tenant isolation | `POST /api/shops/:shopId/services` spreads the body into Prisma: plants a service in another shop; a nested write makes the caller a manager of any shop |
| TI-02 | Critical | CONFIRMED | Tenant isolation | `PATCH /api/shops/:shopId/services/:serviceId` passes the body to Prisma as-is: same takeover, moves services across shops, rewrites the parent shop row |
| TI-03 | High | CONFIRMED | Tenant isolation | `DELETE …/services/:serviceId/staff/:userShopId` checks neither id against the shop: deletes another shop's staff-service assignments |
| AU-01 | Medium | CONFIRMED | Auth | Booking responses give every member the customer's `cancelToken`; restricted staff replay it on `/public/*` to unmask the customer and reschedule or cancel |
| AU-02 | Medium | CONFIRMED | Auth | `PATCH /user/me` changes password and starts an email change with no current password; a pending email change survives a password reset |
| AU-03 | Medium | CONFIRMED | Auth | Anyone can overwrite a pending registration including its password; the mailbox owner's click activates the attacker's password |
| PB-01 | Medium | CONFIRMED | Public booking | An explicitly chosen staff member need not perform the service (book, slots, reschedule) |
| PB-02 | Medium | CONFIRMED | Public booking | No cap on slots one anonymous customer holds: 20 requests fill a provider's day, all auto-confirmed |
| VE-07 | Medium | CONFIRMED | Validation | Working hours accept `99:99`, end before start, and a repeated day (500) |
| TI-04 | Low | CONFIRMED | Tenant isolation | `GET /public/:slug` names internal-only and deactivated services and lists members customers cannot book |
| TI-05 | Low | CONFIRMED | Tenant isolation | Public slots with `X-Customer-Phone` reveal whether a phone is a customer with a custom duration |
| AU-04 | Low | CONFIRMED | Auth | `POST /auth/register` answers 409 "Email already in use" |
| AU-05 | Low | CONFIRMED | Auth | Login skips bcrypt for unknown emails; the timing gap reveals whether an account exists |
| AU-06 | Low | CONFIRMED | Auth | Access tokens stay valid (up to 15 min) after password reset and "log out everywhere" |
| AU-07 | Low | CONFIRMED | Auth | Reset, email-verification, email-change and refresh tokens are stored in plaintext |
| AU-08 | Low | CONFIRMED | Auth | No strength or distinctness check on JWT secrets; tokens carry no type claim |
| AU-09 | Low | CONFIRMED | Auth | Login throttling is per IP only (documented as deliberate) |
| AU-10 | Low | CONFIRMED | Auth | `POST /auth/logout` is cookie-only, `SameSite=None` in production, no Origin check |
| PB-03 | Low | CONFIRMED | Public booking | "Any staff" picks the provider before taking the lock: false 409 while other providers are free |
| PB-04 | Low | CONFIRMED | Public booking | Cancel link is a non-atomic check-then-write: duplicate cancels succeed; cancel racing reschedule says "cancelled" while the moved booking stays active |
| PB-05 | Low | CONFIRMED | Public booking | `startTime` without a UTC offset is accepted and read in the server process timezone |
| PB-06 | Low | CONFIRMED | Public booking | ISO strings the validator accepts but the code cannot parse give a 500 |
| PB-07 | Low | CONFIRMED | Public booking | Public slots list past times, past dates and dates beyond `maxAdvanceDays` as available |
| PB-08 | Low | CONFIRMED | Public booking | A locked shop refuses new public bookings but still accepts token reschedules |
| PB-09 | Low | CONFIRMED | Public booking | Customer key is the raw phone string: the same number typed differently creates a second customer |
| PB-11 | Low | CONFIRMED | Public booking | A returning customer with no email on file gets no confirmation or cancel link for the email they typed |
| PB-12 | Low | CONFIRMED | Public booking | "Any staff" on a taken slot answers 422 SHOP_CLOSED instead of 409 when a teammate is off that day |
| VE-02 | Low | CONFIRMED | Validation | Validators check format, not JSON type: arrays, string booleans and string ints reach bcrypt/Prisma and return 500, including on unauthenticated routes |
| VE-03 | Low | CONFIRMED | Validation | A NUL character in any string returns 500, including on public routes |
| VE-04 | Low | CONFIRMED | Validation | No length cap on shop, service and team-member strings; no max on service `price` |
| VE-05 | Low | CONFIRMED | Validation | `page` has no upper bound; a huge value returns 500 |
| VE-06 | Low | CONFIRMED | Validation | `sendEmail: "false"` passes validation and the invite is still sent |
| VE-08 | Low | CONFIRMED | Validation | The 2 MB import body parser runs before authentication |
| VE-09 | Low | CONFIRMED | Validation | The unhandled-error log includes Prisma query arguments (password hash, email, name) |

### Duplicates folded

| Reported as | Folded into | Why |
|---|---|---|
| VE-01 (Critical, validation) | TI-01 / TI-02 | Same lines (`svc/service.service.ts:39`, `:94`). VE-01 added two facets, kept under TI-02: the nested write to the parent `Shop` row and overwriting `createdAt`. Its 4 tests stay in `validation/ve01-service-mass-assignment.test.ts`. |
| PB-10 (Low, public booking) | TI-05 | Same oracle (`X-Customer-Phone` on public slots). Both tests kept. |

Related but kept separate: PB-06 (unparseable ISO strings, 500) and VE-02 (wrong JSON types, 500) have different root causes. PB-09 (phone not normalised) weakens any per-phone cap proposed for PB-02.

## Test run

Run from `api/`:

```
TEST_DATABASE_URL=postgresql://nicktheodosis@localhost:5432/booking_app_test_audit_a npx vitest run --dir ../tests/audit
```

Result of the full suite, one run: **28 files, 148 tests: 84 failed, 64 passed.** Every failing test is a finding test asserting the secure or correct behaviour; every passing test is a true negative, the required concurrency test, or the harness smoke test.

| File | Failed | Passed | Findings |
|---|---|---|---|
| `tenant-isolation/serviceMassAssignment.test.ts` | 6 | 0 | TI-01a/b, TI-02a/b/c/d |
| `tenant-isolation/unassignStaff.test.ts` | 1 | 0 | TI-03 |
| `tenant-isolation/publicExposure.test.ts` | 4 | 0 | TI-04a/b/c, TI-05 |
| `tenant-isolation/isolation.negative.test.ts` | 0 | 8 | true negatives |
| `auth/au01-cancelTokenLeak.test.ts` | 5 | 0 | AU-01 |
| `auth/au02-accountChangeNoReauth.test.ts` | 3 | 0 | AU-02 |
| `auth/au03-pendingRegistrationTakeover.test.ts` | 2 | 0 | AU-03 |
| `auth/au04-userEnumeration.test.ts` | 2 | 0 | AU-04, AU-05 |
| `auth/au06-staleAccessToken.test.ts` | 2 | 0 | AU-06 |
| `auth/au07-tokensAtRest.test.ts` | 4 | 0 | AU-07 |
| `auth/au08-jwtSecretPolicy.test.ts` | 3 | 0 | AU-08 |
| `auth/au09-loginThrottle.test.ts` | 1 | 0 | AU-09 |
| `auth/au10-logoutCsrf.test.ts` | 1 | 0 | AU-10 |
| `auth/authCoverage.negative.test.ts` | 0 | 8 | true negatives |
| `public-booking/findings.test.ts` | 23 | 0 | PB-01a-d, PB-02, PB-03, PB-04a/b, PB-05a/b, PB-06a(x3)/b/c, PB-07a/b/c, PB-08, PB-09, PB-10, PB-11, PB-12 |
| `public-booking/concurrency.test.ts` | 0 | 6 | required concurrency test |
| `public-booking/boundaries.negative.test.ts` | 0 | 33 | true negatives |
| `validation/ve01-service-mass-assignment.test.ts` | 4 | 0 | VE-01 (= TI-01/02) |
| `validation/ve02-type-confusion.test.ts` | 9 | 0 | VE-02 |
| `validation/ve03-nul-byte.test.ts` | 2 | 0 | VE-03 |
| `validation/ve04-length-caps.test.ts` | 4 | 0 | VE-04 |
| `validation/ve05-pagination.test.ts` | 2 | 0 | VE-05 |
| `validation/ve06-send-email-flag.test.ts` | 1 | 0 | VE-06 |
| `validation/ve07-working-hours.test.ts` | 3 | 0 | VE-07 |
| `validation/ve08-import-body-before-auth.test.ts` | 1 | 0 | VE-08 |
| `validation/ve09-log-leak.test.ts` | 1 | 0 | VE-09 |
| `validation/platform.negative.test.ts` | 0 | 8 | true negatives |
| `smoke.test.ts` | 0 | 1 | harness |

Timing-dependent tests, which could in principle pass on another machine or run: AU-05 (login timing, threshold 50 ms, measured 188-238 ms), PB-03 (random tie-break; 3 rounds) and PB-04b (60 staggered attempts). All three failed in every run made.

Not run: the existing `api/src/tests` suite, and nothing was checked against the live deployment (real secrets, proxy hop count, cookie flags).

---

## Tenant isolation

Attacker model: an authenticated owner or manager of shop A acting against shop B (anyone can register and create a shop), or an anonymous caller on `/public`. The ids needed are public: anonymous `GET /public/:slug` returns the shop `id`, every active member `id` and each member's service ids (`svc/public.service.ts:96-115`, `:135-141`).

### TI-01 — Critical — CONFIRMED — service create spreads the request body into Prisma
- **Where:** `api/src/controllers/service.controller.ts:13-17` passes `req.body` whole; `svc/service.service.ts:38-40` does `prisma.service.create({ data: { shopId, ...dto } })`. `api/src/validators/service.validator.ts:7-29` checks the known fields only and `api/src/middleware/validate.ts:5-11` strips nothing.
- **What's wrong:** `...dto` comes after `shopId`, so a body `shopId` overrides the access-checked one, and any relation field in the body runs as a nested write. The access check (`service.service.ts:36`) covers only the caller's own shop.
- **Exploit (a):** as A's owner, `POST /api/shops/<A>/services` with `{"name":"Planted","duration":30,"price":0,"shopId":"<B>"}`. The service is created in shop B and shows on B's public page.
- **Exploit (b), takeover:** same route with `{"name":"x","duration":30,"price":0,"staffServices":{"create":[{"userShop":{"create":{"userId":"<attacker user id>","shopId":"<B>","role":"manager","name":"x","canManageManagers":true,"canEditShopSettings":true}}}]}}`. This creates an active manager membership for the attacker in shop B, which `requireShopAccess` (`api/src/utils/shopAccess.ts:34-36`) accepts. The test then reads B's customers from `GET /api/shops/<B>/customers/export-all` with the attacker's ordinary token.
- **Tests:** `tenant-isolation/serviceMassAssignment.test.ts` TI-01a (`expected [ { …(10) } ] to deeply equal []`), TI-01b (`expected '{"status":"success","data":[{"name":"…' not to contain '6911111111'`); `validation/ve01-service-mass-assignment.test.ts` (`expected 1 to be +0`).
- **Suggested fix:** never pass the body to Prisma. Pick the allowed scalars explicitly (name, description, duration, price, isActive, showOnPublicPage), as `svc/product.service.ts:24-32` and `svc/shop.service.ts:47-85` already do. Optionally reject unknown body keys in `validate`.

### TI-02 — Critical — CONFIRMED — service update passes the request body to Prisma as-is
- **Where:** `api/src/controllers/service.controller.ts:66-71`; `svc/service.service.ts:92-95` does `prisma.service.update({ where: { id: serviceId }, data: dto })`. The check at `:87-90` covers the row being updated, not what the body writes.
- **Exploit** (as A's owner or manager, on A's own service, `PATCH /api/shops/<A>/services/<id>`):
  - (a) `{"shopId":"<B>"}` moves the service into shop B.
  - (b) `{"staffServices":{"create":[{"userShop":{"create":{"userId":"<attacker>","shopId":"<B>","role":"manager","name":"x"}}}]}}` gives the same takeover as TI-01b.
  - (c) `{"bookings":{"connect":[{"id":"<B booking id>"}]}}` re-points B's booking at A's service (needs a booking id, which is not public).
  - (d) `{"name":"<text>","staffServices":{"create":[{"userShopId":"<B member id>"}]}}` attaches A's service to B's staff; its name then shows on B's public page (`svc/public.service.ts:107-113`).
  - (e) `{"shop":{"update":{"name":"..."}}}` edits the parent shop row, bypassing `updateShop`'s whitelist and owner checks. Plan and subscription columns sit on the same row, so a manager could presumably also unlock a locked shop this way; only the `name` write was tested.
  - (f) `{"createdAt":"2001-01-01T00:00:00.000Z"}` overwrites a server-managed column.
- **Tests:** `tenant-isolation/serviceMassAssignment.test.ts` TI-02a (`expected '<B shop id>' to be '<A shop id>'`), TI-02b (`expected { …(16) } to be null`), TI-02c, TI-02d; `validation/ve01-service-mass-assignment.test.ts` (`expected 'changed-through-service' to be 'Aa'`, `expected '2001-01-01T00:00:00.000Z' to be '2026-12-01T09:00:00.000Z'`).
- **Suggested fix:** the same whitelist as TI-01; one shared pick function closes both.

### TI-03 — High — CONFIRMED — unassign-staff deletes another shop's assignment
- **Where:** `svc/service.service.ts:160-175`. After the access check on the caller's own shop (`:166`), the row is found by `{ userShopId, serviceId }` alone (`:168-170`) and deleted by id (`:173`). `assignStaffToService` (`:140-150`) checks both ids; this does not.
- **Exploit:** read `members[].id` and `members[].staffServices[].service.id` from `GET /public/<B slug>`, then as A's owner or manager `DELETE /api/shops/<A>/services/<B serviceId>/staff/<B memberId>` returns 200. B's customers can no longer book that service through "any staff" with that member (`svc/booking.service.ts:122-131`).
- **Why the existing suite misses it:** `api/src/tests/crossShopIds.test.ts:27-53,152-161` swaps one id at a time, so no such pair exists and it 404s. With both ids from B the pair exists.
- **Test:** `tenant-isolation/unassignStaff.test.ts` (`expected +0 to be 1`).
- **Suggested fix:** require `service: { shopId }` and `userShop: { shopId }` in the lookup and 404 otherwise.

### TI-04 — Low — CONFIRMED — `GET /public/:slug` over-exposes within the shop
- **Where:** `svc/public.service.ts:83-95` filters `shop.services` by `isActive` / `showOnPublicPage`, but `members[].staffServices` (`:107-113`) has no filter. `:96-106` selects every active member whatever `bookableByCustomers` says, with `role`, `createdAt`, `shopId`, `bookableInternally`.
- **What's wrong:** `api/prisma/schema.prisma:223-225` says an internal-only service is never shown on the public page, yet its id and name are in the anonymous response. Members customers cannot book are listed by name and role.
- **Exploit:** `GET /public/<slug>` with no token.
- **Tests:** `tenant-isolation/publicExposure.test.ts` TI-04a/b/c (`not to contain 'InternalOnlyTreatment'` / `'RetiredSecretService'` / `'Backoffice Accountant'`). Existing `api/src/tests/internalService.test.ts:74-80` checks only `data.services`.
- **Suggested fix:** in the public context filter `staffServices` like `services`, list only `bookableByCustomers` members, and select only id, name and photoUrl.
- **By reading only, not tested:** the payload is the whole `Shop` row minus plan and photo-original columns (`:135-141`), so it also carries `isActive`, `createdAt`, `updatedAt`, `reminderEnabled`, `reminderHoursBefore`, and exact product `stock` (`:72-80`).

### TI-05 — Low — CONFIRMED — public slots reveal whether a phone is a known customer (also reported as PB-10)
- **Where:** `api/src/controllers/public.controller.ts:287,302-318` passes `X-Customer-Phone` to `getAvailableSlots`; `svc/booking.service.ts:912-923` sizes the grid via `svc/customerDuration.service.ts:21-31`. The same signal is in `endTime` and `services[].duration` of the `POST /public/:slug/book` response (`public.controller.ts:55-67`).
- **What's wrong:** the comment at `public.controller.ts:305-306` says whether the phone is known is never revealed, but the slot list differs for a customer with a custom duration.
- **Exploit:** call `GET /public/<slug>/slots?...` once with the candidate phone and once with a random one, and compare. Production rate limit is 100 per 15 minutes per IP.
- **Tests:** `tenant-isolation/publicExposure.test.ts` TI-05; `public-booking/findings.test.ts` PB-10 (`expected [ …(5) ] to deeply equal [ …(8) ]`).
- **Suggested fix:** a product trade-off. Accept it and correct the comment, honour the phone only alongside the customer's booking token, or offer the standard grid publicly and apply the custom duration at booking time.

### True negatives
- Every id-addressed booking, customer, product, schedule, time-off and member route verifies the row's `shopId` before any write. `isolation.negative.test.ts` (8 passing) probes combinations the existing suite lacks: foreign `serviceId` in customer durations, foreign merge source, foreign `staffId` in the time-off body and list filter, foreign `staffId` booking filter, foreign booking+line pair, foreign `customerId` / `forBookingId` on owner slots, foreign product on public booking, foreign staff on public reschedule.
- Bodies are picked field by field everywhere except the two service routes.
- Public booking, cancel and reschedule responses are fixed projections with no cancel token or staff email (`public.controller.ts:55-77,123-130,161-209,226-234`). `supplierUrl` is never selected for the public page.

---

## Auth and authorization

### AU-01 — Medium — CONFIRMED — customer `cancelToken` returned to every shop member
- **Where:** `svc/booking.service.ts:1085-1100` (`listBookings` uses `include`, so every `Booking` column goes out; only `customer` is redacted), `:1171-1198` (`getBooking`), `:1135-1160` (stats), `:1496-1510` (status update); `svc/overview.service.ts:325-348` (`getMyUpcoming`); `api/src/controllers/booking.controller.ts:28-35`, `:172-176`. The risk is already acknowledged at `svc/customer.service.ts:89-91`.
- **What's wrong:** the token is the sole credential for the unauthenticated customer endpoints (`api/src/controllers/public.controller.ts:150-151`). Leaking it defeats two in-shop controls: redaction for staff with `canViewCustomerDetails=false` (`api/src/utils/customerVisibility.ts:13-19`), because `/public/booking` and `/public/cancel` return `customerName`; and manager-only reschedule (`booking.service.ts:1336-1341`), because `/public/reschedule` moves the booking for any token holder. Staff can also cancel "as the customer" with no actor trail.
- **Exploit:** `GET /api/shops/<shopId>/bookings` as restricted staff returns `customer.name == ""` but `cancelToken` in clear. `POST /public/booking {"token":...}` returns the real name. `POST /public/reschedule {"token":...,"startTime":...}` moves the booking.
- **Test:** `auth/au01-cancelTokenLeak.test.ts`, 5 fail (`expected '7b0f6a52-…' to be undefined`, `expected 'Secret Sophia' not to be 'Secret Sophia'`, `expected { …(17) } to be null`).
- **Suggested fix:** never serialise `cancelToken` to authenticated callers. Use a shared `select` / `omit` (a client-level Prisma `omit` covers all call sites) and load it only where the confirmation email is built.

### AU-02 — Medium — CONFIRMED — password and email change with only an access token
- **Where:** `api/src/routes/user.routes.ts:13`; `api/src/validators/userValidation.ts:3-25` (no current-password field); `api/src/controllers/user.controller.ts:35-40`; `svc/auth.service.ts:378-381` (new hash written), `:386-409` (email change queued, link sent to the new address only), `:531-566` (`resetPassword` does not delete `PendingEmailChange`), `:441-465` (`verifyEmailChange` applies it). Contrast `deleteUser` at `:471-478`, which does require the password.
- **What's wrong:** a stolen 15-minute access token is enough to take the account, and every shop it owns, permanently. Nothing is sent to the old address. A queued email change stays valid for 24 h and outlives the victim's own password reset.
- **Exploit:** `PATCH /user/me {"password":"Attacker-Pass-2!"}` returns 200. Or `PATCH /user/me {"email":"attacker@evil"}`; the victim resets their password; the attacker then opens `GET /auth/verify-email-change?token=...` (200) and uses forgot-password on the new address.
- **Test:** `auth/au02-accountChangeNoReauth.test.ts`, 3 fail (`expected 200 not to be 200` twice, `expected 200 to be 400`).
- **Suggested fix:** require a bcrypt-verified `currentPassword` for `password` and `email`; delete `PendingEmailChange` on reset and on password change; notify the old address.

### AU-03 — Medium — CONFIRMED — pending registration can be overwritten by anyone
- **Where:** `svc/auth.service.ts:33-38` (existing pending row deleted), `:40-54` (replaced with the caller's password hash), `:295-325` (`verifyEmail` creates the user from the current row, no password or session binding); `svc/invite.service.ts:60` (invites accepted purely by matching account email).
- **What's wrong:** the last unauthenticated submitter picks the password; the mailbox owner merely activates it. Verification returns no session, so the victim does not notice.
- **Exploit:** an owner invites `victim@x.gr` as manager (or the victim is mid-signup). The attacker sends `POST /auth/register` with the victim's email and their own password. The victim clicks the verification email. The attacker logs in (200), then `GET /api/invites` and `POST /api/invites/<id>/accept`: the attacker is a manager. Precondition: the victim clicks a verification email from this product.
- **Test:** `auth/au03-pendingRegistrationTakeover.test.ts`, 2 fail (`expected 200 to be 401`, `expected true to be false`).
- **Suggested fix:** collect the password at the verification step (or require it again there), and do not replace an unexpired pending registration; re-send its email instead.

### AU-04 — Low — CONFIRMED — registration enumerates accounts
- **Where:** `svc/auth.service.ts:27-31`; same message at `:83-88` and at `:387-392` (`PATCH /user/me`, which has no limiter at `api/src/routes/user.routes.ts:13` and emails the probed address on a miss).
- **Exploit:** `POST /auth/register` with a candidate email returns 409 if registered, 201 otherwise. Bounded by `authLimiter` (10 per 15 min per IP) on register only.
- **Test:** `auth/au04-userEnumeration.test.ts` AU-04.
- **Suggested fix:** always answer 201 with the generic message and mail "you already have an account"; rate-limit email changes.

### AU-05 — Low — CONFIRMED — login timing enumerates accounts
- **Where:** `svc/auth.service.ts:160-168` returns before any hashing; `:170` runs bcrypt at cost 12. `forgotPassword` awaits the mail send only for existing users (`:329-346`).
- **Exploit:** time `POST /auth/login`; a response in a few ms means no account. Limited to 10 probes per 15 min per IP.
- **Test:** `auth/au04-userEnumeration.test.ts` AU-05, median of 5 interleaved pairs (`expected 188.3 to be less than 50`).
- **Suggested fix:** compare against a dummy bcrypt hash for unknown users; do not await the reset email.

### AU-06 — Low — CONFIRMED — access tokens cannot be revoked
- **Where:** `api/src/middleware/authenticate.ts:16-21` and `api/src/utils/jwt.ts:12-14` check signature and expiry only. Revocation touches refresh tokens only (`svc/auth.service.ts:561-563`, `:364-366`, `:412`, `:288-290`).
- **What's wrong:** a stolen access token works for up to 15 min after reset or "log out everywhere"; combined with AU-02 that window can be made permanent. Shop membership is re-read per request, so removed or deactivated members are cut off immediately.
- **Test:** `auth/au06-staleAccessToken.test.ts`, 2 fail (`expected 200 to be 401`).
- **Suggested fix:** put a per-user token version (or `passwordChangedAt`) in the claims and check it in `authenticate`. If the window is accepted as design, document it and fix AU-02.

### AU-07 — Low — CONFIRMED — tokens stored in plaintext (needs DB read access)
- **Where:** `svc/auth.service.ts:42-49`, `:336-344`, `:394-403`, `:187-189`, `:248-250`; `api/prisma/schema.prisma:436, 456, 469, 480`. Invite tokens are hashed correctly (`svc/team.service.ts:401-402`).
- **Exploit:** read `"RefreshToken".token` from a backup or replica, then `POST /auth/refresh` with that cookie.
- **Test:** `auth/au07-tokensAtRest.test.ts`, 4 fail.
- **Suggested fix:** store `hashToken()` (`api/src/utils/jwt.ts:42-43`) for all four and look up by hash.

### AU-08 — Low — CONFIRMED — JWT secret policy (configuration hardening)
- **Where:** `api/src/config/parseEnv.ts:99-101` checks only "is set". `api/src/utils/jwt.ts:9`, `:21` sign identical claim shapes; `:13`, `:25` verify by key only, with no `aud` / `typ` and no algorithm pin.
- **What's wrong:** a one-character secret, or the same value for both, boots in production. With equal secrets a 30-day refresh token passes `authenticate`. Production secrets were not inspected.
- **Test:** `auth/au08-jwtSecretPolicy.test.ts`, 3 fail.
- **Suggested fix:** require at least 32 characters and distinct values in `parseEnv`; add and check a token-type claim; pin `algorithms: ['HS256']`.

### AU-09 — Low — CONFIRMED — login throttle is per IP only
- **Where:** `api/src/middleware/rateLimiter.ts:18-25` (keyed by `req.ip`); `api/src/routes/auth.routes.ts:34-35, 72` (one counter shared by register, login and reset-password); `svc/auth.service.ts:172-175` (failures only logged). Per-IP is documented at `docs/deployment.md:275`.
- **Exploit:** 10 guesses per address per 15 min; rotate addresses indefinitely against one account.
- **Test:** `auth/au09-loginThrottle.test.ts` loads the real auth router and limiter with `NODE_ENV=development`. The 11th request from the same IP is 429 (control); the next from a second IP is 401 (`expected 401 to be 429`).
- **Suggested fix:** add a second limiter keyed by normalised email that counts failures only.

### AU-10 — Low — CONFIRMED — cross-site logout (nuisance only)
- **Where:** `api/src/routes/auth.routes.ts:43`; `api/src/controllers/auth.controller.ts:107-125`; `SameSite=None` in production at `:40, 69, 97`; CORS at `api/src/app.ts:49-58` does not block a simple form POST.
- **Exploit:** an auto-submitted `<form method=post action=".../auth/logout">` on any site ends the session. Bearer-authenticated routes are unaffected.
- **Test:** `auth/au10-logoutCsrf.test.ts` (`expected +0 to be 1`).
- **Suggested fix:** reject a foreign `Origin` on `/auth/logout` and `/auth/refresh`, or require a custom header.

### True negatives
Backed by `auth/authCoverage.negative.test.ts` (8 pass) unless marked "read".
- **Auth coverage:** the routes without `authenticate`, taken from the live router, are exactly the intended public ones plus `/health` and `/media`.
- **Token verification:** every authenticated route (60+) returns 401 for no header, tampered signature, expired, `alg:none`, wrong key, a refresh token used as an access token, and a missing `Bearer ` prefix.
- **Secret source (read):** env only, required, no defaults (`api/src/config/parseEnv.ts:5-11, 99-101`).
- **Refresh tokens (read):** rotated in one transaction, server-side expiry, reuse outside a 10 s window revokes all sessions (`svc/auth.service.ts:216-285`); cookie is `HttpOnly` and `Secure` in production.
- **Password hashing (read):** bcrypt cost 12 everywhere; the hash is never serialised (`api/src/utils/userDto.ts:36-44`); policy is 8+ with upper, digit and symbol. Minor: no maximum length.
- **Reset flow (read):** 256-bit token, 1 h, single use, one live token per user, refresh tokens revoked, uniform answer, 5 per hour per IP.
- **Roles:** staff get 403 on 24 owner/manager routes probed. Managers get 403 on delete shop, transfer ownership, GDPR export/delete, edit/demote/remove owner, take shop offline. A manager without `canManageManagers` cannot create, promote to, edit or remove a manager, nor self-grant.
- **Deactivated and removed members:** access is lost on the next request even with a valid access token.
- **Limiters (read):** cannot be disabled in production (`api/src/middleware/rateLimiter.ts:7-10`).

Design choices noted, not findings: staff may pass `overrideRules` when creating bookings and may change any booking's status; any member, including redacted staff, reads customer notes and history and sets per-customer durations; any member sees the team list with emails and flags.

---

## Public booking flow

### Concurrency (required test)
`public-booking/concurrency.test.ts`: 10 parallel `POST /public/:slug/book` for the same staff and slot, 5 rounds per run, asserting exactly one 201, nine 409 (all `SLOT_TAKEN`) and one slot-holding row. Every round was `{201:1, 409:9}`: 110 rounds across 22 runs by the auditor, and again in the lead's full-suite run. No 500, no 503, no flakiness. **True negative.**

Other races, all passing: 10 parallel 60-minute bookings at 10 mutually overlapping starts never stored an overlap; 7 parallel reschedules of one booking gave one 200 and six 409; 5 reschedules plus 5 new bookings for one slot gave one winner and nine 409.

Correction to the brief: booking transactions run at READ COMMITTED with a per-provider advisory lock plus a DB exclusion constraint, not SERIALIZABLE. This is documented as deliberate at `api/src/utils/serializable.ts:199-214`.

### PB-01 — Medium — CONFIRMED — a chosen staff member need not perform the service
- **Where:** `svc/booking.service.ts:345-350` (`assertDoesAll` returns early for fewer than 2 services), `:591-604` (public create; `resolveBookableStaff` checks only shop, active and bookable), `:874-881` (slots with a `staffId` never consult the eligibility list), `:1642-1652` (token reschedule to another member has no service check at all).
- **What's wrong:** `StaffService` is enforced only for "any staff" and for multi-service creation. Same tenant only.
- **Exploit:** `POST /public/<slug>/book {"name":"x","phone":"+306941234567","serviceId":"<Color>","staffId":"<Cut-only member>","startTime":"2026-12-08T10:00:00+02:00"}` returns 201. `GET /public/<slug>/slots?date=2026-12-08&serviceId=<Color>&staffId=<Cut-only member>` returns 8 slots. `POST /public/reschedule {"token":"<own>","startTime":"...","staffId":"<member who does not do it>"}` returns 200.
- **Tests:** `public-booking/findings.test.ts` PB-01a (`expected 201 to be 400`), PB-01b (`expected 'ok' to be 'closed'`), PB-01c, PB-01d (`expected 200 to be 400`).
- **Suggested fix:** require a `StaffService` row for every service whenever a specific member is used: public create (also for one service), slots with `staffId`, and token reschedule when the member changes. The owner-side `updateBooking` has the same gap (`:1369-1375`, by reading only).

### PB-02 — Medium — CONFIRMED — no cap on slots one anonymous customer holds
- **Where:** `svc/booking.service.ts:549-641` (no limit on the public create path); `api/prisma/schema.prisma:399` (`status @default(CONFIRMED)`); `api/src/middleware/rateLimiter.ts:66-73` (the only control, 20 writes per 15 min per IP).
- **What's wrong:** one 15-minute IP budget takes a provider's whole 10-hour day, with no verification step.
- **Exploit:** 20 x `POST /public/<slug>/book` with the same `phone` and consecutive start times returns 20 x 201.
- **Test:** PB-02 (`{"201":20}: expected 20 to be less than 20`).
- **Suggested fix:** a product decision. Options: a cap on active future bookings per (shop, phone) and per day, a bot check or email/SMS confirmation before a booking holds time, a per-shop write budget.

### PB-03 — Low — CONFIRMED — "any staff" picks before locking
- **Where:** `svc/booking.service.ts:591-602` (`pickAnyStaff` reads conflicts with no lock held), `:510` (`lockProvider` taken afterwards), `:227` (ties broken at random).
- **What's wrong:** parallel no-preference requests can pick the same member; the loser gets 409 although other members are free. No double booking results.
- **Test:** PB-03 (`expected { '201': 3, '409': 2 } to deeply equal { '201': 5 }`). Probabilistic.
- **Suggested fix:** re-run the pick on `SLOT_TAKEN` for a no-preference request, or take a shop-level lock before picking.

### PB-04 — Low — CONFIRMED — cancel by token is not atomic
- **Where:** `svc/booking.service.ts:1691-1705`: reads, checks, then does an unconditional `update` by id with no transaction and no status condition. Reschedule uses a conditional `updateMany` at `:1246-1250`.
- **What's wrong:** (a) parallel cancels all return 200 and each sends a cancellation email (`api/src/controllers/public.controller.ts:132-144`). (b) A cancel racing a reschedule of the same token returns 200 "cancelled" while the moved booking stays CONFIRMED and holds the time. Only the token holder can do this.
- **Tests:** PB-04a (`expected { '200': 5 } to deeply equal { '200': 1, '409': 4 }`); PB-04b (reproduced in 21-28 of 60 staggered attempts per run).
- **Suggested fix:** `updateMany where id AND status IN (PENDING, CONFIRMED)`, and on `count === 0` re-read and answer with the current block reason.

### PB-05 — Low — CONFIRMED — `startTime` without an offset
- **Where:** `api/src/validators/booking.validator.ts:112-115` and `api/src/validators/public.validator.ts:24-26` (`isISO8601()` accepts no offset); `svc/booking.service.ts:564`, `:1633` (`new Date(data.startTime)`).
- **What's wrong:** `"2026-12-08T10:00:00"` is booked at 10:00 server time, not shop time, contradicting `api/src/utils/shopTime.ts:4-8`. The web client sends an offset, so only other API clients are affected.
- **Tests:** PB-05a (`stored ["2026-12-08T10:00:00.000Z"]: expected 201 to be 400`), PB-05b.
- **Suggested fix:** require an explicit offset or `Z`, or parse offset-less values in the shop timezone.

### PB-06 — Low — CONFIRMED — unparseable ISO strings give a 500
- **Where:** same validators as PB-05; the Invalid Date reaches `api/src/utils/shopTime.ts:112-115`, which throws a plain `Error`. Slots: `api/src/validators/booking.validator.ts:122-125` (non-strict), `svc/booking.service.ts:837-838`, `api/src/utils/shopTime.ts:40-43`.
- **Exploit:** `POST /public/<slug>/book` or `/public/reschedule` with `"startTime":"2026-W50"`, `"20261208T080000Z"` or `"2026-342"`; `GET /public/<slug>/slots?date=2026-02-30&serviceId=<id>`.
- **Tests:** PB-06a (x3), PB-06b, PB-06c.
- **Suggested fix:** reject when `Number.isNaN(new Date(v).getTime())`; use the strict date validation the owner slots validator already has (`booking.validator.ts:136-140`).

### PB-07 — Low — CONFIRMED — public slots ignore "now" and the advance window
- **Where:** `svc/booking.service.ts:975-990`: the public branch sets `available: isFree(c)` only.
- **What's wrong:** the grid offers times `POST /book` always refuses, and exposes a provider's free/busy pattern for arbitrary past and far-future dates.
- **Tests:** PB-07a/b/c.
- **Suggested fix:** in the public view mark starts before now as unavailable and return closed outside `[today, today + maxAdvanceDays]`.

### PB-08 — Low — CONFIRMED — locked shop still accepts token reschedules
- **Where:** `svc/booking.service.ts:1582-1588` (`rescheduleBlock` checks `customerRescheduleEnabled` and `isActive` only) versus `:570-575` (public create returns 403 `SHOP_LOCKED`) and `svc/plan.service.ts:29-30`.
- **Test:** PB-08 (`expected 200 to be 403`).
- **Suggested fix:** decide the rule; either add `isShopLocked` to `rescheduleBlock` or document the exception.

### PB-09 — Low — CONFIRMED — phone is not normalised
- **Where:** `api/src/validators/booking.validator.ts:49-55` (trim only); `api/src/validators/common.ts:13-19`; `svc/booking.service.ts:441-457` (upsert on the raw `(shopId, phone)`).
- **What's wrong:** `+306941234567`, `+30 694 123 4567` and `6941234567` are three customers in one shop; history and custom durations are lost.
- **Test:** PB-09.
- **Suggested fix:** normalise to one canonical form before lookup and storage on every path, with a data migration.

### PB-11 — Low — CONFIRMED — typed email dropped for a returning customer with none on file
- **Where:** `svc/booking.service.ts:453-457` (`update: {}`); `api/src/utils/bookingEmail.ts:27` and `api/src/controllers/public.controller.ts:79-84` (confirmation goes to `booking.customer.email` only).
- **What's wrong:** no confirmation is sent, so there is no cancel or reschedule link and no reminder. Not overwriting is deliberate and tested in `api/src/tests/customerUpsert.test.ts`; this is the gap it leaves.
- **Test:** PB-11.
- **Suggested fix:** keep the contact email per booking and send that booking's emails there. Do not fill the customer's empty email from the public form: anyone who knows the phone could attach their own address.

### PB-12 — Low — CONFIRMED — wrong error code from the "any staff" fallback
- **Where:** `svc/booking.service.ts:198-199` (`return free[0] ?? team[0]`), then `:608-617`.
- **What's wrong:** when the working members are all taken and another eligible member is off that day, the customer gets 422 "The shop is closed on that day." instead of 409 `SLOT_TAKEN`.
- **Test:** PB-12.
- **Suggested fix:** in the fallback prefer a member who works then (and is taken) over one who does not.

### True negatives
`public-booking/boundaries.negative.test.ts` (33 pass); the full boundary matrix is in [COVERAGE.md](COVERAGE.md).
- **Overlap:** back-to-back is allowed on both sides; same start, partial overlap and containment are 409; CANCELED and NO_SHOW free the slot, COMPLETED does not. The lock, the overlap query and the DB exclusion constraint all apply.
- **Zero-length / end before start:** impossible from a client; `endTime` is never accepted, and durations are `isInt 1..1440`.
- **Time rules:** past is 422, exactly now is accepted, before opening / past closing / off-grid are 422, time off and `maxAdvanceDays` behave as specified.
- **Other tenants:** another shop's staff, service, product or token is refused on book, slots and reschedule.
- **Customer upsert:** a known phone with a different name or email leaves the record untouched and echoes nothing.
- **Tokens:** `randomUUID()`, rotated on reschedule; old tokens answer `BOOKING_RESCHEDULED` or `BOOKING_ALREADY_CANCELED`; cutoffs hold.
- **DST:** the gap hour yields no slots, the repeated hour is bookable once.

---

## Validation and error handling

VE-01 is folded into TI-01 / TI-02 above.

### VE-07 — Medium — CONFIRMED — working-hour ranges are validated by shape only
- **Where:** `api/src/validators/workingHours.validator.ts:4` uses `/^\d{2}:\d{2}$/` (the strict form is at `api/src/validators/timeOff.validator.ts:4`); see also `:13-42`. There is no start-before-end, overlap or duplicate-day check in `svc/workingHours.service.ts:172-176`, `:308`, `:378-386`. `:384` also spreads each `hours` item into `createMany` (`{ ...h, dayId }`); `dayId` wins and extra keys cause a 500, not a write.
- **What's wrong:** bad data is stored and feeds slot generation.
- **Exploit:** `PUT …/schedules/<id>/days` with hours `99:99`-`99:99` returns 200; with `18:00`-`09:00` returns 200. `POST …/schedules` with the same day twice returns 500.
- **Test:** `validation/ve07-working-hours.test.ts`, 3 fail.
- **Suggested fix:** strict time regex, require start before end and non-overlapping ranges, reject repeated days, pick `startTime` / `endTime` explicitly at `:384`.

### VE-02 — Low — CONFIRMED — wrong JSON types reach bcrypt/Prisma and return 500
- **Root cause:** express-validator applies string validators per array element and stringifies other values. `["a@b.com"]` passes `isEmail()`, `"true"` passes `isBoolean()`, `"30"` passes `isInt()`, and `notEmpty()` passes any object or number. Almost no chain has `isString()`, `toInt()`, `toBoolean()` or strict booleans.
- **Where, unauthenticated:** `api/src/validators/authValidation.ts:30-34` (login), `:4-19` (register), `:42`, `:49` (forgot-password, resend-verification); `api/src/validators/booking.validator.ts:42-61` (public book `name` / `email`), `:126`, `:131` (public slots `staffId`, `rescheduleToken` as a repeated query key).
- **Where, authenticated:** string booleans at `shop.validator.ts:128`, `service.validator.ts:21-28,44-51`, `team.validator.ts:18-28,50`, `workingHours.validator.ts:32-36,54-57,73-76,96`; string ints at `service.validator.ts:11-20,36-43`, `product.validator.ts:44-49`, `booking.validator.ts:82-84,202-205`; no type rule at `userValidation.ts:4-9`, `service.validator.ts:62`, `booking.validator.ts:224-228,243-246`, `team.validator.ts:13-17,32,47-49`, most of `shop.validator.ts`, `product.validator.ts:11-43`, `customer.validator.ts:11,44-63`, `workingHours.validator.ts:107`, `timeOff.validator.ts:14-18`.
- **Exploit:** `POST /auth/login {"email":"x@example.com","password":["a"]}` returns 500. `POST /public/<slug>/book` with `"name":["x"]` returns 500. `PATCH /api/shops/<id> {"isActive":"true"}` returns 500. The body is generic; no data changes.
- **Test:** `validation/ve02-type-confusion.test.ts`, 9 fail.
- **Suggested fix:** `isString()` ahead of every string rule, `toInt()` after `isInt()`, strict or converted booleans, reject repeated query keys. As a backstop, map `PrismaClientValidationError` to 400 in the error handler.

### VE-03 — Low — CONFIRMED — NUL character returns 500
- **Where:** no validator rejects `\u0000` and PostgreSQL refuses it. Unauthenticated: `booking.validator.ts:42-48`, `:64-70`, `:126`; `authValidation.ts:57-63`, `:66-70`. Authenticated: every free-text field, import rows, `search`.
- **Exploit:** `POST /public/<slug>/book` with `"name":"a\u0000b"`; `GET /auth/verify-email?token=a%00b`.
- **Test:** `validation/ve03-nul-byte.test.ts`, 2 fail.
- **Suggested fix:** one shared rule or small middleware that rejects control characters in body and query strings.

### VE-04 — Low — CONFIRMED — missing upper bounds
- **Where:** shop `name`, `description`, `phone`, `formattedAddress` (`shop.validator.ts:12,23,24,33,57,64,65,74`); service `name`, `description` (`service.validator.ts:9-10,34-35`); team member `name` (`team.validator.ts:32`); service `price` has no max (`service.validator.ts:16-20,40-43`), and an Int overflow returns 500.
- **Related, not separately tested:** no max on `password`; no max on `days` / `hours` arrays; register `name` may be empty.
- **Impact:** only the 100 kb body limit caps these. Shop, service and staff names appear on the public page and in email subjects and bodies.
- **Test:** `validation/ve04-length-caps.test.ts`, 4 fail.
- **Suggested fix:** reuse `NAME_MAX_LENGTH` / `NOTES_MAX_LENGTH` from `api/src/validators/common.ts`; cap `price` as `product.validator.ts:45` does; cap arrays.

### VE-05 — Low — CONFIRMED — `page` has no upper bound
- **Where:** `customer.validator.ts:12-15`, `:96-99`; consumed at `api/src/controllers/customer.controller.ts:25`, `:198`.
- **Exploit:** `GET /api/shops/<id>/customers?page=99999999999999999999` returns 500.
- **Test:** `validation/ve05-pagination.test.ts`, 2 fail.
- **Suggested fix:** `isInt({ min: 1, max: <sane> }).toInt()`.

### VE-06 — Low — CONFIRMED — `sendEmail: "false"` sends the invite
- **Where:** `team.validator.ts:51` (`isBoolean()`, not strict, no conversion); `team.validator.ts:37` and `svc/team.service.ts:125`, `:157` compare with `!== false`.
- **Exploit:** `POST /api/shops/<id>/team {"name":"M","email":"m@example.com","role":"staff","sendEmail":"false"}` returns 201 and creates an invite.
- **Test:** `validation/ve06-send-email-flag.test.ts`.
- **Suggested fix:** `isBoolean({ strict: true })`.

### VE-08 — Low — CONFIRMED — the 2 MB import body limit applies before authentication
- **Where:** `api/src/app.ts:61-64` matches the path for every method and caller, ahead of `authenticate` at `api/src/routes/shop.routes.ts:130-135`.
- **Exploit:** an anonymous `POST /api/shops/x/customers/import` with a 1.5 MB body is fully read and parsed (15x the default allowance) before any auth check; the test's malformed body comes back as a 400 parse error rather than 401 or 413.
- **Test:** `validation/ve08-import-body-before-auth.test.ts`.
- **Suggested fix:** attach the 2 MB parser inside the customer router after `authenticate`.
- **Same pattern, untested:** `photoUpload` buffers up to 8 MB before the service checks shop membership. The caller must be authenticated but need not belong to the shop.

### VE-09 — Low — CONFIRMED — error log carries password hash, email and name
- **Where:** `api/src/middleware/errorHandler.ts:76` logs the full error; `api/src/utils/logger.ts:5-22` has no `redact`. A `PrismaClientValidationError` message embeds the query arguments.
- **Exploit:** `POST /auth/register` with `"name":["N"]` and a real email and password (VE-02 makes this reachable by anyone). The log line contains the `pendingRegistration.create` arguments, including `passwordHash` and `email`. Needs log access to read.
- **Test:** `validation/ve09-log-leak.test.ts`.
- **Suggested fix:** for Prisma errors log `name`, `code`, `meta` and the stack only; add pino `redact` paths.

### Platform checklist

| Item | Verdict | Evidence |
|---|---|---|
| helmet | OK | `api/src/app.ts:29-47`: nosniff, frameguard deny, X-Powered-By hidden, HSTS in production only. CSP is off, acceptable for a JSON API. |
| CORS | OK | `api/src/app.ts:49-58` passes a fixed array, so no reflection. `api/src/config/parseEnv.ts:45-53`, `:112-123` rejects empty, `*`, `null` and non-http(s). Tested. |
| Body limits | Mostly OK | Default 100 kb (`app.ts:65`). The 2 MB import parser runs pre-auth (VE-08). Multer is 8 MB, 1 file, 5 fields. |
| Error bodies in production | OK | `api/src/middleware/errorHandler.ts:76-80` is not environment-dependent: generic 500, no stack, no Prisma text. The 4xx branch only echoes body-parser and router messages. |
| Unhandled rejections | OK | Every fire-and-forget chain ends in `.catch`. No route was found that can trip `app.ts:132-135`. |
| trust proxy | OK by reading | `app.ts:27` trusts one hop. Not verified against the live proxy chain. |
| /docs | OK by reading | Mounted only outside production; `parseEnv.ts:103-110` refuses an unset `NODE_ENV`. |
| /health | OK | No detail in the body. Tested. |
| Logging | Issue | Request log is method/path/status/ms with the query string stripped. The unhandled-error log dumps Prisma arguments (VE-09). |

### True negatives
`validation/platform.negative.test.ts` (8 pass).
- **Mass assignment elsewhere:** shop, product, customer, team, time-off, schedule header and booking services all pick fields explicitly. Only the service module does not.
- **Email HTML:** every user-supplied string goes through `escapeHtml` (`svc/email.service.ts:11-17`). Mail goes through the Resend JSON API, so there is no header injection.
- **CSV / formula injection:** the API export is JSON; the CSV is built in `web/src/utils/customerFiles.ts:16-27` with a leading-apostrophe guard on name, email and notes.
- **Photo upload:** type is decided from content by sharp and re-encoded to WebP; size and pixel caps apply.
- **Slug:** strict shape, length and reserved list; immutable on update.

---

## Observations outside the four briefs (read, not tested)

- `ShopInvite.createdBy` / `acceptedBy` have no `onDelete` (`api/prisma/schema.prisma:501-502`): `DELETE /user/me` for anyone who sent or accepted an invite likely ends in the generic P2003 409.
- `UserShop.user` is `onDelete: Cascade` (`schema.prisma:203`): a staff member deleting their account removes their team-member row.
- `verifyEmail` and `verifyEmailChange` are check-then-write without a transaction (`svc/auth.service.ts:309-321, 455-461`); the reset token's `used` check is also non-atomic (`:540-559`).
- `cleanupExpiredTokens` never purges `PendingEmailChange` (`api/src/utils/cleanup.ts:13-22`); expiry is still enforced on use.
- `acceptInvite` does not re-check that the placeholder member is active or still has no `userId` (`svc/invite.service.ts:79-82`).
- `GET /api/invites` "sent" still lists invites a user created for a shop they have left (`svc/invite.service.ts:38-42`).
- `redactCustomer` leaves `notes` visible to staff without `canViewCustomerDetails` (`api/src/utils/customerVisibility.ts:17-18`).
- A public booking with a new phone sends a confirmation to any typed address with a caller-chosen `name`, bounded only by the write limiter.
- `api/.env` is also loaded during test runs: dotenv reports one variable injected on top of `.env.test`.

## Reviewed and skipped

**Reviewed:** every file in `api/src/routes/`, `validators/`, `controllers/` and `middleware/`; all services except as listed below; `utils/shopAccess`, `jwt`, `serializable`, `slots`, `shopTime`, `customerVisibility`, `bookingEmail`, `userDto`, `cleanup`, `logger`, `locale`; `config/env.ts`, `parseEnv.ts`; `api/prisma/schema.prisma` and the booking no-overlap migration; relevant parts of `docs/deployment.md` and `docs/decisions/`. Every route in the repo map appears in the coverage tables.

**Skipped or partial:**
- `svc/storage.service.ts` beyond the key pattern; `utils/reminders.ts`, `utils/shutdown.ts`; `api/src/admin/`, `api/scripts/`; `web/` (one file read) and `e2e/`.
- Photo routes were reviewed in code only; no upload was exercised.
- Rate limiters were exercised only through a small app under `NODE_ENV=development`; the 503 `BOOKING_BUSY` path was read, not provoked.
- Production-only behaviour of `app.ts` (HSTS header, `/docs` absent) was verified by reading.
- Timezones other than Europe/Athens (covered by the existing `bookingTimezone.test.ts`).
- The existing `api/src/tests` suite was not re-run. Nothing was tested against a live deployment.
