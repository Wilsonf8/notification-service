-- Composite index for CRM boolean filter subqueries (hasBeenInCall, hasContactForm).
-- These filters query conversations by (visitor_id, type); existing indexes cover
-- (visitor_id, status) and (project_id, type) but not this combination.
CREATE INDEX idx_conversations_visitor_type ON liveconnect_conversations (visitor_id, type);
