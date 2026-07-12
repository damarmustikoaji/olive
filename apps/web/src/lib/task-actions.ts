"use server";

import { revalidatePath } from "next/cache";
import { repositories } from "@/lib/repositories";
import { buildWebExecutionContext } from "@/lib/build-web-context";
import { AnalyzeImageSkill } from "@/lib/analyze-image.skill";
import { extractImageUrl } from "@/lib/task-image";

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

/** Owner-triggered only — never runs automatically. See AnalyzeImageSkill for why. */
export async function analyzeTaskImage(taskId: string): Promise<void> {
  const task = await repositories.tasks.findById(taskId);
  if (!task) throw new Error(`task ${taskId} not found`);

  const imageUrl = extractImageUrl(task.description);
  if (!imageUrl) throw new Error("Task ini tidak punya lampiran gambar");

  const ctx = buildWebExecutionContext();
  const skill = new AnalyzeImageSkill();
  const analysis = await skill.execute({ imageUrl, context: task.title }, ctx);

  await repositories.taskEvents.record(taskId, "image_analyzed", { analysis });
  revalidatePath(`/tasks/${taskId}`);
}
