-- A shop has exactly one owner. The creator was never recorded, so the earliest
-- owner who can sign in (active, with a login) is kept; every other owner
-- becomes a manager. Separate from the enum change: Postgres cannot use a new
-- enum value in the transaction that adds it.
UPDATE "UserShop"
SET "role" = 'manager'
WHERE "role" = 'owner'
  AND "id" NOT IN (
    SELECT DISTINCT ON ("shopId") "id"
    FROM "UserShop"
    WHERE "role" = 'owner'
    ORDER BY
      "shopId",
      ("active" AND "userId" IS NOT NULL) DESC,
      "createdAt" ASC,
      "id" ASC
  );

-- Pending invites snapshot the member's role.
UPDATE "ShopInvite"
SET "role" = 'manager'
WHERE "role" = 'owner' AND "status" = 'pending';
