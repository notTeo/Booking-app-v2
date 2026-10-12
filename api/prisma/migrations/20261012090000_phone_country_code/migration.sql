-- Every phone number now carries its country code: "+30694…" instead of
-- "694…". A number stored without one is taken to be Greek, as the app now
-- does for a number typed that way ("00…" is the same as "+…").
--
-- A row is left as it is when its new form already belongs to another customer
-- of the shop: those are the same person twice, to be merged in the app.
WITH canon AS (
  SELECT
    id,
    "shopId",
    CASE
      WHEN phone LIKE '00%' THEN '+' || substr(phone, 3)
      WHEN length(phone) = 12 AND phone LIKE '30%' THEN '+' || phone
      ELSE '+30' || phone
    END AS normalized
  FROM "Customer"
  WHERE "isSystem" = false AND phone ~ '^[0-9]+$'
)
UPDATE "Customer" c
SET phone = canon.normalized
FROM canon
WHERE c.id = canon.id
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
