-- Add Stripe customer ID to organizations
ALTER TABLE organizations ADD COLUMN stripe_customer_id VARCHAR(255);
CREATE UNIQUE INDEX idx_organizations_stripe_customer_id ON organizations (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Subscriptions table (one per organization)
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(255) NOT NULL UNIQUE,
    stripe_price_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'INACTIVE',
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    last_event_timestamp BIGINT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_organization_id ON subscriptions (organization_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions (stripe_subscription_id);

-- Stripe webhook deduplication table
CREATE TABLE stripe_processed_events (
    event_id VARCHAR(255) PRIMARY KEY,
    event_type VARCHAR(255),
    processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
