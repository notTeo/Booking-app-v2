-- Session, reset and verification tokens are now stored as their SHA-256 hash
-- (hex), like invite tokens already were, so a copy of the database no longer
-- hands out working sessions or reset links. Existing rows are hashed in
-- place: nobody is logged out, and links already emailed keep working.
UPDATE "RefreshToken" SET token = encode(sha256(convert_to(token, 'UTF8')), 'hex');
UPDATE "PasswordResetToken" SET token = encode(sha256(convert_to(token, 'UTF8')), 'hex');
UPDATE "PendingRegistration" SET token = encode(sha256(convert_to(token, 'UTF8')), 'hex');
UPDATE "PendingEmailChange" SET token = encode(sha256(convert_to(token, 'UTF8')), 'hex');
UPDATE "EmailVerificationToken" SET token = encode(sha256(convert_to(token, 'UTF8')), 'hex');
