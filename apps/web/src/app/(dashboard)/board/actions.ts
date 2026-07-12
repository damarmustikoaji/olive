"use server";

import { revalidatePath } from "next/cache";
import { repositories } from "@/lib/repositories";
import type { TaskPriority, TaskSeverity } from "@ai-workforce/core";

export async function createManualTask(formData: FormData): Promise<void> {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const severity = String(formData.get("severity") ?? "medium") as TaskSeverity;
  const priority = String(formData.get("priority") ?? "medium") as TaskPriority;

  if (!title) return;

  const task = await repositories.tasks.create({
    title,
    description: description || undefined,
    source: "manual",
    severity,
    priority,
    createdBy: "owner",
  });

  await repositories.taskEvents.record(task.id, "task_created", { source: "manual" });
  revalidatePath("/board");
}
