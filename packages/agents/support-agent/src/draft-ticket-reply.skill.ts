import { PromptDrivenSkill } from "@ai-workforce/core";

export interface DraftTicketReplyInput extends Record<string, unknown> {
  title: string;
  description: string;
  ticketType: string;
}

export const AGENT_NAME = "support-agent";

/**
 * Drafts a suggested reply for a support ticket. Never sent automatically —
 * AI Workforce has no write access to the app that owns support_tickets, so
 * this is always surfaced to the Owner (via the Task timeline) to copy over
 * manually, or to confirm before it's considered "handled".
 */
export class DraftTicketReplySkill extends PromptDrivenSkill<DraftTicketReplyInput, string> {
  readonly name = "draft-ticket-reply";
  protected readonly agentName = AGENT_NAME;
}
