-- A customer's profile photo (same three columns as Shop, UserShop, Product
-- and User), and the two shop settings that let customers add one and open
-- the shop's public sign-up page. Both are off until the shop turns them on.
ALTER TABLE "Customer" ADD COLUMN "photoUrl" TEXT,
ADD COLUMN "photoOriginalUrl" TEXT,
ADD COLUMN "photoCrop" JSONB;

ALTER TABLE "Shop" ADD COLUMN "customerPhotosEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "customerProfilePageEnabled" BOOLEAN NOT NULL DEFAULT false;
