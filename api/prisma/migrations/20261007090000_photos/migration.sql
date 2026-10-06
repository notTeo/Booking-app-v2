-- Photos for a shop and for each team member. Only URLs are stored here; the
-- files are in the storage bucket. photoUrl is the cropped image that is
-- shown, photoOriginalUrl and photoCrop let it be re-edited later.
ALTER TABLE "Shop" ADD COLUMN "photoUrl" TEXT;
ALTER TABLE "Shop" ADD COLUMN "photoOriginalUrl" TEXT;
ALTER TABLE "Shop" ADD COLUMN "photoCrop" JSONB;
ALTER TABLE "UserShop" ADD COLUMN "photoUrl" TEXT;
ALTER TABLE "UserShop" ADD COLUMN "photoOriginalUrl" TEXT;
ALTER TABLE "UserShop" ADD COLUMN "photoCrop" JSONB;
