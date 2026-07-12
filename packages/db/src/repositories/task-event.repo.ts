import type { SupabaseClient } from "../supabase-client.js";
import type { TaskEvent, TaskEventRepo as ITaskEventRepo } from "@ai-workforce/core";
import { DatabaseError } from "../database-error.js";

interface Row {
  id: string;
  task_id: string;
  event: string;
  meta: Record<string, unknown> | null;
  created_at: string;
}

function toDomain(row: Row): TaskEvent {
  return {
    id: row.id,
    taskId: row.task_id,
    event: row.event,
    meta: row.meta,
    createdAt: new Date(row.created_at),
  };
}

export class TaskEventRepo implements ITaskEventRepo {
  constructor(private readonly client: SupabaseClient) {}

  async record(taskId: string, event: string, meta?: Record<string, unknown>): Promise<TaskEvent> {
    const { data, error } = await this.client
      .from("task_events")
      .insert({ task_id: taskId, event, meta: meta ?? null })
      .select()
      .single();

    if (error) throw new DatabaseError("record task_event failed", error);
    return toDomain(data as Row);
  }

  async listByTask(taskId: string): Promise<TaskEvent[]> {
    const { data, error } = await this.client
      .from("task_events")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    if (error) throw new DatabaseError("listByTask task_events failed", error);
    return (data as Row[]).map(toDomain);
  }
}
