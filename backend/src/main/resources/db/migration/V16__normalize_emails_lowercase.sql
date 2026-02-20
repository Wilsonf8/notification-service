-- Normalize all existing emails to lowercase
UPDATE users SET email = LOWER(email) WHERE email IS NOT NULL;
UPDATE user_identities SET email = LOWER(email) WHERE email IS NOT NULL;

-- Replace existing index with case-insensitive version
DROP INDEX IF EXISTS idx_users_email;
CREATE UNIQUE INDEX idx_users_email_unique ON users(LOWER(email)) WHERE email IS NOT NULL;
