-- AlterTable
ALTER TABLE "ShopWorkingSchedule" ADD COLUMN     "staffId" TEXT;

-- CreateIndex
CREATE INDEX "ShopWorkingSchedule_shopId_staffId_idx" ON "ShopWorkingSchedule"("shopId", "staffId");
