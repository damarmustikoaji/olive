import type { SupabaseClient } from "../supabase-client.js";
import type {
  Task,
  TaskCreatedBy,
  TaskPriority,
  TaskSeverity,
  TaskSource,
  TaskStatus,
  WorkTaskRepo as IWorkTaskRepo,
} from "@ai-workforce/core";
import { DatabaseError } from "../database-error.js";

interface Row {
  id: string;
  title: string;
  description: string | null;
  source: TaskSource;
  source_ref: string | null;
  severity: TaskSeverity;
  priority: TaskPriority;
  status: TaskStatus;
  assignee_agent: string | null;
  content_batch_id: string | null;
  payload: Record<string, unknown>;
  created_by: TaskCreatedBy;
  created_at: string;
  updated_at: string;
}

function toDomain(row: Row): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    source: row.source,
    sourceRef: row.source_ref,
    severity: row.severity,
    priority: row.priority,
    status: row.status,
    assigneeAgent: row.assignee_agent,
    contentBatchId: row.content_batch_id,
    payload: row.payload ?? {},
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

const UNIQUE_VIOLATION = "23505";

export class WorkTaskRepo implements IWorkTaskRepo {
  constructor(private readonly client: SupabaseClient) {}

  async getOrCreateBySourceRef(input: {
    title: string;
    description?: string;
    source: TaskSource;
    sourceRef: string;
    severity?: TaskSeverity;
    priority?: TaskPriority;
    payload?: Record<string, unknown>;
  }): Promise<Task> {
    const existing = await this.findBySourceRef(input.source, input.sourceRef);
    if (existing) return existing;

    const { data, error } = await this.client
      .from("tasks")
      .insert({
        title: input.title,
        description: input.description ?? null,
        source: input.source,
        source_ref: input.sourceRef,
        severity: input.severity ?? "medium",
        priority: input.priority ?? "medium",
        payload: input.payload ?? {},
      })
      .select()
      .single();

    if (error?.code === UNIQUE_VIOLATION) {
      const row = await this.findBySourceRef(input.source, input.sourceRef);
      if (row) return row;
    }
    if (error) throw new DatabaseError("getOrCreateBySourceRef task failed", error);
    return toDomain(data as Row);
  }

  async create(input: {
    title: string;
    description?: string;
    source: TaskSource;
    sourceRef?: string;
    severity?: TaskSeverity;
    priority?: TaskPriority;
    payload?: Record<string, unknown>;
    createdBy?: TaskCreatedBy;
  }): Promise<Task> {
    const { data, error } = await this.client
      .from("tasks")
      .insert({
        title: input.title,
        description: input.description ?? null,
        source: input.source,
        source_ref: input.sourceRef ?? null,
        severity: input.severity ?? "medium",
        priority: input.priority ?? "medium",
        payload: input.payload ?? {},
        created_by: input.createdBy ?? "owner",
      })
      .select()
      .single();

    if (error) throw new DatabaseError("create task failed", error);
    return toDomain(data as Row);
  }

  async findById(id: string): Promise<Task | null> {
    const { data, error } = await this.client.from("tasks").select("*").eq("id", id).maybeSingle();
    if (error) throw new DatabaseError("findById task failed", error);
    return data ? toDomain(data as Row) : null;
  }

  async listByStatus(status: TaskStatus): Promise<Task[]> {
    const { data, error } = await this.client
      .from("tasks")
      .select("*")
      .eq("status", status)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) throw new DatabaseError("listByStatus tasks failed", error);
    return (data as Row[]).map(toDomain);
  }

  async listAll(limit = 200): Promise<Task[]> {
    const { data, error } = await this.client
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new DatabaseError("listAll tasks failed", error);
    return (data as Row[]).map(toDomain);
  }

  async assign(id: string, assigneeAgent: string): Promise<void> {
    const { error } = await this.client
      .from("tasks")
      .update({ assignee_agent: assigneeAgent, status: "assigned" })
      .eq("id", id);
    if (error) throw new DatabaseError("assign task failed", error);
  }

  async updateStatus(id: string, status: TaskStatus): Promise<void> {
    const { error } = await this.client.from("tasks").update({ status }).eq("id", id);
    if (error) throw new DatabaseError("updateStatus task failed", error);
  }

  async updateSeverity(id: string, severity: TaskSeverity): Promise<void> {
    const { error } = await this.client.from("tasks").update({ severity }).eq("id", id);
    if (error) throw new DatabaseError("updateSeverity task failed", error);
  }

  async linkContentBatch(id: string, contentBatchId: string): Promise<void> {
    const { error } = await this.client
      .from("tasks")
      .update({ content_batch_id: contentBatchId })
      .eq("id", id);
    if (error) throw new DatabaseError("linkContentBatch task failed", error);
  }

  private async findBySourceRef(source: TaskSource, sourceRef: string): Promise<Task | null> {
    const { data, error } = await this.client
      .from("tasks")
      .select("*")
      .eq("source", source)
      .eq("source_ref", sourceRef)
      .maybeSingle();

    if (error) throw new DatabaseError("findBySourceRef task failed", error);
    return data ? toDomain(data as Row) : null;
  }
}
