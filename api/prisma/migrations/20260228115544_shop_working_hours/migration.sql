-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');

-- CreateTable
CREATE TABLE "ShopWorkingSchedule" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopWorkingSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopWorkingDay" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "day" "DayOfWeek" NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ShopWorkingDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopWorkingHourRange" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "ShopWorkingHourRange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopWorkingSchedule_shopId_idx" ON "ShopWorkingSchedule"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopWorkingDay_scheduleId_day_key" ON "ShopWorkingDay"("scheduleId", "day");

-- CreateIndex
CREATE INDEX "ShopWorkingHourRange_dayId_idx" ON "ShopWorkingHourRange"("dayId");

-- AddForeignKey
ALTER TABLE "ShopWorkingSchedule" ADD CONSTRAINT "ShopWorkingSchedule_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopWorkingDay" ADD CONSTRAINT "ShopWorkingDay_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ShopWorkingSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopWorkingHourRange" ADD CONSTRAINT "ShopWorkingHourRange_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "ShopWorkingDay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
