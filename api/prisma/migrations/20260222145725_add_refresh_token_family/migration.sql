-- Clear existing refresh tokens (they have no family — force re-login)
DELETE FROM "RefreshToken";

-- AlterTable
ALTER TABLE "RefreshToken" ADD COLUMN "family" TEXT NOT NULL;
