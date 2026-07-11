"use server";

import { revalidatePath } from "next/cache";
import { repositories } from "@/lib/repositories";
import { buildWebExecutionContext } from "@/lib/build-web-context";
import { ensureSkillsRegistered } from "@/lib/register-skills";
import { SkillRegistry, type ContentPlatform } from "@ai-workforce/core";
import { getCurrentUser } from "@/lib/supabase-auth";

const PLATFORM_TO_SKILL: Record<Exclude<ContentPlatform, "seo">, string> = {
  blog: "generate-blog",
  linkedin: "generate-linkedin",
  x: "generate-x",
  facebook: "generate-facebook",
  instagram: "generate-instagram",
  newsletter: "generate-newsletter",
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
