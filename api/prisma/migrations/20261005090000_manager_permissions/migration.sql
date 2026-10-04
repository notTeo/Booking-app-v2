-- AlterTable
ALTER TABLE "UserShop" ADD COLUMN     "canEditShopSettings" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageManagers" BOOLEAN NOT NULL DEFAULT false;
