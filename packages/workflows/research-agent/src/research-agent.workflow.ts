import type { ExecutionContext, Workflow, WorkUnit } from "@ai-workforce/core";
import { ResearchAgent } from "@ai-workforce/agent-research";
import type { TavilyClient } from "@ai-workforce/integration-tavily";

interface Payload {
  date: string;
}

/**
 * Unlike the other task sources, this workflow both creates and finishes the
 * task in one shift: search + AI summary is a single atomic unit of work,
 * there's no separate specialist to hand off to. The task lands directly at
 * ready_for_review — it's a recommendation for the Owner to read, not
 * something the Manager should triage or auto-approve on its own.
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

    const task = await ctx.repositories.tasks.getOrCreateBySourceRef({
      title: `Riset harian — ide pengembangan & promo (${date})`,
      description: result.digest,
      source: "research",
      sourceRef: date,
      severity: "minor",
      priority: "low",
      payload: { sourcesChecked: result.sourcesChecked },
    });

    await ctx.repositories.tasks.assign(task.id, "research-agent");
    await ctx.repositories.tasks.updateStatus(task.id, "ready_for_review");
    await ctx.repositories.taskEvents.record(task.id, "research_completed", {
      sourcesChecked: result.sourcesChecked,
    });
  }
}
