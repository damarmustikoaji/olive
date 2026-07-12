import { buildRepositories } from "@ai-workforce/db";
import { env } from "./env";

/**
 * Service-role access to workforce.* (and read-only public.*) tables. Shared
 * module-level singleton so every server component/action in this app
 * reuses the same connections instead of re-instantiating per request.
 */
export const repositories = buildRepositories(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
