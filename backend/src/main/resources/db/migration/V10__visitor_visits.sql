CREATE TABLE liveconnect_visitor_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id UUID NOT NULL REFERENCES liveconnect_visitors(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_visitor_visits_visitor_started ON liveconnect_visitor_visits(visitor_id, started_at DESC);
CREATE INDEX idx_visitor_visits_project_visitor ON liveconnect_visitor_visits(project_id, visitor_id);

ALTER TABLE liveconnect_visitors ADD COLUMN first_seen_at TIMESTAMP WITH TIME ZONE;
UPDATE liveconnect_visitors SET first_seen_at = created_at;
