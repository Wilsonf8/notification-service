-- Add device_session_id to liveconnect_requests for multi-device call routing
ALTER TABLE liveconnect_requests ADD COLUMN device_session_id VARCHAR(255);
