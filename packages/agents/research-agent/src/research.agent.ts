import type { Agent, ExecutionContext } from "@ai-workforce/core";
import type { TavilyClient } from "@ai-workforce/integration-tavily";
import type { GithubRepoClient } from "@ai-workforce/integration-github";
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

// A shallow snapshot (file list + README), not a deep read of the codebase —
// that's what Code Investigator is for, and it's bug-scoped for a reason.
// This just gives the recommendation something concrete to react to
// ("this already exists" / "this obviously doesn't yet") instead of
// reasoning about the market in a vacuum.
const MAX_README_CHARS = 3000;

export class ResearchAgent implements Agent<Record<string, never>, ResearchAgentResult> {
  readonly name = AGENT_NAME;

  constructor(
    private readonly tavilyClient: TavilyClient,
    private readonly githubClient?: GithubRepoClient,
    private readonly repoOwner?: string,
    private readonly repoName?: string,
  ) {}

  async run(_input: Record<string, never>, ctx: ExecutionContext): Promise<ResearchAgentResult> {
    const [resultsPerQuery, repoContextText] = await Promise.all([
      Promise.all(QUERIES.map((q) => this.tavilyClient.search(q, 5))),
      this.buildRepoContext(),
    ]);
    const allResults = resultsPerQuery.flat();

    const searchResultsText = allResults
      .map((r) => `### ${r.title}\n${r.url}\n${r.content}`)
      .join("\n\n");

    const summarizeSkill = new SummarizeResearchSkill();
    const digest = await summarizeSkill.execute({ searchResultsText, repoContextText }, ctx);

    return { digest, sourcesChecked: allResults.length };
  }

  private async buildRepoContext(): Promise<string> {
    if (!this.githubClient || !this.repoOwner || !this.repoName) {
      return "(tidak ada akses source code untuk riset ini)";
    }

    try {
      const [files, readme] = await Promise.all([
        this.githubClient.listSourceFiles(this.repoOwner, this.repoName),
        this.githubClient.getFileContent(this.repoOwner, this.repoName, "README.md"),
      ]);

      const fileListSummary = files.slice(0, 100).join("\n");
      const readmeExcerpt = readme?.slice(0, MAX_README_CHARS) ?? "(tidak ada README.md)";

      return `README:\n${readmeExcerpt}\n\nStruktur file (sebagian):\n${fileListSummary}`;
    } catch (err) {
      // A failed repo read shouldn't block the whole daily research run —
      // the external search half still stands on its own.
      return `(gagal membaca source code: ${String(err)})`;
    }
  }
}
