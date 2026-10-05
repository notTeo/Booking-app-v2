-- Per-customer service durations: a customer's own length for a service.
CREATE TABLE "CustomerServiceDuration" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CustomerServiceDuration_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomerServiceDuration_serviceId_idx" ON "CustomerServiceDuration"("serviceId");
CREATE UNIQUE INDEX "CustomerServiceDuration_customerId_serviceId_key" ON "CustomerServiceDuration"("customerId", "serviceId");

ALTER TABLE "CustomerServiceDuration" ADD CONSTRAINT "CustomerServiceDuration_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerServiceDuration" ADD CONSTRAINT "CustomerServiceDuration_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
