import { WorkflowRegistry } from "@ai-workforce/core";
import type { Config } from "@ai-workforce/shared";
import { GithubReleaseClient } from "@ai-workforce/integration-github";
import { GithubReleaseTaskSourceWorkflow } from "@ai-workforce/workflow-release-to-content";
import { WorkforceManagerWorkflow } from "@ai-workforce/workflow-workforce-manager";

/**
 * The one file that needs to change when a new agent/workflow is added.
 * Nothing in apps/runner's loop or packages/core ever needs to change for that.
 *
 * Order matters within a single shift: task sources run first (turning
 * external events into backlog items), then the Manager picks up whatever
 * just landed. Both still run every shift — this isn't a strict pipeline,
 * just a sensible default ordering.
 */
export function registerWorkflows(config: Config): void {
  const githubClient = new GithubReleaseClient(config.GH_TOKEN);

  WorkflowRegistry.register(new GithubReleaseTaskSourceWorkflow(githubClient));
  WorkflowRegistry.register(new WorkforceManagerWorkflow());
  // WorkflowRegistry.register(new GithubIssueTaskSourceWorkflow(...));  <- future task sources
}
