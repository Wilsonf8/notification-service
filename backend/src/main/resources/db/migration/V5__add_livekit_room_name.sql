-- Add LiveKit room name to conversations
ALTER TABLE liveconnect_conversations
ADD COLUMN livekit_room_name VARCHAR(255);

-- Add event_type to processed webhooks for better tracking
ALTER TABLE liveconnect_processed_webhooks
ADD COLUMN event_type VARCHAR(50);

-- Index for looking up conversations by room name
CREATE INDEX idx_conversations_livekit_room ON liveconnect_conversations(livekit_room_name);
