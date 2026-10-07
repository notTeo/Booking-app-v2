-- AlterTable
ALTER TABLE "User" ADD COLUMN "photoUrl" TEXT,
ADD COLUMN "photoOriginalUrl" TEXT,
ADD COLUMN "photoCrop" JSONB;
