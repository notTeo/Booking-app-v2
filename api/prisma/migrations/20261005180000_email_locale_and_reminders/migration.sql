-- Emails in the recipient's language: what a user has the app in, and what a
-- customer booked in.
ALTER TABLE "User" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'el';
ALTER TABLE "Booking" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'el';

-- Reminder emails: the shop's switch and lead time, and when a booking's
-- reminder went out (null = not sent).
ALTER TABLE "Shop" ADD COLUMN "reminderEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Shop" ADD COLUMN "reminderHoursBefore" INTEGER NOT NULL DEFAULT 24;
ALTER TABLE "Booking" ADD COLUMN "reminderSentAt" TIMESTAMPTZ(3);
