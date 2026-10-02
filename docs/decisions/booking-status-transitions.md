# Booking status transitions

**Status:** accepted, 2026-10-02. Revisit when a shop asks for stricter rules.

## Decision

A booking's status has no transition rules. An owner or staff member may move a
booking from any status (`PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELED`,
`NO_SHOW`) to any other, including backwards (for example `COMPLETED` to
`PENDING`).

## Why

The status is set by hand at the front desk. Mis-clicks happen, and the person
who made one needs to be able to undo it without help. A state machine would
block those corrections and we have no rule yet that a real shop needs.

## The one constraint

`CANCELED` and `NO_SHOW` release the provider's time; every other status holds
it. Moving a booking from a releasing status back to a holding one re-checks
the slot, and is refused with `409 SLOT_TAKEN` if someone else was booked there
meanwhile. The database's `Booking_no_overlap` constraint backs this up.

The customer's own cancel link is stricter: it only cancels a future `PENDING`
or `CONFIRMED` booking.

## Where it is tested

- `api/src/tests/bookingStatusTransitions.test.ts` documents every pair.
- `api/src/tests/overlapIntegrity.test.ts` covers the slot re-check.
- `api/src/tests/publicCancel.test.ts` covers the cancel link.

If transition rules are introduced, change this note and the first test file
together.
