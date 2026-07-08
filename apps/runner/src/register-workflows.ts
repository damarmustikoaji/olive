import { WorkflowRegistry } from "@ai-workforce/core";
import type { Config } from "@ai-workforce/shared";
import { GithubReleaseClient } from "@ai-workforce/integration-github";
import { ReleaseToContentWorkflow } from "@ai-workforce/workflow-release-to-content";

/**
 * The one file that needs to change when a new agent/workflow is added.
 * Nothing in apps/runner's loop or packages/core ever needs to change for that.
 */
export function registerWorkflows(config: Config): void {
  const githubClient = new GithubReleaseClient(config.GH_TOKEN);

  WorkflowRegistry.register(new ReleaseToContentWorkflow(githubClient));
  // WorkflowRegistry.register(new WeeklyReportWorkflow(...));  <- future agents go here
}
