import type { Agent, ExecutionContext } from "@ai-workforce/core";
import type { ThreadsClient } from "@ai-workforce/integration-threads";
import { AGENT_NAME } from "./types.js";

export interface InsightAgentInput {
  mediaId: string;
}

export interface InsightAgentResult {
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
}

/**
 * No AI call here — this is pure metrics retrieval, not analysis. Spending
 * a model invocation to fetch numbers from an API would just burn free-tier
 * budget for nothing; the KPI reasoning lives on the dashboard, not here.
 */
export class InsightAgent implements Agent<InsightAgentInput, InsightAgentResult> {
  readonly name = AGENT_NAME;

  constructor(private readonly threadsClient: ThreadsClient) {}

  async run(input: InsightAgentInput, _ctx: ExecutionContext): Promise<InsightAgentResult> {
    return this.threadsClient.getMediaInsights(input.mediaId);
  }
}
