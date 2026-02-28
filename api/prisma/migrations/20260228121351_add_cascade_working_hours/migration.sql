-- DropForeignKey
ALTER TABLE "ShopWorkingDay" DROP CONSTRAINT "ShopWorkingDay_scheduleId_fkey";

-- DropForeignKey
ALTER TABLE "ShopWorkingHourRange" DROP CONSTRAINT "ShopWorkingHourRange_dayId_fkey";

-- AlterTable
ALTER TABLE "Shop" ALTER COLUMN "timezone" SET DEFAULT 'Europe/Athens';

-- AddForeignKey
ALTER TABLE "ShopWorkingDay" ADD CONSTRAINT "ShopWorkingDay_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ShopWorkingSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopWorkingHourRange" ADD CONSTRAINT "ShopWorkingHourRange_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "ShopWorkingDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
