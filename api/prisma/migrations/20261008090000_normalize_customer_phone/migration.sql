-- One stored form per phone number: digits, with a leading + kept. Until now
-- "+30 694 123 4567" and "+306941234567" were two customers of the same shop.
--
-- A row is left as it is when its normalised form already belongs to another
-- customer of the shop (or two rows would normalise to the same value): those
-- are real duplicates, to be merged by the shop in the app. Find them with:
--
--   SELECT "shopId", id, phone FROM "Customer"
--   WHERE "isSystem" = false AND phone ~ '[^0-9+]|.\+';
WITH canon AS (
  SELECT
    id,
    "shopId",
    (CASE WHEN btrim(phone) LIKE '+%' THEN '+' ELSE '' END)
      || regexp_replace(phone, '[^0-9]', '', 'g') AS normalized
  FROM "Customer"
  WHERE "isSystem" = false
)
UPDATE "Customer" c
SET phone = canon.normalized
FROM canon
WHERE c.id = canon.id
  AND c.phone <> canon.normalized
  AND canon.normalized <> ''
  -- nobody in the shop already has that number...
  AND NOT EXISTS (
    SELECT 1 FROM "Customer" o
    WHERE o."shopId" = c."shopId" AND o.id <> c.id AND o.phone = canon.normalized
  )
  -- ...and no other row is about to take it in this same statement.
  AND NOT EXISTS (
    SELECT 1 FROM canon o
    WHERE o."shopId" = canon."shopId" AND o.id <> canon.id
      AND o.normalized = canon.normalized
  );
