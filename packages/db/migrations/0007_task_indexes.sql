SET search_path TO workforce;

-- Board load (listAll) orders by created_at; workflows filter/list by status.
-- Neither had an index, so both were sequential scans over the full tasks table.
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_status_created_at ON tasks (status, created_at DESC);
