import type { SupabaseClient } from "../supabase-client.js";
import type { SupportTicket, SupportTicketRepo as ISupportTicketRepo } from "@ai-workforce/core";
import { DatabaseError } from "../database-error.js";

interface Row {
  id: string;
  user_id: string;
  type: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
}

function toDomain(row: Row): SupportTicket {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    description: row.description,
    status: row.status,
    createdAt: new Date(row.created_at),
  };
}

/**
 * Client passed in here must be schema-bound to "public" (Sandbox's own
 * schema), not "workforce" — see createSupabaseClient's schema param.
 * Read-only: this repo has no create/update methods on purpose.
 */
export class SupportTicketRepo implements ISupportTicketRepo {
  constructor(private readonly client: SupabaseClient) {}

  async listOpen(): Promise<SupportTicket[]> {
    const { data, error } = await this.client
      .from("support_tickets")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: true });

    if (error) throw new DatabaseError("listOpen support_tickets failed", error);
    return (data as Row[]).map(toDomain);
  }
}
