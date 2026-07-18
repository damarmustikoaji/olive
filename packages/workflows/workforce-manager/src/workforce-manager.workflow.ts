import type { ExecutionContext, Task, Workflow, WorkUnit } from "@ai-workforce/core";
import { MarketingContentWriterAgent } from "@ai-workforce/agent-marketing-content-writer";
import { DraftTicketReplySkill } from "@ai-workforce/agent-support";
import type { ThreadsClient } from "@ai-workforce/integration-threads";
import { ClassifySeverityTaskSkill } from "./classify-severity.skill.js";
import { AnalyzeImageSkill } from "./analyze-image.skill.js";
import { AssignTaskDecisionSkill, buildDecisionInput } from "./llm-decision.skill.js";

/** Matches every markdown image link in a task description, e.g. ![alt](https://...). */
const IMAGE_MARKDOWN_RE = /!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g;

function extractImageUrls(description: string | null): string[] {
  if (!description) return [];
  return [...description.matchAll(IMAGE_MARKDOWN_RE)]
    .map((m) => m[1])
    .filter((url): url is string => url !== undefined);
}

interface TaskPayload {
  kind: "task";
  taskId: string;
}

interface RetryPublishPayload {
  kind: "retry_publish";
  contentPieceId: string;
  contentBatchId: string;
  content: string;
}

type Payload = TaskPayload | RetryPublishPayload;

const RETRY_PUBLISH_WINDOW_DAYS = 3;

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
 * decides who's capable of a task, and hands it off. A shift normally moves
 * a task one stage forward (backlog -> assigned -> in_progress ->
 * ready_for_review/done), but assignStage chains straight into executeStage
 * within the same run when possible — GitHub's schedule trigger is
 * unreliable enough (frequently delayed or dropped, especially for public/
 * free-tier repos) that waiting for a second successful shift just to pick
 * up "assigned" can mean hours of apparent inactivity for no real reason.
 * A crash between the two still leaves the task at "assigned" for the next
 * shift to pick up, so this doesn't weaken the crash-safety the original
 * one-stage design was protecting — it only skips a *guaranteed-successful*
 * wait for another shift.
 *
 * Two specialists exist today (marketing-content-writer, support-agent).
 * Which one (if any) a task gets assigned to is now an LLM decision made via
 * tool calls (see AssignTaskDecisionSkill / board-tools.ts), not a hardcoded
 * switch — adding a specialist means adding it to the assign_task tool's
 * agentName enum and the prompt's guidance, plus a branch in `executeStage`.
 */
export class WorkforceManagerWorkflow implements Workflow {
  readonly name = "workforce-manager";

  private readonly classifySeveritySkill = new ClassifySeverityTaskSkill();
  private readonly draftTicketReplySkill = new DraftTicketReplySkill();
  private readonly assignTaskDecisionSkill = new AssignTaskDecisionSkill();

  constructor(private readonly threadsClient?: ThreadsClient) {}

  async shouldRun(ctx: ExecutionContext): Promise<WorkUnit[]> {
    const [backlog, assigned] = await Promise.all([
      ctx.repositories.tasks.listByStatus("backlog"),
      ctx.repositories.tasks.listByStatus("assigned"),
    ]);

    const taskUnits: WorkUnit[] = [...backlog, ...assigned].map((task) => ({
      // Includes the status being acted on so each stage transition gets
      // its own idempotency record — the same task is revisited across
      // multiple shifts as it moves through the state machine.
      triggerRef: `${task.id}:${task.status}`,
      payload: { kind: "task", taskId: task.id } satisfies Payload,
    }));

    const retryUnits = this.threadsClient ? await this.buildRetryPublishUnits(ctx) : [];

    return [...taskUnits, ...retryUnits];
  }

  private async buildRetryPublishUnits(ctx: ExecutionContext): Promise<WorkUnit[]> {
    const sinceCreatedAt = new Date(ctx.now);
    sinceCreatedAt.setDate(sinceCreatedAt.getDate() - RETRY_PUBLISH_WINDOW_DAYS);

    const pieces = await ctx.repositories.contentPieces.listApprovedUnpublished({
      platform: "threads",
      sinceCreatedAt,
    });

    const today = ctx.now.toISOString().slice(0, 10);

    return pieces.map((piece) => ({
      // One retry attempt per piece per calendar day — frequent enough to
      // recover quickly from a transient failure, not so frequent it hammers
      // Meta's API for something that might be down for hours.
      triggerRef: `retry-publish:${piece.id}:${today}`,
      payload: {
        kind: "retry_publish",
        contentPieceId: piece.id,
        contentBatchId: piece.contentBatchId,
        content: piece.content,
      } satisfies Payload,
    }));
  }

  async execute(unit: WorkUnit, ctx: ExecutionContext): Promise<void> {
    const payload = unit.payload as Payload;

    if (payload.kind === "retry_publish") {
      await this.retryPublish(payload, ctx);
      return;
    }

    const task = await ctx.repositories.tasks.findById(payload.taskId);
    if (!task) throw new Error(`task ${payload.taskId} not found`);

    if (task.status === "backlog") {
      const assignedTask = await this.assignStage(task, ctx);
      if (assignedTask) {
        await this.executeStage(assignedTask, ctx);
      }
      return;
    }

    if (task.status === "assigned") {
      await this.executeStage(task, ctx);
      return;
    }
  }

  private async retryPublish(payload: RetryPublishPayload, ctx: ExecutionContext): Promise<void> {
    if (!this.threadsClient) return;

    const task = await ctx.repositories.tasks.findByContentBatchId(payload.contentBatchId);

    try {
      const result = await this.threadsClient.postThread(payload.content);
      await ctx.repositories.contentPieces.markPublished(payload.contentPieceId, result.url, result.id);
      if (task) {
        await ctx.repositories.taskEvents.record(task.id, "auto_published_to_threads", { url: result.url, retried: true });
      }
    } catch (err) {
      if (task) {
        await ctx.repositories.taskEvents.record(task.id, "auto_publish_retry_failed", { error: String(err) });
      }
      ctx.logger.warn("retried Threads publish failed again", {
        contentPieceId: payload.contentPieceId,
        error: String(err),
      });
    }
  }

  /** Returns the updated task if it got assigned to a specialist, null if it's staying in backlog. */
  private async assignStage(task: Task, ctx: ExecutionContext): Promise<Task | null> {
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

    // The LLM decides what happens next via tool calls (assign_task /
    // post_task_comment), replacing the old hardcoded pickAgentFor switch —
    // its reasoning lands as a real task_events entry either way, instead of
    // a silent logger.warn when no specialist fit.
    const decision = await this.assignTaskDecisionSkill.execute(buildDecisionInput(task), ctx);

    const updated = await ctx.repositories.tasks.findById(task.id);
    if (!updated || updated.status !== "assigned") {
      ctx.logger.info("manager LLM left task in backlog", { taskId: task.id, summary: decision.summary });
      return null;
    }
    return updated;
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

    if (task.assigneeAgent === "workforce-manager") {
      await this.executeImageAnalysis(task, ctx);
      return;
    }

    ctx.logger.warn("assigned agent has no execution handler yet", {
      taskId: task.id,
      assigneeAgent: task.assigneeAgent,
    });
  }

  /** The Manager handling a manual task itself — vision analysis is a direct capability, not a delegated one. */
  private async executeImageAnalysis(task: Task, ctx: ExecutionContext): Promise<void> {
    await ctx.repositories.tasks.updateStatus(task.id, "in_progress");
    await ctx.repositories.taskEvents.record(task.id, "in_progress");

    const imageUrls = extractImageUrls(task.description);
    const skill = new AnalyzeImageSkill();

    for (const imageUrl of imageUrls) {
      try {
        const analysis = await skill.execute({ imageUrl, context: task.title }, ctx);
        await ctx.repositories.taskEvents.record(task.id, "image_analyzed", { url: imageUrl, analysis });
      } catch (err) {
        ctx.logger.error("image analysis failed", { taskId: task.id, imageUrl, error: String(err) });
        await ctx.repositories.taskEvents.record(task.id, "image_analysis_failed", { url: imageUrl, error: String(err) });
      }
    }

    // Owner reviews the conclusion — this is analysis output, not a routine
    // decision the Manager should auto-resolve on its own.
    await ctx.repositories.tasks.updateStatus(task.id, "ready_for_review");
  }

  private async executeContentWriter(task: Task, ctx: ExecutionContext): Promise<void> {
    await ctx.repositories.tasks.updateStatus(task.id, "in_progress");
    await ctx.repositories.taskEvents.record(task.id, "in_progress");

    const source = resolveContentSource(task);

    const batch = await ctx.repositories.contentBatches.create({
      taskRunId: ctx.taskRunId,
      repositoryId: source.repositoryId,
      releaseTag: source.releaseTag,
      releaseTitle: source.title,
      releaseBody: source.body,
    });

    const agent = new MarketingContentWriterAgent();
    const result = await agent.run(
      {
        contentBatchId: batch.id,
        releaseTitle: source.title,
        releaseBody: source.body,
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
          await ctx.repositories.contentPieces.markPublished(threadsPiece.id, result.url, result.id);
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

function resolveContentSource(task: Task): {
  title: string;
  body: string;
  repositoryId?: string;
  releaseTag: string;
} {
  if (task.source === "github_release") {
    const payload = task.payload as unknown as ReleasePayload;
    return {
      title: payload.releaseTitle,
      body: payload.releaseBody,
      repositoryId: payload.repositoryId,
      releaseTag: payload.releaseTag,
    };
  }

  // Research-sourced: the task's own title/digest (task.description) is the
  // material Marketing writes from — there's no separate release payload.
  return {
    title: task.title,
    body: task.description ?? "",
    releaseTag: task.id,
  };
}
