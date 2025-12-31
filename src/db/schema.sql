-- PlanSignal schema
-- Stores plan assignment facts only

CREATE TABLE IF NOT EXISTS plan_assignments (
    id SERIAL PRIMARY KEY,
    subject TEXT NOT NULL,
    scope TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    origin TEXT NOT NULL,
    reason TEXT NOT NULL,
    policy_version TEXT NOT NULL,
    effective_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient lookup by subject and scope
CREATE INDEX IF NOT EXISTS idx_plan_assignments_subject_scope 
ON plan_assignments (subject, scope, effective_at DESC);
