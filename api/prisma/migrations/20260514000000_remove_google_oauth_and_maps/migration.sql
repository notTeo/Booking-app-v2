-- AlterTable: remove Google Maps location fields from Shop
ALTER TABLE "Shop" DROP COLUMN IF EXISTS "lat",
                   DROP COLUMN IF EXISTS "lng",
                   DROP COLUMN IF EXISTS "placeId";

-- AlterTable: remove Google OAuth field from User
ALTER TABLE "User" DROP COLUMN IF EXISTS "googleId";
