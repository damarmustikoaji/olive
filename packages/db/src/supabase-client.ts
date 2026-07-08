import { createClient } from "@supabase/supabase-js";

/**
 * Bound to the "workforce" schema so it never touches Sandbox's tables,
 * even though both share the same Postgres instance/project.
 */
export function createSupabaseClient(url: string, serviceRoleKey: string) {
  return createClient(url, serviceRoleKey, {
    db: { schema: "workforce" },
    auth: { persistSession: false },
  });
}

export type SupabaseClient = ReturnType<typeof createSupabaseClient>;
