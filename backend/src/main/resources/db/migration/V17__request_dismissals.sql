CREATE TABLE liveconnect_request_dismissals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES liveconnect_requests(id) ON DELETE CASCADE,
    rep_id UUID NOT NULL REFERENCES liveconnect_reps(id) ON DELETE CASCADE,
    dismissed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(request_id, rep_id)
);

CREATE INDEX idx_dismissals_rep_id ON liveconnect_request_dismissals(rep_id);
