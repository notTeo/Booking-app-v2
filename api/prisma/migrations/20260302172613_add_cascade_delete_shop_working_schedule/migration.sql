-- DropForeignKey
ALTER TABLE "ShopWorkingSchedule" DROP CONSTRAINT "ShopWorkingSchedule_shopId_fkey";

-- AddForeignKey
ALTER TABLE "ShopWorkingSchedule" ADD CONSTRAINT "ShopWorkingSchedule_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
