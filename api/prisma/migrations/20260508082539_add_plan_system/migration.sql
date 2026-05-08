/*
  Warnings:

  - You are about to drop the column `stripeCustomerId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Subscription` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_userId_fkey";

-- DropIndex
DROP INDEX "User_stripeCustomerId_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "stripeCustomerId",
ADD COLUMN     "planId" TEXT;

-- DropTable
DROP TABLE "Subscription";

-- DropEnum
DROP TYPE "SubscriptionStatus";

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "features" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plan_name_key" ON "Plan"("name");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed Free and Pro plans
INSERT INTO "Plan" ("id", "name", "displayName", "description", "features", "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES (
  'cm_plan_free_bookly_2026',
  'free',
  'Free',
  'Get started with basic booking features.',
  '{"CREATE_SHOP": false, "MAX_STAFF": 1, "MAX_BOOKINGS_PER_MONTH": 30, "SMS_REMINDERS": false, "ADVANCED_ANALYTICS": false}',
  true,
  0,
  NOW(),
  NOW()
) ON CONFLICT ("name") DO NOTHING;

INSERT INTO "Plan" ("id", "name", "displayName", "description", "features", "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES (
  'cm_plan_pro_bookly_2026_',
  'pro',
  'Pro',
  'Full access for growing businesses.',
  '{"CREATE_SHOP": true, "MAX_STAFF": 10, "MAX_BOOKINGS_PER_MONTH": null, "SMS_REMINDERS": true, "ADVANCED_ANALYTICS": false}',
  true,
  1,
  NOW(),
  NOW()
) ON CONFLICT ("name") DO NOTHING;

-- Back-fill all existing users to the Free plan
UPDATE "User"
SET "planId" = 'cm_plan_free_bookly_2026'
WHERE "planId" IS NULL;

-- Now enforce NOT NULL
ALTER TABLE "User" ALTER COLUMN "planId" SET NOT NULL;
