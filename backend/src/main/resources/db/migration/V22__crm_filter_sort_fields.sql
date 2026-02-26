-- Add denormalized fields to liveconnect_visitors for CRM filtering and sorting.
-- last_call_at: updated when a VIDEO_CALL conversation is created (for sort by last call)
-- contact_updated_at: set when a rep edits visitor contact info via CRM
-- contact_updated_by_rep_id: FK to the rep who last edited visitor contact info

ALTER TABLE liveconnect_visitors
    ADD COLUMN last_call_at TIMESTAMPTZ,
    ADD COLUMN contact_updated_at TIMESTAMPTZ,
    ADD COLUMN contact_updated_by_rep_id UUID REFERENCES liveconnect_reps(id) ON DELETE SET NULL;

-- Index for sort-by-last-call performance
CREATE INDEX idx_visitors_last_call_at ON liveconnect_visitors (last_call_at DESC NULLS LAST);
