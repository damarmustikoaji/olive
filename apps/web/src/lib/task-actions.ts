"use server";

import { revalidatePath } from "next/cache";
import { repositories } from "@/lib/repositories";

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
