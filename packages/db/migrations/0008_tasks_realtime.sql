SET search_path TO workforce;

-- Enables the Board page to subscribe to live changes via the browser
-- (anon key) instead of relying on Next.js's server-fetch cache, which
-- never invalidates when apps/runner writes to this table directly.
--
-- Scope is deliberately minimal: SELECT only, only for logged-in
-- (authenticated) Supabase sessions. All writes continue exclusively
-- through the service-role key in server actions, which bypasses RLS
-- entirely — this policy does not touch write access.
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tasks_select_authenticated ON tasks
  FOR SELECT
  TO authenticated
  USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE workforce.tasks;
