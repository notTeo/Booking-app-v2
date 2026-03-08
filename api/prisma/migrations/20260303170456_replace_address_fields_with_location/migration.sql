/*
  Warnings:

  - You are about to drop the column `address` on the `Shop` table. All the data in the column will be lost.
  - You are about to drop the column `city` on the `Shop` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `Shop` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Shop" DROP COLUMN "address",
DROP COLUMN "city",
DROP COLUMN "country",
ADD COLUMN     "formattedAddress" TEXT,
ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION,
ADD COLUMN     "placeId" TEXT;
