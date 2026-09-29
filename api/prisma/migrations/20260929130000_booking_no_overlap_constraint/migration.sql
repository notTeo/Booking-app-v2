-- Database-level double-booking guard: one provider (UserShop id) can never
-- have two slot-holding bookings whose [start, end) ranges overlap, regardless
-- of transaction isolation or application bugs. The application still checks
-- first (and answers 409 SLOT_TAKEN); this is the backstop.
--
-- "Slot-holding" mirrors the app's SLOT_FREEING_STATUSES rule: every status
-- except CANCELED and NO_SHOW. Ranges are half-open, so a booking may start
-- exactly when the previous one ends.
--
-- btree_gist lets a plain equality column ("staffId") share a GiST index with
-- the range. It is a trusted extension (PG13+), creatable by the database
-- owner; if this statement fails on a host, `CREATE EXTENSION btree_gist`
-- is the thing to check there.
--
-- NOTE: fails if existing rows already overlap. Prisma does not model
-- exclusion constraints; it neither reports drift for this one nor drops it
-- (verified with `prisma migrate diff`, see docs/runbook.md).
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_no_overlap"
  EXCLUDE USING gist (
    "staffId" WITH =,
    tstzrange("startTime", "endTime", '[)') WITH &&
  )
  WHERE ("status" NOT IN ('CANCELED', 'NO_SHOW'));
