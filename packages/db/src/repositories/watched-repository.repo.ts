import type { SupabaseClient } from "../supabase-client.js";
import type { WatchedRepository, WatchedRepositoryRepo as IWatchedRepositoryRepo } from "@ai-workforce/core";
import { DatabaseError } from "../database-error.js";

interface Row {
  id: string;
  owner: string;
  repo: string;
  is_active: boolean;
  last_release_tag: string | null;
  last_checked_at: string | null;
}

function toDomain(row: Row): WatchedRepository {
  return {
    id: row.id,
    owner: row.owner,
    repo: row.repo,
    isActive: row.is_active,
    lastReleaseTag: row.last_release_tag,
    lastCheckedAt: row.last_checked_at ? new Date(row.last_checked_at) : null,
  };
}

export class WatchedRepositoryRepo implements IWatchedRepositoryRepo {
  constructor(private readonly client: SupabaseClient) {}

  async getActive(): Promise<WatchedRepository[]> {
    const { data, error } = await this.client
      .from("watched_repositories")
      .select("*")
      .eq("is_active", true);

    if (error) throw new DatabaseError("getActive failed", error);
    return (data as Row[]).map(toDomain);
  }

  async listAll(): Promise<WatchedRepository[]> {
    const { data, error } = await this.client
      .from("watched_repositories")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new DatabaseError("listAll failed", error);
    return (data as Row[]).map(toDomain);
  }

  async create(input: { owner: string; repo: string; isActive?: boolean }): Promise<WatchedRepository> {
    const { data, error } = await this.client
      .from("watched_repositories")
      .insert({ owner: input.owner, repo: input.repo, is_active: input.isActive ?? true })
      .select()
      .single();

    if (error) throw new DatabaseError("create watched_repository failed", error);
    return toDomain(data as Row);
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await this.client
      .from("watched_repositories")
      .update({ is_active: isActive })
      .eq("id", id);

    if (error) throw new DatabaseError("setActive failed", error);
  }

  async updateCheckpoint(id: string, releaseTag: string): Promise<void> {
    const { error } = await this.client
      .from("watched_repositories")
      .update({ last_release_tag: releaseTag, last_checked_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw new DatabaseError("updateCheckpoint failed", error);
  }
}
