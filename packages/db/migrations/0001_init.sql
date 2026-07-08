-- AI Workforce lives in its own schema inside the shared Sandbox Supabase project.
CREATE SCHEMA IF NOT EXISTS workforce;
SET search_path TO workforce;

-- ============================================================
-- SOURCE MONITORING
-- ============================================================
CREATE TABLE watched_repositories (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner             VARCHAR(100) NOT NULL,
  repo              VARCHAR(100) NOT NULL,
  is_active         BOOLEAN DEFAULT true,
  last_release_tag  VARCHAR(100),
  last_checked_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (owner, repo)
);

-- ============================================================
-- WORKFORCE CORE
-- ============================================================
CREATE TABLE task_runs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_name  VARCHAR(100) NOT NULL,
  agent_name     VARCHAR(100),
  trigger_ref    VARCHAR(255) NOT NULL,
  status         VARCHAR(20) DEFAULT 'pending', -- pending|running|done|failed
  attempt_count  INTEGER DEFAULT 0,
  error_message  TEXT,
  started_at     TIMESTAMPTZ,
  finished_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (workflow_name, trigger_ref)
);

CREATE TABLE task_run_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_run_id  UUID REFERENCES task_runs(id) ON DELETE CASCADE,
  level        VARCHAR(10) NOT NULL,
  message      TEXT NOT NULL,
  meta         JSONB,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CONTENT PRODUCTION
-- ============================================================
CREATE TABLE content_batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_run_id     UUID REFERENCES task_runs(id) ON DELETE CASCADE,
  repository_id   UUID REFERENCES watched_repositories(id),
  release_tag     VARCHAR(100) NOT NULL,
  release_title   TEXT,
  release_body    TEXT,
  status          VARCHAR(20) DEFAULT 'draft', -- draft|ready|published|rejected
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE content_pieces (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_batch_id  UUID REFERENCES content_batches(id) ON DELETE CASCADE,
  platform          VARCHAR(30) NOT NULL, -- blog|linkedin|x|facebook|instagram|newsletter|seo
  content           TEXT NOT NULL,
  seo_title         TEXT,
  seo_description   TEXT,
  hashtags          TEXT[] DEFAULT '{}',
  reviewed_by       UUID,
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (content_batch_id, platform)
);

-- ============================================================
-- PROMPT MANAGEMENT & VERSIONING
-- ============================================================
CREATE TABLE prompt_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name   VARCHAR(100) NOT NULL,
  skill_name   VARCHAR(100) NOT NULL,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (agent_name, skill_name, is_active)
);

CREATE TABLE prompt_versions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_template_id  UUID REFERENCES prompt_templates(id) ON DELETE CASCADE,
  version             INTEGER NOT NULL,
  system_prompt       TEXT NOT NULL,
  user_prompt_tpl     TEXT NOT NULL,
  provider            VARCHAR(30) DEFAULT 'openrouter',
  model               VARCHAR(100) NOT NULL,
  fallback_models     TEXT[] DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE (prompt_template_id, version)
);

-- ============================================================
-- AI PROVIDER USAGE LOG
-- ============================================================
CREATE TABLE ai_invocations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_run_id        UUID REFERENCES task_runs(id) ON DELETE CASCADE,
  provider           VARCHAR(30) DEFAULT 'openrouter',
  model              VARCHAR(100) NOT NULL,
  prompt_version_id  UUID REFERENCES prompt_versions(id),
  input_tokens       INTEGER,
  output_tokens      INTEGER,
  latency_ms         INTEGER,
  status             VARCHAR(20) DEFAULT 'success', -- success|failed|retried
  error_message      TEXT,
  created_at         TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Atomic helpers (avoid read-modify-write races across overlapping Actions runs)
-- ============================================================
CREATE OR REPLACE FUNCTION workforce.increment_task_attempt(p_task_id UUID)
RETURNS void AS $$
  UPDATE workforce.task_runs
  SET attempt_count = attempt_count + 1
  WHERE id = p_task_id;
$$ LANGUAGE sql;
