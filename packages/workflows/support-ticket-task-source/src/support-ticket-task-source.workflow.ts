import type { ExecutionContext, SupportTicket, Workflow, WorkUnit } from "@ai-workforce/core";

interface Payload {
  ticket: SupportTicket;
}

/**
 * A task source, not a handler — same pattern as GithubReleaseTaskSourceWorkflow.
 * Its only job is turning an open ticket in Sandbox's public.support_tickets
 * into one Task on the backlog. It never writes back to support_tickets
 * (that table belongs to a different app) — idempotency comes entirely from
 * workforce.tasks' UNIQUE(source, source_ref) constraint, keyed by ticket id.
 */
export class SupportTicketTaskSourceWorkflow implements Workflow {
  readonly name = "support-ticket-task-source";

  async shouldRun(ctx: ExecutionContext): Promise<WorkUnit[]> {
    const tickets = await ctx.repositories.supportTickets.listOpen();

    return tickets.map((ticket) => ({
      triggerRef: ticket.id,
      payload: { ticket } satisfies Payload,
    }));
  }

  async execute(unit: WorkUnit, ctx: ExecutionContext): Promise<void> {
    const { ticket } = unit.payload as Payload;

    const task = await ctx.repositories.tasks.getOrCreateBySourceRef({
      title: ticket.title.slice(0, 200),
      description: ticket.description,
      source: "support_ticket",
      sourceRef: ticket.id,
      payload: {
        ticketId: ticket.id,
        userId: ticket.userId,
        ticketType: ticket.type,
      },
    });

    await ctx.repositories.taskEvents.record(task.id, "task_created", {
      source: "support_ticket",
      ticketType: ticket.type,
    });
  }
}
