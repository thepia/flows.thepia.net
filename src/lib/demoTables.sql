-- Demo tables for flows.thepia.net
-- These can be added to flows-db when ready

-- User workflow sessions table
CREATE TABLE IF NOT EXISTS api.user_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    workflow_id TEXT NOT NULL,
    workflow_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'started', -- started, completed, failed, pending
    invitation_token TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE api.user_workflows ENABLE ROW LEVEL SECURITY;

-- Basic RLS policy - users can only see their own workflows
CREATE POLICY user_workflows_policy ON api.user_workflows
    FOR ALL
    USING (user_email = auth.email());

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_workflows_email ON api.user_workflows(user_email);
CREATE INDEX IF NOT EXISTS idx_user_workflows_status ON api.user_workflows(status);
CREATE INDEX IF NOT EXISTS idx_user_workflows_created_at ON api.user_workflows(created_at);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION api.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_workflows_updated_at
    BEFORE UPDATE ON api.user_workflows
    FOR EACH ROW
    EXECUTE FUNCTION api.update_updated_at_column();