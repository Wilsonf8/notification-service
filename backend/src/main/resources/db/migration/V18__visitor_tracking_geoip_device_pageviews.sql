-- V18: Add GeoIP, device info, and browsing history tracking

-- Add geo/device columns to liveconnect_visitors
ALTER TABLE liveconnect_visitors
  ADD COLUMN country_code VARCHAR(2),
  ADD COLUMN country VARCHAR(100),
  ADD COLUMN region VARCHAR(100),
  ADD COLUMN city VARCHAR(100),
  ADD COLUMN latitude DOUBLE PRECISION,
  ADD COLUMN longitude DOUBLE PRECISION,
  ADD COLUMN timezone VARCHAR(64),
  ADD COLUMN browser_name VARCHAR(64),
  ADD COLUMN browser_version VARCHAR(32),
  ADD COLUMN os_name VARCHAR(64),
  ADD COLUMN os_version VARCHAR(32),
  ADD COLUMN device_type VARCHAR(16),
  ADD COLUMN screen_width SMALLINT,
  ADD COLUMN screen_height SMALLINT,
  ADD COLUMN language VARCHAR(16),
  ADD COLUMN ip_address VARCHAR(45);

-- Page views table for browsing history
CREATE TABLE liveconnect_page_views (
    id          BIGSERIAL PRIMARY KEY,
    visitor_id  UUID NOT NULL REFERENCES liveconnect_visitors(id) ON DELETE CASCADE,
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    title       VARCHAR(512),
    visited_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_ms INTEGER
);

CREATE INDEX idx_page_views_visitor ON liveconnect_page_views (visitor_id, visited_at DESC);
CREATE INDEX idx_page_views_project ON liveconnect_page_views (project_id, visited_at DESC);
