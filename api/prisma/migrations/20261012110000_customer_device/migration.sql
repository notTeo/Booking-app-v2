-- A customer is now recognised by the browser they booked or signed up from
-- (a key in a cookie; only its hash is stored), and changes their own details
-- themselves. So what they ask to change no longer waits for the shop: the
-- requests still waiting are dropped with their table.
DROP TABLE "CustomerChangeRequest";

CREATE TABLE "CustomerDevice" (
    "id" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerDevice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerDevice_keyHash_shopId_key" ON "CustomerDevice"("keyHash", "shopId");
CREATE INDEX "CustomerDevice_customerId_idx" ON "CustomerDevice"("customerId");

ALTER TABLE "CustomerDevice" ADD CONSTRAINT "CustomerDevice_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerDevice" ADD CONSTRAINT "CustomerDevice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
