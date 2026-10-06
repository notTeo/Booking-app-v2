# Repo map (audit)

Generated 2026-10-06 from branch `dev` @ `4868d53`. Paths are relative to the repo root.
This is a map, not an audit: it says where things are, not whether they are correct.

## Layout

| Path | What |
|---|---|
| `api/` | Express 5 + TypeScript + Prisma 7 (pg adapter) backend. Its own npm project. |
| `api/src/app.ts` | App wiring: global middleware, router mounts, error handler, process handlers. |
| `api/src/routes/` | Route tables (middleware chains). |
| `api/src/validators/` | express-validator chains, one file per router. `common.ts`, `slug.ts` shared. |
| `api/src/controllers/` | Thin handlers: read `req`, call a service, shape the response. |
| `api/src/services/` | Business logic and nearly all Prisma queries. |
| `api/src/utils/` | `shopAccess.ts` (tenant/role gate), `jwt.ts`, `serializable.ts` (tx retry), `slots.ts`, `shopTime.ts`, `prisma.ts`, `cleanup.ts`, `reminders.ts`. |
| `api/src/middleware/` | `authenticate`, `validate`, `rateLimiter`, `requireWritableShop`, `photoUpload`, `requestId`, `errorHandler`. |
| `api/src/config/` | `env.ts` / `parseEnv.ts` (env parsing, secrets), `terms.ts`. |
| `api/src/admin/`, `api/scripts/` | CLI-only tenant/seed scripts (not HTTP-reachable). |
| `api/prisma/schema.prisma` | Models. Migrations in `api/prisma/migrations/` (note raw-SQL constraints: `20260929130000_booking_no_overlap_constraint`, `20260930120000_schedule_no_overlap_constraint`, `20261004100100_single_owner_per_shop`). |
| `api/src/tests/` | Existing Vitest + Supertest suite (~90 files). Helpers in `helpers.ts`, `testRequest.ts`, `setup.ts`, `globalSetup.ts`. |
| `web/` | React + Vite frontend (out of scope except as a consumer of the API). |
| `e2e/` | Playwright suite (out of scope). |

## Global middleware (`api/src/app.ts`, in order)

1. `app.set('trust proxy', 1)` (line 27)
2. `requestId` (28)
3. `helmet({...})` (29-47): HSTS only in production, CSP disabled, frameguard deny
4. `cors({ origin: env.clientUrls, credentials: true, exposedHeaders: ['Retry-After'] })` (49-58)
5. `cookieParser()` (59)
6. `express.json({ limit: '2mb' })` only for `/api/shops/:id/customers/import` (61-64), then `express.json()` default 100kb (65)
7. `GET /health` (69-89)
8. `/docs` Swagger UI when `NODE_ENV !== 'production'` (92-97)
9. Router mounts (99-104), then `ErrorHandler` (106)
10. `unhandledRejection` / `uncaughtException` handlers, only when `NODE_ENV !== 'test'` (128-139)

## Middleware

| File | Behaviour (as written) |
|---|---|
| `middleware/authenticate.ts` | Reads `Authorization: Bearer <jwt>`, `verifyAccessToken` (`utils/jwt.ts`), sets `req.user = { userId }`. 401 otherwise. Does not load the user or any membership. |
| `utils/shopAccess.ts` `requireShopAccess(userId, shopId, {role})` | NOT middleware: called from services/controllers. Looks up `UserShop {userId, shopId, active: true}`; 404 if none; 403 if role below `owner`/`manager`. Also `canManage`, `canManageManagers`, `canEditShopSettings`, `canViewCustomerDetails`. **Tenant and role enforcement lives here, per call site.** |
| `middleware/requireWritableShop.ts` | Blocks non-GET/HEAD (optionally allows DELETE) with 403 `SHOP_LOCKED` when the caller is an active member of a locked shop. Passes non-members through. Not an access check. |
| `middleware/validate.ts` | `validate` / `validateAs(code)`: 400 with the first express-validator message. |
| `middleware/rateLimiter.ts` | `authLimiter` 10/15min, `forgotPasswordLimiter` 5/h, `refreshLimiter` 60/15min (skipped without cookie), `publicReadLimiter` 100/15min, `publicWriteLimiter` 20/15min. **All are pass-through when `NODE_ENV === 'test'`** or `RATE_LIMIT_DISABLED=true` outside production. |
| `middleware/photoUpload.ts` | multer upload for photo routes. |
| `middleware/errorHandler.ts` | `AppError` -> its status/message/code/details; Prisma `P2003` -> 409; any error carrying a 4xx `status` -> that status with `err.message`; everything else -> 500 generic. |
| `middleware/requestId.ts` | Request id + request log line. |

## Routes

`A` = `authenticate` in the chain. `V` = validator chain + `validate`. Shop-scoped routers are mounted in `routes/shop.routes.ts:97-135` as `router.use('/:shopId/<x>', authenticate, requireWritableShop(), <router>)`.

### `/auth` (`routes/auth.routes.ts`) -> `controllers/auth.controller.ts` -> `services/auth.service.ts`

| Method | Path | Chain |
|---|---|---|
| POST | `/auth/register` | authLimiter, V registerValidation |
| POST | `/auth/login` | authLimiter, V loginValidation |
| POST | `/auth/refresh` | refreshLimiter, V refreshCookieValidation |
| POST | `/auth/logout` | V refreshCookieValidation |
| GET | `/auth/verify-email` | V verifyEmailTokenValidation |
| GET | `/auth/verify-email-change` | V verifyEmailTokenValidation |
| POST | `/auth/resend-verification` | forgotPasswordLimiter, V |
| POST | `/auth/forgot-password` | forgotPasswordLimiter, V |
| POST | `/auth/reset-password` | authLimiter, V |
| GET | `/auth/sessions` | A (no validator) |
| DELETE | `/auth/sessions` | A (no validator) |

### `/user` (`routes/user.routes.ts`) -> `controllers/user.controller.ts`

| Method | Path | Chain |
|---|---|---|
| GET | `/user/me` | A |
| PATCH | `/user/me` | A, V updateMeValidation |
| DELETE | `/user/me` | A, V deleteAccountValidation |

### `/api/shops` (`routes/shop.routes.ts`) -> `shop.controller.ts`, `overview.controller.ts`, `workingHours.controller.ts`

| Method | Path | Chain |
|---|---|---|
| POST | `/api/shops` | A, V createShopValidation |
| GET | `/api/shops` | A |
| GET | `/api/shops/overview` | A, V myOverviewValidation |
| GET | `/api/shops/upcoming` | A |
| GET | `/api/shops/:id` | A, V |
| PATCH | `/api/shops/:id` | A, requireWritableShop, V updateShopValidation |
| DELETE | `/api/shops/:id` | A, V |
| PUT | `/api/shops/:id/photo` | A, requireWritableShop, V, photoUpload |
| DELETE | `/api/shops/:id/photo` | A, requireWritableShop, V |
| GET | `/api/shops/:shopId/schedules/day` | A, V dayScheduleValidation |
| GET | `/api/shops/:shopId/overview` | A, V overviewValidation |

### `/api/shops/:shopId/team` (`routes/team.routes.ts`) -> `team.controller.ts` -> `team.service.ts`, `invite.service.ts`, `photo.service.ts`

| Method | Path | Chain |
|---|---|---|
| GET | `/` | A, V |
| POST | `/` | A, V createTeamMemberValidation |
| GET | `/:memberId` | A, V |
| PATCH | `/:memberId` | A, V updateMemberRoleValidation |
| DELETE | `/:memberId` | A, V |
| POST / DELETE | `/:memberId/invite` | A, V |
| POST | `/:memberId/transfer-ownership` | A, V |
| PUT / DELETE | `/:memberId/photo` | A, V (, photoUpload) |
| GET | `/:memberId/services` | A, V -> `service.controller.getMemberServices` |

### `/api/shops/:shopId/team/:memberId/schedules` (`routes/workingHours.routes.ts`) -> `workingHours.controller.ts` -> `workingHours.service.ts`

| Method | Path | Chain |
|---|---|---|
| POST | `/` | A, V createScheduleValidation |
| GET | `/` | A, V |
| GET / PATCH / DELETE | `/:scheduleId` | A, V |
| PUT | `/:scheduleId/days` | A, V upsertDaysValidation |
| PATCH | `/:scheduleId/days/:day` | A, V updateDayValidation |

### `/api/shops/:shopId/time-off` (`routes/timeOff.routes.ts`) -> `timeOff.controller.ts` -> `timeOff.service.ts`

GET `/`, POST `/`, PATCH `/:timeOffId`, DELETE `/:timeOffId` — all A, V.

### `/api/shops/:shopId/services` (`routes/service.routes.ts`) -> `service.controller.ts` -> `service.service.ts`

POST `/`, GET `/`, GET/PATCH/DELETE `/:serviceId`, POST `/:serviceId/staff`, DELETE `/:serviceId/staff/:userShopId` — all A, V.

### `/api/shops/:shopId/products` (`routes/product.routes.ts`) -> `product.controller.ts` -> `product.service.ts`

POST `/`, GET `/`, GET/PATCH/DELETE `/:productId`, PUT/DELETE `/:productId/photo` — all A, V.

### `/api/shops/:shopId/bookings` (`routes/booking.routes.ts`) -> `booking.controller.ts` -> `booking.service.ts`, `bookingRules.service.ts`

| Method | Path | Chain |
|---|---|---|
| POST | `/` | A, V ownerCreateBookingValidation |
| GET | `/` | A, V listBookingsValidation |
| GET | `/stats` | A, V |
| GET | `/wizard-info` | A, V |
| GET | `/slots` | A, V ownerSlotsValidation |
| GET | `/:bookingId` | A, V |
| PATCH | `/:bookingId` | A, V updateBookingValidation |
| PATCH | `/:bookingId/status` | A, V updateStatusValidation |
| PATCH / DELETE | `/:bookingId/products/:lineId` | A, V |

### `/api/shops/:shopId/customers` (`routes/customer.routes.ts`) -> `customer.controller.ts` -> `customer.service.ts`, `customerDuration.service.ts`

Mounted with `requireWritableShop({ allowDelete: true })`.
GET `/`, GET `/export-all`, POST `/import`, GET/PATCH/DELETE `/:customerId`, GET `/:customerId/bookings`, PUT `/:customerId/service-durations`, GET `/:customerId/export`, POST `/:customerId/merge` — all A, V.

### `/api/invites` (`routes/globalInvite.routes.ts`) -> `invite.controller.ts` -> `invite.service.ts`

| Method | Path | Chain |
|---|---|---|
| GET | `/api/invites/lookup` | **no auth**, V lookupTokenQueryValidation |
| GET | `/api/invites` | A |
| POST | `/api/invites/:inviteId/accept` | A, V |
| POST | `/api/invites/:inviteId/decline` | A, V |

### `/public` (`routes/public.routes.ts`) — **no auth** -> `public.controller.ts` -> `public.service.ts`, `booking.service.ts`

| Method | Path | Chain |
|---|---|---|
| POST | `/public/cancel` | publicWriteLimiter, cancelBookingValidation, validateAs |
| POST | `/public/booking` | publicReadLimiter, cancelBookingValidation, validateAs |
| POST | `/public/reschedule` | publicWriteLimiter, rescheduleBookingValidation, validateAs |
| GET | `/public/:slug/slots` | publicReadLimiter, V getPublicSlotsValidation |
| GET | `/public/:slug` | publicReadLimiter, V getShopInfoValidation |
| POST | `/public/:slug/book` | publicWriteLimiter, V createBookingValidation |

### Other

| Method | Path | Chain |
|---|---|---|
| GET | `/media/<key>` (`routes/media.routes.ts`) | **no auth**, no validator; key tested against `MEDIA_KEY_PATTERN` (`services/storage.service.ts`) |
| GET | `/health` | none |
| * | `/docs` | Swagger UI, non-production only |

## Prisma models (`api/prisma/schema.prisma`)

| Model | Tenant key | Notes |
|---|---|---|
| `Shop` | is the tenant (`id`, unique `slug`) | plan / subscriptionStatus / trialEndsAt drive `isShopLocked` |
| `UserShop` | `shopId` | Membership AND the bookable staff member. `userId` nullable. `role` owner/manager/staff, `active`, permission flags. `@@unique([userId, shopId])` |
| `ShopInvite` | `shopId`, `userShopId` | `tokenHash` unique, status, expiresAt |
| `ShopWorkingSchedule` | `shopId` | `staffId` nullable; children `ShopWorkingDay` -> `ShopWorkingHourRange` have **no shopId** (reach tenant via parent) |
| `TimeOff` | `shopId` | `staffId` -> UserShop, nullable |
| `Service` | `shopId` | `isActive`, `showOnPublicPage` |
| `StaffService` | none directly (`userShopId`, `serviceId`) | join table |
| `Customer` | `shopId` | `@@unique([shopId, phone])`, `isSystem` placeholder |
| `CustomerServiceDuration` | none directly (`customerId`, `serviceId`) | |
| `Product` | `shopId` | `supplierUrl` is shop-private |
| `Booking` | `shopId` | `customerId`, `serviceId`, `staffId` (UserShop), `startTime`/`endTime` timestamptz, `status`, `cancelToken` unique, `overriddenRules`, `rescheduledFromId` |
| `BookingService`, `BookingProduct` | none directly (`bookingId`) | line items |
| `User` | global | `passwordHash` nullable, `isVerified`, `email` unique |
| `RefreshToken`, `EmailVerificationToken`, `PasswordResetToken`, `PendingRegistration`, `PendingEmailChange` | per user / global | auth state |

## Writing and running audit tests

Audit tests live in `tests/audit/<area>/*.test.ts` and run through the API's own Vitest config (root `api/`), so they inherit `api/.env.test`, `globalSetup.ts` (migrates the DB, refuses a DB whose name lacks "test") and `setup.ts` (clock frozen at `2026-12-01T09:00:00Z`, all shops/users deleted after each test).

- Test files sit outside any `node_modules`, so **bare package imports do not resolve** (`import request from 'supertest'` fails). Import through the API instead:
  - `import app from '../../../api/src/app';`
  - `import { serve } from '../../../api/src/tests/testRequest';` -> `const api = await serve(app); await api.get('/x')` (a Supertest agent)
  - `import { createTenant, authHeader, createBookingRow, createStaffMember, addWeeklySchedule, addService, addManager, unique } from '../../../api/src/tests/helpers';`
  - `import { prisma } from '../../../api/src/utils/prisma';`
  - `describe / it / expect / vi / beforeEach` are globals.
- Run (from `api/`), one area:
  `TEST_DATABASE_URL=postgresql://nicktheodosis@localhost:5432/<your db> npx vitest run --dir ../tests/audit/<area>`
- The local Postgres has no `postgres` role; always pass `TEST_DATABASE_URL` with the `nicktheodosis` role.
- Rate limiters are disabled under `NODE_ENV=test` (decided at module load in `middleware/rateLimiter.ts`).
- `tests/audit/smoke.test.ts` is a working example.
- Existing coverage worth checking before claiming a gap: `api/src/tests/` (e.g. `crossShopIds`, `tenantForeignIds`, `listIsolation`, `shopScopedListRoutes`, `tokenForgery`, `tokenValidation`, `refreshRace`, `concurrency`, `overlapIntegrity`, `bookingNoOverlapConstraint`, `customerUpsert`, `publicRateLimiter`, `errorHandler`, `cors`, `bookingFieldValidation`, `shopMassAssignment`).
