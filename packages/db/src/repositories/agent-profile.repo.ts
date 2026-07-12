import type { SupabaseClient } from "../supabase-client.js";
import type { AgentProfile, AgentProfileRepo as IAgentProfileRepo, AgentStatus } from "@ai-workforce/core";
import { DatabaseError } from "../database-error.js";

interface Row {
  agent_name: string;
  role: string;
  level: string;
  status: AgentStatus;
  description: string;
  updated_at: string;
}

function toDomain(row: Row): AgentProfile {
  return {
    agentName: row.agent_name,
    role: row.role,
    level: row.level,
    status: row.status,
    description: row.description,
    updatedAt: new Date(row.updated_at),
  };
}

export class AgentProfileRepo implements IAgentProfileRepo {
  constructor(private readonly client: SupabaseClient) {}

  async listAll(): Promise<AgentProfile[]> {
    const { data, error } = await this.client.from("agent_profiles").select("*").order("agent_name");
    if (error) throw new DatabaseError("listAll agent_profiles failed", error);
    return (data as Row[]).map(toDomain);
  }

  async getByAgent(agentName: string): Promise<AgentProfile | null> {
    const { data, error } = await this.client
      .from("agent_profiles")
      .select("*")
      .eq("agent_name", agentName)
      .maybeSingle();

    if (error) throw new DatabaseError("getByAgent agent_profiles failed", error);
    return data ? toDomain(data as Row) : null;
  }

  async upsert(input: {
    agentName: string;
    role: string;
    level: string;
    status?: AgentStatus;
    description: string;
  }): Promise<AgentProfile> {
    const { data, error } = await this.client
      .from("agent_profiles")
      .upsert(
        {
          agent_name: input.agentName,
          role: input.role,
          level: input.level,
          status: input.status ?? "active",
          description: input.description,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "agent_name" },
      )
      .select()
      .single();

    if (error) throw new DatabaseError("upsert agent_profile failed", error);
    return toDomain(data as Row);
  }
}
