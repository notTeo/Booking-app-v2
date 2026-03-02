-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('pending', 'accepted', 'expired');

-- CreateTable
CREATE TABLE "ShopInvite" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "ShopRole" NOT NULL DEFAULT 'staff',
    "status" "InviteStatus" NOT NULL DEFAULT 'pending',
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "acceptedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopInvite_tokenHash_key" ON "ShopInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "ShopInvite_shopId_idx" ON "ShopInvite"("shopId");

-- CreateIndex
CREATE INDEX "ShopInvite_email_idx" ON "ShopInvite"("email");

-- AddForeignKey
ALTER TABLE "ShopInvite" ADD CONSTRAINT "ShopInvite_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopInvite" ADD CONSTRAINT "ShopInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopInvite" ADD CONSTRAINT "ShopInvite_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
