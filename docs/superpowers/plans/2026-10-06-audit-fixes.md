# Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 34 findings in `tests/audit/REPORT.md`, most severe first, until the whole `tests/audit` suite passes and runs in CI.

**Architecture:** The red tests already exist: every finding has a failing test under `tests/audit/` that asserts the correct behaviour. Each task makes its named tests pass without touching them, then re-runs the existing API suite. Work ships as six pull requests into `dev`, one per phase, so the Critical fix can reach production on its own.

**Tech Stack:** Node, Express 5, TypeScript, Prisma 7 (pg adapter), PostgreSQL, express-validator, Vitest + Supertest. Two tasks touch the React web app.

**Spec:** `tests/audit/REPORT.md` (findings, exploit requests, suggested fixes) and `tests/audit/COVERAGE.md` (per-route tables). Read the finding before starting its task.

## Global Constraints

- Never edit a test under `tests/audit/` to make it pass. The only allowed test edits are the ones a task names explicitly because a product decision changed the expected behaviour: Task 20 (TI-05/PB-10), Task 22 (PB-02) and Task 25 (AU-06).
- No request body is ever spread or passed whole into a Prisma `data`. Pick fields by name.
- Every new Prisma lookup by id on a shop-scoped route includes `shopId` (directly or through a relation).
- Run commands from `api/`. The local Postgres has no `postgres` role, so always prefix test runs with `TEST_DATABASE_URL=postgresql://nicktheodosis@localhost:5432/booking_app_test`.
- Audit tests for one area: `npx vitest run --dir ../tests/audit/<area>`. Existing suite: `npm test`. Lint: `npm run lint`.
- Branches are `fix/audit-<phase>` off `dev`, merged by pull request into `dev`. `main` is production.
- Web changes follow `CLAUDE.md`: tokens from `web/src/styles/tokens.css`, classes from `web/src/styles/components.css`, working in light, dark and at 360px.
- Schema changes are Prisma migrations in `api/prisma/migrations/`, named `YYYYMMDDHHMMSS_<what>`.

## Phases

| Phase | Branch | Findings | Why this order |
|---|---|---|---|
| 0 | `fix/audit-baseline` | none | Commit the audit so every later PR shows tests going green |
| 1 | `fix/audit-tenant-isolation` | TI-01, TI-02, TI-03 (and VE-01) | Critical and High; ship to production alone, first |
| 2 | `fix/audit-account-security` | AU-01, AU-02, AU-03, AU-04, AU-05 | Medium account-takeover paths |
| 3 | `fix/audit-booking-rules` | PB-01, PB-04, PB-05, PB-06, PB-07, PB-08, PB-12, PB-03, VE-07 | Booking correctness |
| 4 | `fix/audit-validation` | VE-02, VE-03, VE-04, VE-05, VE-06, VE-08, VE-09 | Input hardening, mostly mechanical |
| 5 | `fix/audit-public-exposure` | TI-04, PB-09, PB-11; TI-05/PB-10 and PB-02 documented as accepted | Needs a data migration |
| 6 | `fix/audit-token-hardening` | AU-06, AU-07, AU-08, AU-09, AU-10 | Low; needs a production secret check before deploy |

## Decisions needed from Nick

Each has a recommended default. A task that depends on one says so; with no answer, use the default. D1 and D3 are decided; D2 and D4 to D7 are still on their defaults.

| # | Finding | Question | Recommended default |
|---|---|---|---|
| D1 | PB-02 | Cap on bookings one phone can hold? | **Decided 2026-10-06: no cap.** Accepted as design; the per-IP write limiter stays the only control (Task 22 documents it) |
| D2 | PB-08 | May a customer reschedule by link while the shop is locked? | No: refuse like a new booking |
| D3 | TI-05 / PB-10 | Keep personal durations in the public slot grid? | **Decided 2026-10-06: keep.** Intended flow: a customer who identifies themselves in the first step ("continue as") gets their own durations; one who skips gets the defaults. Accepted as design (Task 20 documents it) |
| D4 | AU-06 | Revoke access tokens on password reset? | Accept the 15-minute window (a revocation check costs one query per request), document it, and rewrite the two AU-06 tests to assert the documented behaviour |
| D5 | AU-09 | Add a per-account login throttle? | Yes: 10 failures per email per 15 minutes, alongside the per-IP limit |
| D6 | AU-04 | Hide "Email already in use" on registration? | Yes: always answer 201 and email the existing account instead |
| D7 | PB-11 | Send confirmations to the email typed for this booking? | Yes: store a contact email on the booking; never change the customer record |

---

## Phase 0: Baseline

### Task 0: Commit the audit and add a run script

**Files:**
- Modify: `api/package.json` (scripts)
- Add to git: `tests/audit/**`, `docs/superpowers/plans/2026-10-06-audit-fixes.md`

- [ ] **Step 1: Branch**

```bash
git checkout -b fix/audit-baseline dev
```

- [ ] **Step 2: Add the script** to `api/package.json`, after `"test:watch"`:

```json
"test:audit": "vitest run --dir ../tests/audit",
```

- [ ] **Step 3: Record the baseline**

Run: `TEST_DATABASE_URL=postgresql://nicktheodosis@localhost:5432/booking_app_test npm run test:audit`
Expected: `Tests  84 failed | 64 passed (148)`

- [ ] **Step 4: Commit**

```bash
git add tests/audit docs/superpowers/plans api/package.json
git commit -m "Add security audit report, failing tests and fix plan"
```

Do not add the audit suite to CI yet; it is red by design until Phase 6 (Task 26).

---

## Phase 1: Tenant isolation (Critical, High)

Ship this phase to production on its own, before starting Phase 2.

### Task 1: Stop passing the request body to Prisma in the service module (TI-01, TI-02, VE-01)

**Files:**
- Modify: `api/src/services/service.service.ts:1-21` (DTOs), `:38-40` (create), `:92-95` (update)
- Test (existing, do not edit): `tests/audit/tenant-isolation/serviceMassAssignment.test.ts`, `tests/audit/validation/ve01-service-mass-assignment.test.ts`

- [ ] **Step 1: Confirm the tests fail**

Run: `npx vitest run --dir ../tests/audit/tenant-isolation serviceMassAssignment` and `npx vitest run --dir ../tests/audit/validation ve01`
Expected: 6 failed and 4 failed.

- [ ] **Step 2: Replace the two DTO interfaces** at the top of `service.service.ts` with one, and add the picker under the `MANAGER_ONLY` helper:

```ts
import type { Prisma } from '../../dist/generated/prisma';

interface ServiceDto {
  name?: string;
  description?: string;
  duration?: number;
  price?: number;
  isActive?: boolean;
  showOnPublicPage?: boolean;
}

// Request bodies are never spread into Prisma: only these fields are taken.
const pickFields = (dto: ServiceDto) => {
  const out: Prisma.ServiceUncheckedUpdateInput = {};
  if (dto.name !== undefined) out.name = dto.name;
  if (dto.description !== undefined) out.description = dto.description;
  if (dto.duration !== undefined) out.duration = dto.duration;
  if (dto.price !== undefined) out.price = dto.price;
  if (dto.isActive !== undefined) out.isActive = dto.isActive;
  if (dto.showOnPublicPage !== undefined)
    out.showOnPublicPage = dto.showOnPublicPage;
  return out;
};
```

Change the `dto` parameter type of `createService` and `updateService` to `ServiceDto`.

- [ ] **Step 3: Use it in create** (`shopId` last, so nothing can override it):

```ts
const service = await prisma.service.create({
  data: {
    ...(pickFields(dto) as Prisma.ServiceUncheckedCreateInput),
    shopId,
  },
});
```

- [ ] **Step 4: Use it in update**, and scope the write to the shop:

```ts
const updated = await prisma.service.update({
  where: { id: serviceId, shopId },
  data: pickFields(dto),
});
```

- [ ] **Step 5: Verify**

Run the two commands from Step 1. Expected: 6 passed and 4 passed.
Run: `npm test`. Expected: no new failures (in particular `internalService`, `inactiveService`, `serviceDelete`).

- [ ] **Step 6: Commit**

```bash
git add api/src/services/service.service.ts
git commit -m "Pick service fields by name instead of passing the request body to Prisma"
```

### Task 2: Scope unassign-staff to the shop (TI-03)

**Files:**
- Modify: `api/src/services/service.service.ts:168-170`
- Test (existing): `tests/audit/tenant-isolation/unassignStaff.test.ts`

- [ ] **Step 1: Confirm it fails.** Run: `npx vitest run --dir ../tests/audit/tenant-isolation unassignStaff`. Expected: 1 failed, `expected +0 to be 1`.

- [ ] **Step 2: Add both shop conditions to the lookup:**

```ts
const assignment = await prisma.staffService.findFirst({
  where: {
    userShopId,
    serviceId,
    service: { shopId },
    userShop: { shopId },
  },
});
```

- [ ] **Step 3: Verify.** Same command: 1 passed. `npx vitest run src/tests/crossShopIds.test.ts`: all pass.

- [ ] **Step 4: Commit**

```bash
git add api/src/services/service.service.ts
git commit -m "Check both ids against the shop when unassigning staff from a service"
```

### Task 3: Guard against the next mass assignment, and check production for abuse

**Files:**
- Modify: `api/src/services/workingHours.service.ts:384`
- Create: `api/src/tests/noBodyPassthrough.test.ts`

- [ ] **Step 1: Pick the hour-range fields** at `workingHours.service.ts:384`. Replace the `{ ...h, dayId }` spread with:

```ts
{ startTime: h.startTime, endTime: h.endTime, dayId }
```

- [ ] **Step 2: Add a static guard test** so the pattern cannot come back unnoticed:

```ts
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Request bodies must never reach Prisma whole (audit TI-01/TI-02).
describe('no request-body pass-through', () => {
  const dir = join(__dirname, '../controllers');
  const files = readdirSync(dir).filter((f) => f.endsWith('.ts'));

  it.each(files)('%s destructures req.body or passes named fields', (file) => {
    const src = readFileSync(join(dir, file), 'utf8');
    // `req.body` as a bare call argument: followed by `,` or `)`.
    const bare = src.match(/[(,]\s*req\.body\s*[,)]/g) ?? [];
    expect(bare).toEqual([]);
  });
});
```

- [ ] **Step 3: Run it.** `npx vitest run src/tests/noBodyPassthrough.test.ts`. It will list every controller that still hands `req.body` to a service (at least `service.controller.ts`, `auth.controller.ts` login, `public.controller.ts` reschedule). For each, change the call site to pass named fields, for example in `service.controller.ts`:

```ts
const { name, description, duration, price, isActive, showOnPublicPage } =
  req.body;
const service = await serviceService.createService(userId, shopId, {
  name,
  description,
  duration,
  price,
  isActive,
  showOnPublicPage,
});
```

Repeat until the guard passes, then run `npm test`.

- [ ] **Step 4: Commit**

```bash
git add api/src
git commit -m "Pass named fields from controllers and guard against body pass-through"
```

- [ ] **Step 5: Production check (Nick runs this, read-only).** These find rows only the exploit could have created. Any result means the bug was used and needs a closer look before the rows are touched.

```sql
-- Services assigned to a staff member of a different shop.
SELECT ss.id, s."shopId" AS service_shop, us."shopId" AS member_shop
FROM "StaffService" ss
JOIN "Service" s ON s.id = ss."serviceId"
JOIN "UserShop" us ON us.id = ss."userShopId"
WHERE s."shopId" <> us."shopId";

-- Bookings whose service or staff member belongs to a different shop.
SELECT b.id, b."shopId", s."shopId" AS service_shop, us."shopId" AS staff_shop
FROM "Booking" b
JOIN "Service" s ON s.id = b."serviceId"
JOIN "UserShop" us ON us.id = b."staffId"
WHERE s."shopId" <> b."shopId" OR us."shopId" <> b."shopId";

-- Managers with a login that no accepted invite explains.
SELECT us.id, us."shopId", us."userId", us."createdAt"
FROM "UserShop" us
WHERE us.role = 'manager' AND us."userId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "ShopInvite" i
    WHERE i."userShopId" = us.id AND i.status = 'accepted'
  );
```

- [ ] **Step 6: Open the PR into `dev`, merge, and release to `main`.**

---

## Phase 2: Account security

### Task 4: Never serialise `cancelToken` to shop members (AU-01)

**Files:**
- Modify: `api/src/utils/prisma.ts:19`
- Modify: every place that needs the token on purpose (found in Step 3)
- Test (existing): `tests/audit/auth/au01-cancelTokenLeak.test.ts`

- [ ] **Step 1: Confirm it fails.** `npx vitest run --dir ../tests/audit/auth au01`. Expected: 5 failed.

- [ ] **Step 2: Omit the column by default** in the client constructor:

```ts
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter, omit: { booking: { cancelToken: true } } });
```

- [ ] **Step 3: Opt back in only where the token is the point.** Run `npx tsc --noEmit` and `grep -rn "cancelToken" src --include=*.ts | grep -v tests`. Each read of `.cancelToken` on a query result now fails to compile or is `undefined`; at those queries only (building the confirmation, reminder and reschedule emails, and `loadByToken`), add `omit: { cancelToken: false }` to the query. Queries that filter by `where: { cancelToken }` need no change.

- [ ] **Step 4: Verify.** AU-01 command: 5 passed. Then `npm test`; fix any existing test that read `cancelToken` from an API response by reading it from the database instead (`prisma.booking.findUnique({ where: { id }, omit: { cancelToken: false } })`).

- [ ] **Step 5: Commit**

```bash
git add api/src
git commit -m "Keep the customer's cancel token out of responses to shop members"
```

### Task 5: Require the current password to change password or email (AU-02)

**Files:**
- Modify: `api/src/validators/userValidation.ts:3-25`, `api/src/controllers/user.controller.ts:35-40`, `api/src/services/auth.service.ts:370-412` (`updateUser`), `:531-566` (`resetPassword`)
- Modify (web): the account settings form that calls `PATCH /user/me` (find with `grep -rn "user/me" web/src`)
- Test (existing): `tests/audit/auth/au02-accountChangeNoReauth.test.ts`

**Interfaces:**
- Produces: `updateUser(userId, data: { email?: string; password?: string; name?: string; currentPassword?: string })`. A missing or wrong `currentPassword` with `email` or `password` present throws `AppError(403, 'Current password is incorrect', 'CURRENT_PASSWORD_REQUIRED')`.

- [ ] **Step 1: Confirm it fails.** `npx vitest run --dir ../tests/audit/auth au02`. Expected: 3 failed.

- [ ] **Step 2: Validator.** Add to `updateMeValidation`:

```ts
body('currentPassword')
  .optional()
  .isString()
  .withMessage('currentPassword must be a string'),
```

- [ ] **Step 3: Service.** At the top of `updateUser`, before anything is hashed or written:

```ts
if (data.email || data.password) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const ok =
    !!user?.passwordHash &&
    typeof data.currentPassword === 'string' &&
    (await bcrypt.compare(data.currentPassword, user.passwordHash));
  if (!ok)
    throw new AppError(
      403,
      'Current password is incorrect',
      'CURRENT_PASSWORD_REQUIRED',
    );
}
```

In the `if (data.password)` block that already deletes refresh tokens, also drop any queued email change:

```ts
await prisma.pendingEmailChange.deleteMany({ where: { userId } });
```

- [ ] **Step 4: Reset flow.** In `resetPassword`, next to the `refreshToken.deleteMany`:

```ts
await prisma.pendingEmailChange.deleteMany({
  where: { userId: resetToken.userId },
});
```

- [ ] **Step 5: Controller.** Pass `currentPassword` through from `req.body` alongside `name`, `email`, `password`.

- [ ] **Step 6: Web.** In the settings form, add a "Current password" input (existing `.input` classes, `type="password"`, `autocomplete="current-password"`) shown when the email or new-password field is non-empty, send it as `currentPassword`, and show the API message on a 403 with code `CURRENT_PASSWORD_REQUIRED`. Check light, dark and 360px.

- [ ] **Step 7: Verify.** AU-02 command: 3 passed. `npx vitest run src/tests/user.test.ts`: update the existing password- and email-change tests to send `currentPassword`. `npm run e2e` from the repo root if it covers settings.

- [ ] **Step 8: Commit**

```bash
git add api/src web/src
git commit -m "Ask for the current password before changing password or email"
```

### Task 6: Do not let a second registration replace a pending one (AU-03)

**Files:**
- Modify: `api/src/services/auth.service.ts:33-58` (`registerUser`), and the invite-registration path at `:70-110` if it has the same delete-then-create
- Test (existing): `tests/audit/auth/au03-pendingRegistrationTakeover.test.ts`

- [ ] **Step 1: Confirm it fails.** `npx vitest run --dir ../tests/audit/auth au03`. Expected: 2 failed.

- [ ] **Step 2: Keep an unexpired pending row.** Replace the `existingPending` block:

```ts
const existingPending = await prisma.pendingRegistration.findUnique({
  where: { email },
});
if (existingPending && existingPending.expiresAt > new Date()) {
  // Someone already started signing up with this address. Whoever reads the
  // mailbox finishes that sign-up; a later request cannot swap its password.
  await sendVerificationEmail(
    email,
    existingPending.token,
    existingPending.name,
  );
  return;
}
if (existingPending) {
  await prisma.pendingRegistration.delete({ where: { email } });
}
```

Check what `registerUser` returns to the controller and return the same shape from the early exit, so the response is identical in both cases.

**What this does not close:** if the attacker is the *first* to register the victim's address and the victim then clicks a verification email they never asked for, the attacker's password still becomes the account. Closing that fully means collecting the password on the verification page instead of at sign-up, which changes the web register flow; raise it with Nick as a follow-up rather than doing it here. As a cheap mitigation in this task, make the verification email say plainly "If you did not just sign up, ignore this email" in both locales (`emailStrings.ts`).

- [ ] **Step 3: Verify.** AU-03 command: 2 passed. `npx vitest run src/tests/auth.test.ts`: a test that re-registers to change details before verifying must now expect the first password to win.

- [ ] **Step 4: Commit**

```bash
git add api/src
git commit -m "Keep the first pending registration instead of replacing it"
```

### Task 7: Uniform answers on register and login (AU-04, AU-05) — decision D6

**Files:**
- Modify: `api/src/services/auth.service.ts:27-31` (register), `:160-170` (login)
- Modify: `api/src/services/email.service.ts` and `api/src/services/emailStrings.ts` (new "you already have an account" email, el and en)
- Test (existing): `tests/audit/auth/au04-userEnumeration.test.ts`

- [ ] **Step 1: Confirm it fails.** `npx vitest run --dir ../tests/audit/auth au04`. Expected: 2 failed.

- [ ] **Step 2: Login timing.** Add near the top of `auth.service.ts`:

```ts
// Compared against when the email is unknown or has no password, so the
// response takes as long as a real wrong-password attempt.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);
```

Replace the two early `throw`s in `loginUser` with one path:

```ts
const user = await prisma.user.findUnique({ where: { email } });
const isPasswordValid = await bcrypt.compare(
  password,
  user?.passwordHash ?? DUMMY_HASH,
);
if (!user || !user.passwordHash || !isPasswordValid) {
  logger.warn('Failed login attempt');
  throw new AppError(401, 'Invalid credentials');
}
```

- [ ] **Step 3: Registration.** Replace the 409 at `:27-31` with: send the new "you already have an account, sign in or reset your password" email to that address (add `sendAccountExistsEmail(email, name)` to `email.service.ts`, following `sendVerificationEmail`, with strings in both locales in `emailStrings.ts`, every interpolated value through `escapeHtml`), then return exactly what a successful registration returns.

- [ ] **Step 4: Verify.** AU-04 command: 2 passed. Update the existing "duplicate email returns 409" test in `src/tests/auth.test.ts` to expect 201 and the new email. Check the web register page still reads sensibly: it now always shows "check your email".

- [ ] **Step 5: Commit, open the PR for Phase 2.**

```bash
git add api/src web/src
git commit -m "Answer the same on register and login whether or not the account exists"
```

---

## Phase 3: Booking rules

All tests are in `tests/audit/public-booking/findings.test.ts` unless stated. Run one finding with `npx vitest run --dir ../tests/audit/public-booking -t "PB-01"`. After every task also run `npx vitest run --dir ../tests/audit/public-booking concurrency boundaries` (39 must stay green) and `npm test`.

### Task 8: A chosen staff member must do the service (PB-01)

**Files:**
- Modify: `api/src/services/booking.service.ts:345-359` (`assertDoesAll`), `:874-881` (slots), `:1642-1652` (reschedule), `:1369-1375` (owner `updateBooking`)

- [ ] **Step 1: Confirm PB-01a-d fail** (4 failed).

- [ ] **Step 2: Remove the early return** `if (ids.length < 2) return;` from `assertDoesAll`, and change the message to `'Selected staff member does not do this service'` when `ids.length === 1`.

- [ ] **Step 3: Slots.** In `getAvailableSlots`, a requested member must also be eligible:

```ts
if (staffId) {
  const member = await resolveBookableStaff(prisma, shopId, staffId, context);
  team = member && eligible.some((e) => e.id === member.id) ? [member] : [];
} else {
  team = eligible;
}
```

- [ ] **Step 4: Reschedule.** After `if (!staff) throw staffUnavailable(...)` in the token reschedule, when `staffChanged`:

```ts
if (staffChanged)
  await assertDoesAll(
    tx,
    staff.id,
    existing.services.map((s) => s.serviceId),
  );
```

(`existing.services` comes from `TOKEN_INCLUDE`; if it does not select `serviceId`, add it there.)

- [ ] **Step 5: Owner update.** In `updateBooking`, call `assertDoesAll(tx, newStaffId, serviceIds)` when the staff member or the service changes.

- [ ] **Step 6: Verify and commit.** PB-01: 4 passed. Existing tests that book a member for a service without a `StaffService` row must create the row (`prisma.staffService.create`) in their setup.

```bash
git commit -am "Require the chosen staff member to perform every booked service"
```

### Task 9: Make cancel-by-link atomic (PB-04)

**Files:**
- Modify: `api/src/services/booking.service.ts:1691-1706`

- [ ] **Step 1: Confirm PB-04a and PB-04b fail.**

- [ ] **Step 2: Replace `cancelBookingByToken`:**

```ts
export const cancelBookingByToken = async (token: string) => {
  const booking = await loadByToken(prisma, token);
  const block = cancelBlock(booking);
  if (block) throw blockError(block);

  // Conditional write: only one request can take a booking out of an active
  // state, so a second cancel or a reschedule that won the race is told so.
  const { count } = await prisma.booking.updateMany({
    where: {
      id: booking.id,
      status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
    },
    data: { status: BookingStatus.CANCELED },
  });
  if (count === 0) {
    const current = await loadByToken(prisma, token);
    throw blockError(cancelBlock(current) ?? 'BOOKING_ALREADY_CANCELED');
  }

  return prisma.booking.findUniqueOrThrow({
    where: { id: booking.id },
    include: {
      customer: true,
      service: true,
      shop: true,
      services: SERVICE_LINES,
    },
  });
};
```

Check the literal type `blockError` accepts and use its existing "already cancelled" code.

- [ ] **Step 3: Verify and commit.** PB-04a, PB-04b pass; `npx vitest run src/tests/publicCancel.test.ts` passes.

```bash
git commit -am "Cancel a booking by link with a conditional write"
```

### Task 10: Strict timestamps on the public endpoints (PB-05, PB-06)

**Files:**
- Modify: `api/src/validators/common.ts` (new helper), `api/src/validators/booking.validator.ts:112-115,122-125`, `api/src/validators/public.validator.ts:24-26`

- [ ] **Step 1: Confirm PB-05a/b and PB-06a/b/c fail** (7 failed).

- [ ] **Step 2: Add to `common.ts`:**

```ts
// A full timestamp with an explicit offset or Z, that JavaScript can parse.
// Rejects week dates, ordinal dates, basic format and offset-less times, all
// of which isISO8601() lets through.
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;
export const isInstant = (value: unknown): boolean =>
  typeof value === 'string' &&
  INSTANT.test(value) &&
  !Number.isNaN(new Date(value).getTime());
```

- [ ] **Step 3: Use it.** In `createBookingValidation`, `ownerCreateBookingValidation`, `updateBookingValidation` and `rescheduleBookingValidation`, replace `.isISO8601()` on `startTime` with `.custom(isInstant)`, keeping each message. On `getPublicSlotsValidation`'s `date`, use the strict form the owner slots validator already has at `booking.validator.ts:136-140` (`isISO8601({ strict: true })` plus the `YYYY-MM-DD` shape).

- [ ] **Step 4: Verify and commit.** 7 pass. `grep -rn "startTime" web/src | grep -i "toISOString\|format"`: confirm the web client always sends an offset. Add four cases to `api/src/validators/common.test.ts`: `2026-12-08T10:00:00+02:00` true, `2026-12-08T10:00:00` false, `2026-W50` false, `20261208T080000Z` false.

```bash
git commit -am "Accept only full timestamps with an offset for booking start times"
```

### Task 11: Public slots respect "now" and the advance window (PB-07)

**Files:**
- Modify: `api/src/services/booking.service.ts:975-990` and the public branch above it

- [ ] **Step 1: Confirm PB-07a/b/c fail.**

- [ ] **Step 2: Close out-of-window dates.** In `getAvailableSlots`, for `context === 'public'`, after the shop is loaded: compute today in the shop zone (`todayInZone(zone)` from `utils/shopTime.ts`) and return `closed()` when `date < today` or `date > today + shop.maxAdvanceDays` (compare as `YYYY-MM-DD` strings; add days with Luxon, as `bookingRules.service.ts` does for `BOOKING_BEYOND_ADVANCE_WINDOW`).

- [ ] **Step 3: Mark past starts.** In the `!withOutside` map:

```ts
const now = Date.now();
// ...
.map((c) => {
  const past = c.start.getTime() < now;
  return {
    time: c.time,
    available: !past && isFree(c),
    outsideHours: false,
    past,
  };
})
```

Apply the `past` rule only when `context === 'public'` if owner slots must keep offering past times for overrides; check `ownerSlots.test.ts`.

- [ ] **Step 4: Verify and commit.**

```bash
git commit -am "Hide past and out-of-window times from the public slot list"
```

### Task 12: Locked shops refuse token reschedules (PB-08) — decision D2

**Files:**
- Modify: `api/src/services/booking.service.ts:1582-1588` (`rescheduleBlock`), `TOKEN_INCLUDE` (select `plan`, `subscriptionStatus`, `trialEndsAt` on `shop`)

- [ ] **Step 1: Confirm PB-08 fails.**
- [ ] **Step 2:** Add `|| isShopLocked(b.shop)` to the `RESCHEDULE_DISABLED` condition (import `isShopLocked` from `./plan.service`). If the PB-08 test expects 403 `SHOP_LOCKED` specifically, return a new block code `'SHOP_LOCKED'` mapped to 403 in `blockError`.
- [ ] **Step 3: Verify** PB-08 and `src/tests/publicReschedule.test.ts`, `plans.test.ts`. **Commit:** `git commit -am "Refuse customer reschedules while a shop is locked"`

### Task 13: "Any staff" fallback and race (PB-12, PB-03)

**Files:**
- Modify: `api/src/services/booking.service.ts:180-230` (`pickAnyStaff`), `:591-617` (public create)

- [ ] **Step 1: Confirm PB-12 and PB-03 fail.**
- [ ] **Step 2 (PB-12):** in `pickAnyStaff`, replace `return free[0] ?? team[0]` so the fallback prefers a member who is working at that time: compute `working` (members whose hours cover the slot, the same check used to build `free` minus the conflict test) and `return free[0] ?? working[0] ?? team[0]`.
- [ ] **Step 3 (PB-03):** in the public create path, when no `staffId` was requested and the transaction throws `SLOT_TAKEN`, run the whole transaction function again (it re-picks), at most 3 times, before letting the 409 through:

```ts
const MAX_ANY_STAFF_ATTEMPTS = 3;
for (let attempt = 1; ; attempt++) {
  try {
    return await runBookingTransaction(/* existing arguments */);
  } catch (err) {
    const retry =
      !data.staffId &&
      err instanceof AppError &&
      err.code === 'SLOT_TAKEN' &&
      attempt < MAX_ANY_STAFF_ATTEMPTS;
    if (!retry) throw err;
  }
}
```

Use the transaction helper's real name from `utils/serializable.ts`; `pickAnyStaff` must run inside the retried function, not before it.
- [ ] **Step 4: Verify** PB-12, PB-03 (run PB-03 five times), `anyStaff.test.ts`, the concurrency file. **Commit:** `git commit -am "Re-pick a provider when a no-preference booking loses the race"`

### Task 14: Validate working hours properly (VE-07)

**Files:**
- Modify: `api/src/validators/workingHours.validator.ts:4,13-42` and the `days` array rules
- Test (existing): `tests/audit/validation/ve07-working-hours.test.ts`

- [ ] **Step 1: Confirm 3 fail.** `npx vitest run --dir ../tests/audit/validation ve07`
- [ ] **Step 2:** change the regex to the strict one from `timeOff.validator.ts:4`:

```ts
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
```

- [ ] **Step 3:** add two custom rules and apply them wherever `days` or `hours` arrays are validated:

```ts
// Ranges must run forwards and not overlap within one day.
const validRanges = (hours: unknown) => {
  if (!Array.isArray(hours)) return true;
  const sorted = [...hours].sort((a, b) =>
    String(a?.startTime).localeCompare(String(b?.startTime)),
  );
  return sorted.every(
    (h, i) =>
      h.startTime < h.endTime && (i === 0 || sorted[i - 1].endTime <= h.startTime),
  );
};

const uniqueDays = (days: unknown) =>
  !Array.isArray(days) ||
  new Set(days.map((d) => d?.day)).size === days.length;
```

```ts
body('days').optional().isArray({ max: 7 }).custom(uniqueDays)
  .withMessage('Each day may appear only once'),
body('days.*.hours').optional().isArray({ max: 10 }).custom(validRanges)
  .withMessage('Each range must end after it starts and not overlap another'),
```

- [ ] **Step 4: Check existing data first.** `npm run audit:schedule-overlaps` exists for overlapping schedules; before deploying, also count stored bad ranges: `SELECT count(*) FROM "ShopWorkingHourRange" WHERE "startTime" >= "endTime" OR "startTime" !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$';` If non-zero, list them for Nick to correct in the app.
- [ ] **Step 5: Verify** (3 pass; `scheduleOverlap.test.ts` passes). **Commit and open the Phase 3 PR.**

---

## Phase 4: Input hardening

Tests: `tests/audit/validation/`. The fix is one rule applied to many chains; `tests/audit/COVERAGE.md` section 4 is the checklist of fields.

### Task 15: Backstop — Prisma validation errors are 400s and are not logged whole (VE-09, part of VE-02)

**Files:**
- Modify: `api/src/middleware/errorHandler.ts:38-80`, `api/src/utils/logger.ts`

- [ ] **Step 1:** before the generic 500 branch:

```ts
// A value of the wrong type got past a validator. The client's mistake, and
// the message embeds the query arguments, so it is never logged or returned.
if (err instanceof Prisma.PrismaClientValidationError) {
  logger.warn(
    { path: req.path, method: req.method, name: err.name },
    'Rejected malformed input at the database layer',
  );
  return res.status(400).json({ status: 'error', message: 'Invalid request' });
}
```

- [ ] **Step 2:** add `redact: ['err.meta', '*.passwordHash', '*.password', '*.token']` to the pino options in `logger.ts`.
- [ ] **Step 3: Verify** `ve09` passes and most of `ve02` turns green. **Commit.**

### Task 16: Type-check every validated field (VE-02, VE-06)

**Files:**
- Modify: every file in `api/src/validators/`

- [ ] **Step 1:** apply these four rules to each chain listed under VE-02 in the report:
  - String fields: put `.isString().withMessage('<field> must be a string').bail()` first.
  - Integers: follow `.isInt(...)` with `.toInt()`.
  - Booleans: `.isBoolean({ strict: true })`.
  - Query parameters that must be single values: `.custom((v) => typeof v === 'string')`.

  Example, `authValidation.ts` login:

```ts
body('email').isString().bail().isEmail().withMessage('Valid email is required').normalizeEmail(),
body('password').isString().withMessage('Password is required').bail().notEmpty(),
body('rememberMe').optional().isBoolean({ strict: true }),
```

- [ ] **Step 2: Check the web client** sends real booleans and numbers for every field made strict: `grep -rn "isActive\|sendEmail\|rememberMe\|isOpen" web/src/api web/src/services 2>/dev/null`. Fix any string value at the call site.
- [ ] **Step 3: Verify** `ve02` (9 pass), `ve06` (1 pass), `npm test`, `npm run e2e`. **Commit.**

### Task 17: Reject control characters, cap lengths and pages (VE-03, VE-04, VE-05)

**Files:**
- Create: `api/src/middleware/rejectControlChars.ts`
- Modify: `api/src/app.ts` (after `express.json()`), `shop.validator.ts`, `service.validator.ts`, `team.validator.ts`, `customer.validator.ts`, `authValidation.ts`, `userValidation.ts`

- [ ] **Step 1: Middleware:**

```ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

// PostgreSQL refuses NUL in text, and no field here has a use for control
// characters other than tab and newline.
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/;

const hasControl = (v: unknown): boolean =>
  typeof v === 'string'
    ? CONTROL.test(v)
    : Array.isArray(v)
      ? v.some(hasControl)
      : !!v && typeof v === 'object' && Object.values(v).some(hasControl);

export const rejectControlChars = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (hasControl(req.body) || hasControl(req.query))
    return next(new AppError(400, 'Request contains invalid characters'));
  next();
};
```

Mount with `app.use(rejectControlChars);` directly after `app.use(express.json());`.

- [ ] **Step 2: Caps.** Add `.isLength({ max: NAME_MAX_LENGTH })` to shop, service and team-member `name`; `.isLength({ max: NOTES_MAX_LENGTH })` to shop and service `description`; `.isLength({ max: 200 })` to `formattedAddress`; `.isLength({ max: 128 })` to every `password`; `max: 10_000_000` to service `price` (matching `product.validator.ts:45`); `isInt({ min: 1, max: 100000 }).toInt()` on both `page` rules.
- [ ] **Step 3: Check stored data** will not be locked out of edits: `SELECT count(*) FROM "Shop" WHERE length(name) > 100 OR length(description) > 1000;` and the same for `Service`.
- [ ] **Step 4: Verify** `ve03`, `ve04`, `ve05` pass. **Commit.**

### Task 18: Authenticate before reading large bodies (VE-08)

**Files:**
- Modify: `api/src/app.ts:61-65`, `api/src/routes/customer.routes.ts` (import route)

- [ ] **Step 1:** delete the path-matched 2 MB parser from `app.ts`, and make the default parser skip the import path so the router can read it:

```ts
const IMPORT_PATH = /^\/api\/shops\/[^/]+\/customers\/import\/?$/;
const defaultJson = express.json();
app.use((req, res, next) =>
  IMPORT_PATH.test(req.path) ? next() : defaultJson(req, res, next),
);
```

- [ ] **Step 2:** on the import route, parse after `authenticate`:

```ts
router.post(
  '/import',
  authenticate,
  express.json({ limit: '2mb' }),
  importCustomersValidation,
  validate,
  importCustomers,
);
```

`requireWritableShop` at the mount does not read the body, so it is unaffected. Move `rejectControlChars` so it also runs on this route (add it after the route-level parser).
- [ ] **Step 3: Verify** `ve08` passes and `customerImportExport.test.ts` passes. **Commit and open the Phase 4 PR.**

---

## Phase 5: Public exposure and customer identity

### Task 19: Trim the public shop payload (TI-04)

**Files:**
- Modify: `api/src/services/public.service.ts:96-115`; check `web/src` for use of the removed member fields

- [ ] **Step 1: Confirm TI-04a/b/c fail.**
- [ ] **Step 2:** for `context === 'public'`, list only bookable members with a minimal projection and filter their services like the shop's:

```ts
members: {
  where: {
    active: true,
    ...(context === 'public' && { bookableByCustomers: true }),
  },
  select: {
    id: true,
    name: true,
    photoUrl: true,
    ...(context !== 'public' && {
      shopId: true,
      role: true,
      createdAt: true,
      bookableByCustomers: true,
      bookableInternally: true,
    }),
    staffServices: {
      where: {
        service: {
          isActive: true,
          ...(context === 'public' && { showOnPublicPage: true }),
        },
      },
      include: { service: { select: { id: true, name: true } } },
    },
  },
},
```

The `schedules` query below filters on `m.bookableByCustomers`; with the public filter in the query, use all returned members when `context === 'public'`.
- [ ] **Step 3:** `grep -rn "bookableByCustomers\|\.role" web/src/pages/public web/src/features/booking 2>/dev/null` and remove any use on the public page.
- [ ] **Step 4: Verify** TI-04, `internalService.test.ts`, `shopPublicBranding.test.ts`, e2e booking flow. **Commit.**

### Task 20: Document personal durations on the public grid as intended (TI-05, PB-10) — decision D3

Decided: the behaviour stays. A customer who identifies themselves in the first step of the wizard ("continue as") is shown slots sized to their own durations; a customer who skips that step gets the service's default durations. The audit's point that the slot list therefore differs for a known phone is accepted. No behaviour changes in this task.

**Files:**
- Modify: `api/src/controllers/public.controller.ts:302-318` (comment only)
- Modify (the permitted audit-test edits): `tests/audit/tenant-isolation/publicExposure.test.ts` (TI-05), `tests/audit/public-booking/findings.test.ts` (PB-10)
- Modify: `tests/audit/REPORT.md`

- [ ] **Step 1: Correct the comment** at `public.controller.ts:305-306`. It currently says whether the phone is known is never revealed, which is not true. Replace it with:

```ts
// Sent only when the customer chose "continue as" in the first step: their
// own durations then size the grid. Skipping that step sends no phone and
// gets the default durations. A known phone with a personal duration is
// therefore distinguishable from an unknown one here; accepted (audit TI-05).
```

- [ ] **Step 2: Move the two tests to documented behaviour.** Cut the `TI-05` test out of `publicExposure.test.ts` and the `PB-10` test out of `findings.test.ts`. Put one test in a new file `tests/audit/public-booking/personalDuration.negative.test.ts` that asserts the intended behaviour both ways, reusing the setup of the PB-10 test:

```ts
// Decision D3 (2026-10-06): personal durations on the public grid are
// intended. Identified customers see their own grid; everyone else the default.
it('TI-05/PB-10 (accepted): the grid follows the identified customer, and is the default otherwise', async () => {
  const known = await slots({ phone: KNOWN_PHONE });
  const unknown = await slots({ phone: '+306900000000' });
  const none = await slots({});
  expect(known).not.toEqual(none); // personal duration applied
  expect(unknown).toEqual(none); // an unknown phone changes nothing
});
```

`slots` and `KNOWN_PHONE` stand for the request helper and fixture the PB-10 test already builds; keep its setup verbatim.

- [ ] **Step 3:** in `tests/audit/REPORT.md`, mark TI-05 "Accepted by design (D3)" in the summary table.
- [ ] **Step 4: Verify** the new file passes and the two source files have one failing test fewer each. **Commit:** `git commit -am "Document personal durations on the public slot grid as intended"`

### Task 21: One canonical phone per customer (PB-09)

**Files:**
- Modify: `api/src/validators/common.ts` (new `normalizePhone`), every customer write path (`booking.service.ts:441-457`, `customer.service.ts` update, import and merge lookups, `customerDuration.service.ts:21-31`)
- Create: `api/prisma/migrations/<timestamp>_normalize_customer_phone/migration.sql`

- [ ] **Step 1:** helper, applied with `.customSanitizer(normalizePhone)` in the customer field validators and to import rows:

```ts
// Storage form: digits, with a leading + kept. Formatting never makes a
// second customer; a missing country code still does (not guessed here).
export const normalizePhone = (value: string): string =>
  (value.trim().startsWith('+') ? '+' : '') + value.replace(/\D/g, '');
```

- [ ] **Step 2: Report collisions before migrating** (Nick runs on production, read-only). Rows returned are pairs that become the same customer and must be merged in the app first:

```sql
SELECT "shopId", regexp_replace(phone, '[^0-9+]', '', 'g') AS canonical, count(*)
FROM "Customer" GROUP BY 1, 2 HAVING count(*) > 1;
```

- [ ] **Step 3: Migration** (fails safely on the unique index if a collision remains):

```sql
UPDATE "Customer"
SET phone = regexp_replace(phone, '[^0-9+]', '', 'g')
WHERE phone ~ '[^0-9+]';
```

- [ ] **Step 4: Verify** PB-09, `customerUpsert.test.ts`, `customerMerge.test.ts`, `customerImportExport.test.ts`. **Commit.**

### Task 22: Document the absence of a per-phone booking cap (PB-02) — decision D1

Decided: no cap. One phone may hold any number of bookings; the per-IP limiter on public writes (20 per 15 minutes, `api/src/middleware/rateLimiter.ts:66-73`) remains the only control. No behaviour changes in this task.

**Files:**
- Modify: `api/src/middleware/rateLimiter.ts:59-73` (comment only), `docs/deployment.md`
- Modify (the permitted audit-test edit): `tests/audit/public-booking/findings.test.ts` (PB-02)
- Modify: `tests/audit/REPORT.md`

- [ ] **Step 1:** add one sentence to the comment above `publicWriteLimiter`: "There is deliberately no cap on how many bookings one phone number may hold (audit PB-02); this limiter is the only brake on bulk booking." Add the same sentence to the rate-limiting section of `docs/deployment.md`, with what a shop owner can do if it happens (cancel the bookings from the calendar).
- [ ] **Step 2:** move the `PB-02` test from `findings.test.ts` into `tests/audit/public-booking/personalDuration.negative.test.ts`'s sibling, a new `tests/audit/public-booking/noBookingCap.negative.test.ts`, keeping its setup and changing only the final assertion and title:

```ts
// Decision D1 (2026-10-06): no per-phone cap.
it('PB-02 (accepted): one phone may take every slot of a day', async () => {
  // ...existing PB-02 setup and the 20 requests, unchanged...
  expect(counts).toEqual({ '201': 20 });
});
```

- [ ] **Step 3:** in `tests/audit/REPORT.md`, mark PB-02 "Accepted by design (D1)" in the summary table.
- [ ] **Step 4: Verify** and **commit:** `git commit -am "Document that public bookings have no per-phone cap"`

### Task 23: Per-booking contact email (PB-11) — decision D7

**Files:**
- Modify: `api/prisma/schema.prisma` (`Booking.contactEmail String?`), new migration, `booking.service.ts` (public create stores the typed email), `api/src/utils/bookingEmail.ts:27`, `utils/reminders.ts`

- [ ] **Step 1:** migration: `ALTER TABLE "Booking" ADD COLUMN "contactEmail" TEXT;`
- [ ] **Step 2:** public create writes `contactEmail: data.email ?? null`. The customer upsert stays `update: {}`.
- [ ] **Step 3:** the recipient becomes `booking.contactEmail ?? booking.customer.email` in `bookingEmail.ts`, the cancel and reschedule emails in `public.controller.ts`, and the reminder job. A reschedule copies `contactEmail` to the new booking.
- [ ] **Step 4: Verify** PB-11, `reminders.test.ts`, `customerUpsert.test.ts`. Add `contactEmail` to the GDPR export in `customer.service.ts:451-465`. **Commit and open the Phase 5 PR.**

---

## Phase 6: Token hardening

### Task 24: Hash stored tokens (AU-07)

**Files:**
- Modify: `api/src/services/auth.service.ts` at `:42-49`, `:187-189`, `:248-250`, `:296-307`, `:336-344`, `:394-403`, `:442-453`, `:532-547`, the sessions and logout lookups; new migration

- [ ] **Step 1:** at every write, store `hashToken(token)` (from `utils/jwt.ts:42`) and keep sending the raw token by email or cookie. At every lookup, query by `hashToken(incoming)`.
- [ ] **Step 2: Migration** hashes existing rows in place, so nobody is logged out and emailed links keep working (`pgcrypto` not needed; `sha256` is built in from PostgreSQL 11):

```sql
UPDATE "RefreshToken" SET token = encode(sha256(convert_to(token, 'UTF8')), 'hex');
UPDATE "PasswordResetToken" SET token = encode(sha256(convert_to(token, 'UTF8')), 'hex');
UPDATE "PendingRegistration" SET token = encode(sha256(convert_to(token, 'UTF8')), 'hex');
UPDATE "PendingEmailChange" SET token = encode(sha256(convert_to(token, 'UTF8')), 'hex');
UPDATE "EmailVerificationToken" SET token = encode(sha256(convert_to(token, 'UTF8')), 'hex');
```

- [ ] **Step 3:** Task 6 re-sends an existing pending registration's token, which is no longer readable. Change that branch to issue a fresh token, store its hash on the existing row (keeping the original `passwordHash`), and email the fresh one.
- [ ] **Step 4: Verify** `au07` (4 pass), `au03` still passes, `auth.test.ts`, `refreshRace.test.ts`, `rememberMe.test.ts`. **Commit.**

### Task 25: JWT secret policy, token type, logout origin, per-account throttle (AU-08, AU-10, AU-09, AU-06)

**Files:**
- Modify: `api/src/config/parseEnv.ts:99-101`, `api/src/utils/jwt.ts`, `api/src/controllers/auth.controller.ts:107-125`, `api/src/middleware/rateLimiter.ts`, `api/src/routes/auth.routes.ts:35`, `api/.env.test`, `docs/deployment.md`

- [ ] **Step 1 (before anything else): Nick confirms** the two production JWT secrets on Railway are each at least 32 characters and differ from each other. If not, rotate them first; rotating logs everyone out once.
- [ ] **Step 2 (AU-08):** in `parseEnv`, after the required-vars loop:

```ts
for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const) {
  if (source[key] && source[key]!.length < 32)
    errors.push(`${key} must be at least 32 characters`);
}
if (
  source.JWT_ACCESS_SECRET &&
  source.JWT_ACCESS_SECRET === source.JWT_REFRESH_SECRET
)
  errors.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ');
```

Lengthen the two values in `api/.env.test` and `api/.env.example` to 32+ characters. In `jwt.ts`, sign with `{ userId, typ: 'access' }` / `{ userId, typ: 'refresh' }`, verify with `{ algorithms: ['HS256'] }`, and make `verifyAccessToken` throw unless `typ === 'access'`. `verifyRefreshToken` accepts a missing `typ` until 30 days after release (existing refresh tokens), then requires `'refresh'`; leave a dated comment.
- [ ] **Step 3 (AU-10):** at the top of the `logout` and `refresh` controllers:

```ts
const origin = req.get('origin');
if (origin && !env.clientUrls.includes(origin))
  throw new AppError(403, 'Forbidden');
```

- [ ] **Step 4 (AU-09, decision D5):** add to `rateLimiter.ts` and mount on `/login` after `authLimiter`:

```ts
// Per account, whatever the address: counts only failed attempts.
export const loginAccountLimiter: RequestHandler = limiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req: Request) =>
    `login:${String(req.body?.email ?? '').trim().toLowerCase()}`,
  message: {
    status: 'error',
    message: 'Too many requests, please try again later.',
  },
});
```

Note in `docs/deployment.md` that this lets anyone lock a known email out of login for 15 minutes, and that password reset still works.
- [ ] **Step 5 (AU-06, decision D4):** add a "Token lifetime" paragraph to `docs/deployment.md` stating that access tokens last 15 minutes and are not revoked by password reset or "log out everywhere". Then, as the one permitted audit-test edit, change the two assertions in `tests/audit/auth/au06-staleAccessToken.test.ts` to expect 200 within the window and rename the file `au06-staleAccessToken.negative.test.ts`, with a header comment citing the decision.
- [ ] **Step 6: Verify** `au06`, `au08`, `au09`, `au10`, `tokenForgery.test.ts`, `tokenValidation.test.ts`, `rateLimiterSwitch.test.ts`. **Commit.**

### Task 26: Turn the audit suite into a CI gate

**Files:**
- Modify: `.github/workflows/ci.yml` (the API test job), `tests/audit/REPORT.md`

- [ ] **Step 1:** run `npm run test:audit`. Expected: `0 failed`. Anything red is unfinished work, not a test to relax.
- [ ] **Step 2:** in the API test job, add a step after the existing `npm test` step, with the same env:

```yaml
      - name: Audit regression tests
        working-directory: api
        run: npm run test:audit
```

- [ ] **Step 3:** add a "Status" column to the summary table in `tests/audit/REPORT.md` with the fixing commit for each finding, and note the findings accepted by design (D1, D3, D4).
- [ ] **Step 4:** delete the four scratch databases: `for s in a b c d; do dropdb booking_app_test_audit_$s; done`
- [ ] **Step 5: Commit and open the Phase 6 PR.**

---

## Coverage check

| Finding | Task | Finding | Task | Finding | Task |
|---|---|---|---|---|---|
| TI-01, TI-02, VE-01 | 1, 3 | PB-01 | 8 | VE-02 | 15, 16 |
| TI-03 | 2 | PB-02 | 22 | VE-03 | 17 |
| TI-04 | 19 | PB-03 | 13 | VE-04 | 17 |
| TI-05, PB-10 | 20 | PB-04 | 9 | VE-05 | 17 |
| AU-01 | 4 | PB-05, PB-06 | 10 | VE-06 | 16 |
| AU-02 | 5 | PB-07 | 11 | VE-07 | 14 |
| AU-03 | 6 | PB-08 | 12 | VE-08 | 18 |
| AU-04, AU-05 | 7 | PB-09 | 21 | VE-09 | 15 |
| AU-06, AU-08, AU-09, AU-10 | 25 | PB-11 | 23 | | |
| AU-07 | 24 | PB-12 | 13 | | |

## Where this plan is thinner than the code it describes

Phases 1 and 2 and Tasks 9, 10, 14, 15, 17 quote code read from the repository. In Tasks 11, 13, 22 and 23 the surrounding functions (`getAvailableSlots`, `pickAnyStaff`, the public create transaction, the email senders) were read only in part, so the snippets show the change and name the helper to use; the implementer must read the function first and fit the change to its real variable names. The tests are the contract in every case.
