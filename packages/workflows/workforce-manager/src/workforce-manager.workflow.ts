import type { ExecutionContext, Task, Workflow, WorkUnit } from "@ai-workforce/core";
import { MarketingContentWriterAgent } from "@ai-workforce/agent-marketing-content-writer";

interface Payload {
  taskId: string;
}

/**
 * The Manager never does the work itself — it only reads the backlog,
 * decides who's capable of a task, and hands it off. Each shift moves a
 * task exactly one stage forward (backlog -> assigned -> in_progress ->
 * ready_for_review), never all the way through in one run, so a crash
 * partway through never loses more than one stage of progress.
 *
 * Only one specialist exists today (marketing-content-writer). Adding a
 * Developer/QA agent later means adding a case to `pickAgentFor`, not
 * rewriting this workflow.
 */
export class WorkforceManagerWorkflow implements Workflow {
  readonly name = "workforce-manager";

  async shouldRun(ctx: ExecutionContext): Promise<WorkUnit[]> {
    const [backlog, assigned] = await Promise.all([
      ctx.repositories.tasks.listByStatus("backlog"),
      ctx.repositories.tasks.listByStatus("assigned"),
    ]);

    return [...backlog, ...assigned].map((task) => ({
      // Includes the status being acted on so each stage transition gets
      // its own idempotency record — the same task is revisited across
      // multiple shifts as it moves through the state machine.
      triggerRef: `${task.id}:${task.status}`,
      payload: { taskId: task.id } satisfies Payload,
    }));
  }

  async execute(unit: WorkUnit, ctx: ExecutionContext): Promise<void> {
    const { taskId } = unit.payload as Payload;
    const task = await ctx.repositories.tasks.findById(taskId);
    if (!task) throw new Error(`task ${taskId} not found`);

    if (task.status === "backlog") {
      await this.assignStage(task, ctx);
      return;
    }

    if (task.status === "assigned") {
      await this.executeStage(task, ctx);
      return;
    }
  }

  private async assignStage(task: Task, ctx: ExecutionContext): Promise<void> {
    const agentName = pickAgentFor(task);

    if (!agentName) {
      ctx.logger.warn("no specialist agent available for task, leaving in backlog", {
        taskId: task.id,
        source: task.source,
      });
      return;
    }

    await ctx.repositories.tasks.assign(task.id, agentName);
    await ctx.repositories.taskEvents.record(task.id, "assigned", { assigneeAgent: agentName });
  }

  private async executeStage(task: Task, ctx: ExecutionContext): Promise<void> {
    if (task.assigneeAgent !== "marketing-content-writer") {
      ctx.logger.warn("assigned agent has no execution handler yet", {
        taskId: task.id,
        assigneeAgent: task.assigneeAgent,
      });
      return;
    }

    await ctx.repositories.tasks.updateStatus(task.id, "in_progress");
    await ctx.repositories.taskEvents.record(task.id, "in_progress");

    const payload = task.payload as {
      repositoryId: string;
      releaseTag: string;
      releaseTitle: string;
      releaseBody: string;
    };

    const batch = await ctx.repositories.contentBatches.create({
      taskRunId: ctx.taskRunId,
      repositoryId: payload.repositoryId,
      releaseTag: payload.releaseTag,
      releaseTitle: payload.releaseTitle,
      releaseBody: payload.releaseBody,
    });

    const agent = new MarketingContentWriterAgent();
    const result = await agent.run(
      {
        contentBatchId: batch.id,
        releaseTitle: payload.releaseTitle,
        releaseBody: payload.releaseBody,
      },
      ctx,
    );

    if (result.piecesFailed.length > 0) {
      ctx.logger.warn("some content pieces failed to generate", { failed: result.piecesFailed });
    }

    await ctx.repositories.contentBatches.updateStatus(batch.id, "ready");
    await ctx.repositories.tasks.linkContentBatch(task.id, batch.id);
    await ctx.repositories.tasks.updateStatus(task.id, "ready_for_review");
    await ctx.repositories.taskEvents.record(task.id, "content_generated", {
      piecesGenerated: result.piecesGenerated,
      piecesFailed: result.piecesFailed,
    });
  }
}

function pickAgentFor(task: Task): string | null {
  if (task.source === "github_release") return "marketing-content-writer";
  return null;
}
