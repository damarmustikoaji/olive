import type { ExecutionContext, Workflow, WorkUnit, WatchedRepository } from "@ai-workforce/core";
import { GithubReleaseClient, type GithubRelease } from "@ai-workforce/integration-github";

interface Payload {
  repo: WatchedRepository;
  release: GithubRelease;
}

/**
 * A "task source", not a content generator. Its only job is to turn a new
 * GitHub release into one Task on the backlog (status: backlog). What
 * happens to that Task next — who gets assigned, what content gets made —
 * is entirely the Workforce Manager's decision, not this workflow's.
 */
export class GithubReleaseTaskSourceWorkflow implements Workflow {
  readonly name = "github-release-task-source";

  constructor(private readonly githubClient: GithubReleaseClient) {}

  async shouldRun(ctx: ExecutionContext): Promise<WorkUnit[]> {
    const repos = await ctx.repositories.watchedRepositories.getActive();
    const units: WorkUnit[] = [];

    for (const repo of repos) {
      const latestRelease = await this.githubClient.getLatestRelease(repo.owner, repo.repo);
      if (latestRelease && latestRelease.tag !== repo.lastReleaseTag) {
        units.push({
          triggerRef: `${repo.owner}/${repo.repo}@${latestRelease.tag}`,
          payload: { repo, release: latestRelease } satisfies Payload,
        });
      }
    }

    return units;
  }

  async execute(unit: WorkUnit, ctx: ExecutionContext): Promise<void> {
    const { repo, release } = unit.payload as Payload;
    const sourceRef = `${repo.owner}/${repo.repo}@${release.tag}`;

    const task = await ctx.repositories.tasks.getOrCreateBySourceRef({
      title: `Promosikan release ${release.tag} (${repo.owner}/${repo.repo})`,
      description: release.body,
      source: "github_release",
      sourceRef,
      severity: "medium",
      priority: "medium",
      payload: {
        repositoryId: repo.id,
        releaseTag: release.tag,
        releaseTitle: release.title,
        releaseBody: release.body,
      },
    });

    await ctx.repositories.taskEvents.record(task.id, "task_created", { source: "github_release", sourceRef });
    await ctx.repositories.watchedRepositories.updateCheckpoint(repo.id, release.tag);
  }
}
