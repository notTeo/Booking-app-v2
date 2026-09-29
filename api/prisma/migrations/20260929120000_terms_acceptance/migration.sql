-- Record which version of the terms a user accepted, and when. Nullable:
-- accounts created before this migration never accepted a versioned document.
ALTER TABLE "User"
  ADD COLUMN "termsVersion" TEXT,
  ADD COLUMN "termsAcceptedAt" TIMESTAMPTZ(3);

-- Carried from the registration request to the user row at email verification.
ALTER TABLE "PendingRegistration"
  ADD COLUMN "termsVersion" TEXT,
  ADD COLUMN "termsAcceptedAt" TIMESTAMPTZ(3);
