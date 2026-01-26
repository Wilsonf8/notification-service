-- Fix project type column to use uppercase enum values
-- The Java enum uses NOTIFYKIT but the default was set to lowercase

UPDATE projects SET type = 'NOTIFYKIT' WHERE type = 'notifykit';
UPDATE projects SET type = 'LIVECONNECT' WHERE type = 'liveconnect';

-- Update the default to uppercase
ALTER TABLE projects ALTER COLUMN type SET DEFAULT 'NOTIFYKIT';
