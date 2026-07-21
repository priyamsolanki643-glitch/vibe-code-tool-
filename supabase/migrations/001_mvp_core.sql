-- FP MVP core schema (subset of full backend blueprint)
-- Run via Supabase CLI: supabase db push

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Lifecycle state log (only state machine service role should UPDATE in production)
CREATE TABLE IF NOT EXISTS user_lifecycle_state (
  user_id UUID PRIMARY KEY,
  current_state TEXT NOT NULL DEFAULT 'ONBOARDING',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_lifecycle_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  trigger_code TEXT NOT NULL,
  actor TEXT NOT NULL CHECK (actor IN ('user', 'ai_agent', 'system')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  tier_classification TEXT DEFAULT 'unknown',
  economic_band TEXT DEFAULT 'constrained',
  data_consent_version TEXT,
  data_consent_at TIMESTAMPTZ,
  onboarding_completed_at TIMESTAMPTZ,
  account_status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  ambition_tier TEXT,
  ai_reality_check_issued BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  goal_id UUID REFERENCES goals(id),
  version_number INT NOT NULL DEFAULT 1,
  title TEXT,
  rationale TEXT,
  path_type TEXT,
  probability_of_success DECIMAL(5,4),
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS one_locked_strategy_per_goal
  ON strategies (goal_id)
  WHERE status = 'locked';

CREATE TABLE IF NOT EXISTS strategy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID NOT NULL REFERENCES strategies(id),
  user_id UUID NOT NULL,
  version_number INT NOT NULL,
  full_snapshot JSONB NOT NULL,
  integrity_hash TEXT NOT NULL,
  change_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS strategy_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID NOT NULL REFERENCES strategies(id),
  user_id UUID NOT NULL,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_strategy_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  version_at_lock INT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS one_active_lock_per_strategy
  ON strategy_locks (strategy_id)
  WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID NOT NULL REFERENCES strategies(id),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  task_type TEXT,
  estimated_duration_minutes INT,
  status TEXT DEFAULT 'pending',
  is_sprint BOOLEAN DEFAULT FALSE,
  is_deep_work BOOLEAN DEFAULT FALSE,
  scheduled_date DATE,
  miss_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capability_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  snapshot_date DATE NOT NULL,
  consistency_score DECIMAL(5,2),
  execution_score DECIMAL(5,2),
  composite_capability_score DECIMAL(5,2),
  inputs_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS mission_log_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL,
  excuse_tags TEXT[],
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  actor_type TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  before_state JSONB,
  after_state JSONB,
  integrity_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Append-only enforcement (MVP)
CREATE OR REPLACE FUNCTION prevent_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_logs_immutable ON audit_logs;
CREATE TRIGGER audit_logs_immutable
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
