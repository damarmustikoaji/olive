import type { ExecutionContext, Workflow, WorkUnit } from "@ai-workforce/core";
import { ResearchAgent } from "@ai-workforce/agent-research";
import type { TavilyClient } from "@ai-workforce/integration-tavily";

interface Payload {
  date: string;
}

/**
 * A task source, not a specialist — same role as the release/support-ticket
 * workflows. It only produces the raw material (a digest); the Manager then
 * routes it to Marketing like any other backlog item, so a research idea can
 * turn into actual published content instead of just a report nobody acts on.
 */
export class ResearchAgentWorkflow implements Workflow {
  readonly name = "research-agent";

  constructor(private readonly tavilyClient: TavilyClient) {}

  async shouldRun(ctx: ExecutionContext): Promise<WorkUnit[]> {
    const today = ctx.now.toISOString().slice(0, 10);
    return [
      {
        // One run per calendar day, full stop — this is what keeps AI spend
        // on this feature bounded no matter how many shifts fire that day.
        triggerRef: `research-agent:${today}`,
        payload: { date: today } satisfies Payload,
      },
    ];
  }

  async execute(unit: WorkUnit, ctx: ExecutionContext): Promise<void> {
    const { date } = unit.payload as Payload;

    const agent = new ResearchAgent(this.tavilyClient);
    const result = await agent.run({}, ctx);

    // Left in "backlog" deliberately — the Manager classifies severity and
    // routes it to Marketing like any other task source, rather than this
    // workflow deciding that itself.
    const task = await ctx.repositories.tasks.getOrCreateBySourceRef({
      title: `Riset harian — ide pengembangan & promo (${date})`,
      description: result.digest,
      source: "research",
      sourceRef: date,
      priority: "low",
      payload: { sourcesChecked: result.sourcesChecked },
    });

    await ctx.repositories.taskEvents.record(task.id, "research_completed", {
      sourcesChecked: result.sourcesChecked,
    });
  }
}
