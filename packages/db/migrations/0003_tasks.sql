SET search_path TO workforce;

-- ============================================================
-- TASKS — the central entity. GitHub releases/issues, manual
-- entries, and future sources (error monitoring, feedback) are
-- all just "task sources" feeding one backlog.
-- ============================================================
CREATE TYPE task_status AS ENUM (
  'backlog',
  'assigned',
  'in_progress',
  'ready_for_review',
  'approved',
  'done',
  'rejected',
  'failed'
);

CREATE TYPE task_severity AS ENUM ('minor', 'medium', 'critical');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');

CREATE TABLE tasks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            VARCHAR(200) NOT NULL,
  description      TEXT,
  source           VARCHAR(30) NOT NULL,       -- github_release | github_issue | manual
  source_ref       VARCHAR(255),               -- e.g. "owner/repo@tag", idempotency key
  severity         task_severity NOT NULL DEFAULT 'medium',
  priority         task_priority NOT NULL DEFAULT 'medium',
  status           task_status NOT NULL DEFAULT 'backlog',
  assignee_agent   VARCHAR(100),               -- e.g. "marketing-content-writer"
  content_batch_id UUID REFERENCES content_batches(id),
  payload          JSONB DEFAULT '{}',         -- source-specific data (release title/body, etc.)
  created_by       VARCHAR(20) NOT NULL DEFAULT 'system', -- 'system' | 'owner'
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (source, source_ref)
);

-- Timeline / activity log per task — what the Jira-style detail view renders.
CREATE TABLE task_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID REFERENCES tasks(id) ON DELETE CASCADE,
  event      VARCHAR(100) NOT NULL,
  meta       JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION workforce.touch_task_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_touch_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION workforce.touch_task_updated_at();
