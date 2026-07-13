"use server";

import { revalidatePath } from "next/cache";
import { repositories } from "@/lib/repositories";
import type { TaskPriority, TaskSeverity, TaskStatus } from "@ai-workforce/core";

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

/**
 * Drag-and-drop on the board — a manual override, distinct from the AI
 * workflows' own stage transitions (which use their own event names like
 * "assigned"/"content_generated"). Recorded under a clearly-separate event
 * name so the timeline never confuses an Owner drag with an agent decision.
 */
export async function moveTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
  const task = await repositories.tasks.findById(taskId);
  if (!task) throw new Error(`task ${taskId} not found`);
  if (task.status === status) return;

  await repositories.tasks.updateStatus(taskId, status);
  await repositories.taskEvents.record(taskId, "moved_by_owner", { from: task.status, to: status });
  revalidatePath("/board");
}
