-- Push notification support for iOS mobile app

-- Device tokens for APNs
CREATE TABLE device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_token VARCHAR(255) NOT NULL UNIQUE,
    platform VARCHAR(20) NOT NULL DEFAULT 'IOS',
    bundle_id VARCHAR(255) NOT NULL,
    is_valid BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Per-rep notification preferences (one row per rep entity)
CREATE TABLE rep_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rep_id UUID NOT NULL UNIQUE REFERENCES liveconnect_reps(id) ON DELETE CASCADE,
    notify_visitor_presence BOOLEAN DEFAULT true,
    notify_visitor_request BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_device_tokens_user ON device_tokens(user_id);
CREATE INDEX idx_device_tokens_valid ON device_tokens(user_id, is_valid) WHERE is_valid = true;
CREATE INDEX idx_rep_notification_preferences_rep ON rep_notification_preferences(rep_id);
