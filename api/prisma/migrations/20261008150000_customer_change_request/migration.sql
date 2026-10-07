-- What a customer asked to change about their own profile on the shop's public
-- sign-up page. Nobody is logged in there, so nothing is applied until the
-- owner or a manager accepts it. At most one per customer: a newer request
-- replaces the older one.
CREATE TABLE "CustomerChangeRequest" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "photoUrl" TEXT,
    "photoOriginalUrl" TEXT,
    "photoCrop" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerChangeRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerChangeRequest_customerId_key" ON "CustomerChangeRequest"("customerId");
CREATE INDEX "CustomerChangeRequest_shopId_idx" ON "CustomerChangeRequest"("shopId");

ALTER TABLE "CustomerChangeRequest" ADD CONSTRAINT "CustomerChangeRequest_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerChangeRequest" ADD CONSTRAINT "CustomerChangeRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
