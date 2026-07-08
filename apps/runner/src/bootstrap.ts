import { loadConfig, createLogger, type Config } from "@ai-workforce/shared";
import type { ExecutionContext } from "@ai-workforce/core";
import { createSupabaseClient, buildRepositories } from "@ai-workforce/db";
import { OpenRouterProvider } from "@ai-workforce/ai-provider";

export interface Bootstrapped {
  ctx: ExecutionContext;
  config: Config;
}

/**
 * The only place that touches process.env and creates real connections
 * (Supabase, OpenRouter). Everything downstream receives ExecutionContext
 * as a parameter, so it can be unit-tested with a fake context instead.
 */
export async function bootstrap(): Promise<Bootstrapped> {
  const config = loadConfig();

  const supabase = createSupabaseClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);
  const repositories = buildRepositories(supabase);

  const aiProvider = new OpenRouterProvider({ apiKey: config.OPENROUTER_API_KEY });
  const logger = createLogger();

  const ctx: ExecutionContext = {
    taskRunId: "",
    logger,
    aiProvider,
    repositories,
    config,
    now: new Date(),
  };

  return { ctx, config };
}
