import type { SupabaseClient } from "../supabase-client.js";
import type { TaskRun, TaskRunRepo as ITaskRunRepo, TaskRunStatus } from "@ai-workforce/core";
import { DatabaseError } from "../database-error.js";

interface Row {
  id: string;
  workflow_name: string;
  agent_name: string | null;
  trigger_ref: string;
  status: TaskRunStatus;
  attempt_count: number;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

function toDomain(row: Row): TaskRun {
  return {
    id: row.id,
    workflowName: row.workflow_name,
    agentName: row.agent_name,
    triggerRef: row.trigger_ref,
    status: row.status,
    attemptCount: row.attempt_count,
    errorMessage: row.error_message,
    startedAt: row.started_at ? new Date(row.started_at) : null,
    finishedAt: row.finished_at ? new Date(row.finished_at) : null,
    createdAt: new Date(row.created_at),
  };
}

const UNIQUE_VIOLATION = "23505";

export class TaskRunRepo implements ITaskRunRepo {
  constructor(private readonly client: SupabaseClient) {}

  async getOrCreate(params: { workflowName: string; agentName?: string; triggerRef: string }): Promise<TaskRun> {
    const existing = await this.findByTrigger(params.workflowName, params.triggerRef);
    if (existing) return existing;

    const { data, error } = await this.client
      .from("task_runs")
      .insert({
        workflow_name: params.workflowName,
        agent_name: params.agentName ?? null,
        trigger_ref: params.triggerRef,
      })
      .select()
      .single();

    if (error?.code === UNIQUE_VIOLATION) {
      // Lost a race with another overlapping run — the row now exists, just fetch it.
      const row = await this.findByTrigger(params.workflowName, params.triggerRef);
      if (row) return row;
    }
    if (error) throw new DatabaseError("getOrCreate task_run failed", error);
    return toDomain(data as Row);
  }

  async markRunning(id: string): Promise<void> {
    const { error } = await this.client
      .from("task_runs")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new DatabaseError("markRunning failed", error);
  }

  async markDone(id: string): Promise<void> {
    const { error } = await this.client
      .from("task_runs")
      .update({ status: "done", finished_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new DatabaseError("markDone failed", error);
  }

  async markFailed(id: string, err: unknown): Promise<void> {
    const { error } = await this.client
      .from("task_runs")
      .update({ status: "failed", error_message: String(err) })
      .eq("id", id);
    if (error) throw new DatabaseError("markFailed failed", error);

    // Atomic increment via SQL function — avoids read-modify-write races
    // if two overlapping Actions runs fail the same task_run concurrently.
    const { error: rpcError } = await this.client.rpc("increment_task_attempt", { p_task_id: id });
    if (rpcError) throw new DatabaseError("increment_task_attempt failed", rpcError);
  }

  async resetForRetry(id: string): Promise<void> {
    const { error } = await this.client
      .from("task_runs")
      .update({ status: "pending", attempt_count: 0, error_message: null })
      .eq("id", id);
    if (error) throw new DatabaseError("resetForRetry failed", error);
  }

  async listRecent(limit = 50): Promise<TaskRun[]> {
    const { data, error } = await this.client
      .from("task_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new DatabaseError("listRecent task_runs failed", error);
    return (data as Row[]).map(toDomain);
  }

  private async findByTrigger(workflowName: string, triggerRef: string): Promise<TaskRun | null> {
    const { data, error } = await this.client
      .from("task_runs")
      .select("*")
      .eq("workflow_name", workflowName)
      .eq("trigger_ref", triggerRef)
      .maybeSingle();

    if (error) throw new DatabaseError("findByTrigger failed", error);
    return data ? toDomain(data as Row) : null;
  }
}
