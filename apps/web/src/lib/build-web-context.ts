import { createLogger, type Config } from "@ai-workforce/shared";
import type { ExecutionContext } from "@ai-workforce/core";
import { OpenRouterProvider } from "@ai-workforce/ai-provider";
import { repositories } from "./repositories.js";
import { env } from "./env.js";

/**
 * apps/web's equivalent of apps/runner's bootstrap() — built per request (regenerate
 * action), not once at process start, since Next.js doesn't have a single long-lived
 * entrypoint the way the runner's index.ts does. Only the fields Skills actually touch
 * (aiProvider, repositories, logger) are real; config/taskRunId are placeholders since
 * on-demand regenerate isn't tied to a task_run.
 */
export function buildWebExecutionContext(): ExecutionContext {
  return {
    taskRunId: "web-regenerate",
    logger: createLogger(),
    aiProvider: new OpenRouterProvider({ apiKey: env.OPENROUTER_API_KEY }),
    repositories,
    config: {} as Config,
    now: new Date(),
  };
}
