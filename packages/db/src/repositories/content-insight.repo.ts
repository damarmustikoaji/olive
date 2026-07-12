import type { SupabaseClient } from "../supabase-client.js";
import type { ContentInsight, ContentInsightRepo as IContentInsightRepo } from "@ai-workforce/core";
import { DatabaseError } from "../database-error.js";

interface Row {
  id: string;
  content_piece_id: string;
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  fetched_at: string;
}

function toDomain(row: Row): ContentInsight {
  return {
    id: row.id,
    contentPieceId: row.content_piece_id,
    views: row.views,
    likes: row.likes,
    replies: row.replies,
    reposts: row.reposts,
    quotes: row.quotes,
    fetchedAt: new Date(row.fetched_at),
  };
}

export class ContentInsightRepo implements IContentInsightRepo {
  constructor(private readonly client: SupabaseClient) {}

  async record(input: {
    contentPieceId: string;
    views: number;
    likes: number;
    replies: number;
    reposts: number;
    quotes: number;
  }): Promise<ContentInsight> {
    const { data, error } = await this.client
      .from("content_insights")
      .insert({
        content_piece_id: input.contentPieceId,
        views: input.views,
        likes: input.likes,
        replies: input.replies,
        reposts: input.reposts,
        quotes: input.quotes,
      })
      .select()
      .single();

    if (error) throw new DatabaseError("record content_insight failed", error);
    return toDomain(data as Row);
  }

  async listByContentPiece(contentPieceId: string): Promise<ContentInsight[]> {
    const { data, error } = await this.client
      .from("content_insights")
      .select("*")
      .eq("content_piece_id", contentPieceId)
      .order("fetched_at", { ascending: false });

    if (error) throw new DatabaseError("listByContentPiece content_insights failed", error);
    return (data as Row[]).map(toDomain);
  }
}
