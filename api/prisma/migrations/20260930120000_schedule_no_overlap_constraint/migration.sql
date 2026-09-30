-- Database-level guard: for one shop, and separately for the shop-wide scope
-- ("staffId" NULL) and each staff member, no two ACTIVE working-hours schedules
-- may share a date — regardless of concurrent requests or application bugs.
-- The application still checks first and answers with a descriptive 409
-- (assertNoActiveOverlap in workingHours.service.ts); this is the backstop.
--
-- Ranges are half-open, as in the application check: a schedule may start on
-- the day the previous one ends. A NULL "endDate" is an open-ended schedule
-- (unbounded range). Inactive schedules are ignored.
--
-- NOTE: fails if existing active rows already overlap. Run
-- `npm run audit:schedule-overlaps` first and fix any pairs by hand (see
-- docs/runbook.md). btree_gist is already required by Booking_no_overlap.
-- Prisma does not model exclusion constraints; it neither reports drift for
-- this one nor drops it.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "ShopWorkingSchedule"
  ADD CONSTRAINT "ShopWorkingSchedule_no_overlap"
  EXCLUDE USING gist (
    "shopId" WITH =,
    (COALESCE("staffId", '')) WITH =,
    tstzrange("startDate", "endDate", '[)') WITH &&
  )
  WHERE ("isActive");
