-- Add type column to existing projects table
-- Default 'notifykit' ensures existing projects continue working
ALTER TABLE projects ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'notifykit';

-- Index for filtering by type
CREATE INDEX idx_projects_type ON projects(type);
