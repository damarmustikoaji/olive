import type { ExecutionContext, Task, Workflow, WorkUnit } from "@ai-workforce/core";
import { MarketingContentWriterAgent } from "@ai-workforce/agent-marketing-content-writer";
import { DraftTicketReplySkill } from "@ai-workforce/agent-support";
import type { ThreadsClient } from "@ai-workforce/integration-threads";
import { ClassifySeverityTaskSkill } from "./classify-severity.skill.js";

interface Payload {
  taskId: string;
}

interface ReleasePayload {
  repositoryId: string;
  releaseTag: string;
  releaseTitle: string;
  releaseBody: string;
}

interface SupportTicketPayload {
  ticketId: string;
  userId: string;
  ticketType: string;
}

/**
 * The Manager never does the work itself — it only reads the backlog,
 * decides who's capable of a task, and hands it off. Each shift moves a
 * task exactly one stage forward (backlog -> assigned -> in_progress ->
 * ready_for_review/done), never all the way through in one run, so a crash
 * partway through never loses more than one stage of progress.
 *
 * Two specialists exist today (marketing-content-writer, support-agent).
 * Adding another means a case in `pickAgentFor` and a branch in
 * `executeStage`, not rewriting this workflow.
 */
export class WorkforceManagerWorkflow implements Workflow {
  readonly name = "workforce-manager";

  private readonly classifySeveritySkill = new ClassifySeverityTaskSkill();
  private readonly draftTicketReplySkill = new DraftTicketReplySkill();

  constructor(private readonly threadsClient?: ThreadsClient) {}

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
    // The Owner's own judgment on a manually-created task is never
    // second-guessed by the Manager's classifier.
    if (task.source !== "manual") {
      const classification = await this.classifySeveritySkill.execute(
        { title: task.title, description: task.description ?? "" },
        ctx,
      );
      await ctx.repositories.tasks.updateSeverity(task.id, classification.severity);
      await ctx.repositories.taskEvents.record(task.id, "severity_classified", {
        severity: classification.severity,
        reasoning: classification.reasoning,
      });
      task = { ...task, severity: classification.severity };
    }

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
    if (task.assigneeAgent === "marketing-content-writer") {
      await this.executeContentWriter(task, ctx);
      return;
    }

    if (task.assigneeAgent === "support-agent") {
      await this.executeSupportAgent(task, ctx);
      return;
    }

    ctx.logger.warn("assigned agent has no execution handler yet", {
      taskId: task.id,
      assigneeAgent: task.assigneeAgent,
    });
  }

  private async executeContentWriter(task: Task, ctx: ExecutionContext): Promise<void> {
    await ctx.repositories.tasks.updateStatus(task.id, "in_progress");
    await ctx.repositories.taskEvents.record(task.id, "in_progress");

    const payload = task.payload as unknown as ReleasePayload;

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
    await ctx.repositories.taskEvents.record(task.id, "content_generated", {
      piecesGenerated: result.piecesGenerated,
      piecesFailed: result.piecesFailed,
    });

    if (task.severity === "critical") {
      // Escalate: the Owner reviews and approves each piece manually.
      await ctx.repositories.tasks.updateStatus(task.id, "ready_for_review");
      return;
    }

    // Non-critical: the Manager is confident enough to approve and publish
    // on its own — the Owner finds out by seeing it land on the board, not
    // by being asked first.
    await this.autoApproveAndPublishContent(task, batch.id, ctx);
  }

  private async autoApproveAndPublishContent(task: Task, contentBatchId: string, ctx: ExecutionContext): Promise<void> {
    const pieces = await ctx.repositories.contentPieces.listByBatch(contentBatchId);

    for (const piece of pieces) {
      await ctx.repositories.contentPieces.update(piece.id, { reviewedAt: new Date() });
    }
    await ctx.repositories.taskEvents.record(task.id, "auto_approved_by_manager", { severity: task.severity });

    if (this.threadsClient) {
      const threadsPiece = pieces.find((p) => p.platform === "threads");
      if (threadsPiece) {
        try {
          const result = await this.threadsClient.postThread(threadsPiece.content);
          await ctx.repositories.contentPieces.markPublished(threadsPiece.id, result.url);
          await ctx.repositories.taskEvents.record(task.id, "auto_published_to_threads", { url: result.url });
        } catch (err) {
          ctx.logger.error("auto-publish to threads failed", { taskId: task.id, error: String(err) });
          await ctx.repositories.taskEvents.record(task.id, "auto_publish_failed", { error: String(err) });
        }
      }
    }

    await ctx.repositories.tasks.updateStatus(task.id, "done");
  }

  private async executeSupportAgent(task: Task, ctx: ExecutionContext): Promise<void> {
    await ctx.repositories.tasks.updateStatus(task.id, "in_progress");
    await ctx.repositories.taskEvents.record(task.id, "in_progress");

    const payload = task.payload as unknown as SupportTicketPayload;

    const draftReply = await this.draftTicketReplySkill.execute(
      { title: task.title, description: task.description ?? "", ticketType: payload.ticketType },
      ctx,
    );
    await ctx.repositories.taskEvents.record(task.id, "draft_reply_generated", { draftReply });

    if (payload.ticketType === "issue") {
      // Bug reports are never auto-resolved — there's no Developer agent yet
      // to actually fix anything. This just guarantees the report is triaged
      // and visible, not silently sitting in the source app unactioned.
      await ctx.repositories.tasks.updateStatus(task.id, "ready_for_review");
      return;
    }

    // ask/feedback: same severity-based auto-resolve as content tasks.
    if (task.severity === "critical") {
      await ctx.repositories.tasks.updateStatus(task.id, "ready_for_review");
      return;
    }

    await ctx.repositories.taskEvents.record(task.id, "auto_approved_by_manager", { severity: task.severity });
    await ctx.repositories.tasks.updateStatus(task.id, "done");
  }
}

function pickAgentFor(task: Task): string | null {
  if (task.source === "github_release") return "marketing-content-writer";
  if (task.source === "support_ticket") return "support-agent";
  return null;
}
