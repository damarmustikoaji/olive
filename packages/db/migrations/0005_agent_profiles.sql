SET search_path TO workforce;

-- Replaces agent_targets: instead of a rigid metric/target_value schema, the
-- Owner writes free-form job-description text per agent (role, responsibilities,
-- targets, ad-hoc instructions — whatever's useful), editable from the dashboard.
-- Computed KPIs (tasks done, tokens used, etc.) are never stored here — always
-- derived live from tasks/content_pieces/ai_invocations.
DROP TABLE IF EXISTS agent_targets;

CREATE TABLE agent_profiles (
  agent_name  VARCHAR(100) PRIMARY KEY,
  role        VARCHAR(100) NOT NULL,
  level       VARCHAR(50) NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'active', -- active | not_hired
  description TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ DEFAULT now()
);
