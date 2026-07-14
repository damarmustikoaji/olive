import { WorkflowRegistry } from "@ai-workforce/core";
import type { Config } from "@ai-workforce/shared";
import { GithubReleaseClient, GithubRepoClient } from "@ai-workforce/integration-github";
import { ThreadsClient } from "@ai-workforce/integration-threads";
import { GithubReleaseTaskSourceWorkflow } from "@ai-workforce/workflow-release-to-content";
import { SupportTicketTaskSourceWorkflow } from "@ai-workforce/workflow-support-ticket-task-source";
import { WorkforceManagerWorkflow } from "@ai-workforce/workflow-workforce-manager";
import { CodeInvestigatorWorkflow } from "@ai-workforce/workflow-code-investigator";
import { InsightAgentWorkflow } from "@ai-workforce/workflow-insight-agent";
import { TavilyClient } from "@ai-workforce/integration-tavily";
import { ResearchAgentWorkflow } from "@ai-workforce/workflow-research-agent";

/**
 * The one file that needs to change when a new agent/workflow is added.
 * Nothing in apps/runner's loop or packages/core ever needs to change for that.
 *
 * Order matters within a single shift: task sources run first (turning
 * external events into backlog items), then the Manager picks up whatever
 * just landed, then Code Investigator adds a second opinion on any bug
 * tickets the Manager/Support Agent already escalated. Every workflow still
 * runs every shift — this isn't a strict pipeline, just a sensible default
 * ordering that lets a task move as far forward as possible in one run.
 */
export function registerWorkflows(config: Config): void {
  const githubClient = new GithubReleaseClient(config.GH_TOKEN);
  const githubRepoClient = new GithubRepoClient(config.GH_TOKEN);

  // Optional — the Manager still auto-approves non-critical tasks without
  // this, it just can't actually publish anywhere until credentials exist.
  const threadsClient =
    config.THREADS_USER_ID && config.THREADS_ACCESS_TOKEN
      ? new ThreadsClient({ userId: config.THREADS_USER_ID, accessToken: config.THREADS_ACCESS_TOKEN })
      : undefined;

  WorkflowRegistry.register(new GithubReleaseTaskSourceWorkflow(githubClient));
  WorkflowRegistry.register(new SupportTicketTaskSourceWorkflow());
  WorkflowRegistry.register(new WorkforceManagerWorkflow(threadsClient));
  WorkflowRegistry.register(
    new CodeInvestigatorWorkflow(githubRepoClient, config.CODE_INVESTIGATOR_REPO_OWNER, config.CODE_INVESTIGATOR_REPO_NAME),
  );
  // Insight Agent needs real Threads credentials to have anything to fetch —
  // without them there's nothing published to track yet, so skip registering.
  if (threadsClient) {
    WorkflowRegistry.register(new InsightAgentWorkflow(threadsClient));
  }
  // Same pattern: no Tavily key means no search, so skip registering rather
  // than fail every shift trying to call an API with no credentials. Reuses
  // the same GitHub repo client/target as Code Investigator — the daily
  // digest gets a shallow read of the actual codebase alongside external
  // market research, not just market research in a vacuum.
  if (config.TAVILY_API_KEY) {
    WorkflowRegistry.register(
      new ResearchAgentWorkflow(
        new TavilyClient(config.TAVILY_API_KEY),
        githubRepoClient,
        config.CODE_INVESTIGATOR_REPO_OWNER,
        config.CODE_INVESTIGATOR_REPO_NAME,
      ),
    );
  }
  // WorkflowRegistry.register(new GithubIssueTaskSourceWorkflow(...));  <- future task sources
}
