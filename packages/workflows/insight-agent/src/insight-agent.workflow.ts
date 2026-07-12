import type { ExecutionContext, Workflow, WorkUnit } from "@ai-workforce/core";
import { InsightAgent } from "@ai-workforce/agent-insight";
import type { ThreadsClient } from "@ai-workforce/integration-threads";

interface Payload {
  contentPieceId: string;
  mediaId: string;
}

const TRACK_WINDOW_DAYS = 14;

/**
 * Metrics keep moving for a couple of weeks after a post goes out, then
 * settle — tracking indefinitely would just mean an ever-growing list of
 * near-zero-change fetches against Meta's rate limits for no benefit.
 */
export class InsightAgentWorkflow implements Workflow {
  readonly name = "insight-agent";

  constructor(private readonly threadsClient: ThreadsClient) {}

  async shouldRun(ctx: ExecutionContext): Promise<WorkUnit[]> {
    const sinceDate = new Date(ctx.now);
    sinceDate.setDate(sinceDate.getDate() - TRACK_WINDOW_DAYS);

    const pieces = await ctx.repositories.contentPieces.listPublishedWithMediaId({
      platform: "threads",
      sincePublishedAt: sinceDate,
    });

    const today = ctx.now.toISOString().slice(0, 10);

    return pieces
      .filter((piece): piece is typeof piece & { publishedMediaId: string } => piece.publishedMediaId !== null)
      .map((piece) => ({
        // One fetch per piece per calendar day — the same piece is revisited
        // across many shifts while it's inside the tracking window.
        triggerRef: `insight:${piece.id}:${today}`,
        payload: { contentPieceId: piece.id, mediaId: piece.publishedMediaId } satisfies Payload,
      }));
  }

  async execute(unit: WorkUnit, ctx: ExecutionContext): Promise<void> {
    const { contentPieceId, mediaId } = unit.payload as Payload;

    const agent = new InsightAgent(this.threadsClient);
    const metrics = await agent.run({ mediaId }, ctx);

    await ctx.repositories.contentInsights.record({
      contentPieceId,
      views: metrics.views,
      likes: metrics.likes,
      replies: metrics.replies,
      reposts: metrics.reposts,
      quotes: metrics.quotes,
    });
  }
}
