-- LiveConnect Tables Migration
-- Creates all tables needed for the LiveConnect video/chat feature

-- 1. liveconnect_settings (one-to-one with projects)
CREATE TABLE liveconnect_settings (
    project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    welcome_message TEXT DEFAULT 'Hi! How can we help you today?',
    widget_color VARCHAR(7) DEFAULT '#FACC15',
    widget_position VARCHAR(20) DEFAULT 'bottom-right',
    offline_message TEXT DEFAULT 'No reps available. Leave your info and we''ll get back to you.',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. liveconnect_embed_keys
CREATE TABLE liveconnect_embed_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    key_prefix VARCHAR(10) NOT NULL DEFAULT 'lck_',
    key_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    allowed_domains TEXT[],
    is_revoked BOOLEAN DEFAULT false,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. liveconnect_visitors
CREATE TABLE liveconnect_visitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    visitor_id VARCHAR(255) NOT NULL,
    identified_user_id VARCHAR(255),
    name VARCHAR(255),
    email VARCHAR(255),
    metadata JSONB,
    active_connections INT DEFAULT 0,
    disconnected_at TIMESTAMP WITH TIME ZONE,
    ping_cooldown_until TIMESTAMP WITH TIME ZONE,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, visitor_id)
);

-- 4. liveconnect_reps (created before conversations due to circular FK)
CREATE TABLE liveconnect_reps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    availability VARCHAR(20) DEFAULT 'unavailable',
    presence VARCHAR(20) DEFAULT 'offline',
    active_connections INT DEFAULT 0,
    current_conversation_id UUID,
    call_started_at TIMESTAMP WITH TIME ZONE,
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- 5. liveconnect_conversations
CREATE TABLE liveconnect_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    visitor_id UUID REFERENCES liveconnect_visitors(id),
    rep_id UUID REFERENCES liveconnect_reps(id),
    type VARCHAR(20) NOT NULL DEFAULT 'video_call',
    status VARCHAR(20) DEFAULT 'active',
    call_duration_seconds INT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    disconnect_grace_until TIMESTAMP WITH TIME ZONE
);

-- Add FK to reps table (circular reference)
ALTER TABLE liveconnect_reps
ADD CONSTRAINT fk_reps_conversation
FOREIGN KEY (current_conversation_id)
REFERENCES liveconnect_conversations(id);

-- 6. liveconnect_sessions
CREATE TABLE liveconnect_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token VARCHAR(255) NOT NULL UNIQUE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    visitor_id UUID REFERENCES liveconnect_visitors(id) ON DELETE CASCADE,
    embed_key_id UUID REFERENCES liveconnect_embed_keys(id) ON DELETE CASCADE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. liveconnect_messages
CREATE TABLE liveconnect_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES liveconnect_conversations(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL,
    sender_id UUID,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. liveconnect_requests
CREATE TABLE liveconnect_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    visitor_id UUID REFERENCES liveconnect_visitors(id),
    initiated_by_rep_id UUID REFERENCES liveconnect_reps(id),
    direction VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    accepted_by_rep_id UUID REFERENCES liveconnect_reps(id),
    accepted_at TIMESTAMP WITH TIME ZONE,
    conversation_id UUID REFERENCES liveconnect_conversations(id),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Partial unique index: only one pending request per visitor per project
CREATE UNIQUE INDEX idx_unique_pending_request
ON liveconnect_requests (project_id, visitor_id)
WHERE (status = 'pending');

-- 9. liveconnect_processed_webhooks
CREATE TABLE liveconnect_processed_webhooks (
    event_id VARCHAR(255) PRIMARY KEY,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Basic indexes
CREATE INDEX idx_sessions_token ON liveconnect_sessions(session_token);
CREATE INDEX idx_sessions_expires ON liveconnect_sessions(expires_at);
CREATE INDEX idx_visitors_project ON liveconnect_visitors(project_id);
CREATE INDEX idx_conversations_project ON liveconnect_conversations(project_id);
CREATE INDEX idx_conversations_status ON liveconnect_conversations(status);
CREATE INDEX idx_messages_conversation ON liveconnect_messages(conversation_id);
CREATE INDEX idx_requests_project_status ON liveconnect_requests(project_id, status);
CREATE INDEX idx_reps_project ON liveconnect_reps(project_id);
CREATE INDEX idx_processed_webhooks_time ON liveconnect_processed_webhooks(processed_at);

-- Query optimization indexes
CREATE INDEX idx_requests_visitor_status ON liveconnect_requests(visitor_id, status);
CREATE INDEX idx_requests_expires ON liveconnect_requests(status, expires_at) WHERE status = 'pending';
CREATE INDEX idx_conversations_visitor_status ON liveconnect_conversations(visitor_id, status);
CREATE INDEX idx_conversations_project_started ON liveconnect_conversations(project_id, started_at DESC);
CREATE INDEX idx_messages_conversation_created ON liveconnect_messages(conversation_id, created_at DESC);
CREATE INDEX idx_conversations_project_type ON liveconnect_conversations(project_id, type);
CREATE INDEX idx_reps_availability ON liveconnect_reps(project_id, availability, presence);
CREATE INDEX idx_reps_presence_heartbeat ON liveconnect_reps(presence, last_heartbeat);
CREATE INDEX idx_visitors_identified ON liveconnect_visitors(project_id, identified_user_id) WHERE identified_user_id IS NOT NULL;
CREATE INDEX idx_visitors_last_seen ON liveconnect_visitors(last_seen_at);
