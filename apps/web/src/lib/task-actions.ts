"use server";

import { revalidatePath } from "next/cache";
import { repositories } from "@/lib/repositories";
import { buildWebExecutionContext } from "@/lib/build-web-context";
import { AnalyzeImageSkill } from "@/lib/analyze-image.skill";
import { extractImageUrls } from "@/lib/task-image";

export async function approveTask(taskId: string): Promise<void> {
  await repositories.tasks.updateStatus(taskId, "approved");
  await repositories.taskEvents.record(taskId, "approved_by_owner");
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/board");
}

export async function rejectTask(taskId: string): Promise<void> {
  await repositories.tasks.updateStatus(taskId, "rejected");
  await repositories.taskEvents.record(taskId, "rejected_by_owner");
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/board");
}

export async function markTaskDone(taskId: string): Promise<void> {
  await repositories.tasks.updateStatus(taskId, "done");
  await repositories.taskEvents.record(taskId, "marked_done");
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/board");
}

/**
 * Owner-triggered only — never runs automatically. See AnalyzeImageSkill for
 * why. Analyzes every image attached to the task, one AI call each (recorded
 * as separate events, since a single "analyses" array would need its own
 * timeline rendering — this reuses the existing long-text event display).
 */
export async function analyzeTaskImage(taskId: string): Promise<void> {
  const task = await repositories.tasks.findById(taskId);
  if (!task) throw new Error(`task ${taskId} not found`);

  const imageUrls = extractImageUrls(task.description);
  if (imageUrls.length === 0) throw new Error("Task ini tidak punya lampiran gambar");

  const existingEvents = await repositories.taskEvents.listByTask(taskId);
  const alreadyAnalyzed = new Set(
    existingEvents.filter((e) => e.event === "image_analyzed").map((e) => e.meta?.url as string | undefined),
  );
  const pendingUrls = imageUrls.filter((url) => !alreadyAnalyzed.has(url));

  const ctx = buildWebExecutionContext();
  const skill = new AnalyzeImageSkill();

  for (const imageUrl of pendingUrls) {
    const analysis = await skill.execute({ imageUrl, context: task.title }, ctx);
    await repositories.taskEvents.record(taskId, "image_analyzed", { url: imageUrl, analysis });
  }

  revalidatePath(`/tasks/${taskId}`);
}
