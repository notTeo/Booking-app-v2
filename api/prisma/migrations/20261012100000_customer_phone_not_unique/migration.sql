-- A phone number no longer identifies one customer of a shop. Someone booking
-- from a device the shop has not seen becomes a new customer even when the
-- number is known; the shop sees the two side by side and merges them.
DROP INDEX "Customer_shopId_phone_key";
CREATE INDEX "Customer_shopId_phone_idx" ON "Customer"("shopId", "phone");

-- The numbers the country-code migration had to leave alone, because their
-- new form already belonged to another customer: now they can take it.
UPDATE "Customer"
SET phone = CASE
    WHEN phone LIKE '00%' THEN '+' || substr(phone, 3)
    WHEN length(phone) = 12 AND phone LIKE '30%' THEN '+' || phone
    ELSE '+30' || phone
  END
WHERE "isSystem" = false AND phone ~ '^[0-9]+$';
