-- AlterTable
ALTER TABLE "UserShop" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "bookableByCustomers" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "bookableInternally" BOOLEAN NOT NULL DEFAULT true;
