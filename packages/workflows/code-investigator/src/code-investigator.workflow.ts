import type { ExecutionContext, Workflow, WorkUnit } from "@ai-workforce/core";
import { CodeInvestigatorAgent } from "@ai-workforce/agent-code-investigator";
import { GithubRepoClient } from "@ai-workforce/integration-github";

interface Payload {
  taskId: string;
}

/**
 * Complementary to Support Agent, not competing with it: Support Agent owns
 * "issue" tickets (assigneeAgent stays "support-agent", drafts the user
 * acknowledgement, sets ready_for_review). This workflow reacts to those same
 * ready_for_review issue tickets and adds a second opinion — a code-level
 * analysis — as task_events, without touching status or assigneeAgent. The
 * Owner ends up with both the triage AND the investigation before deciding.
 */
export class CodeInvestigatorWorkflow implements Workflow {
  readonly name = "code-investigator";

  constructor(
    private readonly githubClient: GithubRepoClient,
    private readonly repoOwner: string,
    private readonly repoName: string,
  ) {}

  async shouldRun(ctx: ExecutionContext): Promise<WorkUnit[]> {
    const readyForReview = await ctx.repositories.tasks.listByStatus("ready_for_review");

    return readyForReview
      .filter((task) => task.source === "support_ticket" && (task.payload as { ticketType?: string }).ticketType === "issue")
      .map((task) => ({
        triggerRef: task.id,
        payload: { taskId: task.id } satisfies Payload,
      }));
  }

  async execute(unit: WorkUnit, ctx: ExecutionContext): Promise<void> {
    const { taskId } = unit.payload as Payload;
    const task = await ctx.repositories.tasks.findById(taskId);
    if (!task) throw new Error(`task ${taskId} not found`);

    const agent = new CodeInvestigatorAgent(this.githubClient, this.repoOwner, this.repoName);
    const result = await agent.run({ title: task.title, description: task.description ?? "" }, ctx);

    await ctx.repositories.taskEvents.record(task.id, "code_analysis_generated", {
      filesChecked: result.filesChecked,
      analysis: result.analysis,
      repo: `${this.repoOwner}/${this.repoName}`,
    });
  }
}
