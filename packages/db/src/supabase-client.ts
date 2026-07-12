import { createClient } from "@supabase/supabase-js";

/**
 * Bound to a single schema per client — "workforce" by default so it never
 * touches Sandbox's own tables, even though both share the same Postgres
 * instance/project. Pass schema: "public" explicitly (and only) for the
 * handful of read-only integrations that need to see Sandbox's own data
 * (e.g. support_tickets) — never to write to it.
 */
export function createSupabaseClient(url: string, serviceRoleKey: string, schema: string = "workforce") {
  return createClient(url, serviceRoleKey, {
    db: { schema },
    auth: { persistSession: false },
  });
}

export type SupabaseClient = ReturnType<typeof createSupabaseClient>;
