-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "overriddenRules" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
