-- Internal-only services: hidden from the public page, still bookable by staff.
ALTER TABLE "Service" ADD COLUMN "showOnPublicPage" BOOLEAN NOT NULL DEFAULT true;
