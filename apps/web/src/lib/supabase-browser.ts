import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-only client (anon key) used exclusively for Realtime subscriptions
 * (e.g. the Board's live task updates). Never used for writes or privileged
 * reads — those stay on the service-role RepositoryBundle server-side.
 *
 * Reads `NEXT_PUBLIC_*` env vars directly (not via `@/lib/env`) because that
 * module also validates server-only secrets (SUPABASE_SERVICE_ROLE_KEY, etc.)
 * that must never be evaluated in a client bundle.
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
