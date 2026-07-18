SET search_path TO workforce;

-- Enables the Board page to subscribe to live changes via the browser
-- (anon key) instead of relying on Next.js's server-fetch cache, which
-- never invalidates when apps/runner writes to this table directly.
--
-- auth.users in this project is SHARED across every app in the Sandbox
-- Supabase instance (HelloKonseling, CNR, etc — see apps/web/src/lib/env.ts
-- comment on ALLOWED_ADMIN_EMAILS). A bare `TO authenticated USING (true)`
-- policy would let ANY of those unrelated users read every task directly
-- via the Supabase REST/Realtime API using their own session, bypassing the
-- app-layer ALLOWED_ADMIN_EMAILS gate entirely (that gate only runs inside
-- the Next.js server, never enforced at the database). So this policy
-- re-checks the same allowlist at the RLS level — keep it in sync with
-- ALLOWED_ADMIN_EMAILS by hand (single admin today; move to a lookup table
-- if this ever needs to scale beyond a couple of hardcoded emails).
--
-- All writes continue exclusively through the service-role key in server
-- actions, which bypasses RLS entirely — this policy only affects SELECT.
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tasks_select_allowlisted_admin ON tasks
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'email') IN ('damarresin01@gmail.com'));

ALTER PUBLICATION supabase_realtime ADD TABLE workforce.tasks;
