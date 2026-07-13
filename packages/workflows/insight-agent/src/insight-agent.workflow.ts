import type { ExecutionContext, Workflow, WorkUnit } from "@ai-workforce/core";
import { InsightAgent, SummarizeRecommendationSkill } from "@ai-workforce/agent-insight";
import type { ThreadsClient } from "@ai-workforce/integration-threads";

interface FetchPayload {
  kind: "fetch";
  contentPieceId: string;
  mediaId: string;
}

interface RecommendationPayload {
  kind: "recommendation";
  date: string;
}

type Payload = FetchPayload | RecommendationPayload;

const TRACK_WINDOW_DAYS = 14;
// Below this, any "recommendation" would just be restating one data point —
// not worth a model call or an Owner's attention.
const MIN_PIECES_FOR_RECOMMENDATION = 2;

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

    const fetchUnits: WorkUnit[] = pieces
      .filter((piece): piece is typeof piece & { publishedMediaId: string } => piece.publishedMediaId !== null)
      .map((piece) => ({
        // One fetch per piece per calendar day — the same piece is revisited
        // across many shifts while it's inside the tracking window.
        triggerRef: `insight:${piece.id}:${today}`,
        payload: { kind: "fetch", contentPieceId: piece.id, mediaId: piece.publishedMediaId } satisfies Payload,
      }));

    const recommendationUnit: WorkUnit = {
      // One recommendation attempt per day — the handler itself decides
      // whether there's actually enough data to say anything.
      triggerRef: `insight-recommendation:${today}`,
      payload: { kind: "recommendation", date: today } satisfies Payload,
    };

    return [...fetchUnits, recommendationUnit];
  }

  async execute(unit: WorkUnit, ctx: ExecutionContext): Promise<void> {
    const payload = unit.payload as Payload;

    if (payload.kind === "fetch") {
      const agent = new InsightAgent(this.threadsClient);
      const metrics = await agent.run({ mediaId: payload.mediaId }, ctx);

      await ctx.repositories.contentInsights.record({
        contentPieceId: payload.contentPieceId,
        views: metrics.views,
        likes: metrics.likes,
        replies: metrics.replies,
        reposts: metrics.reposts,
        quotes: metrics.quotes,
      });
      return;
    }

    await this.generateDailyRecommendation(payload.date, ctx);
  }

  private async generateDailyRecommendation(date: string, ctx: ExecutionContext): Promise<void> {
    const sinceDate = new Date(ctx.now);
    sinceDate.setDate(sinceDate.getDate() - TRACK_WINDOW_DAYS);

    const pieces = await ctx.repositories.contentPieces.listPublishedWithMediaId({
      platform: "threads",
      sincePublishedAt: sinceDate,
    });

    const withLatestInsight = await Promise.all(
      pieces.map(async (piece) => {
        const insights = await ctx.repositories.contentInsights.listByContentPiece(piece.id);
        return insights[0] ? { piece, latest: insights[0] } : null;
      }),
    );

    const dataPoints = withLatestInsight.filter((p): p is NonNullable<typeof p> => p !== null);

    if (dataPoints.length < MIN_PIECES_FOR_RECOMMENDATION) {
      ctx.logger.info("not enough insight data for a daily recommendation yet", {
        piecesWithData: dataPoints.length,
      });
      return;
    }

    const performanceDataText = dataPoints
      .map(
        ({ piece, latest }) =>
          `Content: ${piece.content.slice(0, 150)}\nViews: ${latest.views}, Likes: ${latest.likes}, Replies: ${latest.replies}, Reposts: ${latest.reposts}`,
      )
      .join("\n---\n");

    const skill = new SummarizeRecommendationSkill();
    const recommendation = await skill.execute({ performanceDataText }, ctx);

    const task = await ctx.repositories.tasks.getOrCreateBySourceRef({
      title: `Insight harian — rekomendasi konten (${date})`,
      description: recommendation,
      source: "insight",
      sourceRef: date,
      severity: "minor",
      priority: "low",
      payload: { piecesAnalyzed: dataPoints.length },
    });

    // Informational for the Owner, not routed through the Manager — there's
    // no specialist that acts on a style recommendation the way Marketing
    // acts on a content idea, so this stays a direct report to read.
    await ctx.repositories.tasks.updateStatus(task.id, "ready_for_review");
    await ctx.repositories.taskEvents.record(task.id, "insight_recommendation_generated", {
      piecesAnalyzed: dataPoints.length,
    });
  }
}
