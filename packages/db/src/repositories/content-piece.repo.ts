import type { SupabaseClient } from "../supabase-client.js";
import type {
  ContentPiece,
  ContentPieceRepo as IContentPieceRepo,
  ContentPlatform,
} from "@ai-workforce/core";
import { DatabaseError } from "../database-error.js";

interface Row {
  id: string;
  content_batch_id: string;
  platform: ContentPlatform;
  content: string;
  seo_title: string | null;
  seo_description: string | null;
  hashtags: string[];
  reviewed_by: string | null;
  reviewed_at: string | null;
  published_at: string | null;
  published_url: string | null;
  published_media_id: string | null;
  created_at: string;
}

function toDomain(row: Row): ContentPiece {
  return {
    id: row.id,
    contentBatchId: row.content_batch_id,
    platform: row.platform,
    content: row.content,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    hashtags: row.hashtags ?? [],
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : null,
    publishedAt: row.published_at ? new Date(row.published_at) : null,
    publishedUrl: row.published_url,
    publishedMediaId: row.published_media_id,
    createdAt: new Date(row.created_at),
  };
}

export class ContentPieceRepo implements IContentPieceRepo {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: {
    contentBatchId: string;
    platform: ContentPlatform;
    content: string;
    seoTitle?: string;
    seoDescription?: string;
    hashtags?: string[];
  }): Promise<ContentPiece> {
    const { data, error } = await this.client
      .from("content_pieces")
      .insert({
        content_batch_id: input.contentBatchId,
        platform: input.platform,
        content: input.content,
        seo_title: input.seoTitle ?? null,
        seo_description: input.seoDescription ?? null,
        hashtags: input.hashtags ?? [],
      })
      .select()
      .single();

    if (error) throw new DatabaseError("create content_piece failed", error);
    return toDomain(data as Row);
  }

  async upsertByBatchAndPlatform(
    contentBatchId: string,
    platform: ContentPlatform,
    fields: Partial<Pick<ContentPiece, "content" | "seoTitle" | "seoDescription" | "hashtags">>,
  ): Promise<ContentPiece> {
    const { data, error } = await this.client
      .from("content_pieces")
      .upsert(
        {
          content_batch_id: contentBatchId,
          platform,
          content: fields.content,
          seo_title: fields.seoTitle,
          seo_description: fields.seoDescription,
          hashtags: fields.hashtags,
        },
        { onConflict: "content_batch_id,platform" },
      )
      .select()
      .single();

    if (error) throw new DatabaseError("upsertByBatchAndPlatform failed", error);
    return toDomain(data as Row);
  }

  async update(
    id: string,
    fields: Partial<Pick<ContentPiece, "content" | "reviewedAt" | "reviewedBy">>,
  ): Promise<void> {
    const { error } = await this.client
      .from("content_pieces")
      .update({
        content: fields.content,
        reviewed_at: fields.reviewedAt?.toISOString(),
        reviewed_by: fields.reviewedBy,
      })
      .eq("id", id);

    if (error) throw new DatabaseError("update content_piece failed", error);
  }

  async markPublished(id: string, publishedUrl: string, publishedMediaId: string): Promise<void> {
    const { error } = await this.client
      .from("content_pieces")
      .update({
        published_at: new Date().toISOString(),
        published_url: publishedUrl,
        published_media_id: publishedMediaId,
      })
      .eq("id", id);

    if (error) throw new DatabaseError("markPublished content_piece failed", error);
  }

  async listByBatch(contentBatchId: string): Promise<ContentPiece[]> {
    const { data, error } = await this.client
      .from("content_pieces")
      .select("*")
      .eq("content_batch_id", contentBatchId)
      .order("platform", { ascending: true });

    if (error) throw new DatabaseError("listByBatch content_pieces failed", error);
    return (data as Row[]).map(toDomain);
  }

  async listPublishedWithMediaId(params: {
    platform: ContentPlatform;
    sincePublishedAt?: Date;
  }): Promise<ContentPiece[]> {
    let query = this.client
      .from("content_pieces")
      .select("*")
      .eq("platform", params.platform)
      .not("published_media_id", "is", null);

    if (params.sincePublishedAt) {
      query = query.gte("published_at", params.sincePublishedAt.toISOString());
    }

    const { data, error } = await query;
    if (error) throw new DatabaseError("listPublishedWithMediaId content_pieces failed", error);
    return (data as Row[]).map(toDomain);
  }

  async listApprovedUnpublished(params: { platform: ContentPlatform; sinceCreatedAt: Date }): Promise<ContentPiece[]> {
    const { data, error } = await this.client
      .from("content_pieces")
      .select("*")
      .eq("platform", params.platform)
      .not("reviewed_at", "is", null)
      .is("published_at", null)
      .gte("created_at", params.sinceCreatedAt.toISOString());

    if (error) throw new DatabaseError("listApprovedUnpublished content_pieces failed", error);
    return (data as Row[]).map(toDomain);
  }
}
