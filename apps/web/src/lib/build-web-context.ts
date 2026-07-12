import { createLogger, type Config } from "@ai-workforce/shared";
import type { AiProvider, ExecutionContext } from "@ai-workforce/core";
import { CompositeAiProvider, GroqProvider, OpenRouterProvider } from "@ai-workforce/ai-provider";
import { repositories } from "./repositories";
import { env } from "./env";

/**
 * apps/web's equivalent of apps/runner's bootstrap() — built per request (regenerate
 * action), not once at process start, since Next.js doesn't have a single long-lived
 * entrypoint the way the runner's index.ts does. Only the fields Skills actually touch
 * (aiProvider, repositories, logger) are real; config/taskRunId are placeholders since
 * on-demand regenerate isn't tied to a task_run.
 */
export function buildWebExecutionContext(): ExecutionContext {
  const providers: AiProvider[] = [new OpenRouterProvider({ apiKey: env.OPENROUTER_API_KEY })];
  if (env.GROQ_API_KEY) providers.push(new GroqProvider({ apiKey: env.GROQ_API_KEY }));
  const aiProvider = providers.length > 1 ? new CompositeAiProvider(providers) : providers[0]!;

  return {
    taskRunId: "web-regenerate",
    logger: createLogger(),
    aiProvider,
    repositories,
    config: {} as Config,
    now: new Date(),
  };
}
