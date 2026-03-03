-- Add soft-delete support for users and organizations
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ NULL;
ALTER TABLE organizations ADD COLUMN deleted_at TIMESTAMPTZ NULL;

CREATE INDEX idx_users_deleted_at ON users(deleted_at);
CREATE INDEX idx_organizations_deleted_at ON organizations(deleted_at);

-- Allow nullification of rep references for account deletion (preserve CRM data)
ALTER TABLE liveconnect_visitor_notes ALTER COLUMN author_rep_id DROP NOT NULL;
