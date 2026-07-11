import { createSupabaseClient, buildRepositories } from "@ai-workforce/db";
import { env } from "./env";

/**
 * Service-role access to workforce.* tables. Shared module-level singleton so
 * every server component/action in this app reuses the same connection instead
 * of re-instantiating per request.
 */
const client = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

export const repositories = buildRepositories(client);
