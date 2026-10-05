-- Blocked slots: bookings held by the shop's one system ("Blocked") customer.
ALTER TABLE "Customer" ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT false;
