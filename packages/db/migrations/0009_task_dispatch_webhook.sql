SET search_path TO workforce;

-- Fires the task-dispatch Edge Function (supabase/functions/task-dispatch)
-- on every real task change, which in turn triggers a GitHub Actions
-- repository_dispatch run so apps/runner reacts within seconds instead of
-- waiting up to 15 minutes for the next cron tick.
--
-- Secrets (service-role key for calling the function, and the shared
-- x-webhook-secret checked by the function) are NOT embedded in this file —
-- they're read at trigger time from Supabase Vault, seeded once via:
--   select vault.create_secret('<service-role-key>', 'task_dispatch_service_role_key', '...');
--   select vault.create_secret('<webhook-secret>',    'task_dispatch_webhook_secret',    '...');
-- (done manually against the live project — see deploy notes, not tracked here).
CREATE OR REPLACE FUNCTION workforce.notify_task_dispatch()
RETURNS trigger AS $$
DECLARE
  service_role_key text;
  webhook_secret text;
BEGIN
  SELECT decrypted_secret INTO service_role_key
    FROM vault.decrypted_secrets WHERE name = 'task_dispatch_service_role_key';
  SELECT decrypted_secret INTO webhook_secret
    FROM vault.decrypted_secrets WHERE name = 'task_dispatch_webhook_secret';

  PERFORM net.http_post(
    url := 'https://ippewyagznfrvojmdjqz.supabase.co/functions/v1/task-dispatch',
    body := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', to_jsonb(NEW),
      'old_record', CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key,
      'x-webhook-secret', webhook_secret
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = workforce, net, vault;

DROP TRIGGER IF EXISTS tasks_notify_dispatch ON tasks;
CREATE TRIGGER tasks_notify_dispatch
AFTER INSERT OR UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION workforce.notify_task_dispatch();
