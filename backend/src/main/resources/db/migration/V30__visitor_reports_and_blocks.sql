-- Visitor reports table for UGC moderation
CREATE TABLE visitor_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    visitor_id UUID NOT NULL REFERENCES liveconnect_visitors(id) ON DELETE CASCADE,
    reporter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(500) NOT NULL,
    message_content VARCHAR(2000),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_visitor_reports_project ON visitor_reports(project_id);
CREATE INDEX idx_visitor_reports_visitor ON visitor_reports(visitor_id);

-- Visitor blocks table for UGC moderation
CREATE TABLE visitor_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    visitor_id UUID NOT NULL REFERENCES liveconnect_visitors(id) ON DELETE CASCADE,
    blocked_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, visitor_id)
);

CREATE INDEX idx_visitor_blocks_project_visitor ON visitor_blocks(project_id, visitor_id);
