-- Time off: dated entries that sit on top of the weekly working hours and
-- remove availability. "staffId" NULL closes the whole shop; "startTime" and
-- "endTime" both NULL is the whole day, otherwise that window on every day
-- from "startDate" to "endDate" (inclusive).
CREATE TABLE "TimeOff" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "staffId" TEXT,
    "startDate" TIMESTAMPTZ(3) NOT NULL,
    "endDate" TIMESTAMPTZ(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "TimeOff_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TimeOff_shopId_staffId_startDate_idx" ON "TimeOff"("shopId", "staffId", "startDate");

ALTER TABLE "TimeOff" ADD CONSTRAINT "TimeOff_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimeOff" ADD CONSTRAINT "TimeOff_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "UserShop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
