import type { SupabaseClient } from "../supabase-client.js";
import type {
  ContentBatch,
  ContentBatchRepo as IContentBatchRepo,
  ContentBatchStatus,
} from "@ai-workforce/core";
import { DatabaseError } from "../database-error.js";

interface Row {
  id: string;
  task_run_id: string;
  repository_id: string;
  release_tag: string;
  release_title: string | null;
  release_body: string | null;
  status: ContentBatchStatus;
  created_at: string;
}

function toDomain(row: Row): ContentBatch {
  return {
    id: row.id,
    taskRunId: row.task_run_id,
    repositoryId: row.repository_id,
    releaseTag: row.release_tag,
    releaseTitle: row.release_title,
    releaseBody: row.release_body,
    status: row.status,
    createdAt: new Date(row.created_at),
  };
}

export class ContentBatchRepo implements IContentBatchRepo {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: {
    taskRunId: string;
    repositoryId: string;
    releaseTag: string;
    releaseTitle: string;
    releaseBody: string;
  }): Promise<ContentBatch> {
    const { data, error } = await this.client
      .from("content_batches")
      .insert({
        task_run_id: input.taskRunId,
        repository_id: input.repositoryId,
        release_tag: input.releaseTag,
        release_title: input.releaseTitle,
        release_body: input.releaseBody,
      })
      .select()
      .single();

    if (error) throw new DatabaseError("create content_batch failed", error);
    return toDomain(data as Row);
  }

  async findById(id: string): Promise<ContentBatch | null> {
    const { data, error } = await this.client
      .from("content_batches")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new DatabaseError("findById content_batch failed", error);
    return data ? toDomain(data as Row) : null;
  }

  async updateStatus(id: string, status: ContentBatchStatus): Promise<void> {
    const { error } = await this.client.from("content_batches").update({ status }).eq("id", id);
    if (error) throw new DatabaseError("updateStatus content_batch failed", error);
  }

  async listRecent(params?: { status?: ContentBatchStatus; limit?: number }): Promise<ContentBatch[]> {
    let query = this.client
      .from("content_batches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(params?.limit ?? 50);

    if (params?.status) query = query.eq("status", params.status);

    const { data, error } = await query;
    if (error) throw new DatabaseError("listRecent content_batches failed", error);
    return (data as Row[]).map(toDomain);
  }
}
