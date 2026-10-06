-- Per-shop plans. Shops that exist today keep full access on the largest plan
-- until changed by hand, and their owners count as having used their trial.
CREATE TYPE "ShopPlan" AS ENUM ('SOLO', 'TEAM', 'BUSINESS');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'INACTIVE');

ALTER TABLE "Shop" ADD COLUMN "plan" "ShopPlan" NOT NULL DEFAULT 'TEAM',
ADD COLUMN "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "trialEndsAt" TIMESTAMPTZ(3);

UPDATE "Shop" SET "plan" = 'BUSINESS';

ALTER TABLE "User" ADD COLUMN "trialUsedAt" TIMESTAMPTZ(3);

UPDATE "User" SET "trialUsedAt" = CURRENT_TIMESTAMP
WHERE "id" IN (SELECT "userId" FROM "UserShop" WHERE "role" = 'owner' AND "userId" IS NOT NULL);

ALTER TABLE "User" DROP COLUMN "isPro";
