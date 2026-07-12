SET search_path TO workforce;

-- Owner-defined KPI targets per agent (e.g. "posts_per_week" = 5).
-- Actual progress against these is always computed live from tasks/content_pieces —
-- this table only stores the target number, never the actual.
CREATE TABLE agent_targets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name   VARCHAR(100) NOT NULL,
  metric       VARCHAR(50) NOT NULL,
  target_value INTEGER NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (agent_name, metric)
);
