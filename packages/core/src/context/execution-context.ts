import type { Config } from "@ai-workforce/shared";
import type { Logger } from "@ai-workforce/shared";
import type { AiProvider } from "../ai-provider/index.js";
import type { RepositoryBundle } from "../domain/index.js";

/**
 * Everything an Agent/Skill/Workflow needs, injected from outside.
 * Built once per process in apps/runner (or apps/web for on-demand regenerate),
 * re-bound per task via `.withTaskRun()` so logs/records link to the right task_run row.
 */
export interface ExecutionContext {
  readonly taskRunId: string;
  readonly logger: Logger;
  readonly aiProvider: AiProvider;
  readonly repositories: RepositoryBundle;
  readonly config: Config;
  readonly now: Date;
}

export function withTaskRun(ctx: ExecutionContext, taskRunId: string): ExecutionContext {
  return {
    ...ctx,
    taskRunId,
    logger: ctx.logger.child(taskRunId),
  };
}
