-- A booking can have several services, done one after another by the same
-- provider. Each service is copied onto the booking (name, minutes, price).
-- Every existing booking gets its one service as the first line, so all
-- bookings have at least one.


-- CreateTable
CREATE TABLE "BookingService" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingService_bookingId_idx" ON "BookingService"("bookingId");

-- CreateIndex
CREATE INDEX "BookingService_serviceId_idx" ON "BookingService"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingService_bookingId_serviceId_key" ON "BookingService"("bookingId", "serviceId");

-- AddForeignKey
ALTER TABLE "BookingService" ADD CONSTRAINT "BookingService_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingService" ADD CONSTRAINT "BookingService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: the booking's own service, for the length it already has.
INSERT INTO "BookingService" ("id", "bookingId", "serviceId", "name", "duration", "price", "position")
SELECT 'bs_' || b."id", b."id", b."serviceId", s."name",
       GREATEST(1, ROUND(EXTRACT(EPOCH FROM (b."endTime" - b."startTime")) / 60)::int),
       s."price", 0
FROM "Booking" b
JOIN "Service" s ON s."id" = b."serviceId";
