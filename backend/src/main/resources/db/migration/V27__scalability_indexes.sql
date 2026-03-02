-- Index for VisitorGracePeriodScheduler query that runs every 10 seconds.
-- Prevents full table scan on liveconnect_visitors for disconnected visitors.
CREATE INDEX IF NOT EXISTS idx_visitors_active_connections_disconnected_at
    ON liveconnect_visitors (active_connections, disconnected_at)
    WHERE active_connections = 0 AND disconnected_at IS NOT NULL;

-- Index for page view cleanup by visited_at.
CREATE INDEX IF NOT EXISTS idx_page_views_visited_at
    ON liveconnect_page_views (visited_at);

-- Index for visit cleanup by ended_at.
CREATE INDEX IF NOT EXISTS idx_visitor_visits_ended_at
    ON liveconnect_visitor_visits (ended_at)
    WHERE ended_at IS NOT NULL;
