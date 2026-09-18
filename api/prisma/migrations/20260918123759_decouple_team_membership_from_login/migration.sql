/*
  Decouples team membership from having a login: UserShop.userId becomes
  nullable, and UserShop gets its own durable name/email/canViewCustomerDetails
  so a member can exist (and be booked/scheduled) before they ever accept an
  invite. ShopInvite now points at the UserShop placeholder it grants a login
  to, instead of being linked only by email.
*/

-- AlterTable: add the new UserShop columns as nullable first, backfill, then lock down
ALTER TABLE "UserShop"
  ADD COLUMN     "canViewCustomerDetails" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN     "email" TEXT,
  ADD COLUMN     "name" TEXT,
  ALTER COLUMN "userId" DROP NOT NULL;

UPDATE "UserShop" us
SET "name" = u."name", "email" = u."email"
FROM "User" u
WHERE us."userId" = u."id" AND us."name" IS NULL;

ALTER TABLE "UserShop"
  ALTER COLUMN "name" SET NOT NULL,
  ALTER COLUMN "email" SET NOT NULL;

-- AlterTable: add ShopInvite.userShopId as nullable first, backfill, then lock down
ALTER TABLE "ShopInvite" ADD COLUMN     "userShopId" TEXT;

-- Link each existing invite to the UserShop of the user it was sent to, if one exists
UPDATE "ShopInvite" si
SET "userShopId" = us."id"
FROM "UserShop" us
JOIN "User" u ON u."id" = us."userId"
WHERE us."shopId" = si."shopId"
  AND lower(u."email") = lower(si."email")
  AND si."userShopId" IS NULL;

-- Any remaining invites (pending/expired, never accepted) had no UserShop under
-- the old model — create the placeholder now so the FK below can be satisfied.
INSERT INTO "UserShop" ("id", "userId", "shopId", "role", "name", "email", "canViewCustomerDetails", "createdAt")
SELECT md5(random()::text || clock_timestamp()::text || si."id"), NULL, si."shopId", si."role", si."email", lower(si."email"), true, now()
FROM "ShopInvite" si
WHERE si."userShopId" IS NULL;

UPDATE "ShopInvite" si
SET "userShopId" = us."id"
FROM "UserShop" us
WHERE us."shopId" = si."shopId"
  AND us."email" = lower(si."email")
  AND us."userId" IS NULL
  AND si."userShopId" IS NULL;

ALTER TABLE "ShopInvite" ALTER COLUMN "userShopId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "ShopInvite_userShopId_idx" ON "ShopInvite"("userShopId");

-- AddForeignKey
ALTER TABLE "ShopInvite" ADD CONSTRAINT "ShopInvite_userShopId_fkey" FOREIGN KEY ("userShopId") REFERENCES "UserShop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
