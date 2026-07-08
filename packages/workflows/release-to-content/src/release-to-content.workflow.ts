import type { ExecutionContext, Workflow, WorkUnit, WatchedRepository } from "@ai-workforce/core";
import { MarketingContentWriterAgent } from "@ai-workforce/agent-marketing-content-writer";
import { GithubReleaseClient, type GithubRelease } from "@ai-workforce/integration-github";

interface Payload {
  repo: WatchedRepository;
  release: GithubRelease;
}

export class ReleaseToContentWorkflow implements Workflow {
  readonly name = "release-to-content";

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

    const batch = await ctx.repositories.contentBatches.create({
      taskRunId: ctx.taskRunId,
      repositoryId: repo.id,
      releaseTag: release.tag,
      releaseTitle: release.title,
      releaseBody: release.body,
    });

    const agent = new MarketingContentWriterAgent();
    const result = await agent.run(
      {
        contentBatchId: batch.id,
        releaseTitle: release.title,
        releaseBody: release.body,
      },
      ctx,
    );

    if (result.piecesFailed.length > 0) {
      ctx.logger.warn("some content pieces failed to generate", { failed: result.piecesFailed });
    }

    await ctx.repositories.contentBatches.updateStatus(batch.id, "ready");
    await ctx.repositories.watchedRepositories.updateCheckpoint(repo.id, release.tag);
  }
}
