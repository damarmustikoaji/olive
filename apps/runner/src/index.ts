import { isWithinWorkingHours } from "@ai-workforce/shared";
import { WorkflowRegistry, withTaskRun } from "@ai-workforce/core";
import { bootstrap } from "./bootstrap.js";
import { registerWorkflows } from "./register-workflows.js";

async function main(): Promise<void> {
  const { ctx, config } = await bootstrap();

  // FORCE_RUN exists only for manual workflow_dispatch testing outside business
  // hours — the scheduled cron trigger never sets it.
  const forceRun = process.env.FORCE_RUN === "true";

  if (!forceRun && !isWithinWorkingHours(ctx.now, config)) {
    ctx.logger.info("outside working hours, skipping run");
    return;
  }

  registerWorkflows(config);

  for (const workflow of WorkflowRegistry.all()) {
    const units = await workflow.shouldRun(ctx);

    for (const unit of units) {
      const taskRun = await ctx.repositories.taskRuns.getOrCreate({
        workflowName: workflow.name,
        triggerRef: unit.triggerRef,
      });

      if (taskRun.status === "done") continue; // already processed — idempotent skip
      if (taskRun.attemptCount >= config.MAX_TASK_ATTEMPTS) {
        ctx.logger.warn("task_run exceeded max attempts, needs manual review", {
          taskRunId: taskRun.id,
          triggerRef: unit.triggerRef,
        });
        continue;
      }

      const runCtx = withTaskRun(ctx, taskRun.id);

      try {
        await ctx.repositories.taskRuns.markRunning(taskRun.id);
        await workflow.execute(unit, runCtx);
        await ctx.repositories.taskRuns.markDone(taskRun.id);
      } catch (err) {
        runCtx.logger.error("workflow execution failed", { error: String(err) });
        await ctx.repositories.taskRuns.markFailed(taskRun.id, err);
      }
    }
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ level: "error", message: "runner crashed", error: String(err) }));
  process.exitCode = 1;
});
