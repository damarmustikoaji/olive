import type { Agent, ExecutionContext } from "@ai-workforce/core";
import type { TavilyClient } from "@ai-workforce/integration-tavily";
import { AGENT_NAME } from "./types.js";
import { SummarizeResearchSkill } from "./skills/summarize-research.skill.js";

export interface ResearchAgentResult {
  digest: string;
  sourcesChecked: number;
}

// Fixed, not owner-configurable yet — two angles that matter for a small API
// testing tool: what competitors/the market are doing, and how similar tools
// grow their active users. Kept to two queries so a full run is one search
// round + one AI call, not an open-ended crawl.
const QUERIES = [
  "API testing tool features trends 2026 Postman Insomnia alternatives",
  "developer tool growth marketing strategies increase active users",
];

export class ResearchAgent implements Agent<Record<string, never>, ResearchAgentResult> {
  readonly name = AGENT_NAME;

  constructor(private readonly tavilyClient: TavilyClient) {}

  async run(_input: Record<string, never>, ctx: ExecutionContext): Promise<ResearchAgentResult> {
    const resultsPerQuery = await Promise.all(QUERIES.map((q) => this.tavilyClient.search(q, 5)));
    const allResults = resultsPerQuery.flat();

    const searchResultsText = allResults
      .map((r) => `### ${r.title}\n${r.url}\n${r.content}`)
      .join("\n\n");

    const summarizeSkill = new SummarizeResearchSkill();
    const digest = await summarizeSkill.execute({ searchResultsText }, ctx);

    return { digest, sourcesChecked: allResults.length };
  }
}
