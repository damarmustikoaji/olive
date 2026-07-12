"use server";

import { revalidatePath } from "next/cache";
import { repositories } from "@/lib/repositories";
import { buildWebExecutionContext } from "@/lib/build-web-context";
import { ensureSkillsRegistered } from "@/lib/register-skills";
import { SkillRegistry, type ContentPlatform } from "@ai-workforce/core";
import { getCurrentUser } from "@/lib/supabase-auth";
import { XTwitterClient } from "@ai-workforce/integration-x-twitter";
import { ThreadsClient } from "@ai-workforce/integration-threads";
import { env } from "@/lib/env";

const PLATFORM_TO_SKILL: Record<Exclude<ContentPlatform, "seo">, string> = {
  blog: "generate-blog",
  linkedin: "generate-linkedin",
  x: "generate-x",
  facebook: "generate-facebook",
  instagram: "generate-instagram",
  newsletter: "generate-newsletter",
  threads: "generate-threads",
};

export async function approvePiece(formData: FormData): Promise<void> {
  const pieceId = String(formData.get("pieceId"));
  const batchId = String(formData.get("batchId"));
  const content = String(formData.get("content") ?? "");

  const user = await getCurrentUser();

  await repositories.contentPieces.update(pieceId, {
    content,
    reviewedAt: new Date(),
    reviewedBy: user?.id,
  });

  revalidatePath(`/content/${batchId}`);
}

export async function publishToX(pieceId: string, batchId: string): Promise<void> {
  const { X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET } = env;
  if (!X_API_KEY || !X_API_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_TOKEN_SECRET) {
    throw new Error("X API credentials are not configured (X_API_KEY / X_API_SECRET / X_ACCESS_TOKEN / X_ACCESS_TOKEN_SECRET)");
  }

  const pieces = await repositories.contentPieces.listByBatch(batchId);
  const piece = pieces.find((p) => p.id === pieceId);
  if (!piece) throw new Error(`content_piece ${pieceId} not found in batch ${batchId}`);
  if (piece.platform !== "x") throw new Error("publishToX can only be used on the 'x' platform piece");
  if (!piece.reviewedAt) throw new Error("Approve this piece before publishing it");
  if (piece.publishedAt) throw new Error("This piece has already been published");

  const client = new XTwitterClient({
    apiKey: X_API_KEY,
    apiSecret: X_API_SECRET,
    accessToken: X_ACCESS_TOKEN,
    accessTokenSecret: X_ACCESS_TOKEN_SECRET,
  });

  const result = await client.postTweet(piece.content);
  await repositories.contentPieces.markPublished(pieceId, result.url, result.id);

  revalidatePath(`/content/${batchId}`);
}

export async function publishToThreads(pieceId: string, batchId: string): Promise<void> {
  const { THREADS_USER_ID, THREADS_ACCESS_TOKEN } = env;
  if (!THREADS_USER_ID || !THREADS_ACCESS_TOKEN) {
    throw new Error("Threads credentials are not configured (THREADS_USER_ID / THREADS_ACCESS_TOKEN)");
  }

  const pieces = await repositories.contentPieces.listByBatch(batchId);
  const piece = pieces.find((p) => p.id === pieceId);
  if (!piece) throw new Error(`content_piece ${pieceId} not found in batch ${batchId}`);
  if (piece.platform !== "threads") throw new Error("publishToThreads can only be used on the 'threads' platform piece");
  if (!piece.reviewedAt) throw new Error("Approve this piece before publishing it");
  if (piece.publishedAt) throw new Error("This piece has already been published");

  const client = new ThreadsClient({
    userId: THREADS_USER_ID,
    accessToken: THREADS_ACCESS_TOKEN,
  });

  const result = await client.postThread(piece.content);
  await repositories.contentPieces.markPublished(pieceId, result.url, result.id);

  revalidatePath(`/content/${batchId}`);
}

export async function regeneratePiece(batchId: string, platform: ContentPlatform): Promise<void> {
  ensureSkillsRegistered();

  const batch = await repositories.contentBatches.findById(batchId);
  if (!batch) throw new Error(`content_batch ${batchId} not found`);

  const skillName = platform === "seo" ? "generate-seo" : PLATFORM_TO_SKILL[platform];
  const skill = SkillRegistry.get(skillName);
  const ctx = buildWebExecutionContext();

  const output = await skill.execute(
    { releaseTitle: batch.releaseTitle ?? "", releaseBody: batch.releaseBody ?? "" },
    ctx,
  );

  if (platform === "seo") {
    const seo = output as { seoTitle: string; seoDescription: string; hashtags: string[] };
    await repositories.contentPieces.upsertByBatchAndPlatform(batchId, "seo", {
      content: seo.seoTitle,
      seoTitle: seo.seoTitle,
      seoDescription: seo.seoDescription,
      hashtags: seo.hashtags,
    });
  } else {
    await repositories.contentPieces.upsertByBatchAndPlatform(batchId, platform, {
      content: output as string,
    });
  }

  revalidatePath(`/content/${batchId}`);
}
