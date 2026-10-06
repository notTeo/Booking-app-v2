-- Products a shop sells and customers can reserve with a booking. A reserved
-- product is copied onto the booking (name and price), so editing or deleting
-- the product later leaves the booking as the customer saw it.


-- CreateEnum
CREATE TYPE "ProductSaleStatus" AS ENUM ('RESERVED', 'SOLD', 'NOT_SOLD');

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "supplierUrl" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "photoUrl" TEXT,
    "photoOriginalUrl" TEXT,
    "photoCrop" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingProduct" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "saleStatus" "ProductSaleStatus" NOT NULL DEFAULT 'RESERVED',
    "stockTaken" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Product_shopId_idx" ON "Product"("shopId");

-- CreateIndex
CREATE INDEX "BookingProduct_bookingId_idx" ON "BookingProduct"("bookingId");

-- CreateIndex
CREATE INDEX "BookingProduct_productId_idx" ON "BookingProduct"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingProduct_bookingId_productId_key" ON "BookingProduct"("bookingId", "productId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingProduct" ADD CONSTRAINT "BookingProduct_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingProduct" ADD CONSTRAINT "BookingProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

