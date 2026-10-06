# Audit coverage tables

Companion to [REPORT.md](REPORT.md). Branch `dev` @ `4868d53`. `svc/` = `api/src/services/`; other bare paths are under `api/src/`. Sub-router paths are under `/api/shops/:shopId`.

## 1. Tenant isolation: route | query | tenant-scoped? | evidence

"Access" = `requireShopAccess` (`utils/shopAccess.ts:29-49`).

| Route | Query | Scoped? | Evidence |
|---|---|---|---|
| POST `/api/shops` | `shop.create` + owner member, whitelisted | Yes | `svc/shop.service.ts:47-56,115-136` |
| GET `/api/shops` | `userShop.findMany {userId, active}` | Yes | `shop.service.ts:143-146` |
| GET `/api/shops/overview` | raw SQL joined to caller's shops | Yes | `svc/overview.service.ts:176-206,291-301` |
| GET `/api/shops/upcoming` | `booking.findMany {shopId in caller's}` | Yes | `overview.service.ts:325-331` |
| GET `/api/shops/:id` | access, then `findUniqueOrThrow {id}` | Yes | `shop.service.ts:156-157` |
| PATCH `/api/shops/:id` | access (manager), whitelisted `update {id}` | Yes | `shop.service.ts:58-74,167-195` |
| DELETE `/api/shops/:id` | access (owner), `delete {id}` | Yes | `shop.service.ts:202-208` |
| PUT/DELETE `/api/shops/:id/photo` | access, `update {id}`; files under `shops/<shopId>/` | Yes | `shop.service.ts:215-273`; `svc/photo.service.ts:135-136` |
| GET `/schedules/day` | access; `userShop.findMany {shopId}`; `loadDayHours(shopId, …)` | Yes | `svc/workingHours.service.ts:414-422`; `svc/bookingRules.service.ts:71-93` |
| GET `/overview` | access; `computeOverview([shop])` | Yes | `overview.service.ts:270-281` |
| GET `/team` | `findMany {shopId}` | Yes | `svc/team.service.ts:97-101` |
| POST `/team` | `create {shopId, …picked}` | Yes | `team.service.ts:120-151` |
| GET `/team/:memberId` | `findFirst {id, shopId}` | Yes | `team.service.ts:87-94` |
| PATCH `/team/:memberId` | member checked, `update {id}` picked fields | Yes | `team.service.ts:171-172,267-281` |
| DELETE `/team/:memberId` | member checked, `delete {id}` | Yes | `team.service.ts:294-308` |
| POST/DELETE `/team/:memberId/invite` | member checked; `shopInvite` by `userShopId` | Yes | `team.service.ts:371-372,404-429,453-459` |
| POST `/team/:memberId/transfer-ownership` | owner access, member checked | Yes | `team.service.ts:323-354` |
| PUT/DELETE `/team/:memberId/photo` | member checked, `update {id}` | Yes | `team.service.ts:470-529` |
| GET `/team/:memberId/services` | member `{id, shopId}`, `staffService.findMany {userShopId}` | Yes (shows a foreign service only if TI-02d planted one) | `svc/service.service.ts:185-195` |
| POST `/team/:memberId/schedules` | member `{id, shopId}`, `create {shopId, staffId, …picked}` | Yes | `workingHours.service.ts:139-184` |
| GET `/team/:memberId/schedules` | member checked, `findMany {shopId, staffId}` | Yes | `workingHours.service.ts:200-213` |
| GET/PATCH/DELETE `…/schedules/:scheduleId` | `findUnique {id}`, then `shopId` and `staffId` compared | Yes | `workingHours.service.ts:116-131,223,239,288` |
| PUT `…/:scheduleId/days`, PATCH `…/days/:day` | schedule checked; children via that schedule | Yes | `workingHours.service.ts:305-338,359-392` |
| GET `/time-off` | `memberId` checked; `findMany {shopId}` | Yes | `svc/timeOff.service.ts:125-133` |
| POST `/time-off` | body `staffId` checked `{id, shopId}`; `create {shopId, …picked}` | Yes | `timeOff.service.ts:142-163` |
| PATCH/DELETE `/time-off/:timeOffId` | `findUnique {id}`, `shopId` compared | Yes | `timeOff.service.ts:65-70,182,222` |
| POST `/services` | `create { shopId, ...body }` | **No (TI-01)** | `service.service.ts:38-40` |
| GET `/services` | `findMany {shopId}` | Yes | `service.service.ts:49-52` |
| GET `/services/:serviceId` | `findFirst {id, shopId}` | Yes | `service.service.ts:62-73` |
| PATCH `/services/:serviceId` | target checked; `update {id}, data: body` | **No (TI-02)** | `service.service.ts:87-95` |
| DELETE `/services/:serviceId` | target checked `{id, shopId}` | Yes | `service.service.ts:108-125` |
| POST `/services/:serviceId/staff` | service and member both `{id, shopId}` | Yes | `service.service.ts:140-154` |
| DELETE `/services/:serviceId/staff/:userShopId` | `findFirst {userShopId, serviceId}` | **No (TI-03)** | `service.service.ts:168-173` |
| POST `/products` | `create {shopId, …picked}` | Yes | `svc/product.service.ts:57-66` |
| GET `/products` | `findMany {shopId}` | Yes | `product.service.ts:75-78` |
| GET/PATCH/DELETE `/products/:productId`, PUT/DELETE `…/photo` | `findFirst {id, shopId}` first; `pickFields` | Yes | `product.service.ts:24-32,42-48,99-103,113-115,129-141,152-156` |
| POST `/bookings` | services, staff, products all `{…, shopId}`; customer by `shopId_phone` | Yes | `svc/booking.service.ts:104-111,311-318,391-393,448-456,672` |
| GET `/bookings` | `findMany {shopId, …filters}` | Yes | `booking.service.ts:1070-1095` |
| GET `/bookings/stats` | all `{shopId}` | Yes | `booking.service.ts:1118-1151` |
| GET `/bookings/wizard-info` | access; `shop.findFirst {id}` | Yes | `controllers/booking.controller.ts:60-61` |
| GET `/bookings/slots` | access; staff, services, `forBookingId`, `customerId` all pinned to shop | Yes | `booking.controller.ts:76`; `booking.service.ts:849-857,874-906`; `svc/customerDuration.service.ts:21-28` |
| GET `/bookings/:bookingId` | `findUnique {id}`, `shopId` compared | Yes | `booking.service.ts:1166-1184` |
| PATCH `/bookings/:bookingId` | booking checked; new service/staff `{id, shopId}` | Yes | `booking.service.ts:1343,1354-1356,1369-1376` |
| PATCH `/bookings/:bookingId/status` | booking checked, `update {id}` | Yes | `booking.service.ts:1468,1496-1498` |
| PATCH/DELETE `/bookings/:bookingId/products/:lineId` | `findFirst {id, bookingId, booking:{shopId}}` | Yes (a `FOR UPDATE` lock by bare `lineId` precedes it at `:1733,1790`; lock only) | `booking.service.ts:1734-1737,1791-1794` |
| GET `/customers` | `{shopId, isSystem:false}` | Yes | `svc/customer.service.ts:44-64` |
| GET `/customers/export-all` | `findMany {shopId}` | Yes | `customer.service.ts:316-320` |
| POST `/customers/import` | `{shopId, phone in}`; `create {shopId, …picked}` | Yes | `customer.service.ts:379-427` |
| GET/PATCH/DELETE `/customers/:customerId` | `findUnique {id}`, `shopId` compared; bookings `{customerId, shopId}` | Yes | `customer.service.ts:18-26,92-104,218,232-240,503-509` |
| GET `/customers/:customerId/bookings` | customer checked, `{customerId, shopId}` | Yes | `customer.service.ts:178-201` |
| PUT `/customers/:customerId/service-durations` | customer checked; `service.count {shopId, id in}` | Yes | `customer.service.ts:150-166` |
| GET `/customers/:customerId/export` | customer checked | Yes | `customer.service.ts:451-465` |
| POST `/customers/:customerId/merge` | target and source both `shopId` compared | Yes | `customer.service.ts:259-291` |
| GET `/api/invites` | received by caller's email; sent by `createdById` | Caller-scoped, not membership-scoped | `svc/invite.service.ts:28-42` |
| POST `/api/invites/:inviteId/accept`, `/decline` | `findUnique {id}`, email must match caller | Yes | `invite.service.ts:55-87,104-117` |
| GET `/api/invites/lookup` | by `tokenHash` | Token holder only | `invite.service.ts:125-147` |
| GET `/media/<key>` | storage get by key | Public by design; random keys, pattern-checked | `routes/media.routes.ts:9-24`; `svc/storage.service.ts:29` |
| GET `/public/:slug` | `shop.findFirst {slug, isActive}` + relations | Shop-scoped, over-exposes (TI-04) | `svc/public.service.ts:68-117` |
| GET `/public/:slug/slots` | shop by slug; reschedule token only if its booking is in this shop | Yes; phone oracle (TI-05) | `controllers/public.controller.ts:288-320`; `booking.service.ts:1621-1627` |
| POST `/public/:slug/book` | services, staff, products `{…, shopId}`; fixed projection | Yes | `booking.service.ts:568-639`; `public.controller.ts:55-77` |
| POST `/public/booking` | by `cancelToken`; fixed projection | Token holder only | `booking.service.ts:1600-1618`; `public.controller.ts:161-209` |
| POST `/public/cancel` | by token | Token holder only | `booking.service.ts:1691-1706` |
| POST `/public/reschedule` | by token; new staff `{id, shopId: existing.shopId}` | Yes | `booking.service.ts:1636-1652` |

## 2. Auth: route | auth? | role? | enforced at

`A` = `authenticate` (`middleware/authenticate.ts:5-25`); shop sub-routers also get it at the mount (`routes/shop.routes.ts:105-135`). "member" = any active `UserShop` (`utils/shopAccess.ts:34-37`, else 404); "manager+" = `shopAccess.ts:43-47`; "owner" = `shopAccess.ts:38-42`.

### `/auth` and `/user`

| Route | Auth? | Role? | Enforced at |
|---|---|---|---|
| POST /auth/register | no (authLimiter) | none; invite path needs valid token + matching email | `routes/auth.routes.ts:34`; `svc/auth.service.ts:70-81` |
| POST /auth/login | no (authLimiter) | credentials | `auth.routes.ts:35`; `auth.service.ts:156-175` |
| POST /auth/refresh | refresh cookie (refreshLimiter) | DB row, rotation, reuse detection | `auth.routes.ts:36-42`; `auth.service.ts:240-285` |
| POST /auth/logout | refresh cookie only | none (AU-10) | `auth.routes.ts:43`; `controllers/auth.controller.ts:113-117` |
| GET /auth/verify-email | no | 256-bit token, 24 h | `auth.routes.ts:44-49`; `auth.service.ts:296-307` |
| GET /auth/verify-email-change | no | 256-bit token, 24 h | `auth.routes.ts:50-55`; `auth.service.ts:442-453` |
| POST /auth/resend-verification | no (forgotPasswordLimiter) | uniform answer | `auth.routes.ts:56-62`; `auth.service.ts:505-514` |
| POST /auth/forgot-password | no (forgotPasswordLimiter) | uniform answer | `auth.routes.ts:63-69`; `auth.service.ts:327-332` |
| POST /auth/reset-password | no (authLimiter) | single-use token, 1 h | `auth.routes.ts:70-76`; `auth.service.ts:532-547` |
| GET /auth/sessions | A | self | `auth.routes.ts:77`; `auth.service.ts:352-353` |
| DELETE /auth/sessions | A | self | `auth.routes.ts:78`; `auth.service.ts:364-366` |
| GET /user/me | A | self | `routes/user.routes.ts:12`; `controllers/user.controller.ts:14-16` |
| PATCH /user/me | A | self, no re-auth (AU-02) | `user.routes.ts:13`; `auth.service.ts:370-439` |
| DELETE /user/me | A | self + password; blocked while owner | `user.routes.ts:14`; `auth.service.ts:471-495` |

### `/api/shops`

| Route | Auth? | Role? | Enforced at |
|---|---|---|---|
| POST /api/shops | A | any user (becomes owner) | `routes/shop.routes.ts:40`; `svc/shop.service.ts:101-124` |
| GET /api/shops | A | own active memberships | `shop.routes.ts:41`; `shop.service.ts:143-144` |
| GET /api/shops/overview | A | own active memberships | `shop.routes.ts:44-50`; `svc/overview.service.ts:291-294` |
| GET /api/shops/upcoming | A | own active memberships; redacted per shop; leaks `cancelToken` (AU-01) | `shop.routes.ts:51`; `overview.service.ts:320-348` |
| GET /api/shops/:id | A | member | `shop.routes.ts:52`; `shop.service.ts:156` |
| PATCH /api/shops/:id | A | manager+ with `canEditShopSettings`; `isActive` owner only | `shop.routes.ts:53-60`; `shop.service.ts:167-190` |
| DELETE /api/shops/:id | A | owner | `shop.routes.ts:61-67`; `shop.service.ts:202-205` |
| PUT, DELETE /api/shops/:id/photo | A | manager+ with `canEditShopSettings` | `shop.routes.ts:69-85`; `shop.service.ts:215-226` |
| GET /:shopId/schedules/day | A | member | `shop.routes.ts:89-95`; `svc/workingHours.service.ts:414` |
| GET /:shopId/overview | A | member (staff see totals; design) | `shop.routes.ts:96-102`; `overview.service.ts:270` |

### `/team` (`routes/team.routes.ts`, `svc/team.service.ts`)

| Route | Auth? | Role? | Enforced at |
|---|---|---|---|
| GET / | A | member | `team.routes.ts:29`; `team.service.ts:97` |
| POST / | A | manager+; creating a manager needs owner or `canManageManagers` | `:30-36`; `:120-121` |
| GET /:memberId | A | member | `:37-43`; `:111` |
| PATCH /:memberId | A | manager+; manager rows need `canManageManagers`; flags owner only; owner row self only, role fixed | `:44-50`; `:171-204` |
| DELETE /:memberId | A | manager+; manager rows need `canManageManagers`; owner never | `:51-57`; `:294-304` |
| POST /:memberId/invite | A | manager+ (+`canManageManagers` for a manager) | `:58-64`; `:371-375` |
| DELETE /:memberId/invite | A | same | `:65-71`; `:453-455` |
| POST /:memberId/transfer-ownership | A | owner; target an active manager with a login | `:72-78`; `:323-333` |
| PUT, DELETE /:memberId/photo | A | manager+ (+flag for a manager; owner's by owner only) | `:79-93`; `:475-480` |
| GET /:memberId/services | A | member | `:96-102`; `svc/service.service.ts:182` |

### `/team/:memberId/schedules` (`routes/workingHours.routes.ts`, `svc/workingHours.service.ts`)

| Route | Auth? | Role? | Enforced at |
|---|---|---|---|
| POST / | A | manager+ | `:25`; `:139` |
| GET / | A | member | `:32`; `:197` |
| GET /:scheduleId | A | member | `:33`; `:222` |
| PATCH /:scheduleId | A | manager+ | `:40`; `:238` |
| DELETE /:scheduleId | A | manager+ | `:47`; `:287` |
| PUT /:scheduleId/days | A | manager+ | `:54`; `:304` |
| PATCH /:scheduleId/days/:day | A | manager+ | `:61`; `:358` |

### `/time-off`, `/services`, `/products`

| Route | Auth? | Role? | Enforced at |
|---|---|---|---|
| GET /time-off | A | member | `routes/timeOff.routes.ts:20`; `svc/timeOff.service.ts:125` |
| POST /time-off | A | manager+ | `:21`; `:142` |
| PATCH /time-off/:timeOffId | A | manager+ | `:28`; `:181` |
| DELETE /time-off/:timeOffId | A | manager+ | `:35`; `:221` |
| POST /services | A | manager+ | `routes/service.routes.ts:16`; `svc/service.service.ts:36` |
| GET /services | A | member | `:23`; `:47` |
| GET /services/:serviceId | A | member | `:30`; `:60` |
| PATCH /services/:serviceId | A | manager+ | `:37`; `:85` |
| DELETE /services/:serviceId | A | manager+ | `:44`; `:106` |
| POST /services/:serviceId/staff | A | manager+ | `:52`; `:137` |
| DELETE /services/:serviceId/staff/:userShopId | A | manager+ | `:59`; `:166` |
| POST /products | A | manager+ | `routes/product.routes.ts:15`; `svc/product.service.ts:55` |
| GET /products | A | member (`supplierUrl` hidden from staff, `:39`) | `:22`; `:74` |
| GET /products/:productId | A | member (same) | `:29`; `:87` |
| PATCH /products/:productId | A | manager+ | `:36`; `:97` |
| DELETE /products/:productId | A | manager+ | `:43`; `:112` |
| PUT /products/:productId/photo | A | manager+ | `:50`; `:127` |
| DELETE /products/:productId/photo | A | manager+ | `:58`; `:151` |

### `/bookings` (`routes/booking.routes.ts`, `svc/booking.service.ts`)

| Route | Auth? | Role? | Enforced at |
|---|---|---|---|
| POST / | A | member (staff may pass `overrideRules`; out-of-stock override manager+ at `:399`) | `:19`; `:672` |
| GET / | A | member; customer redacted; leaks `cancelToken` (AU-01) | `:26`; `:1067-1069` |
| GET /stats | A | member; same | `:33`; `:1108-1110` |
| GET /wizard-info | A | member | `:41`; `controllers/booking.controller.ts:60` |
| GET /slots | A | member | `:48`; `booking.controller.ts:76` |
| GET /:bookingId | A | member; same as list | `:55`; `:1191-1193` |
| PATCH /:bookingId | A | manager+ | `:62`; `:1336-1341` |
| PATCH /:bookingId/status | A | member | `:69`; `:1465-1467` |
| PATCH /:bookingId/products/:lineId | A | member; raising past stock manager+ | `:77`; `:1730, 1753-1757` |
| DELETE /:bookingId/products/:lineId | A | member | `:85`; `:1789` |

### `/customers` (`routes/customer.routes.ts`, `svc/customer.service.ts`)

| Route | Auth? | Role? | Enforced at |
|---|---|---|---|
| GET / | A | member; redacted and search disabled without `canViewCustomerDetails` | `:30`; `:37-42` |
| GET /export-all | A | manager+ | `:32`; `:314` |
| POST /import | A | manager+ | `:39`; `:367` |
| GET /:customerId | A | member; contact fields redacted (notes are not) | `:46`; `:85, 133` |
| GET /:customerId/bookings | A | member | `:53`; `:178` |
| PATCH /:customerId | A | member; contact fields need `canViewCustomerDetails` | `:60`; `:217-230` |
| PUT /:customerId/service-durations | A | member (any staff) | `:67`; `:150` |
| GET /:customerId/export | A | owner | `:75`; `:451` |
| DELETE /:customerId | A | owner | `:82`; `:503` |
| POST /:customerId/merge | A | manager+ | `:89`; `:254` |

### `/api/invites`, `/public`, other

| Route | Auth? | Role? | Enforced at |
|---|---|---|---|
| GET /api/invites/lookup | no | holder of 256-bit invite token (stored hashed) | `routes/globalInvite.routes.ts:18`; `svc/invite.service.ts:123-137` |
| GET /api/invites | A | invites to own email / sent by self | `:20`; `:28-42` |
| POST /api/invites/:inviteId/accept | A | account email must equal invite email | `:21-27`; `:60-67` |
| POST /api/invites/:inviteId/decline | A | same | `:28-34`; `:108-112` |
| POST /public/cancel | no (publicWriteLimiter) | `cancelToken` holder | `routes/public.routes.ts:27`; `booking.service.ts:1600-1607, 1691-1694` |
| POST /public/booking | no (publicReadLimiter) | `cancelToken` holder | `:34`; `booking.service.ts:1611-1612` |
| POST /public/reschedule | no (publicWriteLimiter) | `cancelToken` holder | `:41`; `booking.service.ts:1636-1638` |
| GET /public/:slug/slots | no (publicReadLimiter) | public by design | `:48` |
| GET /public/:slug | no (publicReadLimiter) | public by design | `:55` |
| POST /public/:slug/book | no (publicWriteLimiter) | public by design | `:62` |
| GET /media/<key> | no | public by design, random keys | `routes/media.routes.ts:9-12` |
| GET /health | no | none | `app.ts:69` |
| /docs | no | non-production only | `app.ts:92-97` |

## 3. Public booking: boundary matrix

"neg" = `public-booking/boundaries.negative.test.ts`. "probe" = observed in a throwaway exploratory run, no test kept. Line numbers are in `svc/booking.service.ts` unless a file is named.

| Case | Expected | Actual | Evidence |
|---|---|---|---|
| Back-to-back, both sides | 201 | 201 | `:79-83`; neg |
| Same start, same staff | 409 SLOT_TAKEN | 409 | neg |
| Partial overlap (tail, head), containment | 409 | 409 | neg |
| CANCELED / NO_SHOW in the slot | 201 | 201 | `:47`; neg |
| COMPLETED in the slot | 409 | 409 | neg |
| Zero-length / end before start | impossible | n/a | client cannot send `endTime`; duration is `isInt 1..1440` (`service.validator.ts:11-15`, `customer.validator.ts:35-37`) |
| Longer than 24 h | 422 | not provoked | `assertBookingLength` `:56-67`, read only |
| Start in the past | 422 BOOKING_IN_PAST | 422 | neg |
| Start exactly now | accepted | 201 | strict `<` at `svc/bookingRules.service.ts:129`; neg |
| Before opening / at closing / runs past closing | 422 OUTSIDE_OPENING_HOURS | 422 | neg |
| Last slot ending at closing | 201 | 201 | neg |
| Off grid (10:15, 10:00:00.001) | 422 OFF_SLOT_GRID | 422 | neg |
| Closed weekday / staff with no schedule | 422 SHOP_CLOSED | 422 | neg |
| Whole-day time off (own, shop-wide) | 422 | 422 | neg |
| Partial time off: inside, running into it | 422 | 422 | neg |
| Partial time off: touching either edge | 201 | 201 | neg |
| maxAdvanceDays: last day / next day / 0 | 201 / 422 / today only | as expected | neg |
| Slots: past time today, past date, beyond window | not available | **available** | PB-07 |
| Staff of another tenant | refused | 400 | `:104-110`; neg |
| Service of another tenant (single, in list) | refused | 404 | `:311-319`; neg |
| Product of another tenant | refused | 404 PRODUCT_NOT_FOUND | `:391-395`; neg |
| Reschedule to another tenant's staff | refused | 400 | neg |
| Another shop's token on slots | ignored | ignored | `:1621-1627`; neg |
| Same-tenant staff who does not do the service | refused | **201 / 200** | PB-01 |
| Inactive / non-public service | 404 | 404 | neg |
| Staff not customer-bookable / deactivated (explicit and any) | 400 | 400 | neg |
| Inactive shop (book, slots, info) | 404 | 404 | neg |
| Locked shop, new booking | 403 SHOP_LOCKED | 403 | neg |
| Locked shop, token reschedule | refused? | **200** | PB-08 |
| Known phone, different name/email | record untouched, nothing echoed | as expected | `:453-457`; neg |
| Same phone in two shops | two customers | two | neg |
| Same phone, different formatting | one customer | **two** | PB-09 |
| Known phone without stored email + typed email | confirmation sent | **none** | PB-11 |
| 20 bookings, one phone, one day | some limit | **20 x 201** | PB-02 |
| Multi-service: total held, must fit, max 5 | as stated | as expected | neg |
| Multi-service: duplicate ids | 400 | 400 | `:295-296`; probe |
| Multi-service create, explicit staff lacking one | 400 | 400 | `:345-359`; probe |
| Products: over stock / qty 0, -1, 100, 1.5 / duplicate / SOLO plan | 422 / 400 / 400 / 403 | as expected | neg |
| Products: last unit reserved by several bookings | (design) | all 201 | documented `:370`; probe |
| Any staff: free member chosen; all taken | 201; 409 | as expected | neg |
| Any staff: off / hidden / lacks-service member | never assigned | never | neg |
| Any staff: taken slot + teammate off | 409 | **422 SHOP_CLOSED** | PB-12 |
| Any staff: N parallel, N free | N x 201 | **false 409s** | PB-03 |
| Token after cancel | 409 BOOKING_ALREADY_CANCELED | 409 | neg |
| Old token after reschedule | 409 BOOKING_RESCHEDULED | 409 | neg |
| New token after reschedule | works, differs | yes | neg |
| Reschedule into occupied slot | 409, booking unchanged | as expected | neg |
| Reschedule overlapping only itself | 200 | 200 | neg |
| Reschedule: past / outside hours / beyond window / unchanged | 422 / 422 / 422 / 400 | as expected | neg |
| Cutoff: inside (30 min, cutoff 1 h) | 409 *_WINDOW_CLOSED | 409 | neg |
| Cutoff: exactly at it | allowed | 200 | `:1572-1573`; neg |
| Already started | 409 BOOKING_IN_PAST | 409 | neg |
| Unknown / malformed token (3 endpoints) | 404 / 400 | as expected | neg |
| Inactive shop: reschedule / cancel | refused / allowed | 403 RESCHEDULE_DISABLED / 200 | probe |
| 5 parallel cancels | one 200 | **all 200** | PB-04a |
| Cancel racing reschedule | never "cancelled" with an active booking | **21-28 of 60** | PB-04b |
| 7 parallel reschedules of one booking | one 200, six 409 | as expected | neg |
| 5 reschedules + 5 new bookings, one slot | one winner, nine 409 | as expected | neg |
| 10 parallel POSTs, one slot | one 201, nine 409 | as expected | `concurrency.test.ts` |
| DST start 2027-03-28 | no slots in the gap, no overlap | as expected | neg |
| DST end 2027-10-31 | repeated hour bookable once, second pass 422 | as expected | documented `utils/slots.ts:59-61`; neg |
| Same instant, other offset / Z | 409 | 409 | neg |
| `startTime` with no offset | 400 | **201, server-TZ dependent** | PB-05 |
| `startTime` `2026-W50`, `20261208T080000Z`, `2026-342` | 400 | **500** | PB-06 |
| `startTime` `2026-12-08` (date only) | refused | 422 (read as 00:00Z) | probe |
| Slots `date=2026-02-30` | 400 | **500** | PB-06c |
| Slots `date=2026-13-01` / full timestamp | 400 | 400 | probe |

## 4. Validation: route | field (source) | rule or MISSING | notes

Rule citations are `api/src/validators/<file>:<line>`. "fmt only" = the format is checked but the JSON type is not (VE-02). Every string field also lacks a NUL check (VE-03).

| Route | Field (source) | Rule or MISSING | Notes |
|---|---|---|---|
| POST /auth/register | email (body) | authValidation:4 | fmt only |
| | name (body) | authValidation:8 | max 50; optional, empty allowed, fmt only |
| | password (body) | authValidation:11 | no max; array passes |
| | inviteToken (body) | authValidation:20 | ok |
| | acceptTerms (body) | authValidation:24 | ok (strict) |
| POST /auth/login | email, password (body) | authValidation:30, :34 | fmt only; whole body to `loginUser`, which reads 3 fields |
| | rememberMe (body) | authValidation:35 | "true" returns 500 |
| POST /auth/refresh, /auth/logout | refreshToken (cookie) | authValidation:86 | ok |
| GET /auth/verify-email, /verify-email-change | token (query) | authValidation:58 | ok; no max |
| POST /auth/resend-verification, /forgot-password | email (body) | authValidation:49, :42 | fmt only |
| POST /auth/reset-password | token, password (body) | authValidation:66, :71 | token ok; password array passes |
| GET/DELETE /auth/sessions | refreshToken (cookie, DELETE) | MISSING | only compared against stored tokens |
| GET /user/me | none | n/a | |
| PATCH /user/me | name, email, password (body) | userValidation:4, :10, :15 | fmt only |
| DELETE /user/me | password (body) | userValidation:27 | ok |
| POST /api/shops | name, description, phone, formattedAddress | shop.validator:12, :23, :24, :33 | no type, no max |
| | slug | shop.validator:13 | ok |
| | lat, lng, placeId | shop.validator:25-34 | validated but never stored (not in `CREATE_FIELDS`) |
| | timezone, maxAdvanceDays, slotIntervalMinutes | shop.validator:35-52 | timezone array returns 500 |
| | whole body | n/a | `pick(dto, CREATE_FIELDS)` `svc/shop.service.ts:47`, ok |
| GET /api/shops, /upcoming | none | n/a | |
| GET /api/shops/overview | range (query) | overview.validator:4 | ok |
| GET /api/shops/:id | id (param) | shop.validator:134 | notEmpty only |
| PATCH /api/shops/:id | create fields plus booleans, cutoffs, reminder, palette, font, isActive | shop.validator:55-132 | `isActive` not converted (:128); `pick(dto, UPDATE_FIELDS)` ok |
| DELETE /api/shops/:id | id | shop.validator:134 | |
| PUT /api/shops/:id/photo | photo (file), crop (body) | multer limits `middleware/photoUpload.ts:8`; `parseCrop` `svc/photo.service.ts:48`; type by content `photo.service.ts:85-107` | ok; buffered before membership check |
| DELETE /api/shops/:id/photo | id | shop.validator:134 | |
| GET /api/shops/:shopId/schedules/day | date (query) | workingHours.validator:107 | repeated key returns 500 |
| GET /api/shops/:shopId/overview | shopId, range | overview.validator:10, :4 | ok |
| GET team; GET/DELETE team/:memberId; invite; transfer-ownership; :memberId/services | params | team.validator:3-9 | |
| POST team | name | team.validator:32 | no type, no max |
| | email, role, canViewCustomerDetails, sendEmail | team.validator:36-51 | VE-02, VE-06 |
| PATCH team/:memberId | role, flags, email, active, bookable* | team.validator:11-29 | flags not strict |
| PUT/DELETE team/:memberId/photo | photo, crop | as shop photo | ok |
| POST schedules | startDate, endDate, isActive, days[] and nested day/isOpen/hours | workingHours.validator:44-60 | VE-07; arrays unbounded |
| GET schedules; GET/DELETE schedules/:id | params | workingHours.validator:9, :101 | |
| PATCH schedules/:id | startDate, endDate, isActive | workingHours.validator:62-77 | |
| PUT schedules/:id/days | days[] | workingHours.validator:79-87 | VE-07 |
| PATCH schedules/:id/days/:day | day (param), isOpen, hours[] | workingHours.validator:89-99 | VE-07; `...h` spread at `svc/workingHours.service.ts:384` |
| GET time-off | memberId (query) | timeOff.validator:34 | ok |
| POST time-off | staffId, startDate, endDate, startTime, endTime, note | timeOff.validator:41-53 | times as array return 500; note max 200 |
| PATCH/DELETE time-off/:id | same plus timeOffId | timeOff.validator:55-65 | |
| POST services | name, description, duration, price, isActive, showOnPublicPage | service.validator:7-29 | **whole body spread (TI-01)**; VE-02, VE-04 |
| GET services; GET/DELETE services/:id | params | service.validator:3, :54 | |
| PATCH services/:id | same as create | service.validator:31-52 | **whole body as `data` (TI-02)** |
| POST services/:id/staff | userShopId (body) | service.validator:62 | notEmpty only |
| DELETE services/:id/staff/:userShopId | params | service.validator:65 | |
| POST/PATCH products | name, description, price, stock, supplierUrl | product.validator:11-52 | caps ok; ints not converted; fields picked at `svc/product.service.ts:23` |
| GET/DELETE products(/:id); photo | params, photo, crop | product.validator:54-55 | |
| POST bookings | block, name, phone, email, serviceId, serviceIds[], staffId, startTime, notes, products[], overrideRules[], override | booking.validator:166-185 | name/email fmt only; quantity not converted; fields picked in booking.service |
| GET bookings | date, status, staffId (query) | booking.validator:218-229 | repeated status/staffId returns 500 |
| GET bookings/stats, /wizard-info | shopId | booking.validator:214 | |
| GET bookings/slots | date, serviceId, serviceIds, staffId, forBookingId, customerId, includeOutsideHours, intervalMinutes | booking.validator:134-164 | ok |
| GET bookings/:id | params | booking.validator:231 | |
| PATCH bookings/:id | startTime, serviceId, staffId, notes, overrideRules | booking.validator:236-255 | serviceId no type (:243) |
| PATCH bookings/:id/status | status | booking.validator:257 | array returns 500 |
| PATCH/DELETE bookings/:id/products/:lineId | saleStatus, quantity | booking.validator:187-212 | not converted |
| GET customers | search, page, limit, hasCustomDurations | customer.validator:9-24 | search no type or max; page no max (VE-05) |
| GET customers/export-all | shopId | customer.validator:81 | unpaginated by design |
| POST customers/import | rows[] | customer.validator:87-92 (1-500); per-row checks `svc/customer.service.ts:338-356` | ok; VE-08 |
| GET/DELETE customers/:id; /export | params | customer.validator:4 | `customerId` reaches a Content-Disposition filename (`controllers/customer.controller.ts:113`) only after the row is found |
| PATCH customers/:id | name, phone, email, notes | customer.validator:41-71 | name/email fmt only; fields picked at `customer.service.ts:233` |
| PUT customers/:id/service-durations | items[].serviceId, .duration | customer.validator:27-39 | ok (max 200, toInt) |
| GET customers/:id/bookings | page, limit | customer.validator:94-104 | VE-05 |
| POST customers/:id/merge | sourceCustomerId | customer.validator:73 | ok |
| GET /api/invites/lookup | token (query) | invite.validator:7 | ok |
| GET /api/invites | none | n/a | |
| POST /api/invites/:inviteId/accept, /decline | inviteId | invite.validator:3 | |
| POST /public/cancel, /public/booking | token (body) | public.validator:8-20 | ok (string and UUID) |
| POST /public/reschedule | token, startTime, staffId | public.validator:22-28 | whole body passed, service reads 2 fields; startTime PB-05/PB-06 |
| GET /public/:slug/slots | date, staffId, serviceId, serviceIds, rescheduleToken (query); x-customer-phone (header) | booking.validator:120-132; header via `isPlausiblePhone` at `controllers/public.controller.ts:316` | staffId/serviceId no type (:126-127); date not strict (PB-06) |
| GET /public/:slug | slug | public.validator:3 | |
| POST /public/:slug/book | name, phone, email, serviceId, serviceIds[], staffId, startTime, notes, products[] | booking.validator:107-118 | name/email fmt only; startTime PB-05/PB-06 |
| GET /media/<key> | key (path) | no validator; `MEDIA_KEY_PATTERN` at `routes/media.routes.ts:12` | ok |
| GET /health | none | n/a | |
| all | accept-language (header) | `parseLocale` whitelist, `utils/locale.ts:11` | ok |
| all | x-request-id (header) | `SAFE_ID`, `middleware/requestId.ts:10` | ok |
