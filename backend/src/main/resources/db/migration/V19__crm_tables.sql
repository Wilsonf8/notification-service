-- V19: CRM tables — pipeline, tags, notes, lead score

-- Add CRM columns to liveconnect_visitors
ALTER TABLE liveconnect_visitors
  ADD COLUMN pipeline_stage VARCHAR(20) NOT NULL DEFAULT 'NEW',
  ADD COLUMN assigned_rep_id UUID REFERENCES liveconnect_reps(id) ON DELETE SET NULL,
  ADD COLUMN lead_score INTEGER NOT NULL DEFAULT 0;

-- Tag definitions per project
CREATE TABLE liveconnect_tags (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name       VARCHAR(50) NOT NULL,
    color      VARCHAR(7) NOT NULL DEFAULT '#6B7280',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, name)
);

-- Visitor-tag join table
CREATE TABLE liveconnect_visitor_tags (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id      UUID NOT NULL REFERENCES liveconnect_visitors(id) ON DELETE CASCADE,
    tag_id          UUID NOT NULL REFERENCES liveconnect_tags(id) ON DELETE CASCADE,
    tagged_by_rep_id UUID REFERENCES liveconnect_reps(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (visitor_id, tag_id)
);

-- Visitor notes
CREATE TABLE liveconnect_visitor_notes (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id    UUID NOT NULL REFERENCES liveconnect_visitors(id) ON DELETE CASCADE,
    project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    author_rep_id UUID NOT NULL REFERENCES liveconnect_reps(id) ON DELETE CASCADE,
    content       TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for CRM queries
CREATE INDEX idx_visitors_pipeline_stage ON liveconnect_visitors (pipeline_stage);
CREATE INDEX idx_visitors_assigned_rep ON liveconnect_visitors (assigned_rep_id);
CREATE INDEX idx_visitors_lead_score ON liveconnect_visitors (lead_score DESC);
CREATE INDEX idx_visitors_last_seen ON liveconnect_visitors (last_seen_at DESC);
CREATE INDEX idx_visitor_notes_visitor ON liveconnect_visitor_notes (visitor_id, created_at DESC);
CREATE INDEX idx_tags_project ON liveconnect_tags (project_id);
