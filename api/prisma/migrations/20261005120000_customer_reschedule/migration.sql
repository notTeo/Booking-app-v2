-- Customer reschedule: shop policy settings and the link from a rescheduled
-- booking back to the one it replaced.
ALTER TABLE "Shop" ADD COLUMN "customerRescheduleEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Shop" ADD COLUMN "cancelCutoffHours" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Shop" ADD COLUMN "rescheduleCutoffHours" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Booking" ADD COLUMN "rescheduledFromId" TEXT;
CREATE UNIQUE INDEX "Booking_rescheduledFromId_key" ON "Booking"("rescheduledFromId");
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_rescheduledFromId_fkey" FOREIGN KEY ("rescheduledFromId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
