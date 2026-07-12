import { loadConfig, createLogger, type Config } from "@ai-workforce/shared";
import type { ExecutionContext } from "@ai-workforce/core";
import { buildRepositories } from "@ai-workforce/db";
import { CompositeAiProvider, GroqProvider, OpenRouterProvider } from "@ai-workforce/ai-provider";
import type { AiProvider } from "@ai-workforce/core";

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

  const repositories = buildRepositories(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);

  const providers: AiProvider[] = [new OpenRouterProvider({ apiKey: config.OPENROUTER_API_KEY })];
  if (config.GROQ_API_KEY) providers.push(new GroqProvider({ apiKey: config.GROQ_API_KEY }));
  const aiProvider = providers.length > 1 ? new CompositeAiProvider(providers) : providers[0]!;
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
