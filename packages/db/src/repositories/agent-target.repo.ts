import type { SupabaseClient } from "../supabase-client.js";
import type { AgentTarget, AgentTargetRepo as IAgentTargetRepo } from "@ai-workforce/core";
import { DatabaseError } from "../database-error.js";

interface Row {
  id: string;
  agent_name: string;
  metric: string;
  target_value: number;
  updated_at: string;
}

function toDomain(row: Row): AgentTarget {
  return {
    id: row.id,
    agentName: row.agent_name,
    metric: row.metric,
    targetValue: row.target_value,
    updatedAt: new Date(row.updated_at),
  };
}

export class AgentTargetRepo implements IAgentTargetRepo {
  constructor(private readonly client: SupabaseClient) {}

  async getByAgent(agentName: string): Promise<AgentTarget[]> {
    const { data, error } = await this.client
      .from("agent_targets")
      .select("*")
      .eq("agent_name", agentName);

    if (error) throw new DatabaseError("getByAgent agent_targets failed", error);
    return (data as Row[]).map(toDomain);
  }

  async upsert(agentName: string, metric: string, targetValue: number): Promise<AgentTarget> {
    const { data, error } = await this.client
      .from("agent_targets")
      .upsert(
        { agent_name: agentName, metric, target_value: targetValue, updated_at: new Date().toISOString() },
        { onConflict: "agent_name,metric" },
      )
      .select()
      .single();

    if (error) throw new DatabaseError("upsert agent_target failed", error);
    return toDomain(data as Row);
  }
}
